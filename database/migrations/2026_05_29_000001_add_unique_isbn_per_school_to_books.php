<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        // Partial unique index: an ISBN may repeat across schools (different
        // physical collections) but must be unique within one school. NULL/blank
        // ISBNs are excluded so books awaiting cataloguing are never blocked.
        // Note: when school_id IS NULL (super-admin-owned books) the composite
        // index does not enforce uniqueness — those rows are guarded only at the
        // application layer (FormRequest Rule::unique + BatchImportService).
        if ($driver === 'pgsql' || $driver === 'sqlite') {
            DB::statement('CREATE UNIQUE INDEX books_school_id_isbn_unique ON books (school_id, isbn) WHERE isbn IS NOT NULL');
        } else {
            // Engines without partial-index support (not used by this app).
            DB::statement('CREATE UNIQUE INDEX books_school_id_isbn_unique ON books (school_id, isbn)');
        }
    }

    public function down(): void
    {
        // Raw DROP — Laravel's dropUnique cannot represent a partial index.
        // The bare index name works on both pgsql and sqlite.
        DB::statement('DROP INDEX IF EXISTS books_school_id_isbn_unique');
    }
};
