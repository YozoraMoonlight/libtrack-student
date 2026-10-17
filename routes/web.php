<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\AdminLoginController;
use App\Http\Controllers\Auth\LibrarianLoginController;
use App\Http\Controllers\Auth\SuperAdminLoginController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Librarian\DashboardController as LibrarianDashboardController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\Admin\BookController;
use App\Http\Controllers\Admin\BookCopyController;
use App\Http\Controllers\Admin\BookImportController;
use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\CredentialHoldController;
use App\Http\Controllers\Admin\LrnSearchController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\SchoolController;
use App\Http\Controllers\Admin\SectionController;
use App\Http\Controllers\Admin\StudentController;
use App\Http\Controllers\Admin\CirculationController;
use App\Http\Controllers\Admin\FineController as AdminFineController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\InventoryController;
use App\Http\Controllers\SuperAdmin\DashboardController as SuperAdminDashboardController;
use App\Http\Controllers\SuperAdmin\SchoolAdminController;
use App\Http\Controllers\User\UserDashboardController;
use App\Http\Controllers\User\UserSettingsController;
use App\Http\Controllers\User\BookSearchController;
use App\Http\Controllers\User\BorrowingController;
use App\Http\Controllers\User\FineController as UserFineController;
use App\Http\Controllers\Api\QrLookupController;
use App\Http\Middleware\GuestMiddleware;
use App\Http\Middleware\AdminMiddleware;
use App\Http\Middleware\UserMiddleware;
use App\Http\Middleware\StaffMiddleware;
use App\Http\Middleware\SuperAdminMiddleware;
use App\Http\Middleware\RedirectLibrarianPrefix;
use App\Http\Controllers\Auth\MobileLoginController;
use App\Http\Controllers\Auth\MobileRegisterController;

Route::get('/mobile/login', [MobileLoginController::class, 'index'])->name('mobile.login');
Route::post('/mobile/login', [MobileLoginController::class, 'store'])->name('mobile.login.store');

// Mobile Registration Routes
Route::get('/mobile/register', [MobileRegisterController::class, 'index'])
    ->name('mobile.register');

Route::post('/mobile/register/lookup-lrn', [MobileRegisterController::class, 'lookupLrn'])
    ->name('mobile.register.lookup-lrn');

Route::post('/mobile/register/initiate', [MobileRegisterController::class, 'initiate'])
    ->name('mobile.register.initiate');

Route::post('/mobile/register/resend', [MobileRegisterController::class, 'resend'])
    ->name('mobile.register.resend');

Route::post('/mobile/register/verify', [MobileRegisterController::class, 'verify'])
    ->name('mobile.register.verify');

Route::post('/mobile/register/cancel', [MobileRegisterController::class, 'cancel'])
    ->name('mobile.register.cancel');

// Public routes
Route::get('/', [HomeController::class, 'index'])->name('home');

// Guest routes (authentication) — one login URL per role
Route::middleware(GuestMiddleware::class)->group(function () {
  Route::get('student/login', [LoginController::class, 'index'])->name('auth.login');
  Route::get('login', fn() => redirect()->route('auth.login'));
  Route::get('admin/login', [AdminLoginController::class, 'index'])->name('admin.auth.login');
  Route::get('librarian/login', fn() => redirect()->route('auth.login'))->name('librarian.auth.login');
  Route::get('superadmin/login', fn() => redirect()->route('admin.auth.login'))->name('superadmin.auth.login');
  Route::get('register', [RegisterController::class, 'index'])->name('auth.register');
});

Route::post('student/login', [LoginController::class, 'store'])->name('auth.login.store');
Route::post('admin/login', [AdminLoginController::class, 'store'])->name('admin.auth.login.store');
Route::post('librarian/login', [LoginController::class, 'store'])->name('librarian.auth.login.store');
Route::post('superadmin/login', [AdminLoginController::class, 'store'])->name('superadmin.auth.login.store');
Route::post('register/lookup-lrn', [RegisterController::class, 'lookupLrn'])->name('auth.register.lookup-lrn');
Route::post('register/initiate', [RegisterController::class, 'initiate'])->name('auth.register.initiate');
Route::post('register/resend', [RegisterController::class, 'resend'])->name('auth.register.resend');
Route::post('register/verify', [RegisterController::class, 'verify'])->name('auth.register.verify');
Route::post('register/cancel', [RegisterController::class, 'cancel'])->name('auth.register.cancel');
Route::get('logout', [LoginController::class, 'destroy'])->name('auth.logout');

