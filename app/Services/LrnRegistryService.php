<?php

namespace App\Services;

use App\Models\LrnRegistry;

class LrnRegistryService
{
    /**
     * Look up an LRN in the registry. Returns null if not found.
     */
    public function lookup(string $lrn): ?LrnRegistry
    {
        $lrn = trim($lrn);
        if (!preg_match('/^\d{12}$/', $lrn)) {
            return null;
        }

        return LrnRegistry::with('school:id,name,code')
            ->where('lrn', $lrn)
            ->first();
    }

    /**
     * Search registry rows whose LRN starts with the given prefix.
     * Used for the admin manual-registration LRN search button.
     *
     * @return array<int, array<string, mixed>>
     */
    public function search(string $query, int $limit = 10): array
    {
        $query = trim($query);
        if ($query === '') {
            return [];
        }

        return LrnRegistry::with('school:id,name,code')
            ->where('lrn', 'like', $query . '%')
            ->orWhereRaw('lower(name) like ?', ['%' . strtolower($query) . '%'])
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'id' => $row->id,
                'lrn' => $row->lrn,
                'name' => $row->name,
                'first_name' => $row->first_name,
                'middle_name' => $row->middle_name,
                'last_name' => $row->last_name,
                'birthdate' => $row->birthdate?->toDateString(),
                'school_id' => $row->school_id,
                'school_name' => $row->school?->name,
                'school_code' => $row->school?->code,
                'grade_level' => $row->grade_level,
                'section' => $row->section,
                'enrollment_status' => $row->enrollment_status,
            ])
            ->all();
    }

    /**
     * Validate that an LRN exists and is currently enrolled.
     * Returns ['ok' => bool, 'reason' => ?string, 'record' => ?LrnRegistry]
     */
    public function validateEnrolled(string $lrn): array
    {
        $record = $this->lookup($lrn);

        if (!$record) {
            return [
                'ok' => false,
                'reason' => 'LRN not found in DepEd registry. Please contact your school administrator.',
                'record' => null,
            ];
        }

        if (!$record->isEnrolled()) {
            return [
                'ok' => false,
                'reason' => 'This LRN is marked as ' . $record->enrollment_status . '. Only currently-enrolled students can register.',
                'record' => $record,
            ];
        }

        return ['ok' => true, 'reason' => null, 'record' => $record];
    }
}
