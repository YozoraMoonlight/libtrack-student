<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A student can ask to return a book from their own page.
 *
 * The request does NOT close the loan — the book is still in the student's
 * hands until a librarian receives it — so it is recorded beside the loan
 * rather than as a new `status` value (that column is an enum, and every
 * dashboard, report and fine job already reads active/overdue/returned).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->timestamp('return_requested_at')->nullable()->after('returned_at');
            // 'qr' when the student scanned the book's label, 'manual' when they picked it from the list.
            $table->string('return_request_method', 10)->nullable()->after('return_requested_at');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn(['return_requested_at', 'return_request_method']);
        });
    }
};