// Shared staff routes closure (dashboard is registered per-role outside the closure)
// $includeBatchImport: student LRN batch upload is admin/super_admin only — librarians don't manage students.
// $includeBookImport: book batch upload is librarian-only — only librarians manage the catalogue (panel requirement).
$registerStaffRoutes = function (string $prefix, bool $includeBatchImport = true, bool $includeBookImport = false, bool $includeSections = true) {
  Route::get('books', [BookController::class, 'index'])->name("{$prefix}.books.index");
  Route::get('books/create', [BookController::class, 'create'])->name("{$prefix}.books.create");
  Route::post('books', [BookController::class, 'store'])->name("{$prefix}.books.store");
  if ($includeBookImport) {
    Route::get('books/import', [BookImportController::class, 'form'])->name("{$prefix}.books.import");
    Route::post('books/import', [BookImportController::class, 'import'])->name("{$prefix}.books.import.store");
  }
  Route::get('books/{book}', [BookController::class, 'show'])->name("{$prefix}.books.show");
  Route::get('books/{book}/edit', [BookController::class, 'edit'])->name("{$prefix}.books.edit");
  Route::put('books/{book}', [BookController::class, 'update'])->name("{$prefix}.books.update");
  Route::delete('books/{book}', [BookController::class, 'destroy'])->name("{$prefix}.books.destroy");
  Route::get('books/{book}/qr-code', [BookController::class, 'qrCode'])->name("{$prefix}.books.qr-code");

  // Physical copies: each has its own QR label, which is what makes a return
  // verifiable against the exact copy that was borrowed.
  Route::get('books/{book}/copies', [BookCopyController::class, 'index'])->name("{$prefix}.books.copies.index");
  Route::post('books/{book}/copies', [BookCopyController::class, 'store'])->name("{$prefix}.books.copies.store");
  Route::put('books/{book}/copies/{copy}', [BookCopyController::class, 'update'])->name("{$prefix}.books.copies.update");
  Route::delete('books/{book}/copies/{copy}', [BookCopyController::class, 'destroy'])->name("{$prefix}.books.copies.destroy");
  Route::get('books/{book}/copies/{copy}/qr-code', [BookCopyController::class, 'qrCode'])->name("{$prefix}.books.copies.qr-code");

  Route::get('categories', [CategoryController::class, 'index'])->name("{$prefix}.categories.index");
  Route::get('categories/create', [CategoryController::class, 'create'])->name("{$prefix}.categories.create");
  Route::post('categories', [CategoryController::class, 'store'])->name("{$prefix}.categories.store");
  Route::get('categories/{category}', [CategoryController::class, 'show'])->name("{$prefix}.categories.show");
  Route::get('categories/{category}/edit', [CategoryController::class, 'edit'])->name("{$prefix}.categories.edit");
  Route::put('categories/{category}', [CategoryController::class, 'update'])->name("{$prefix}.categories.update");
  Route::delete('categories/{category}', [CategoryController::class, 'destroy'])->name("{$prefix}.categories.destroy");

  Route::get('circulation', [CirculationController::class, 'index'])->name("{$prefix}.circulation.index");
  Route::get('circulation/borrow', [CirculationController::class, 'borrow'])->name("{$prefix}.circulation.borrow");
  Route::post('circulation/borrow', [CirculationController::class, 'processBorrow'])->name("{$prefix}.circulation.process-borrow");
  Route::get('circulation/return', [CirculationController::class, 'returnForm'])->name("{$prefix}.circulation.return");
  Route::post('circulation/return', [CirculationController::class, 'processReturn'])->name("{$prefix}.circulation.process-return");
  Route::get('circulation/{transaction}', [CirculationController::class, 'show'])->name("{$prefix}.circulation.show");
  Route::put('circulation/{transaction}/dates', [CirculationController::class, 'updateDates'])->name("{$prefix}.circulation.update-dates");

  Route::get('fines', [AdminFineController::class, 'index'])->name("{$prefix}.fines.index");
  Route::post('fines', [AdminFineController::class, 'store'])->name("{$prefix}.fines.store");
  Route::put('fines/{fine}', [AdminFineController::class, 'update'])->name("{$prefix}.fines.update");

  Route::get('inventory', [InventoryController::class, 'index'])->name("{$prefix}.inventory.index");
  Route::get('inventory/export', [InventoryController::class, 'export'])->name("{$prefix}.inventory.export");

  Route::get('reports', [ReportController::class, 'index'])->name("{$prefix}.reports.index");
  Route::get('reports/export', [ReportController::class, 'export'])->name("{$prefix}.reports.export");

  Route::get('settings', [SettingsController::class, 'index'])->name("{$prefix}.settings");
  Route::put('settings/profile', [SettingsController::class, 'updateProfile'])->name("{$prefix}.settings.updateProfile");
  Route::put('settings/password', [SettingsController::class, 'updatePassword'])->name("{$prefix}.settings.updatePassword");

  // Sections (G7-A, G7-B, …) are school-owned and drive the section dropdown on
  // the manual-register form and the roster template. Managing them is the
  // school admin's job — librarians run the desk, not the class lists — so the
  // librarian prefix gets no section routes at all.
  if ($includeSections) {
    Route::get('sections', [SectionController::class, 'index'])->name("{$prefix}.sections.index");
    Route::post('sections', [SectionController::class, 'store'])->name("{$prefix}.sections.store");
    Route::put('sections/{section}', [SectionController::class, 'update'])->name("{$prefix}.sections.update");
    Route::post('sections/{section}/move-students', [SectionController::class, 'moveStudents'])->name("{$prefix}.sections.move-students");
    Route::delete('sections/{section}', [SectionController::class, 'destroy'])->name("{$prefix}.sections.destroy");
  }

  Route::get('students', [StudentController::class, 'index'])->name("{$prefix}.students.index");
  Route::get('students/manual-register', [StudentController::class, 'manualRegisterForm'])->name("{$prefix}.students.manual-register");
  Route::post('students/manual-register', [StudentController::class, 'manualRegister'])->name("{$prefix}.students.manual-register.store");
  // The student account is written only once the code texted to the number on
  // the form comes back — see App\Services\AccountCreationOtp.
  Route::post('students/manual-register/verify', [StudentController::class, 'verifyManualRegisterOtp'])->name("{$prefix}.students.manual-register.verify");
  Route::post('students/manual-register/resend', [StudentController::class, 'resendManualRegisterOtp'])->name("{$prefix}.students.manual-register.resend");
  Route::post('students/manual-register/cancel', [StudentController::class, 'cancelManualRegisterOtp'])->name("{$prefix}.students.manual-register.cancel");
  if ($includeBatchImport) {
    Route::get('students/import', [StudentController::class, 'importForm'])->name("{$prefix}.students.import");
    Route::get('students/import/template', [StudentController::class, 'importTemplate'])->name("{$prefix}.students.import.template");
    Route::post('students/import', [StudentController::class, 'import'])->name("{$prefix}.students.import.store");
  }
  Route::post('students/{user}/toggle-active', [StudentController::class, 'toggleActive'])->name("{$prefix}.students.toggle-active");
  Route::put('students/{registry}/enrollment', [StudentController::class, 'updateEnrollment'])->name("{$prefix}.students.enrollment");
  Route::put('students/{registry}/placement', [StudentController::class, 'updatePlacement'])->name("{$prefix}.students.placement");
  Route::delete('students/{user}', [StudentController::class, 'destroy'])->name("{$prefix}.students.destroy");

  Route::get('lrn/search', [LrnSearchController::class, 'search'])->name("{$prefix}.lrn.search");
  Route::get('lrn/lookup', [LrnSearchController::class, 'lookup'])->name("{$prefix}.lrn.lookup");

  Route::get('credential-holds', [CredentialHoldController::class, 'index'])->name("{$prefix}.credential-holds.index");
  Route::post('credential-holds', [CredentialHoldController::class, 'store'])->name("{$prefix}.credential-holds.store");
  Route::post('credential-holds/{hold}/release', [CredentialHoldController::class, 'release'])->name("{$prefix}.credential-holds.release");
};

