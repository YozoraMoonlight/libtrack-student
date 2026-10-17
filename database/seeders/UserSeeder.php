<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\School;
use App\Models\User;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $lnhs = School::where('code', 'LNHS')->first();
        $xuhs = School::where('code', 'XUHS')->first();

        User::create([
            'name' => 'Super Admin',
            'email' => 'superadmin@gmail.com',
            'password' => bcrypt('password'),
            'user_role' => 'super_admin',
            'is_active' => true,
        ]);

        User::create([
            'name' => 'Admin User',
            'email' => 'admin@gmail.com',
            'password' => bcrypt('password'),
            'user_role' => 'school_admin',
            'school_id' => $lnhs?->id,
            'is_active' => true,
        ]);

        User::create([
            'name' => 'Maria Santos',
            'email' => 'librarian@gmail.com',
            'password' => bcrypt('password'),
            'user_role' => 'librarian',
            'school_id' => $lnhs?->id,
            'is_active' => true,
        ]);

        User::create([
            'name' => 'Juan Dela Cruz',
            'email' => 'student@gmail.com',
            'password' => bcrypt('password'),
            'user_role' => 'user',
            'student_id' => 'STU-2024-0001',
            'department' => 'Computer Science',
            'phone' => '09171234567',
            'school_id' => $lnhs?->id,
            'is_active' => true,
        ]);

        User::create([
            'name' => 'Ana Reyes',
            'email' => 'student2@gmail.com',
            'password' => bcrypt('password'),
            'user_role' => 'user',
            'student_id' => 'STU-2024-0002',
            'department' => 'Engineering',
            'phone' => '09181234567',
            'school_id' => $lnhs?->id,
            'is_active' => true,
        ]);

        User::create([
            'name' => 'Carlos Garcia',
            'email' => 'student3@gmail.com',
            'password' => bcrypt('password'),
            'user_role' => 'user',
            'student_id' => 'STU-2024-0003',
            'department' => 'Education',
            'phone' => '09191234567',
            'school_id' => $xuhs?->id,
            'is_active' => true,
        ]);
    }
}
