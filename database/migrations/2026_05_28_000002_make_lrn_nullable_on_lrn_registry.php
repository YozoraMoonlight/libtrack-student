<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE lrn_registry ALTER COLUMN lrn DROP NOT NULL');
        } elseif ($driver === 'sqlite') {
            // SQLite can't drop NOT NULL with a simple ALTER. Recreate the table.
            Schema::table('lrn_registry', function ($table) {
                $table->string('lrn', 12)->nullable()->change();
            });
        } else {
            Schema::table('lrn_registry', function ($table) {
                $table->string('lrn', 12)->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('UPDATE lrn_registry SET lrn = id::text WHERE lrn IS NULL');
            DB::statement('ALTER TABLE lrn_registry ALTER COLUMN lrn SET NOT NULL');
        } else {
            Schema::table('lrn_registry', function ($table) {
                $table->string('lrn', 12)->nullable(false)->change();
            });
        }
    }
};
