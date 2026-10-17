<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

/**
 * Students sign in with their LRN or their email address.
 *
 * Batch-registered students often have no real email — the importer generates
 * a placeholder like 123456789012@student.libtrack.local — so requiring an
 * email at the login box would make those accounts unusable in practice. The
 * LRN is printed on their DepEd form and is what they actually know.
 */
class LoginIdentifier
{
    /** A DepEd LRN is exactly 12 digits. */
    public static function looksLikeLrn(string $identifier): bool
    {
        return (bool) preg_match('/^\d{12}$/', trim($identifier));
    }

    /**
     * Turn whatever was typed into an Auth::attempt() credential array.
     *
     * Returns null when an LRN was entered that matches no account. The caller
     * reports the same generic "credentials do not match" message it would for a
     * wrong password.
     *
     * @return array{email: string, password: string}|null
     */
    public static function credentials(string $identifier, string $password): ?array
    {
        $identifier = trim($identifier);

        if (self::looksLikeLrn($identifier)) {
            $email = User::where('lrn', $identifier)->value('email');

            if ($email === null) {
                // Returning early here would skip bcrypt entirely, and the
                // ~70x response-time gap against a real LRN (which does run
                // bcrypt) would turn this box into an LRN oracle. Burn one
                // equivalent hash so an unknown LRN costs the same as a wrong
                // password.
                self::burnHashTime($password);

                return null;
            }

            return ['email' => $email, 'password' => $password];
        }

        return ['email' => $identifier, 'password' => $password];
    }

    /**
     * Spend the same time a real password check would, without revealing
     * anything. The digest is a fixed bcrypt hash of a value nothing uses.
     */
    protected static function burnHashTime(string $password): void
    {
        static $dummy = null;

        if ($dummy === null) {
            $dummy = Hash::make('libtrack-timing-equaliser');
        }

        Hash::check($password, $dummy);
    }
}
