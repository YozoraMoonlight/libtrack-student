<?php

namespace App\Services;

use App\Models\OtpVerification;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class OtpService
{
    protected IprogSmsService $sms;

    public function __construct(IprogSmsService $sms)
    {
        $this->sms = $sms;
    }

    public function issue(string $phone, string $purpose = 'registration', int $ttlMinutes = 10): array
    {
        $code = (string) random_int(100000, 999999);

        OtpVerification::where('phone', $phone)
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->delete();

        $record = OtpVerification::create([
            'phone' => $phone,
            'purpose' => $purpose,
            'code_hash' => Hash::make($code),
            'attempts' => 0,
            'expires_at' => Carbon::now()->addMinutes($ttlMinutes),
        ]);

        $message = "LIBTRACK: Your verification code is {$code}. Valid for {$ttlMinutes} minutes. Do not share this code.";

        $sent = false;
        if ($this->sms->isConfigured()) {
            $sent = $this->sms->sendNow($phone, $message);
        } else {
            Log::info('OtpService: SMS not configured; OTP generated but not dispatched.', [
                'phone' => $phone,
                'code' => $code,
            ]);
        }

        return [
            'id' => $record->id,
            'sent' => $sent,
            'expires_at' => $record->expires_at,
            'debug_code' => app()->environment('local') && !$this->sms->isConfigured() ? $code : null,
        ];
    }

    public function verify(int $otpId, string $phone, string $code, string $purpose = 'registration'): array
    {
        $record = OtpVerification::where('id', $otpId)
            ->where('phone', $phone)
            ->where('purpose', $purpose)
            ->first();

        if (!$record) {
            return ['ok' => false, 'error' => 'Verification code not found. Please request a new one.'];
        }

        if ($record->consumed_at) {
            return ['ok' => false, 'error' => 'This verification code has already been used.'];
        }

        if ($record->expires_at->isPast()) {
            return ['ok' => false, 'error' => 'Verification code has expired. Please request a new one.'];
        }

        if ($record->attempts >= 5) {
            return ['ok' => false, 'error' => 'Too many failed attempts. Please request a new code.'];
        }

        if (!Hash::check($code, $record->code_hash)) {
            $record->increment('attempts');
            return ['ok' => false, 'error' => 'Incorrect verification code.'];
        }

        $record->update(['consumed_at' => Carbon::now()]);

        return ['ok' => true];
    }
}
