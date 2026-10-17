<?php

namespace App\Support;

use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Default credentials for accounts a school admin creates on a student's
 * behalf (manual registration and batch upload).
 *
 * The password is deliberately guessable-by-design: SURNAME + BIRTH YEAR, e.g.
 * "Montenegro2005". A Grade 7 student can be told it once and never forget it,
 * and the admin can re-derive it without a reset flow. Students who register
 * themselves still choose their own strong password.
 */
class StudentCredentials
{
    /** Domain used for placeholder addresses when a student has no real email. */
    public const PLACEHOLDER_DOMAIN = 'student.libtrack.local';

    /**
     * Surname + birth year, e.g. ("Montenegro", 2005-04-12) => "Montenegro2005".
     *
     * Returns null when there's nothing to build from, so callers can fall back
     * to an explicitly-typed password instead of inventing a weak one.
     */
    public static function derivePassword(?string $lastName, CarbonInterface|string|null $birthdate): ?string
    {
        $surname = self::surnameToken($lastName);
        $year = self::birthYear($birthdate);

        if ($surname === null || $year === null) {
            return null;
        }

        return $surname . $year;
    }

    /**
     * ASCII letters only, capitalised: "dela cruz" => "Delacruz",
     * "O'Brien" => "Obrien", "Nuñez" => "Nunez", "José" => "Jose".
     *
     * Accented characters are TRANSLITERATED, not dropped — stripping them
     * bytewise turned "Nuñez" into "Nuez", so the admin who followed the stated
     * rule ("surname + birth year") would lock the student out. Spaces,
     * apostrophes and hyphens are removed so the password is typeable on a
     * phone keyboard without guessing at punctuation.
     */
    public static function surnameToken(?string $lastName): ?string
    {
        $value = trim((string) $lastName);
        if ($value === '') {
            return null;
        }

        $letters = preg_replace('/[^A-Za-z]/', '', self::toAscii($value));

        if ($letters === null || $letters === '') {
            return null;
        }

        return ucfirst(strtolower($letters));
    }

    /**
     * Fold accented Latin characters onto their ASCII base. iconv's //TRANSLIT
     * is locale-dependent (and can emit things like "n" or "'n"), so the common
     * Filipino/Spanish characters are mapped explicitly first and iconv is only
     * a fallback for anything left.
     */
    protected static function toAscii(string $value): string
    {
        $map = [
            'á' => 'a', 'à' => 'a', 'â' => 'a', 'ä' => 'a', 'ã' => 'a', 'å' => 'a',
            'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
            'í' => 'i', 'ì' => 'i', 'î' => 'i', 'ï' => 'i',
            'ó' => 'o', 'ò' => 'o', 'ô' => 'o', 'ö' => 'o', 'õ' => 'o',
            'ú' => 'u', 'ù' => 'u', 'û' => 'u', 'ü' => 'u',
            'ñ' => 'n', 'ç' => 'c',
            'Á' => 'A', 'À' => 'A', 'Â' => 'A', 'Ä' => 'A', 'Ã' => 'A', 'Å' => 'A',
            'É' => 'E', 'È' => 'E', 'Ê' => 'E', 'Ë' => 'E',
            'Í' => 'I', 'Ì' => 'I', 'Î' => 'I', 'Ï' => 'I',
            'Ó' => 'O', 'Ò' => 'O', 'Ô' => 'O', 'Ö' => 'O', 'Õ' => 'O',
            'Ú' => 'U', 'Ù' => 'U', 'Û' => 'U', 'Ü' => 'U',
            'Ñ' => 'N', 'Ç' => 'C',
        ];

        $value = strtr($value, $map);

        if (preg_match('/[^\x20-\x7E]/', $value)) {
            $converted = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
            if ($converted !== false) {
                $value = $converted;
            }
        }

        return $value;
    }

    public static function birthYear(CarbonInterface|string|null $birthdate): ?string
    {
        $date = self::parseBirthdate($birthdate);

        return $date?->format('Y');
    }

