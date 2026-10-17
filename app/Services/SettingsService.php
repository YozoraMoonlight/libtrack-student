<?php

namespace App\Services;

use App\Models\Setting;

class SettingsService
{
    public function get(string $key, $default = null)
    {
        return Setting::getValue($key, $default);
    }

    public function borrowDurationDays(): int
    {
        return (int) $this->get('borrow_duration_days', 14);
    }

    public function maxBorrowPerUser(): int
    {
        return (int) $this->get('max_borrow_per_user', 3);
    }

    public function finePerDay(): float
    {
        return (float) $this->get('fine_per_day', 5.00);
    }

    public function reservationExpiryHours(): int
    {
        return (int) $this->get('reservation_expiry_hours', 48);
    }
}
