<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\LrnRegistryService;
use App\Services\OtpService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;


class MobileRegisterController extends Controller
{
    public function index(Request $request)
    {
        $pending = $request->session()->get('mobile_register.pending');

        return Inertia::render('Auth/MobileRegister', [
            'pending' => $pending ? [
                'phone_masked' => $this->maskPhone($pending['phone'] ?? ''),
                'expires_at' => $pending['otp_expires_at'] ?? null,
                'name' => $pending['name'] ?? null,
                'school_name' => $pending['school_name'] ?? null,
                'lrn' => $pending['lrn'] ?? null,
                'role' => 'student',
            ] : null,
        ]);
    }

    public function lookupLrn(Request $request, LrnRegistryService $service)
    {
        $request->validate([
            'lrn' => 'required|digits:12',
        ]);

        $check = $service->validateEnrolled($request->lrn);

        if (!$check['ok']) {
            return response()->json([
                'ok' => false,
                'reason' => $check['reason'],
            ], 404);
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

        if (!$check['ok']) {
            return back()->withErrors([
                'lrn' => $check['reason'],
            ]);
        }

        $registry = $check['record'];
        $normalizedPhone = $this->normalizePhone($request->phone);
        $issued = $otp->issue($normalizedPhone, 'registration');

        $request->session()->put('mobile_register.pending', [
            'lrn' => $registry->lrn,
            'student_id' => $registry->lrn,
            'name' => $registry->name,
            'email' => $request->email,
            'school_id' => (int) $registry->school_id,
            'school_name' => $registry->school?->name,
            'phone' => $normalizedPhone,
            'password_hash' => Hash::make($request->password),
            'enrollment_status' => $registry->enrollment_status,
            'otp_id' => $issued['id'],
            'otp_expires_at' => optional($issued['expires_at'])->toIso8601String(),
        ]);

        $flash = ['success' => 'Verification code sent to your phone.'];

        if ($issued['debug_code']) {
            $flash['info'] = "Dev OTP (SMS disabled): {$issued['debug_code']}";
        } elseif (!$issued['sent']) {
            $flash['error'] = 'Failed to send SMS. Check the number and try resending.';
        }

        return redirect()->route('mobile.register')->with($flash);
    }

    public function resend(Request $request, OtpService $otp)
    {
        $pending = $request->session()->get('mobile_register.pending');

        if (!$pending) {
            return redirect()->route('mobile.register')
                ->with('error', 'Registration session expired. Please start over.');
        }

        $issued = $otp->issue($pending['phone'], 'registration');

        $pending['otp_id'] = $issued['id'];
        $pending['otp_expires_at'] = optional($issued['expires_at'])->toIso8601String();

        $request->session()->put('mobile_register.pending', $pending);

        $flash = ['success' => 'A new verification code was sent.'];

        if ($issued['debug_code']) {
            $flash['info'] = "Dev OTP (SMS disabled): {$issued['debug_code']}";
        } elseif (!$issued['sent']) {
            $flash['error'] = 'Failed to send SMS. Try again shortly.';
        }

        return redirect()->route('mobile.register')->with($flash);
    }

    public function verify(Request $request, OtpService $otp)
    {
        $request->validate([
            'code' => 'required|digits:6',
        ]);

        $pending = $request->session()->get('mobile_register.pending');

        if (!$pending) {
            return redirect()->route('mobile.register')
                ->with('error', 'Registration session expired. Please start over.');
        }

        $result = $otp->verify(
            (int) $pending['otp_id'],
            $pending['phone'],
            $request->code
        );

        if (!$result['ok']) {
            return back()->withErrors([
                'code' => $result['error'],
            ]);
        }

        $user = User::create([
            'student_id' => $pending['student_id'],
            'lrn' => $pending['lrn'],
            'name' => $pending['name'],
            'email' => $pending['email'],
            'school_id' => $pending['school_id'],
            'phone' => $pending['phone'],
            'password' => $pending['password_hash'],
            'enrollment_status' => $pending['enrollment_status'] ?? 'enrolled',
            'user_role' => 'user',
        ]);

        $request->session()->forget('mobile_register.pending');

        Auth::login($user);

        return redirect()->route('student.dashboard')
            ->with('success', 'Account created successfully.');
    }

    public function cancel(Request $request)
    {
        $request->session()->forget('mobile_register.pending');

        return redirect()->route('mobile.register');
    }

    protected function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone);

        if (str_starts_with($digits, '63') && strlen($digits) === 12) {
            return '0' . substr($digits, 2);
        }

        return $digits;
    }

    protected function maskPhone(string $phone): string
    {
        if (strlen($phone) < 4) {
            return $phone;
        }

        return substr($phone, 0, 4)
            . str_repeat('•', max(0, strlen($phone) - 6))
            . substr($phone, -2);
    }
}