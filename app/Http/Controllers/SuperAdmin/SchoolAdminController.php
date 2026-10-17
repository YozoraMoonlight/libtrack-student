<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\User;
use App\Services\AccountCreationOtp;
use App\Support\PasswordRules;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class SchoolAdminController extends Controller
{
    /** Session slot for the school admin waiting on their SMS code. */
    private const OTP_KEY = 'school_admins';


    public function index(Request $request)
    {
        $admins = User::with('school:id,name,code')
            ->whereIn('user_role', ['admin', 'school_admin'])
            ->when($request->school_id, fn ($q, $id) => $q->where('school_id', $id))
            ->when($request->search, function ($q, $s) {
                $q->where(function ($qq) use ($s) {
                    $qq->whereRaw('lower(name) like ?', ['%' . strtolower($s) . '%'])
                       ->orWhereRaw('lower(email) like ?', ['%' . strtolower($s) . '%']);
                });
            })
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('SuperAdmin/SchoolAdmins/Index', [
            'admins' => $admins,
            'schools' => School::orderBy('name')->get(['id', 'name', 'code']),
            'filters' => $request->only(['search', 'school_id']),
        ]);
    }

    public function create(AccountCreationOtp $otp)
    {
        $assignedSchoolIds = User::whereIn('user_role', ['admin', 'school_admin'])
            ->whereNotNull('school_id')
            ->pluck('school_id')
            ->all();

        return Inertia::render('SuperAdmin/SchoolAdmins/Create', [
            'schools' => School::whereNotIn('id', $assignedSchoolIds)
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
            // Set once the form has been submitted and the code is in flight.
            'otpPending' => $otp->props(self::OTP_KEY),
        ]);
    }

    public function store(Request $request, AccountCreationOtp $otp)
    {
        // The confirmation code is texted to this number, so with OTP on the
        // school admin's own mobile number is what makes the account real.
        $otpOn = $otp->enabled();

        $request->validate([
            'first_name' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z\s\'.\-]+$/'],
            'middle_name' => ['nullable', 'string', 'max:100', 'regex:/^[A-Za-z\s\'.\-]+$/'],
            'last_name' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z\s\'.\-]+$/'],
            'email' => 'required|email|unique:users,email',
            'phone' => [$otpOn ? 'required' : 'nullable', 'regex:/^09\d{9}$/'],
            'school_id' => [
                'required',
                'exists:schools,id',
                function ($attribute, $value, $fail) {
                    $exists = User::whereIn('user_role', ['admin', 'school_admin'])
                        ->where('school_id', $value)
                        ->exists();
                    if ($exists) {
                        $fail('This school already has a registered admin. Disable or remove the existing admin first.');
                    }
                },
            ],
            'password' => PasswordRules::strong(),
        ], array_merge([
            'first_name.regex' => 'First name may only contain letters, spaces, apostrophes, dots, or hyphens.',
            'middle_name.regex' => 'Middle name may only contain letters, spaces, apostrophes, dots, or hyphens.',
            'last_name.regex' => 'Last name may only contain letters, spaces, apostrophes, dots, or hyphens.',
            'phone.regex' => 'Use the 09XXXXXXXXX format (e.g. 09171234567).',
            'phone.required' => 'A mobile number is required — the confirmation code is texted to it.',
        ], PasswordRules::messages()));

        $first = trim($request->first_name);
        $middle = trim((string) $request->middle_name);
        $last = trim($request->last_name);
        $composed = trim($first . ' ' . ($middle !== '' ? $middle . ' ' : '') . $last);

        $payload = [
            'name' => $composed,
            'first_name' => $first,
            'middle_name' => $middle !== '' ? $middle : null,
            'last_name' => $last,
            'email' => $request->email,
            'phone' => $request->phone,
            'school_id' => (int) $request->school_id,
            'user_role' => 'school_admin',
            'password' => Hash::make($request->password),
            'is_active' => true,
        ];

        // Nothing is written until the number on the form answers with the code.
        if ($otpOn) {
            $flash = $otp->start(self::OTP_KEY, $payload['phone'], $payload, $composed . ' (School Admin)');

            return redirect()->route('superadmin.school-admins.create')->with($flash);
        }

        return $this->createFromPayload($payload);
    }

    /** Code came back correct — write the account that was parked at submit time. */
    public function verifyOtp(Request $request, AccountCreationOtp $otp)
    {
        $request->validate(['code' => 'required|digits:6'], ['code.digits' => 'Enter the 6-digit code.']);

        $result = $otp->confirm(self::OTP_KEY, $request->code);

        if (!$result['ok']) {
            return back()->withErrors(['code' => $result['error']]);
        }

        $payload = $result['payload'];

        if (User::where('email', $payload['email'])->exists()) {
            return redirect()->route('superadmin.school-admins.create')
                ->withErrors(['email' => 'That email address was taken while the code was being verified. Please fill in the form again.']);
        }

        // The school may have been given an admin while the code was in the air.
        $taken = User::whereIn('user_role', ['admin', 'school_admin'])
            ->where('school_id', $payload['school_id'])
            ->exists();

        if ($taken) {
            return redirect()->route('superadmin.school-admins.create')
                ->withErrors(['school_id' => 'That school was assigned an admin while the code was being verified.']);
        }

        return $this->createFromPayload($payload);
    }

    public function resendOtp(AccountCreationOtp $otp)
    {
        $flash = $otp->resend(self::OTP_KEY);

        return redirect()->route('superadmin.school-admins.create')
            ->with($flash ?? ['error' => 'That request expired. Fill in the form again.']);
    }

    public function cancelOtp(AccountCreationOtp $otp)
    {
        $otp->forget(self::OTP_KEY);

        return redirect()->route('superadmin.school-admins.create');
    }

    /** @param array<string, mixed> $payload Already validated, with the password hashed. */
    private function createFromPayload(array $payload)
    {
        User::create($payload);

        return redirect()->route('superadmin.school-admins.index')->with('success', 'School Admin created.');
    }

    public function toggleActive(User $user)
    {
        if (!in_array($user->user_role, ['admin', 'school_admin'])) {
            return back()->with('error', 'Only School Admin accounts can be toggled here.');
        }
        $user->update(['is_active' => !$user->is_active]);
        return back()->with('success', 'Account ' . ($user->is_active ? 'enabled' : 'disabled') . '.');
    }
}