    /**
     * Parse a birthdate the way it actually arrives from a form or a spreadsheet.
     *
     * Handles ISO (2005-04-12), the m/d/Y and d/m/Y that Excel writes, and the
     * bare serial number Excel produces when the column is formatted as a date.
     * Returns null rather than guessing when the value is unusable.
     */
    public static function parseBirthdate(CarbonInterface|string|null $birthdate): ?Carbon
    {
        if ($birthdate === null) {
            return null;
        }

        if ($birthdate instanceof CarbonInterface) {
            return Carbon::instance($birthdate);
        }

        $value = trim($birthdate);
        if ($value === '') {
            return null;
        }

        // Excel "force text" wrapper: ="2005-04-12"
        if (str_starts_with($value, '="') && str_ends_with($value, '"')) {
            $value = substr($value, 2, -1);
        }

        // Excel date serial (days since 1899-12-30). Bounded to a plausible
        // human birthdate so a stray "2005" isn't read as a serial.
        if (preg_match('/^\d{5}$/', $value)) {
            $serial = (int) $value;
            if ($serial > 0 && $serial < 60000) {
                // Still range-checked: serial 59999 lands in 2064, which is not
                // a birthdate anyone has yet.
                return self::plausible(Carbon::create(1899, 12, 30)->addDays($serial)->startOfDay());
            }
        }

        foreach (['Y-m-d', 'Y/m/d', 'd/m/Y', 'm/d/Y', 'd-m-Y', 'm-d-Y', 'd M Y', 'M d, Y', 'F j, Y'] as $format) {
            try {
                $parsed = Carbon::createFromFormat('!' . $format, $value);
                if ($parsed && $parsed->format($format) === $value) {
                    return self::plausible($parsed);
                }
            } catch (\Throwable) {
                // Try the next format.
            }
        }

        // The loose fallback only runs for values that actually look like a full
        // date. Without this guard, strtotime reads a bare "2005" (a roster that
        // carries only the birth YEAR) as 20:05 TODAY, which then passes the
        // plausibility check and writes today's date as the student's birthdate.
        if (!self::looksLikeFullDate($value)) {
            return null;
        }

        try {
            return self::plausible(Carbon::parse($value)->startOfDay());
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * True only when the value carries a day, a month and a 4-digit year in some
     * order — enough that strtotime can't reinterpret it as a time of day.
     */
    protected static function looksLikeFullDate(string $value): bool
    {
        if (!preg_match('/\d{4}/', $value)) {
            return false;
        }

        // Three numeric components (2005-4-12, 4.12.2005), or a month name plus
        // a day number and a year (12 April 2005).
        if (preg_match('/^\s*\d{1,4}\s*[-\/.]\s*\d{1,2}\s*[-\/.]\s*\d{1,4}\s*$/', $value)) {
            return true;
        }

        return (bool) preg_match('/[A-Za-z]{3,}/', $value) && (bool) preg_match('/\b\d{1,2}\b/', $value);
    }

    /** Reject dates that can't belong to a living student. */
    protected static function plausible(?Carbon $date): ?Carbon
    {
        if (!$date) {
            return null;
        }

        if ($date->isFuture() || $date->year < 1900) {
            return null;
        }

        return $date;
    }

    /**
     * A login address for a student the school has no email for.
     *
     * Deterministic on the LRN so re-running an import lands on the same
     * address; name-based (with a numeric suffix on collision) for students
     * who have no LRN yet. Students can sign in with their LRN instead, so
     * this address usually never has to be typed.
     */
    public static function generateEmail(?string $lrn, ?string $firstName, ?string $lastName): string
    {
        if ($lrn) {
            $base = $lrn;
        } else {
            $base = Str::slug(trim(($firstName ?? '') . ' ' . ($lastName ?? '')), '.');
            $base = $base !== '' ? $base : 'student';
        }

        $candidate = $base . '@' . self::PLACEHOLDER_DOMAIN;
        $suffix = 1;

        while (User::where('email', $candidate)->exists()) {
            $suffix++;
            $candidate = $base . $suffix . '@' . self::PLACEHOLDER_DOMAIN;
        }

        return $candidate;
    }

    public static function isPlaceholderEmail(?string $email): bool
    {
        return is_string($email) && str_ends_with($email, '@' . self::PLACEHOLDER_DOMAIN);
    }
}
