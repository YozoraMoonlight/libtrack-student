<?php

use App\Support\GradeLevels;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Seed the new sections table from the sections already typed into the
 * registry, so the dropdowns are not empty on the day this ships and no
 * existing student's section becomes unselectable.
 *
 * Rows without a usable grade level are skipped: a section has to hang off a
 * grade, and guessing one would invent data.
 */
return new class extends Migration
{
    public function up(): void
    {
        $rows = DB::table('lrn_registry')
            ->select('school_id', 'grade_level', 'section')
            ->whereNotNull('section')
            ->where('section', '<>', '')
            ->whereNotNull('grade_level')
            ->where('grade_level', '<>', '')
            ->distinct()
            ->get();

        $now = now();
        $insert = [];
        $seen = [];

        foreach ($rows as $row) {
            $grade = GradeLevels::normalize($row->grade_level);
            $name = trim((string) $row->section);
            if ($grade === null || $name === '' || $row->school_id === null) {
                continue;
            }

            // "G7-A" and "g7-a" in the registry are one section, not two.
            $key = $row->school_id . '|' . $grade . '|' . mb_strtolower($name);
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;

            $insert[] = [
                'school_id' => $row->school_id,
                'grade_level' => $grade,
                'name' => $name,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        foreach (array_chunk($insert, 200) as $chunk) {
            DB::table('sections')->insertOrIgnore($chunk);
        }
    }

    public function down(): void
    {
        // Deliberately a no-op. By now the table also holds sections the admin
        // created by hand, and there is no way to tell those from the backfilled
        // ones — dropping the lot to undo a seed would lose real data. Rolling
        // back the create-table migration removes them all anyway.
    }
};
