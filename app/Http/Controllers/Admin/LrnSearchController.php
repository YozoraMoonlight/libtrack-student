<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\LrnRegistryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LrnSearchController extends Controller
{
    public function __construct(protected LrnRegistryService $service) {}

    /**
     * GET /admin/lrn/search?q=...
     * Returns matching LRN registry entries for the manual-registration helper.
     */
    public function search(Request $request)
    {
        $request->validate([
            'q' => 'nullable|string|max:255',
        ]);

        $query = (string) $request->query('q', '');
        $results = $this->service->search($query, 10);

        $authUser = Auth::user();
        if ($authUser && !$authUser->isSuperAdmin() && $authUser->school_id) {
            $results = array_values(array_filter(
                $results,
                fn ($row) => $row['school_id'] === $authUser->school_id,
            ));
        }

        return response()->json(['results' => $results]);
    }

    /**
     * GET /admin/lrn/lookup?lrn=...
     * Returns a single record (used when an exact LRN is typed).
     */
    public function lookup(Request $request)
    {
        $request->validate(['lrn' => 'required|digits:12']);

        $check = $this->service->validateEnrolled($request->lrn);
        if (!$check['ok']) {
            return response()->json(['ok' => false, 'reason' => $check['reason']], 404);
        }

        $record = $check['record'];

        // School-scope the lookup the same way search() does. This response now
        // carries the birthdate, which is half of the student's default password
        // (surname + birth year), so staff must not be able to read it for a
        // student enrolled at another school.
        $authUser = Auth::user();
        if ($authUser && !$authUser->isSuperAdmin() && $record->school_id !== $authUser->school_id) {
            return response()->json([
                'ok' => false,
                'reason' => 'This LRN belongs to another school. Contact the Super Admin to transfer the student.',
            ], 404);
        }
        return response()->json([
            'ok' => true,
            'lrn' => $record->lrn,
            'name' => $record->name,
            'first_name' => $record->first_name,
            'middle_name' => $record->middle_name,
            'last_name' => $record->last_name,
            // Lets the manual-register form pre-fill the birthdate, and with it
            // the default surname + birth year password.
            'birthdate' => $record->birthdate?->toDateString(),
            'school_id' => $record->school_id,
            'school_name' => $record->school?->name,
            'school_code' => $record->school?->code,
            'grade_level' => $record->grade_level,
            'section' => $record->section,
            'enrollment_status' => $record->enrollment_status,
        ]);
    }
}
