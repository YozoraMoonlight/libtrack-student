<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('lrn', 12)->nullable()->unique()->after('student_id');
            $table->enum('enrollment_status', ['enrolled', 'not_enrolled', 'transferred', 'graduated'])
                ->default('enrolled')
                ->after('lrn');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['lrn', 'enrollment_status']);
        });
    }
};
