<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // On Postgres, the original enum installed a CHECK constraint we need to widen.
        // On SQLite/MySQL the base migration now uses a plain string column, so this is a no-op.
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_role_check");
            DB::statement("ALTER TABLE users ALTER COLUMN user_role TYPE VARCHAR(255)");
            DB::statement("ALTER TABLE users ADD CONSTRAINT users_user_role_check CHECK (user_role IN ('admin', 'librarian', 'user'))");
        }

        Schema::table('users', function (Blueprint $table) {
            $table->string('student_id')->nullable()->after('user_role');
            $table->string('phone')->nullable()->after('student_id');
            $table->string('department')->nullable()->after('phone');
            $table->boolean('is_active')->default(true)->after('department');
            $table->string('qr_code')->nullable()->unique()->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['student_id', 'phone', 'department', 'is_active', 'qr_code']);
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_role_check");
            DB::statement("ALTER TABLE users ADD CONSTRAINT users_user_role_check CHECK (user_role IN ('admin', 'user'))");
        }
    }
};
