<?php

namespace Database\Seeders;

use App\Models\School;
use Illuminate\Database\Seeder;

class SchoolSeeder extends Seeder
{
    public function run(): void
    {
        School::updateOrCreate(
            ['code' => 'LNHS'],
            [
                'name' => 'Lumbia National High School',
                'address' => 'Lumbia, Cagayan de Oro City',
                'phone' => '+63 88 000 0001',
                'email' => 'info@lnhs.edu.ph',
                'is_active' => true,
            ],
        );

        School::updateOrCreate(
            ['code' => 'XUHS'],
            [
                'name' => 'Xavier University Senior High School',
                'address' => 'Corrales Avenue, Cagayan de Oro City',
                'phone' => '+63 88 000 0002',
                'email' => 'info@xushs.edu.ph',
                'is_active' => true,
            ],
        );

        // --- Cotabato City schools that power the Add/Edit School address autofill ---
        // These replace the old hardcoded SCHOOL_ADDRESS_MAP. They are real,
        // editable, deletable rows: the autofill reads addresses live from the
        // schools table, so deleting one here also removes it from the autofill
        // (the exact behaviour the panel asked for). The addresses are preserved
        // verbatim from the previous hardcoded list; the names are derived from
        // its match tokens — rename them here or in the UI to match the panel's
        // official list without affecting how the autofill works.
        $cotabatoSchools = [
            ['code' => 'CCNHS-MAIN', 'name' => 'Cotabato City National High School - Main Campus', 'address' => 'Sinsuat Avenue, Cotabato City'],
            ['code' => 'CCNHS-ROJAS', 'name' => 'Cotabato City National High School - Rojas', 'address' => 'Sousa Street, Barangay Rosary Heights 13, Cotabato City'],
            ['code' => 'CCNHS-PCHILL', 'name' => 'Cotabato City National High School - PC Hill', 'address' => 'San Vicente Street, PC Hill, Cotabato City'],
            ['code' => 'CCNHS-AYUNAN', 'name' => 'Cotabato City National High School - Datu Ayunan', 'address' => 'Barangay Kalanganan Mother, Cotabato City'],
            ['code' => 'CCNHS-CANIZARES', 'name' => 'Cotabato City National High School - Cañizares', 'address' => 'Datu Udtog Matalam St., Barangay Rosary Heights 10, Cotabato City'],
            ['code' => 'CCNHS-NDV', 'name' => 'Cotabato City National High School - Notre Dame Village', 'address' => 'Notre Dame Village, Barangay Rosary Heights 8, Cotabato City'],
            ['code' => 'CCPPSHS', 'name' => 'Cotabato City Pilot Provincial Science High School', 'address' => 'Barangay Rosary Heights 4, Cotabato City'],
        ];

        foreach ($cotabatoSchools as $school) {
            School::updateOrCreate(
                ['code' => $school['code']],
                [
                    'name' => $school['name'],
                    'address' => $school['address'],
                    'is_active' => true,
                ],
            );
        }
    }
}
