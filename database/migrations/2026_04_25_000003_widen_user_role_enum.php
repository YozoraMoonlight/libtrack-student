<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_role_check");
            DB::statement("ALTER TABLE users ADD CONSTRAINT users_user_role_check CHECK (user_role IN ('super_admin', 'admin', 'school_admin', 'librarian', 'user'))");
        }
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_role_check");
            DB::statement("ALTER TABLE users ADD CONSTRAINT users_user_role_check CHECK (user_role IN ('admin', 'librarian', 'user'))");
        }
    }
};
