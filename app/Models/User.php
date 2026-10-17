<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'first_name',
        'middle_name',
        'last_name',
        'birthdate',
        'email',
        'password',
        'user_role',
        'student_id',
        'lrn',
        'enrollment_status',
        'phone',
        'department',
        'school_id',
        'is_active',
        'qr_code',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'birthdate' => 'date',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($user) {
            if (empty($user->qr_code)) {
                $user->qr_code = (string) Str::uuid();
            }
        });

        // An account made for a roster LRN — self-registration, batch upload,
        // manual register — is linked to that row the moment it exists, so the
        // Students page shows it as registered straight away.
        static::created(function (User $user) {
            if ($user->user_role === 'user' && filled($user->lrn)) {
                LrnRegistry::where('lrn', $user->lrn)->whereNull('user_id')->update(['user_id' => $user->id]);
            }
        });
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    public function fines(): HasMany
    {
        return $this->hasMany(Fine::class);
    }

    public function notificationLogs(): HasMany
    {
        return $this->hasMany(NotificationLog::class);
    }

    public function credentialHolds(): HasMany
    {
        return $this->hasMany(CredentialHold::class);
    }

    public function isSuperAdmin(): bool
    {
        return $this->user_role === 'super_admin';
    }

    public function isAdmin(): bool
    {
        return in_array($this->user_role, ['admin', 'school_admin']);
    }

    public function isSchoolAdmin(): bool
    {
        return in_array($this->user_role, ['admin', 'school_admin']);
    }

    public function isLibrarian(): bool
    {
        return $this->user_role === 'librarian';
    }

    public function isStaff(): bool
    {
        return in_array($this->user_role, ['super_admin', 'admin', 'school_admin', 'librarian']);
    }

    public function hasUnpaidFines(): bool
    {
        return $this->fines()->where('status', 'unpaid')->exists();
    }

    public function hasActiveCredentialHold(): bool
    {
        return $this->credentialHolds()->where('status', 'active')->exists();
    }

    public function activeBorrowCount(): int
    {
        return $this->transactions()->where('status', 'active')->count();
    }

    public function isEnrolled(): bool
    {
        return ($this->enrollment_status ?? 'enrolled') === 'enrolled';
    }
}
