<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lrn_registry', function (Blueprint $table) {
            $table->id();
            $table->string('lrn', 12)->unique();
            $table->string('name');
            $table->foreignId('school_id')->constrained('schools')->cascadeOnDelete();
            $table->string('grade_level')->nullable();
            $table->string('section')->nullable();
            $table->enum('enrollment_status', ['enrolled', 'not_enrolled', 'transferred', 'graduated'])->default('enrolled');
            $table->timestamps();

            $table->index('school_id');
            $table->index('enrollment_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lrn_registry');
    }
};
