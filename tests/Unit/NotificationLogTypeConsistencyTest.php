<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class NotificationLogTypeConsistencyTest extends TestCase
{
    public function test_circulation_service_uses_only_allowed_notification_types(): void
    {
        $allowed = $this->allowedNotificationTypes();
        $this->assertNotEmpty(
            $allowed,
            'Could not parse allowed notification types from migration.'
        );

        $usedTypes = $this->notificationTypesUsedIn($this->projectPath('app/Services/CirculationService.php'));
        $this->assertNotEmpty(
            $usedTypes,
            'Expected CirculationService to write at least one NotificationLog type.'
        );

        foreach ($usedTypes as $type) {
            $this->assertContains(
                $type,
                $allowed,
                "CirculationService writes NotificationLog type '{$type}' which is not in the notifications_log.type enum."
            );
        }
    }

    public function test_check_overdue_command_uses_only_allowed_notification_types(): void
    {
        $allowed = $this->allowedNotificationTypes();
        $usedTypes = $this->notificationTypesUsedIn($this->projectPath('app/Console/Commands/CheckOverdueBooks.php'));

        foreach ($usedTypes as $type) {
            $this->assertContains(
                $type,
                $allowed,
                "CheckOverdueBooks writes NotificationLog type '{$type}' which is not in the notifications_log.type enum."
            );
        }
    }

    private function allowedNotificationTypes(): array
    {
        $migration = file_get_contents(
            $this->projectPath('database/migrations/2024_01_01_000007_create_notifications_table.php')
        );

        if (!preg_match("/enum\('type',\s*\[([^\]]+)\]/", $migration, $m)) {
            return [];
        }

        preg_match_all("/'([^']+)'/", $m[1], $values);
        return $values[1] ?? [];
    }

    private function notificationTypesUsedIn(string $file): array
    {
        $source = file_get_contents($file);
        $types = [];

        if (preg_match_all(
            "/NotificationLog::create\(\s*\[(.*?)\]\s*\)/s",
            $source,
            $blocks
        )) {
            foreach ($blocks[1] as $block) {
                if (preg_match("/'type'\s*=>\s*'([^']+)'/", $block, $match)) {
                    $types[] = $match[1];
                }
            }
        }

        return array_values(array_unique($types));
    }

    private function projectPath(string $relative): string
    {
        return dirname(__DIR__, 2) . '/' . ltrim($relative, '/');
    }
}
