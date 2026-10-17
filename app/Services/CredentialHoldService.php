<?php

namespace App\Services;

use App\Models\CredentialHold;
use App\Models\User;

class CredentialHoldService
{
    /**
     * Threshold (in pesos) of unpaid fines beyond which a hold is auto-created.
     */
    public const FINE_HOLD_THRESHOLD = 50.00;

    /**
     * Days an item can be overdue before triggering an automatic hold.
     */
    public const OVERDUE_DAYS_THRESHOLD = 14;

    /**
     * Check whether a student qualifies for an automatic hold and create one if so.
     * Idempotent: will not create a duplicate active hold for the same reason.
     */
    public function evaluate(User $user): ?CredentialHold
    {
        if ($user->user_role !== 'user') {
            return null;
        }

        $unpaidTotal = (float) $user->fines()
            ->where('status', 'unpaid')
            ->sum('amount');

        if ($unpaidTotal >= self::FINE_HOLD_THRESHOLD) {
            return $this->placeHold(
                $user,
                'Unpaid fines (₱' . number_format($unpaidTotal, 2) . ')',
                $unpaidTotal,
            );
        }

        $longOverdue = $user->transactions()
            ->where('status', 'overdue')
            ->where('due_date', '<=', now()->subDays(self::OVERDUE_DAYS_THRESHOLD))
            ->exists();

        if ($longOverdue) {
            return $this->placeHold(
                $user,
                'Overdue books beyond ' . self::OVERDUE_DAYS_THRESHOLD . ' days',
                0,
            );
        }

        return null;
    }

    public function placeHold(User $user, string $reason, float $amount = 0, ?string $notes = null): CredentialHold
    {
        $existing = $user->credentialHolds()
            ->where('status', 'active')
            ->where('reason', $reason)
            ->first();

        if ($existing) {
            if ($amount > 0 && (float) $existing->amount !== (float) $amount) {
                $existing->update(['amount' => $amount]);
            }
            return $existing;
        }

        return $user->credentialHolds()->create([
            'reason' => $reason,
            'amount' => $amount,
            'status' => 'active',
            'notes' => $notes,
        ]);
    }

    public function release(CredentialHold $hold, User $releasedBy, ?string $notes = null): CredentialHold
    {
        $hold->update([
            'status' => 'released',
            'released_at' => now(),
            'released_by' => $releasedBy->id,
            'notes' => $notes ?? $hold->notes,
        ]);

        return $hold;
    }

    public function autoReleaseIfClear(User $user): void
    {
        $unpaidTotal = (float) $user->fines()
            ->where('status', 'unpaid')
            ->sum('amount');

        $longOverdue = $user->transactions()
            ->where('status', 'overdue')
            ->where('due_date', '<=', now()->subDays(self::OVERDUE_DAYS_THRESHOLD))
            ->exists();

        if ($unpaidTotal < self::FINE_HOLD_THRESHOLD && !$longOverdue) {
            $user->credentialHolds()
                ->where('status', 'active')
                ->each(function (CredentialHold $hold) {
                    $hold->update([
                        'status' => 'released',
                        'released_at' => now(),
                        'notes' => trim(($hold->notes ?? '') . ' | Auto-released: cleared.'),
                    ]);
                });
        }
    }
}
