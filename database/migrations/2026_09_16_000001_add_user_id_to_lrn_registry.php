<?php

use App\Services\RegistryAccountLink;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Link each Students-page roster row to its student account.
 *
 * The roster found an account through the LRN alone, so a student registered
 * without an LRN showed "Not registered" forever — even with a working login.
 * Nullable (roster rows exist before anyone signs up), unique (one row per
 * account), and nulled when the account is deleted so the row reads
 * unregistered again instead of pointing at nothing.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lrn_registry', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->unique()->after('lrn')->constrained('users')->nullOnDelete();
        });

        // Link what already exists, including the LRN-less students this is for.
        app(RegistryAccountLink::class)->backfill();
    }

    public function down(): void
    {
        Schema::table('lrn_registry', function (Blueprint $table) {
            $table->dropUnique(['user_id']);
            $table->dropConstrainedForeignId('user_id');
        });
    }
};
