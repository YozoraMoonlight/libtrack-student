<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreSchoolRequest;
use App\Http\Requests\Admin\UpdateSchoolRequest;
use App\Models\LrnRegistry;
use App\Models\School;
use App\Models\User;
use App\Services\RegistryAccountLink;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class SchoolController extends Controller
{
    protected function denyForSchoolAdmin(): void
    {
        $u = Auth::user();
        if ($u && $u->user_role === 'school_admin') {
            abort(403, 'Schools management is not available for school admins.');
        }
    }

    public function index(Request $request)
    {
        $this->denyForSchoolAdmin();
        $schools = School::query()
            ->search($request->search)
            ->when($request->status, function ($query, $status) {
                $query->where('is_active', $status === 'active');
            })
            ->withCount([
                'librarians',
                'lrnRegistryEntries as students_count',
                'books',
            ])
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Admin/Schools/Index', [
            'schools' => $schools,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    /**
     * Address type-ahead options sourced live from the schools table, so a
     * deleted school can no longer auto-fill an address or be suggested.
     *
     * @return array<int, array{name: string, address: string}>
     */
    protected function addressOptions(): array
    {
        return School::query()
            ->whereNotNull('address')
            ->where('address', '!=', '')
            ->orderBy('name')
            ->get(['name', 'address'])
            ->map(fn (School $school) => [
                'name' => $school->name,
                'address' => $school->address,
            ])
            ->all();
    }

    public function create()
    {
        $this->denyForSchoolAdmin();
        return Inertia::render('Admin/Schools/Create', [
            'addressOptions' => $this->addressOptions(),
        ]);
    }

    public function show(Request $request, School $school, RegistryAccountLink $links)
    {
        $this->denyForSchoolAdmin();

        $school->loadCount([
            'librarians',
            'lrnRegistryEntries as students_count',
            'books',
        ]);

        $entries = LrnRegistry::query()
            ->where('school_id', $school->id)
            ->when($request->search, function ($q, $s) {
                $q->where(function ($qq) use ($s) {
                    $qq->whereRaw('lower(name) like ?', ['%' . strtolower($s) . '%'])
                       ->orWhere('lrn', 'like', '%' . $s . '%');
                });
            })
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        // Through the row→account link, not the LRN alone (see RegistryAccountLink).
        $accounts = $links->accountsFor($entries->getCollection());

        $entries->getCollection()->transform(function ($entry) use ($accounts) {
            $user = $accounts->get($entry->id);
            return [
                'id' => $entry->id,
                'lrn' => $entry->lrn,
                'name' => $entry->name,
                'grade_level' => $entry->grade_level,
                'section' => $entry->section,
                'enrollment_status' => $entry->enrollment_status,
                'is_registered' => (bool) $user,
                'user' => $user ? [
                    'id' => $user->id,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'is_active' => $user->is_active,
                ] : null,
            ];
        });

        return Inertia::render('Admin/Schools/Show', [
            'school' => $school,
            'students' => $entries,
            'filters' => $request->only(['search']),
        ]);
    }

    public function store(StoreSchoolRequest $request)
    {
        $this->denyForSchoolAdmin();
        School::create($request->validated());

        return redirect()->route('admin.schools.index')
            ->with('success', 'School created successfully.');
    }

    public function edit(School $school)
    {
        $this->denyForSchoolAdmin();
        return Inertia::render('Admin/Schools/Edit', [
            'school' => $school,
            'addressOptions' => $this->addressOptions(),
        ]);
    }

    public function update(UpdateSchoolRequest $request, School $school)
    {
        $this->denyForSchoolAdmin();
        $school->update($request->validated());

        return redirect()->route('admin.schools.index')
            ->with('success', 'School updated successfully.');
    }

    public function destroy(School $school)
    {
        $this->denyForSchoolAdmin();

        try {
            DB::transaction(function () use ($school) {
                // Unassign scoped records first so the delete can never trip a
                // foreign-key constraint: librarians/students/books are kept but
                // detached, while LRN registry rows cascade away with the school.
                $school->users()->update(['school_id' => null]);
                $school->books()->update(['school_id' => null]);
                $school->lrnRegistryEntries()->delete();

                // Deleting the row removes the school's address, phone and email too.
                $school->delete();
            });
        } catch (\Throwable $e) {
            Log::error('School deletion failed', ['school_id' => $school->id, 'error' => $e->getMessage()]);

            return redirect()->route('admin.schools.index')
                ->with('error', 'Could not delete this school. Please try again or contact support.');
        }

        return redirect()->route('admin.schools.index')
            ->with('success', 'School and its address were deleted successfully.');
    }

    public function toggleActive(School $school)
    {
        $this->denyForSchoolAdmin();
        $school->update(['is_active' => !$school->is_active]);

        $action = $school->is_active ? 'enabled' : 'disabled';

        return redirect()->back()->with('success', "School {$action} successfully.");
    }
}
