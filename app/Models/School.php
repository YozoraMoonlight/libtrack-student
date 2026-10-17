<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class School extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'address',
        'phone',
        'email',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function librarians(): HasMany
    {
        return $this->hasMany(User::class)->where('user_role', 'librarian');
    }

    public function students(): HasMany
    {
        return $this->hasMany(User::class)->where('user_role', 'user');
    }

    public function lrnRegistryEntries(): HasMany
    {
        return $this->hasMany(LrnRegistry::class);
    }

    public function books(): HasMany
    {
        return $this->hasMany(Book::class);
    }

    public function scopeSearch($query, ?string $term)
    {
        if (!$term) return $query;

        // Portable case-insensitive match (Postgres-only `ilike` 500s on SQLite).
        $like = '%' . mb_strtolower($term) . '%';

        return $query->where(function ($q) use ($like) {
            $q->whereRaw('lower(name) like ?', [$like])
              ->orWhereRaw('lower(code) like ?', [$like])
              ->orWhereRaw('lower(address) like ?', [$like]);
        });
    }
}
