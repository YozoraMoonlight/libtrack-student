<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Models\School;
use App\Models\User;
use App\Services\AccountCreationOtp;
use App\Services\QrCodeService;
use App\Services\RegistryAccountLink;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    /** Session slot for the account waiting on its SMS code. */
    private const OTP_KEY = 'users';


    public function index(Request $request)
    {
        $auth = Auth::user();
        $isSuperAdmin = $auth->isSuperAdmin();

        $allowedRoles = $isSuperAdmin ? ['admin', 'librarian', 'user'] : ['librarian', 'user'];

        $users = User::query()
            ->with('school:id,name,code')
            ->whereIn('user_role', $allowedRoles)
            ->when(!$isSuperAdmin, fn ($q) => $q->where('school_id', $auth->school_id))
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->whereRaw('lower(name) like ?', ['%' . strtolower($search) . '%'])
                      ->orWhereRaw('lower(email) like ?', ['%' . strtolower($search) . '%'])
                      ->orWhereRaw('lower(student_id) like ?', ['%' . strtolower($search) . '%']);
                });
            })
            ->when($request->role, function ($query, $role) use ($allowedRoles) {
                if (in_array($role, $allowedRoles, true)) {
                    $query->where('user_role', $role);
                }
            })
            ->when($isSuperAdmin && $request->school_id, function ($query, $schoolId) {
                $query->where('school_id', $schoolId);
            })
            ->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
            'schools' => $isSuperAdmin
                ? School::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code'])
                : [],
            'filters' => $request->only(['search', 'role', 'school_id']),
            'allowedRoles' => $allowedRoles,
        ]);
    }

    public function create(AccountCreationOtp $otp)
    {
        $auth = Auth::user();
        $isSuperAdmin = $auth->isSuperAdmin();

        return Inertia::render('Admin/Users/Create', [
            'user' => $auth,
            // Set once the form has been submitted and the code is in flight.
            'otpPending' => $otp->props(self::OTP_KEY),
            'schools' => $isSuperAdmin
                ? School::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code'])
                : School::where('id', $auth->school_id)->get(['id', 'name', 'code']),
            'allowedRoles' => $isSuperAdmin ? ['admin', 'librarian', 'user'] : ['librarian'],
            'lockedSchoolId' => $isSuperAdmin ? null : $auth->school_id,
        ]);
    }

    public function store(StoreUserRequest $request, AccountCreationOtp $otp)
    {
        $auth = Auth::user();
        $data = $request->validated();

        if (!$auth->isSuperAdmin()) {
            // School admins can only create librarians for their own school
            if ($data['user_role'] !== 'librarian') {
                return back()->withErrors(['user_role' => 'School admins can only register librarians.'])->withInput();
            }
            $data['school_id'] = $auth->school_id;
        }

        $data['password'] = Hash::make($data['password']);
        $data['name'] = $this->composeName($data);

        if ($data['user_role'] === 'admin') {
            $data['school_id'] = null;
        }

        if (in_array($data['user_role'], ['admin', 'librarian'])) {
            $data['department'] = null;
        }

        // Nothing is written until the number on the form answers with the code.
        if ($otp->enabled()) {
            $flash = $otp->start(self::OTP_KEY, $data['phone'], $data, $this->accountSummary($data));

            return redirect()->route('admin.users.create')->with($flash);
        }

        return $this->createFromPayload($data);
    }

    /** Code came back correct — write the account that was parked at submit time. */
    public function verifyOtp(Request $request, AccountCreationOtp $otp)
    {
        $request->validate(['code' => 'required|digits:6'], ['code.digits' => 'Enter the 6-digit code.']);

        $result = $otp->confirm(self::OTP_KEY, $request->code);

        if (!$result['ok']) {
            return back()->withErrors(['code' => $result['error']]);
        }

        $data = $result['payload'];

        // The email was free when the form was submitted; somebody else may have
        // taken it while the code was in the air.
        if (User::where('email', $data['email'])->exists()) {
            return redirect()->route('admin.users.create')
                ->withErrors(['email' => 'That email address was taken while the code was being verified. Please fill in the form again.']);
        }

        return $this->createFromPayload($data);
    }

    public function resendOtp(AccountCreationOtp $otp)
    {
        $flash = $otp->resend(self::OTP_KEY);

        return redirect()->route('admin.users.create')
            ->with($flash ?? ['error' => 'That request expired. Fill in the form again.']);
    }

    public function cancelOtp(AccountCreationOtp $otp)
    {
        $otp->forget(self::OTP_KEY);

        return redirect()->route('admin.users.create');
    }

    /** @param array<string, mixed> $data Already validated, with the password hashed. */
    private function createFromPayload(array $data)
    {
        User::create($data);

        return redirect()->route('admin.users.index')
            ->with('success', $data['user_role'] === 'librarian' ? 'Librarian registered successfully.' : 'User created successfully.');
    }

    /** "Yrica Secuya (Librarian)" — shown on the confirmation card. */
    private function accountSummary(array $data): string
    {
        $labels = ['admin' => 'Admin', 'librarian' => 'Librarian', 'user' => 'Student'];

        return $data['name'] . ' (' . ($labels[$data['user_role']] ?? $data['user_role']) . ')';
    }

    public function show(User $user)
    {
        $this->authorizeSchoolScope($user);

        $user->load([
            'transactions.book',
            'fines',
        ]);

        $qrService = new QrCodeService();
        $qrCode = $qrService->generateBase64("LIBTRACK:USER:{$user->qr_code}");

        return Inertia::render('Admin/Users/Show', [
            'user' => $user,
            'qrCode' => $qrCode,
        ]);
    }

    public function edit(User $user)
    {
        $this->authorizeSchoolScope($user);

        $auth = Auth::user();
        $isSuperAdmin = $auth->isSuperAdmin();

        return Inertia::render('Admin/Users/Edit', [
            'user' => $user,
            'schools' => $isSuperAdmin
                ? School::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code'])
                : School::where('id', $auth->school_id)->get(['id', 'name', 'code']),
            // Must match what the index lets them open: a school admin manages
            // their librarians and their students, so both roles belong here.
            'allowedRoles' => $isSuperAdmin ? ['admin', 'librarian', 'user'] : ['librarian', 'user'],
            'lockedSchoolId' => $isSuperAdmin ? null : $auth->school_id,
        ]);
    }

    public function update(UpdateUserRequest $request, User $user, RegistryAccountLink $links)
    {
        $this->authorizeSchoolScope($user);

        $auth = Auth::user();
        $data = $request->validated();

        if (!$auth->isSuperAdmin()) {
            if (!in_array($data['user_role'], ['librarian', 'user'], true)) {
                return back()->withErrors(['user_role' => 'School admins can only manage librarians and students.'])->withInput();
            }
            $data['school_id'] = $auth->school_id;
        }

        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $data['name'] = $this->composeName($data);

        if ($data['user_role'] === 'admin') {
            $data['school_id'] = null;
        }

        if (in_array($data['user_role'], ['admin', 'librarian'])) {
            $data['department'] = null;
        }

        // The LRN belongs to students only. A form that doesn't send the field
        // leaves the LRN alone rather than wiping it.
        if ($data['user_role'] !== 'user') {
            $data['lrn'] = null;
        } elseif (!$request->has('lrn')) {
            unset($data['lrn']);
        }

        // The LRN travels with the student's row on the Students page, so the
        // row and the account change together or not at all.
        DB::transaction(function () use ($user, $data, $links) {
            if ($data['user_role'] !== 'user') {
                $links->detach($user);
            } elseif (array_key_exists('lrn', $data)) {
                $schoolId = isset($data['school_id']) ? (int) $data['school_id'] : null;
                $error = $links->applyLrnChange($user, $data['lrn'], $schoolId);

                if ($error !== null) {
                    throw ValidationException::withMessages(['lrn' => $error]);
                }
            }

            $user->update($data);
        });

        return redirect()->route('admin.users.index')
            ->with('success', 'User updated successfully.');
    }

    public function destroy(User $user)
    {
        $this->authorizeSchoolScope($user);
        $user->delete();

        return redirect()->route('admin.users.index')
            ->with('success', 'User deleted successfully.');
    }

    public function toggleActive(User $user)
    {
        $this->authorizeSchoolScope($user);
        $user->update(['is_active' => !$user->is_active]);

        return redirect()->back()
            ->with('success', 'User status updated.');
    }

    /**
     * Compose the legacy `name` field from the first/middle/last parts so
     * the rest of the app (which still reads `user.name`) keeps working.
     */
    protected function composeName(array $data): string
    {
        $first = trim($data['first_name'] ?? '');
        $middle = trim($data['middle_name'] ?? '');
        $last = trim($data['last_name'] ?? '');
        return trim($first . ' ' . ($middle !== '' ? $middle . ' ' : '') . $last);
    }

    protected function authorizeSchoolScope(User $target): void
    {
        $auth = Auth::user();
        if ($auth->isSuperAdmin()) {
            return;
        }
        if ($target->user_role === 'super_admin' || in_array($target->user_role, ['admin'])) {
            abort(403, 'You cannot manage this account.');
        }
        if ($target->school_id !== $auth->school_id) {
            abort(403, 'This account belongs to another school.');
        }
    }
}
