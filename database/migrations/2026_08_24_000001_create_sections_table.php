<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sections a school actually offers (G7-A, G7-B, Mabini, …).
 *
 * Before this table a section was free text typed into the manual-register
 * form and the CSV, so the same class could arrive as "G7-A", "g7 a" and
 * "Grade 7 A". Sections are now school-owned records that the admin
 * maintains, and every place that used to accept free text picks from them.
 *
 * A section is scoped to one grade level: "Mabini" under Grade 7 and "Mabini"
 * under Grade 8 are two different classes, which is why the uniqueness key
 * includes grade_level.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained('schools')->cascadeOnDelete();
            $table->string('grade_level', 20);
            // Deliberately the same width as lrn_registry.section so the
            // backfill below can never truncate a section that already exists.
            $table->string('name');
            $table->timestamps();

            $table->unique(['school_id', 'grade_level', 'name']);
            $table->index('school_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sections');
    }
};
