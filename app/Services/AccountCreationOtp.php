<?php

namespace App\Services;

use Illuminate\Support\Facades\Session;

/**
 * SMS confirmation for accounts that staff create on someone else's behalf —
 * school admins, librarians and students.
 *
 * The account is NOT written when the form is submitted. The validated payload
 * is parked in the creator's session, a six-digit code goes to the number typed
 * on the form, and the row is only inserted once that code comes back. That is
 * what makes the number on the account a number somebody actually holds.
 *
 * One pending creation per key (`users`, `school_admins`, `students`), so two
 * tabs can't quietly overwrite each other's payload.
 */
class AccountCreationOtp
{
    /** Kept distinct from 'registration' so a self-signup code can't confirm a staff-created account. */
    public const PURPOSE = 'account_creation';

    public function __construct(private OtpService $otp)
    {
    }

    /**
     * Off only when an environment has no SMS gateway to reach — otherwise a
     * missing API token would lock staff out of creating accounts entirely.
     */
    public function enabled(): bool
    {
        return (bool) config('services.account_otp.enabled', true);
    }

    /**
     * Park the payload and text a code to $phone.
     *
     * @param  array<string, mixed>  $payload  What to create once the code checks out.
     * @param  string  $summary  Who is being created, for the confirmation card.
     * @return array<string, string>  Flash bag for the redirect back to the form.
     */
    public function start(string $key, string $phone, array $payload, string $summary): array
    {
        $issued = $this->otp->issue($phone, self::PURPOSE);

        Session::put($this->sessionKey($key), [
            'payload' => $payload,
            'phone' => $phone,
            'summary' => $summary,
            'otp_id' => $issued['id'],
            'expires_at' => optional($issued['expires_at'])->toIso8601String(),
        ]);

        return $this->flash($issued, "Verification code sent to {$this->mask($phone)}.");
    }

    /** The pending creation as the create page renders it, or null when there is none. */
    public function props(string $key): ?array
    {
        $pending = Session::get($this->sessionKey($key));

        if (!$pending) {
            return null;
        }

        return [
            'phone_masked' => $this->mask($pending['phone']),
            'summary' => $pending['summary'],
            'expires_at' => $pending['expires_at'] ?? null,
        ];
    }

    /** @return array<string, string>|null Null when nothing is pending. */
    public function resend(string $key): ?array
    {
        $pending = Session::get($this->sessionKey($key));

        if (!$pending) {
            return null;
        }

        $issued = $this->otp->issue($pending['phone'], self::PURPOSE);

        $pending['otp_id'] = $issued['id'];
        $pending['expires_at'] = optional($issued['expires_at'])->toIso8601String();
        Session::put($this->sessionKey($key), $pending);

        return $this->flash($issued, 'A new verification code was sent.');
    }

    /**
     * Check the code. On success the payload is handed back and the pending
     * creation is cleared, so the same code can never create two accounts.
     *
     * @return array{ok: bool, payload?: array<string, mixed>, error?: string}
     */
    public function confirm(string $key, string $code): array
    {
        $pending = Session::get($this->sessionKey($key));

        if (!$pending) {
            return ['ok' => false, 'error' => 'That request expired. Fill in the form again.'];
        }

        $result = $this->otp->verify((int) $pending['otp_id'], $pending['phone'], $code, self::PURPOSE);

        if (!$result['ok']) {
            return ['ok' => false, 'error' => $result['error']];
        }

        $this->forget($key);

        return ['ok' => true, 'payload' => $pending['payload']];
    }

    public function forget(string $key): void
    {
        Session::forget($this->sessionKey($key));
    }

    private function sessionKey(string $key): string
    {
        return "account_otp.{$key}";
    }

    /** @return array<string, string> */
    private function flash(array $issued, string $success): array
    {
        $flash = ['success' => $success];

        if ($issued['debug_code']) {
            $flash['info'] = "Dev OTP (SMS disabled): {$issued['debug_code']}";
        } elseif (!$issued['sent']) {
            $flash['error'] = 'Could not send the SMS. Check the number and resend the code.';
        }

        return $flash;
    }

    private function mask(string $phone): string
    {
        if (strlen($phone) < 4) {
            return $phone;
        }

        return substr($phone, 0, 4) . str_repeat('•', max(0, strlen($phone) - 6)) . substr($phone, -2);
    }
}
