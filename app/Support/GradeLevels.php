<?php

namespace App\Support;

/**
 * The single source of truth for the grade levels this school offers.
 *
 * Both the manual-register form and the batch-upload page render their
 * dropdown from this list (it is passed down as an Inertia prop), and the CSV
 * importer validates against it — so a roster can never smuggle in a free-text
 * grade that the dropdowns can't represent.
 */
class GradeLevels
{
    /**
     * Junior high (7–10) plus senior high (11–12). The manual-register form
     * previously offered only 7–10 while rosters in the wild already carried
     * Grade 11, so the list is the union of both — widening it can't reject a
     * roster that used to import.
     */
    public const ALL = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

    /** @return array<int, string> */
    public static function all(): array
    {
        return self::ALL;
    }

    public static function isValid(?string $value): bool
    {
        return $value !== null && in_array($value, self::ALL, true);
    }

    /**
     * Fold what a teacher actually types in a spreadsheet onto a canonical
     * value: "grade 7", "GRADE7", "7", "g7" and "Grade  7" all become "Grade 7".
     * Returns null when it isn't a grade this school offers.
     */
    public static function normalize(?string $raw): ?string
    {
        $value = trim((string) $raw);
        if ($value === '') {
            return null;
        }

        // Pull the first integer out of the cell; anything else is not a grade.
        if (!preg_match('/^(?:grade\s*|g\s*|gr\.?\s*)?(\d{1,2})$/i', $value, $m)) {
            return null;
        }

        $candidate = 'Grade ' . (int) $m[1];

        return in_array($candidate, self::ALL, true) ? $candidate : null;
    }

    public static function options(): string
    {
        return implode(', ', self::ALL);
    }
}