// Admin routes (/admin/...) — accessible to admin/school_admin/super_admin AND librarian (via prefix redirect)
Route::middleware([StaffMiddleware::class, RedirectLibrarianPrefix::class])->prefix('admin')->group(function () use ($registerStaffRoutes) {
  Route::get('dashboard', [DashboardController::class, 'index'])->name('admin.dashboard');
  $registerStaffRoutes('admin');
});

// Admin-only routes (user management + schools)
Route::middleware(AdminMiddleware::class)->prefix('admin')->group(function () {
  Route::resource('users', UserController::class)->names('admin.users');
  Route::post('users/{user}/toggle-active', [UserController::class, 'toggleActive'])->name('admin.users.toggle-active');
  // SMS confirmation of a newly created librarian/student account.
  Route::post('users/otp/verify', [UserController::class, 'verifyOtp'])->name('admin.users.otp.verify');
  Route::post('users/otp/resend', [UserController::class, 'resendOtp'])->name('admin.users.otp.resend');
  Route::post('users/otp/cancel', [UserController::class, 'cancelOtp'])->name('admin.users.otp.cancel');

  Route::get('schools', [SchoolController::class, 'index'])->name('admin.schools.index');
  Route::get('schools/create', [SchoolController::class, 'create'])->name('admin.schools.create');
  Route::post('schools', [SchoolController::class, 'store'])->name('admin.schools.store');
  Route::get('schools/{school}', [SchoolController::class, 'show'])->name('admin.schools.show');
  Route::get('schools/{school}/edit', [SchoolController::class, 'edit'])->name('admin.schools.edit');
  Route::put('schools/{school}', [SchoolController::class, 'update'])->name('admin.schools.update');
  Route::delete('schools/{school}', [SchoolController::class, 'destroy'])->name('admin.schools.destroy');
  Route::post('schools/{school}/toggle-active', [SchoolController::class, 'toggleActive'])->name('admin.schools.toggle-active');
});

