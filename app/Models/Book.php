<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Book extends Model
{
    use HasFactory;

    protected $fillable = [
        'isbn',
        'title',
        'author',
        'publisher',
        'publication_year',
        'category_id',
        'school_id',
        'description',
        'cover_image',
        'qr_code',
        'total_copies',
        'available_copies',
        'location',
        'status',
    ];

    protected $casts = [
        'publication_year' => 'integer',
        'total_copies' => 'integer',
        'available_copies' => 'integer',
    ];

    protected $appends = ['cover_image_url'];

    public function getCoverImageUrlAttribute(): ?string
    {
        return $this->cover_image ? asset('storage/' . $this->cover_image) : null;
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($book) {
            if (empty($book->qr_code)) {
                $book->qr_code = (string) Str::uuid();
            }
        });

        // Every creation path (controller, CSV import, seeder, factory) must end
        // up with one book_copies row per physical copy, so it hangs off the
        // model event rather than each call site.
        static::created(function (Book $book) {
            $target = max(1, (int) $book->total_copies);
            $existing = (int) $book->copies()->max('copy_number');

            for ($n = $existing + 1; $n <= $target; $n++) {
                BookCopy::create([
                    'book_id' => $book->id,
                    'copy_number' => $n,
                    'status' => 'available',
                ]);
            }

            $book->forceFill([
                'total_copies' => $target,
                'available_copies' => $target,
            ])->saveQuietly();
        });
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function copies(): HasMany
    {
        return $this->hasMany(BookCopy::class);
    }

    public function availableCopies(): HasMany
    {
        return $this->copies()->where('status', 'available');
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function scopeForSchool($query, ?int $schoolId)
    {
        if (!$schoolId) return $query;

        return $query->where('school_id', $schoolId);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    public function scopeSearch($query, ?string $term)
    {
        if (!$term) return $query;

        // lower() + like rather than Postgres-only `ilike`: the same case-
        // insensitive search on production Postgres and local/test SQLite
        // (where `ilike` is a syntax error and the whole page 500s).
        $like = '%' . mb_strtolower($term) . '%';

        return $query->where(function ($q) use ($like) {
            $q->whereRaw('lower(title) like ?', [$like])
              ->orWhereRaw('lower(author) like ?', [$like])
              ->orWhereRaw('lower(isbn) like ?', [$like]);
        });
    }

    public function scopeFilterByCategory($query, ?int $categoryId)
    {
        if (!$categoryId) return $query;

        return $query->where('category_id', $categoryId);
    }

    public function scopeFilterByStatus($query, ?string $status)
    {
        if (!$status) return $query;

        return $query->where('status', $status);
    }
}
