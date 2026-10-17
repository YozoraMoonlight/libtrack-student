<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One row per PHYSICAL copy of a book.
 *
 * Before this table a title held a single `qr_code`, so every physical copy of
 * "English 7" carried the same code — a student could hand back somebody else's
 * copy and the scan would match their own loan. Each copy now owns a unique
 * qr_code + accession number, and circulation binds a loan to one copy.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('book_copies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('book_id')->constrained()->cascadeOnDelete();

            // 1..N within the title. Human-facing ("Copy 2 of 3").
            $table->unsignedInteger('copy_number');

            // Library accession number printed on the label, e.g. ACC-00012-002.
            $table->string('accession_number')->nullable()->unique();

            // The scan target. Unique across every copy in the system.
            $table->string('qr_code')->unique();

            // Kept as a plain string rather than an enum: production is Postgres
            // (enums become CHECK constraints that later migrations can't widen)
            // while tests run on SQLite (which can't ALTER a CHECK at all).
            // Allowed values live in App\Models\BookCopy::STATUSES.
            $table->string('status')->default('available')->index();
            $table->string('condition')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['book_id', 'copy_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('book_copies');
    }
};