// Super Admin routes
Route::middleware(SuperAdminMiddleware::class)->prefix('superadmin')->group(function () {
  Route::get('dashboard', [SuperAdminDashboardController::class, 'index'])->name('superadmin.dashboard');

  Route::get('school-admins', [SchoolAdminController::class, 'index'])->name('superadmin.school-admins.index');
  Route::get('school-admins/create', [SchoolAdminController::class, 'create'])->name('superadmin.school-admins.create');
  Route::post('school-admins', [SchoolAdminController::class, 'store'])->name('superadmin.school-admins.store');
  // SMS confirmation of the number the new school admin will be reached on.
  Route::post('school-admins/otp/verify', [SchoolAdminController::class, 'verifyOtp'])->name('superadmin.school-admins.otp.verify');
  Route::post('school-admins/otp/resend', [SchoolAdminController::class, 'resendOtp'])->name('superadmin.school-admins.otp.resend');
  Route::post('school-admins/otp/cancel', [SchoolAdminController::class, 'cancelOtp'])->name('superadmin.school-admins.otp.cancel');
  Route::post('school-admins/{user}/toggle-active', [SchoolAdminController::class, 'toggleActive'])->name('superadmin.school-admins.toggle-active');
});

// Librarian routes (/librarian/...) — served to librarians (dedicated dashboard controller).
// Student LRN batch upload stays excluded (admins only); book batch upload is enabled here
// because the catalogue is librarian-owned (panel requirement: only librarians add books).
Route::middleware(StaffMiddleware::class)->prefix('librarian')->group(function () use ($registerStaffRoutes) {
  Route::get('dashboard', [LibrarianDashboardController::class, 'index'])->name('librarian.dashboard');
  $registerStaffRoutes('librarian', false, true, false);
});

// User routes (student-facing — dashboard lives at /student/dashboard)
Route::middleware(UserMiddleware::class)->group(function () {
  Route::get('student/dashboard', [UserDashboardController::class, 'index'])->name('student.dashboard');
  Route::get('dashboard', fn() => redirect()->route('student.dashboard'))->name('user.dashboard');
  Route::get('my-qr-code', [UserDashboardController::class, 'downloadQr'])->name('user.qr-code');

  Route::get('books', [BookSearchController::class, 'index'])->name('user.books.index');
  Route::get('books/{book}/qr-code', [BookSearchController::class, 'qrCode'])->name('user.books.qr-code');
  Route::get('books/{book}', [BookSearchController::class, 'show'])->name('user.books.show');

  Route::get('borrowings', [BorrowingController::class, 'index'])->name('user.borrowings.index');
  // Return Books: the student asks (by list or by scanning the book's QR); the
  // loan only closes when a librarian receives the book on the Return screen.
  Route::post('borrowings/return-request', [BorrowingController::class, 'requestReturn'])->name('user.borrowings.return-request');
  Route::delete('borrowings/{transaction}/return-request', [BorrowingController::class, 'cancelReturnRequest'])->name('user.borrowings.return-request.cancel');

  Route::get('my-fines', [UserFineController::class, 'index'])->name('user.fines.index');

  Route::get('user/settings', [UserSettingsController::class, 'index'])->name('user.settings');
  Route::put('user/settings/profile', [UserSettingsController::class, 'updateProfile'])->name('user.settings.updateProfile');
  Route::put('user/settings/password', [UserSettingsController::class, 'updatePassword'])->name('user.settings.updatePassword');
});

// API routes (authenticated)
Route::middleware('auth')->prefix('api')->group(function () {
  Route::post('qr/lookup', [QrLookupController::class, 'lookup'])->name('api.qr.lookup');
});
