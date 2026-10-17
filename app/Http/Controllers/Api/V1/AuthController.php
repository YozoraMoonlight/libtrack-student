<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\LoginIdentifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $input = $request->validate([
            'email' => ['required', 'string', 'max:255'],
            'password' => ['required'],
        ], [
            'email.required' => 'Enter your email address or LRN.',
        ]);

        $credentials = LoginIdentifier::credentials($input['email'], $input['password']);

        if ($credentials === null || ! Auth::attempt($credentials)) {
            throw ValidationException::withMessages([
                'auth' => 'Invalid email/LRN or password.',
            ]);
        }

        /** @var \App\Models\User $user */
        $user = Auth::user();

        if (! $user->is_active) {
            Auth::logout();

            throw ValidationException::withMessages([
                'auth' => 'Your account has been disabled.',
            ]);
        }

        if ($user->user_role !== 'user') {
            Auth::logout();

            throw ValidationException::withMessages([
                'auth' => 'Only student accounts can use the mobile app.',
            ]);
        }

        $user->update(['last_login_at' => now()]);

        $token = $user->createToken('libtrack-mobile')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'student_id' => $user->student_id,
                'lrn' => $user->lrn,
                'school_id' => $user->school_id,
            ],
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $user->loadMissing('school:id,name,code');

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'student_id' => $user->student_id,
            'lrn' => $user->lrn,
            'school_id' => $user->school_id,
            'school_name' => $user->school?->name,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['ok' => true]);
    }
}
