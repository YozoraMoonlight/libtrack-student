<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Birthdate is what admin-created student accounts derive their password from
 * (Lastname + birth year, e.g. "Montenegro2005"), so it has to live on both
 * the roster row and the account.
 *
 * Nullable: students imported before this change, and every staff account,
 * legitimately have no birthdate on file.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->date('birthdate')->nullable()->after('last_name');
        });

        Schema::table('lrn_registry', function (Blueprint $table) {
            $table->date('birthdate')->nullable()->after('last_name');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('birthdate');
        });

        Schema::table('lrn_registry', function (Blueprint $table) {
            $table->dropColumn('birthdate');
        });
    }
};
