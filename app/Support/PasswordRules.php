<?php

namespace App\Support;

use Illuminate\Validation\Rules\Password;

class PasswordRules
{
    /**
     * Standard strong-password rules shared by every account creation
     * and password-update flow:
     * - min 8 characters
     * - upper + lower case letters
     * - at least one number
     * - at least one symbol
     * - no whitespace
     * - must be confirmed (paired with password_confirmation)
     *
     * @return array<int, mixed>
     */
    public static function strong(bool $confirmed = true): array
    {
        $rules = [
            'required',
            'string',
            'regex:/^\S+$/',
            Password::min(8)->mixedCase()->letters()->numbers()->symbols(),
        ];

        if ($confirmed) {
            $rules[] = 'confirmed';
        }

        return $rules;
    }

    /**
     * Same rules but nullable — used for update flows where the password
     * is optional unless the user actually wants to change it.
     *
     * @return array<int, mixed>
     */
    public static function strongNullable(): array
    {
        return [
            'nullable',
            'string',
            'regex:/^\S+$/',
            Password::min(8)->mixedCase()->letters()->numbers()->symbols(),
        ];
    }

    /**
     * Rules for a student account an admin creates on the student's behalf
     * (manual registration and batch upload).
     *
     * The default password is deliberately SURNAME + BIRTH YEAR — e.g.
     * "Montenegro2005" — so a Grade 7 student can be told it once and an admin
     * can re-derive it without a reset flow. That shape has no symbol, and a
     * short Filipino surname ("Sy2005", "Uy2004") is only six characters, so
     * ->symbols() and min(8) are relaxed here. Everything a student sets for
     * themselves still goes through strong().
     *
     * @return array<int, mixed>
     */
    public static function studentSet(bool $confirmed = false): array
    {
        $rules = [
            'required',
            'string',
            'regex:/^\S+$/',
            Password::min(6)->letters()->numbers(),
        ];

        if ($confirmed) {
            $rules[] = 'confirmed';
        }

        return $rules;
    }

    /** Nullable counterpart of studentSet() for admin edit flows. */
    public static function studentSetNullable(): array
    {
        return [
            'nullable',
            'string',
            'regex:/^\S+$/',
            Password::min(6)->letters()->numbers(),
        ];
    }

    public static function messages(): array
    {
        return [
            'password.regex' => 'Password must not contain spaces.',
        ];
    }
}
