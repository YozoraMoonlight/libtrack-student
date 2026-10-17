<?php

namespace App\Http\Requests\Admin;

use App\Support\PasswordRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $auth = Auth::user();
        // A school admin's Users list shows their librarians AND their students,
        // so both roles have to survive a save here. Locking this to 'librarian'
        // is what made every edit of a student come back as "The selected user
        // role is invalid" — with the password, student ID, phone and
        // department changes thrown away with it.
        $rolesRule = $auth && $auth->isSuperAdmin() ? 'in:admin,librarian,user' : 'in:librarian,user';

        return [
            'first_name' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z\s\'.\-]+$/'],
            'middle_name' => ['nullable', 'string', 'max:100', 'regex:/^[A-Za-z\s\'.\-]+$/'],
            'last_name' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z\s\'.\-]+$/'],
            // Shown on the edit page because a student's default password is
            // their surname + birth year — staff need to read it back.
            'birthdate' => ['nullable', 'date', 'before:today', 'after:1900-01-01'],
            'email' => 'required|email|unique:users,email,' . $this->route('user')->id,
            'password' => PasswordRules::strongNullable(),
            'user_role' => "required|{$rolesRule}",
            // A student's DepEd LRN: they can sign in with it, and it ties the
            // account to its row on the Students page. Roster-side conflicts
            // (another school's row, a merge) are checked in UserController.
            'lrn' => ['nullable', 'digits:12', Rule::unique('users', 'lrn')->ignore($this->route('user')->id)],
            'student_id' => 'nullable|string|max:50',
            'phone' => ['nullable', 'regex:/^09\d{9}$/'],
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
            'birthdate.before' => 'Birthdate must be in the past.',
            'lrn.digits' => 'LRN must be exactly 12 digits.',
            'lrn.unique' => 'This LRN is already registered to another student.',
        ], PasswordRules::messages());
    }
}
