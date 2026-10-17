<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class IprogSmsService
{
    protected ?string $apiToken;
    protected string $baseUrl;

    public function __construct()
    {
        $this->apiToken = config('services.iprog_sms.api_token');
        $this->baseUrl = rtrim((string) config('services.iprog_sms.base_url'), '/');
    }

    public function scheduleReminder(string $phone, string $message, Carbon $scheduledAt): ?int
    {
        if (!$this->isConfigured()) {
            Log::warning('IPROG SMS: api_token not configured; skipping scheduleReminder.');
            return null;
        }

        $normalizedPhone = $this->normalizePhone($phone);
        if (!$normalizedPhone) {
            Log::warning('IPROG SMS: invalid phone number for scheduleReminder.', ['phone' => $phone]);
            return null;
        }

        try {
            $response = Http::asForm()->post($this->baseUrl . '/message-reminders', [
                'api_token' => $this->apiToken,
                'phone_number' => $normalizedPhone,
                'message' => $message,
                'scheduled_at' => $this->formatScheduledAt($scheduledAt),
            ]);

            $body = $response->json();
            if ($response->successful() && ($body['status'] ?? null) === 'success') {
                return (int) ($body['data']['id'] ?? 0) ?: null;
            }

            Log::error('IPROG SMS: scheduleReminder failed.', [
                'status' => $response->status(),
                'body' => $body,
            ]);
            return null;
        } catch (\Throwable $e) {
            Log::error('IPROG SMS: scheduleReminder exception.', ['error' => $e->getMessage()]);
            return null;
        }
    }

    public function sendNow(string $phone, string $message): bool
    {
        if (!$this->isConfigured()) {
            Log::warning('IPROG SMS: api_token not configured; skipping sendNow.');
            return false;
        }

        $normalizedPhone = $this->normalizePhone($phone);
        if (!$normalizedPhone) {
            Log::warning('IPROG SMS: invalid phone number for sendNow.', ['phone' => $phone]);
            return false;
        }

        try {
            $response = Http::asForm()->post($this->baseUrl . '/sms_messages', [
                'api_token' => $this->apiToken,
                'phone_number' => $normalizedPhone,
                'message' => $message,
            ]);

            $body = $response->json();
            $bodyStatus = $body['status'] ?? null;
            $carrierOk = $bodyStatus === 'success' || (is_int($bodyStatus) && $bodyStatus >= 200 && $bodyStatus < 300);

            if ($response->successful() && $carrierOk) {
                return true;
            }

            Log::error('IPROG SMS: sendNow failed.', [
                'http_status' => $response->status(),
                'body' => $body,
            ]);
            return false;
        } catch (\Throwable $e) {
            Log::error('IPROG SMS: sendNow exception.', ['error' => $e->getMessage()]);
            return false;
        }
    }

    public function deleteReminder(int $id): bool
    {
        if (!$this->isConfigured() || $id <= 0) {
            return false;
        }

        try {
            $response = Http::delete($this->baseUrl . '/message-reminders/' . $id, [
                'api_token' => $this->apiToken,
            ]);

            if ($response->successful()) {
                return true;
            }

            Log::error('IPROG SMS: deleteReminder failed.', [
                'id' => $id,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);
            return false;
        } catch (\Throwable $e) {
            Log::error('IPROG SMS: deleteReminder exception.', ['error' => $e->getMessage()]);
            return false;
        }
    }

    public function isConfigured(): bool
    {
        return !empty($this->apiToken);
    }

    protected function normalizePhone(string $phone): ?string
    {
        $digits = preg_replace('/\D+/', '', $phone);
        if (!$digits) return null;

        if (str_starts_with($digits, '63') && strlen($digits) === 12) {
            return $digits;
        }
        if (str_starts_with($digits, '09') && strlen($digits) === 11) {
            return '63' . substr($digits, 1);
        }
        if (str_starts_with($digits, '9') && strlen($digits) === 10) {
            return '63' . $digits;
        }
        return $digits;
    }

    protected function formatScheduledAt(Carbon $scheduledAt): string
    {
        return $scheduledAt->copy()->setTimezone('Asia/Manila')->format('Y-m-d h:iA');
    }
}
