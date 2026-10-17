<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bind each loan to the exact physical copy that left the shelf.
 *
 * `book_id` is deliberately kept alongside it: ~30 read sites (dashboards,
 * reports, SMS reminders, school scoping) join through it, and a denormalised
 * title reference keeps those queries flat. `book_copy_id` is the authority
 * for "which physical book is out", `book_id` is the convenience join.
 *
 * Nullable because pre-existing rows are backfilled heuristically by the next
 * migration, and because a copy that is later deleted must not delete history.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('book_copy_id')
                ->nullable()
                ->after('book_id')
                ->constrained('book_copies')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('book_copy_id');
        });
    }
};
