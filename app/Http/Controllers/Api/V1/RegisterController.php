<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\OtpVerification;
use App\Models\User;
use App\Services\LrnRegistryService;
use App\Services\OtpService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class RegisterController extends Controller
{
    public function lookupLrn(Request $request, LrnRegistryService $service)
    {
        $request->validate(['lrn' => 'required|digits:12']);

        $check = $service->validateEnrolled($request->lrn);

        if (! $check['ok']) {
            return response()->json(['ok' => false, 'reason' => $check['reason']], 404);
        }

        $record = $check['record'];

        return response()->json([
            'ok' => true,
            'lrn' => $record->lrn,
            'name' => $record->name,
            'school_id' => $record->school_id,
            'school_name' => $record->school?->name,
            'school_code' => $record->school?->code,
            'grade_level' => $record->grade_level,
            'section' => $record->section,
        ]);
    }

    public function initiate(Request $request, OtpService $otp, LrnRegistryService $lrn)
    {
        $request->validate([
            'lrn' => 'required|digits:12|unique:users,lrn',
            'email' => 'required|email|unique:users,email',
            'phone' => ['required', 'regex:/^09\d{9}$/', 'unique:users,phone'],
            'password' => ['required', 'min:6', 'confirmed', 'regex:/^\S+$/'],
        ], [
            'phone.regex' => 'Use the 09XXXXXXXXX format (e.g. 09171234567).',
            'password.regex' => 'Password must not contain spaces.',
            'lrn.unique' => 'This LRN is already registered.',
        ]);

        $check = $lrn->validateEnrolled($request->lrn);

        if (! $check['ok']) {
            return response()->json(['errors' => ['lrn' => [$check['reason']]]], 422);
        }

        $registry = $check['record'];
        $normalizedPhone = $this->normalizePhone($request->phone);
        $issued = $otp->issue($normalizedPhone, 'registration');

        return response()->json([
            'otp_id' => $issued['id'],
            'expires_at' => optional($issued['expires_at'])->toIso8601String(),
            'phone_masked' => $this->maskPhone($normalizedPhone),
            'name' => $registry->name,
            'school_name' => $registry->school?->name,
            'lrn' => $registry->lrn,
            'sent' => $issued['sent'],
            'debug_code' => $issued['debug_code'],
        ]);
    }

    public function resend(Request $request, OtpService $otp)
    {
        $request->validate([
            'otp_id' => 'required|integer',
            'phone' => ['required', 'regex:/^09\d{9}$/'],
        ]);

        $normalizedPhone = $this->normalizePhone($request->phone);
        $issued = $otp->issue($normalizedPhone, 'registration');

        return response()->json([
            'otp_id' => $issued['id'],
            'expires_at' => optional($issued['expires_at'])->toIso8601String(),
            'phone_masked' => $this->maskPhone($normalizedPhone),
            'sent' => $issued['sent'],
            'debug_code' => $issued['debug_code'],
        ]);
    }

    public function verify(Request $request, OtpService $otp, LrnRegistryService $lrn)
    {
        $request->validate([
            'otp_id' => 'required|integer',
            'code' => 'required|digits:6',
            'lrn' => 'required|digits:12|unique:users,lrn',
            'email' => 'required|email|unique:users,email',
            'phone' => ['required', 'regex:/^09\d{9}$/', 'unique:users,phone'],
            'password' => ['required', 'min:6', 'confirmed', 'regex:/^\S+$/'],
        ], [
            'phone.regex' => 'Use the 09XXXXXXXXX format (e.g. 09171234567).',
            'password.regex' => 'Password must not contain spaces.',
            'lrn.unique' => 'This LRN is already registered.',
        ]);

        $check = $lrn->validateEnrolled($request->lrn);

        if (! $check['ok']) {
            return response()->json(['errors' => ['lrn' => [$check['reason']]]], 422);
        }

        $registry = $check['record'];
        $normalizedPhone = $this->normalizePhone($request->phone);

        $result = $otp->verify((int) $request->otp_id, $normalizedPhone, $request->code);

        if (! $result['ok']) {
            return response()->json(['errors' => ['code' => [$result['error']]]], 422);
        }

        $user = User::create([
            'student_id' => $registry->lrn,
            'lrn' => $registry->lrn,
            'name' => $registry->name,
            'email' => $request->email,
            'school_id' => (int) $registry->school_id,
            'phone' => $normalizedPhone,
            'password' => Hash::make($request->password),
            'enrollment_status' => $registry->enrollment_status ?? 'enrolled',
            'user_role' => 'user',
        ]);

        $user->update(['last_login_at' => now()]);

        return response()->json([
            'token' => $user->createToken('libtrack-mobile')->plainTextToken,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'student_id' => $user->student_id,
                'lrn' => $user->lrn,
                'school_id' => $user->school_id,
            ],
        ], 201);
    }

    public function cancel(Request $request)
    {
        $request->validate(['otp_id' => 'required|integer']);

        OtpVerification::where('id', $request->otp_id)
            ->where('purpose', 'registration')
            ->whereNull('consumed_at')
            ->delete();

        return response()->json(['ok' => true]);
    }

    protected function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone);

        if (str_starts_with($digits, '63') && strlen($digits) === 12) {
            return '0'.substr($digits, 2);
        }

        return $digits;
    }

    protected function maskPhone(string $phone): string
    {
        if (strlen($phone) < 4) {
            return $phone;
        }

        return substr($phone, 0, 4)
            .str_repeat('•', max(0, strlen($phone) - 6))
            .substr($phone, -2);
    }
}
