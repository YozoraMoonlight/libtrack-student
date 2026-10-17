<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Setting;

class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            ['key' => 'borrow_duration_days', 'value' => '14'],
            ['key' => 'max_borrow_per_user', 'value' => '3'],
            ['key' => 'fine_per_day', 'value' => '5.00'],
            ['key' => 'reservation_expiry_hours', 'value' => '48'],
        ];

        foreach ($settings as $setting) {
            Setting::create($setting);
        }
    }
}
