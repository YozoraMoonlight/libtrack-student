<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LrnRegistry extends Model
{
    use HasFactory;

    protected $table = 'lrn_registry';

    protected $fillable = [
        'lrn',
        // The student account this row belongs to — see App\Services\RegistryAccountLink.
        'user_id',
        'name',
        'first_name',
        'middle_name',
        'last_name',
        'birthdate',
        'school_id',
        'grade_level',
        'section',
        'enrollment_status',
    ];

    protected $casts = [
        'birthdate' => 'date',
    ];

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Rows that do (or don't) have a student account: through the link, or the
     * LRN for rows written before the link existed. Matching on the LRN alone
     * is what kept a student registered without one "Not registered" forever.
     */
    public function scopeRegistered(Builder $query, bool $registered = true): Builder
    {
        $account = function ($sub) {
            $sub->selectRaw('1')->from('users')->where(function ($w) {
                $w->whereColumn('users.id', 'lrn_registry.user_id')
                    ->orWhereColumn('users.lrn', 'lrn_registry.lrn');
            });
        };

        return $registered ? $query->whereExists($account) : $query->whereNotExists($account);
    }

    public function isEnrolled(): bool
    {
        return $this->enrollment_status === 'enrolled';
    }
}
