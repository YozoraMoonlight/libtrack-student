<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('school_id')
                ->nullable()
                ->after('department')
                ->constrained('schools')
                ->nullOnDelete();
        });

        Schema::table('books', function (Blueprint $table) {
            $table->foreignId('school_id')
                ->nullable()
                ->after('category_id')
                ->constrained('schools')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('books', function (Blueprint $table) {
            $table->dropConstrainedForeignId('school_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('school_id');
        });
    }
};
