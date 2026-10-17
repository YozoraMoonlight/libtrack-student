<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Mirror the users table's name parts on the LRN registry so a roster can
     * carry First / Middle / Last separately — matching the manual-register
     * form. `name` stays as the canonical composed full name (still used for
     * display, search and blank-LRN dedup); the parts are additive and
     * nullable, so existing rows and the legacy single-`name` CSV keep working.
     */
    public function up(): void
    {
        Schema::table('lrn_registry', function (Blueprint $table) {
            $table->string('first_name', 100)->nullable()->after('name');
            $table->string('middle_name', 100)->nullable()->after('first_name');
            $table->string('last_name', 100)->nullable()->after('middle_name');
        });
    }

    public function down(): void
    {
        Schema::table('lrn_registry', function (Blueprint $table) {
            $table->dropColumn(['first_name', 'middle_name', 'last_name']);
        });
    }
};
