<?php

namespace App\Http\Requests\Admin;

use App\Support\PasswordRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $auth = Auth::user();
        $rolesRule = $auth && $auth->isSuperAdmin() ? 'in:admin,librarian,user' : 'in:librarian';
        // The confirmation code is texted to this number, so with OTP on there
        // has to be one.
        $otpOn = (bool) config('services.account_otp.enabled', true);

        return [
            'first_name' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z\s\'.\-]+$/'],
            'middle_name' => ['nullable', 'string', 'max:100', 'regex:/^[A-Za-z\s\'.\-]+$/'],
            'last_name' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z\s\'.\-]+$/'],
            'email' => 'required|email|unique:users',
            'password' => PasswordRules::strong(),
            'user_role' => "required|{$rolesRule}",
            'student_id' => 'nullable|string|max:50',
            'phone' => [$otpOn ? 'required' : 'nullable', 'regex:/^09\d{9}$/'],
            'department' => 'nullable|string|max:255',
            'school_id' => 'nullable|exists:schools,id|required_if:user_role,librarian|required_if:user_role,user',
        ];
    }

    public function messages(): array
    {
        return array_merge([
            'first_name.regex' => 'First name may only contain letters, spaces, apostrophes, dots, or hyphens.',
            'middle_name.regex' => 'Middle name may only contain letters, spaces, apostrophes, dots, or hyphens.',
            'last_name.regex' => 'Last name may only contain letters, spaces, apostrophes, dots, or hyphens.',
            'phone.regex' => 'Use the 09XXXXXXXXX format (e.g. 09171234567).',
            'phone.required' => 'A mobile number is required — the confirmation code is texted to it.',
        ], PasswordRules::messages());
    }
}
