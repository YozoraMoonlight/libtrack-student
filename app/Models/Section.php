<?php

namespace App\Models;

use App\Support\GradeLevels;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Collection;

/**
 * A class section a school offers, e.g. Grade 7 – "G7-A".
 *
 * The section a student is filed under is still stored as a string on
 * lrn_registry (renaming a section cascades onto those rows — see
 * SectionController::update). This table is the list the dropdowns are built
 * from and the whitelist the server validates against.
 */
class Section extends Model
{
    use HasFactory;

    protected $fillable = [
        'school_id',
        'grade_level',
        'name',
    ];

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function scopeForSchool(Builder $query, ?int $schoolId): Builder
    {
        return $query->where('school_id', $schoolId);
    }

    /** "Grade 7 – Mabini" — what the dropdowns show when no grade is picked yet. */
    public function getLabelAttribute(): string
    {
        return $this->grade_level . ' – ' . $this->name;
    }

    /**
     * Every section of a school, ordered the way a person reads a roster:
     * Grade 7 before Grade 10 (not alphabetically), then by name.
     *
     * Sorted in PHP rather than SQL because "Grade 10" sorts before "Grade 7"
     * in every collation, and a CASE expression would have to be rewritten
     * each time GradeLevels changes.
     *
     * @return Collection<int, Section>
     */
    public static function orderedFor(?int $schoolId): Collection
    {
        if ($schoolId === null) {
            return collect();
        }

        $order = array_flip(GradeLevels::all());

        return static::query()
            ->where('school_id', $schoolId)
            ->get()
            ->sortBy([
                fn (Section $a, Section $b) => ($order[$a->grade_level] ?? 99) <=> ($order[$b->grade_level] ?? 99),
                fn (Section $a, Section $b) => strnatcasecmp($a->name, $b->name),
            ])
            ->values();
    }
}
