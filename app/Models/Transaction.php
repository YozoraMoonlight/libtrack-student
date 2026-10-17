<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'book_id',
        'book_copy_id',
        'librarian_id',
        'type',
        'borrowed_at',
        'due_date',
        'returned_at',
        // Set when the student asks to return from their own page; the loan
        // stays open until a librarian receives the book.
        'return_requested_at',
        'return_request_method',
        'status',
        'sms_reminder_id',
        'notes',
    ];

    protected $casts = [
        'borrowed_at' => 'datetime',
        'due_date' => 'datetime',
        'returned_at' => 'datetime',
        'return_requested_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class);
    }

    /**
     * The exact physical copy this loan was issued on. Null only for loans
     * recorded before per-copy tracking existed.
     */
    public function bookCopy(): BelongsTo
    {
        return $this->belongsTo(BookCopy::class);
    }

    public function librarian(): BelongsTo
    {
        return $this->belongsTo(User::class, 'librarian_id');
    }

    public function fines(): HasMany
    {
        return $this->hasMany(Fine::class);
    }

    public function isOverdue(): bool
    {
        return $this->status === 'active' && $this->due_date->isPast();
    }
}
