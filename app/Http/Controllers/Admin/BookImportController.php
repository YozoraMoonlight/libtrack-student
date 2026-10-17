<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\BatchImportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class BookImportController extends Controller
{
    public function form()
    {
        // Book catalogue (incl. batch import) is librarian-only (panel requirement).
        abort_unless(Auth::user()->isLibrarian(), 403, 'Only librarians can import books.');

        return Inertia::render('Admin/Books/Import');
    }

    public function import(Request $request, BatchImportService $service)
    {
        abort_unless(Auth::user()->isLibrarian(), 403, 'Only librarians can import books.');

        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:5120',
        ]);

        $currentUser = Auth::user();
        $scope = $currentUser->isSuperAdmin() ? null : $currentUser->school_id;

        $result = $service->importBooks($request->file('file'), $scope);

        return back()->with([
            'success' => "Imported {$result['imported']} books. Skipped {$result['skipped']}.",
            'import_result' => $result,
        ]);
    }
}
