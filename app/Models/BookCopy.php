<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * A single physical copy of a Book.
 *
 * Each copy owns its own QR code, which is what makes a return verifiable:
 * scanning copy #2 can no longer satisfy a loan that was issued on copy #1.
 */
class BookCopy extends Model
{
    use HasFactory;

    /** Statuses a physical copy can be in. */
    public const STATUSES = ['available', 'borrowed', 'reserved', 'damaged', 'lost'];

    /** Statuses an admin may set by hand (borrowed/available are driven by circulation). */
    public const MANUAL_STATUSES = ['available', 'damaged', 'lost'];

    protected $fillable = [
        'book_id',
        'copy_number',
        'accession_number',
        'qr_code',
        'status',
        'condition',
        'notes',
    ];

    protected $casts = [
        'copy_number' => 'integer',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function (BookCopy $copy) {
            if (empty($copy->qr_code)) {
                $copy->qr_code = (string) Str::uuid();
            }

            if (empty($copy->accession_number) && $copy->book_id && $copy->copy_number) {
                $copy->accession_number = static::formatAccessionNumber((int) $copy->book_id, (int) $copy->copy_number);
            }
        });
    }

    public static function formatAccessionNumber(int $bookId, int $copyNumber): string
    {
        return sprintf('ACC-%05d-%03d', $bookId, $copyNumber);
    }

    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    /** The loan this copy is currently out on, if any. */
    public function activeTransaction()
    {
        return $this->hasOne(Transaction::class)->whereIn('status', ['active', 'overdue']);
    }

    public function scopeAvailable($query)
    {
        return $query->where('status', 'available');
    }

    public function isAvailable(): bool
    {
        return $this->status === 'available';
    }

    /** Human label for messages and printed sheets. */
    public function label(): string
    {
        return $this->accession_number ?: "Copy #{$this->copy_number}";
    }
}
