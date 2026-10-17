<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Category;
use App\Models\LrnRegistry;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * End-to-end QA coverage for the May-28 change set:
 *  - School-admin "Add Book" bug fix
 *  - Batch import skip-reason surfacing
 *  - Super-admin School Admin first/middle/last name fields
 *  - Strong password rules applied everywhere
 *  - "Name" → "School Name" label, Cotabato auto-fill (snapshot via Inertia component)
 *  - SuperAdmin school monitoring (school show endpoint)
 *  - Batch upload hidden from super_admin (props delivered to Index don't matter — UI gate)
 *  - Phone regex on schools form
 */
class SedgewickChangesTest extends TestCase
{
    use RefreshDatabase;

    private School $schoolA;
    private School $schoolB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->schoolA = School::create([
            'name' => 'STI College Cotabato',
            'code' => 'STIC',
            'address' => 'Cotabato City',
            'is_active' => true,
        ]);

        $this->schoolB = School::create([
            'name' => 'Xavier University',
            'code' => 'XU',
            'is_active' => true,
        ]);
    }

    private function user(string $role, ?int $schoolId = null): User
    {
        return User::factory()->create([
            'user_role' => $role,
            'is_active' => true,
            'school_id' => $schoolId,
            'password' => Hash::make('Password1!'),
        ]);
    }

    private function csv(string $contents): UploadedFile
    {
        $tmp = tempnam(sys_get_temp_dir(), 'csv');
        file_put_contents($tmp, $contents);
        return new UploadedFile($tmp, 'students.csv', 'text/csv', null, true);
    }

    // ------------------------------------------------------------------
    //  Book management is librarian-only (panel requirement). Admins and
    //  school_admins are read-only on the catalogue → writes return 403.
    // ------------------------------------------------------------------

    public function test_school_admin_cannot_create_book(): void
    {
        $admin = $this->user('school_admin', $this->schoolA->id);
        $category = Category::create(['name' => 'Fiction']);

        $this->actingAs($admin)->post(route('admin.books.store'), [
            'title' => 'A Brief History',
            'author' => 'Stephen Hawking',
            'category_id' => $category->id,
            'total_copies' => 5,
        ])->assertForbidden();

        $this->assertDatabaseMissing('books', ['title' => 'A Brief History']);
    }

    public function test_school_admin_without_school_assignment_is_blocked(): void
    {
        // Still 403 — now via the librarian-only gate (StoreBookRequest::authorize).
        $admin = $this->user('school_admin', null);
        $category = Category::create(['name' => 'Fiction']);

        $this->actingAs($admin)->post(route('admin.books.store'), [
            'title' => 'Test',
            'author' => 'A',
            'category_id' => $category->id,
            'total_copies' => 1,
        ])->assertForbidden();
    }

    public function test_admin_cannot_create_book(): void
    {
        $admin = $this->user('admin', null);
        $category = Category::create(['name' => 'Fiction']);

        $this->actingAs($admin)->post(route('admin.books.store'), [
            'title' => 'Test',
            'author' => 'A',
            'category_id' => $category->id,
            'total_copies' => 1,
        ])->assertForbidden();

        $this->assertDatabaseMissing('books', ['title' => 'Test']);
    }

    public function test_admin_cannot_update_book(): void
    {
        $admin = $this->user('school_admin', $this->schoolA->id);
        $category = Category::create(['name' => 'Fiction']);

        $book = Book::create([
            'title' => 'Original',
            'author' => 'A',
            'category_id' => $category->id,
            'school_id' => $this->schoolA->id,
            'total_copies' => 1,
            'available_copies' => 1,
            'status' => 'available',
            'qr_code' => 'qr-test',
        ]);

        $this->actingAs($admin)->put(route('admin.books.update', $book->id), [
            'title' => 'Updated',
            'author' => 'A',
            'category_id' => $category->id,
            'total_copies' => 1,
        ])->assertForbidden();

        $this->assertDatabaseHas('books', [
            'id' => $book->id,
            'title' => 'Original', // unchanged
        ]);
    }

    public function test_publication_year_no_longer_accepts_negative(): void
    {
        // Books are librarian-only now, so validate as a (school-pinned) librarian.
        $librarian = $this->user('librarian', $this->schoolA->id);
        $category = Category::create(['name' => 'Fiction']);

        $this->actingAs($librarian)->post(route('librarian.books.store'), [
            'title' => 'Test',
            'author' => 'A',
            'category_id' => $category->id,
            'total_copies' => 1,
            'publication_year' => -500,
        ])->assertSessionHasErrors('publication_year');
    }

    // ------------------------------------------------------------------
    //  BUG 2: batch import surfaces skip reasons
    // ------------------------------------------------------------------

    public function test_batch_import_surfaces_skip_reason_for_other_school_lrn(): void
    {
        $admin = $this->user('school_admin', $this->schoolA->id);

        LrnRegistry::create([
            'lrn' => '111111111111',
            'name' => 'Existing Student',
            'school_id' => $this->schoolB->id,
            'enrollment_status' => 'enrolled',
        ]);

        $resp = $this->actingAs($admin)->post(
            route('admin.students.import.store'),
            ['create_accounts' => '0', 'file' => $this->csv("lrn,name\n111111111111,Alice\n222222222222,Bob\n")],
        );

        $resp->assertRedirect();
        $result = session('import_result');
        $this->assertSame(1, $result['imported']);
        $this->assertSame(1, $result['skipped']);
        $this->assertCount(1, $result['errors']);
        $this->assertSame('111111111111', $result['errors'][0]['lrn']);
        $this->assertStringContainsString($this->schoolB->code, $result['errors'][0]['reason']);
    }

    public function test_batch_import_surfaces_skip_reason_for_own_school_duplicate(): void
    {
        $admin = $this->user('school_admin', $this->schoolA->id);

        LrnRegistry::create([
            'lrn' => '111111111111',
            'name' => 'Existing',
            'school_id' => $this->schoolA->id,
            'enrollment_status' => 'enrolled',
        ]);

        $this->actingAs($admin)->post(
            route('admin.students.import.store'),
            ['create_accounts' => '0', 'file' => $this->csv("lrn,name\n111111111111,Alice\n")],
        )->assertRedirect();

        $result = session('import_result');
        $this->assertSame(0, $result['imported']);
        $this->assertSame(1, $result['skipped']);
        $this->assertStringContainsString('already in your registry', $result['errors'][0]['reason']);
    }

    // ------------------------------------------------------------------
    //  School-Admin name parts + strong password
    // ------------------------------------------------------------------

    public function test_super_admin_creates_school_admin_with_split_name_parts(): void
    {
        $sa = $this->user('super_admin', null);
        $fresh = School::create(['name' => 'Fresh School', 'code' => 'FRSH', 'is_active' => true]);

        $resp = $this->actingAs($sa)->post(route('superadmin.school-admins.store'), [
            'first_name' => 'Juan',
            'middle_name' => 'Dela',
            'last_name' => 'Cruz',
            'email' => 'juan@school.test',
            'phone' => '09171234567',
            'school_id' => $fresh->id,
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ]);

        $resp->assertRedirect(route('superadmin.school-admins.index'));

        $this->assertDatabaseHas('users', [
            'first_name' => 'Juan',
            'middle_name' => 'Dela',
            'last_name' => 'Cruz',
            'email' => 'juan@school.test',
            'user_role' => 'school_admin',
            'name' => 'Juan Dela Cruz', // composed
        ]);
    }

    public function test_school_admin_creation_rejects_digits_in_name(): void
    {
        $sa = $this->user('super_admin', null);
        $fresh = School::create(['name' => 'Fresh', 'code' => 'FR2', 'is_active' => true]);

        $this->actingAs($sa)->post(route('superadmin.school-admins.store'), [
            'first_name' => 'Juan123',
            'last_name' => 'Cruz',
            'email' => 'a@b.test',
            'school_id' => $fresh->id,
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ])->assertSessionHasErrors('first_name');
    }

    public function test_school_admin_creation_rejects_weak_password(): void
    {
        $sa = $this->user('super_admin', null);
        $fresh = School::create(['name' => 'Fresh', 'code' => 'FR3', 'is_active' => true]);

        $this->actingAs($sa)->post(route('superadmin.school-admins.store'), [
            'first_name' => 'Juan',
            'last_name' => 'Cruz',
            'email' => 'a@b.test',
            'school_id' => $fresh->id,
            'password' => 'password1', // no upper, no symbol
            'password_confirmation' => 'password1',
        ])->assertSessionHasErrors('password');
    }

    public function test_school_admin_creation_rejects_invalid_phone(): void
    {
        $sa = $this->user('super_admin', null);
        $fresh = School::create(['name' => 'Fresh', 'code' => 'FR4', 'is_active' => true]);

        $this->actingAs($sa)->post(route('superadmin.school-admins.store'), [
            'first_name' => 'Juan',
            'last_name' => 'Cruz',
            'email' => 'a@b.test',
            'phone' => 'abcdef12345',
            'school_id' => $fresh->id,
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ])->assertSessionHasErrors('phone');
    }

    // ------------------------------------------------------------------
    //  Admin/Users form (Register Librarian / Add User): name parts + strong password
    // ------------------------------------------------------------------

    public function test_admin_users_create_accepts_split_name_and_composes_full_name(): void
    {
        $sa = $this->user('super_admin', null);

        $resp = $this->actingAs($sa)->post(route('admin.users.store'), [
            'first_name' => 'Maria',
            'middle_name' => 'Santos',
            'last_name' => 'Reyes',
            'email' => 'maria.reyes@school.test',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
            'user_role' => 'librarian',
            'school_id' => $this->schoolA->id,
        ]);

        $resp->assertRedirect(route('admin.users.index'));

        $this->assertDatabaseHas('users', [
            'first_name' => 'Maria',
            'middle_name' => 'Santos',
            'last_name' => 'Reyes',
            'email' => 'maria.reyes@school.test',
            'user_role' => 'librarian',
            'name' => 'Maria Santos Reyes',
        ]);
    }

    public function test_admin_users_create_rejects_digits_in_first_name(): void
    {
        $sa = $this->user('super_admin', null);

        $this->actingAs($sa)->post(route('admin.users.store'), [
            'first_name' => 'Maria3',
            'last_name' => 'Reyes',
            'email' => 'm@b.test',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
            'user_role' => 'librarian',
            'school_id' => $this->schoolA->id,
        ])->assertSessionHasErrors('first_name');
    }

    public function test_admin_users_create_rejects_weak_password(): void
    {
        $sa = $this->user('super_admin', null);

        $this->actingAs($sa)->post(route('admin.users.store'), [
            'first_name' => 'Maria',
            'last_name' => 'Reyes',
            'email' => 'm2@b.test',
            'password' => 'password1', // missing upper + symbol
            'password_confirmation' => 'password1',
            'user_role' => 'librarian',
            'school_id' => $this->schoolA->id,
        ])->assertSessionHasErrors('password');
    }

    public function test_old_style_user_with_only_name_can_be_edited_via_new_split_form(): void
    {
        // Regression: pre-migration users only had `name` populated. Editing
        // them must still work — the controller composes `name` from the
        // submitted first/middle/last regardless of whether the prior values
        // were null.
        $sa = $this->user('super_admin', null);

        $existing = User::factory()->create([
            'user_role' => 'librarian',
            'is_active' => true,
            'school_id' => $this->schoolA->id,
            'password' => Hash::make('Password1!'),
            'name' => 'Legacy LibrarianFromBefore',
            'first_name' => null,
            'middle_name' => null,
            'last_name' => null,
        ]);

        $this->actingAs($sa)->put(route('admin.users.update', $existing->id), [
            'first_name' => 'Legacy',
            'last_name' => 'Librarian',
            'email' => $existing->email,
            'user_role' => 'librarian',
            'school_id' => $this->schoolA->id,
        ])->assertRedirect(route('admin.users.index'));

        $this->assertDatabaseHas('users', [
            'id' => $existing->id,
            'first_name' => 'Legacy',
            'last_name' => 'Librarian',
            'name' => 'Legacy Librarian',
        ]);
    }

    public function test_seeded_user_with_only_name_field_still_authenticates(): void
    {
        // Regression: the migration added nullable name-part columns. Existing
        // users (created with factory/seeder defaults) must still pass auth.
        $u = User::factory()->create([
            'user_role' => 'admin',
            'is_active' => true,
            'password' => Hash::make('Password1!'),
            'name' => 'Old Admin',
        ]);

        $this->assertNotNull($u->name);
        $this->assertNull($u->first_name);
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('Password1!', $u->password));

        // Auth still works and the dashboard route loads.
        $this->actingAs($u)->get(route('admin.dashboard'))->assertOk();
    }

    public function test_admin_users_update_recomposes_name_on_save(): void
    {
        $sa = $this->user('super_admin', null);

        $existing = User::factory()->create([
            'user_role' => 'librarian',
            'is_active' => true,
            'school_id' => $this->schoolA->id,
            'password' => Hash::make('Password1!'),
            'first_name' => 'Old',
            'middle_name' => null,
            'last_name' => 'Name',
            'name' => 'Old Name',
        ]);

        $this->actingAs($sa)->put(route('admin.users.update', $existing->id), [
            'first_name' => 'Updated',
            'middle_name' => 'Bayani',
            'last_name' => 'Surname',
            'email' => $existing->email,
            'user_role' => 'librarian',
            'school_id' => $this->schoolA->id,
        ])->assertRedirect(route('admin.users.index'));

        $this->assertDatabaseHas('users', [
            'id' => $existing->id,
            'first_name' => 'Updated',
            'middle_name' => 'Bayani',
            'last_name' => 'Surname',
            'name' => 'Updated Bayani Surname',
        ]);
    }

    // ------------------------------------------------------------------
    //  Strong password — sweep across the other endpoints
    // ------------------------------------------------------------------

    public function test_student_manual_register_requires_strong_password(): void
    {
        $admin = $this->user('school_admin', $this->schoolA->id);

        $this->actingAs($admin)->post(route('admin.students.manual-register.store'), [
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'lrn' => '999999999999',
            'email' => 'maria@test.io',
            'phone' => '09171234500',
            'password' => 'weakpass',
            'password_confirmation' => 'weakpass',
        ])->assertSessionHasErrors('password');
    }

    public function test_student_manual_register_accepts_strong_password_with_lrn(): void
    {
        $admin = $this->user('school_admin', $this->schoolA->id);

        $this->actingAs($admin)->post(route('admin.students.manual-register.store'), [
            'first_name' => 'Maria',
            'middle_name' => 'Dela',
            'last_name' => 'Cruz',
            'birthdate' => '2005-04-12',
            'lrn' => '999999999999',
            'email' => 'maria@test.io',
            'phone' => '09171234500',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ])->assertRedirect(route('admin.students.index'));

        $this->assertDatabaseHas('users', [
            'lrn' => '999999999999',
            'email' => 'maria@test.io',
            'first_name' => 'Maria',
            'middle_name' => 'Dela',
            'last_name' => 'Cruz',
            'name' => 'Maria Dela Cruz',
            'school_id' => $this->schoolA->id,
        ]);
        // Registry entry should now exist too for the Students index page.
        $this->assertDatabaseHas('lrn_registry', [
            'lrn' => '999999999999',
            'school_id' => $this->schoolA->id,
        ]);
    }

    public function test_student_manual_register_works_without_lrn(): void
    {
        // Regression for the user-reported issue: school admins must be able to
        // register students who don't have an LRN yet.
        $admin = $this->user('school_admin', $this->schoolA->id);

        $this->actingAs($admin)->post(route('admin.students.manual-register.store'), [
            'first_name' => 'Ana',
            'last_name' => 'Reyes',
            'birthdate' => '2006-02-20',
            // 'lrn' omitted entirely
            'email' => 'ana.noLRN@test.io',
            'phone' => '09181112233',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ])->assertRedirect(route('admin.students.index'));

        $this->assertDatabaseHas('users', [
            'email' => 'ana.noLRN@test.io',
            'first_name' => 'Ana',
            'last_name' => 'Reyes',
            'lrn' => null,
            'school_id' => $this->schoolA->id,
        ]);
        // A registry placeholder row should exist so the student shows up on the index.
        $this->assertDatabaseHas('lrn_registry', [
            'name' => 'Ana Reyes',
            'school_id' => $this->schoolA->id,
            'lrn' => null,
        ]);
    }

    public function test_student_manual_register_blocks_cross_school_lrn(): void
    {
        $admin = $this->user('school_admin', $this->schoolA->id);

        \App\Models\LrnRegistry::create([
            'lrn' => '888888888888',
            'name' => 'Stolen Identity',
            'school_id' => $this->schoolB->id,
            'enrollment_status' => 'enrolled',
        ]);

        $this->actingAs($admin)->post(route('admin.students.manual-register.store'), [
            'first_name' => 'Hacker',
            'last_name' => 'McNope',
            'birthdate' => '2005-07-01',
            'lrn' => '888888888888',
            'email' => 'h@nope.io',
            'phone' => '09181112233',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ])->assertSessionHasErrors('lrn');

        $this->assertDatabaseMissing('users', ['email' => 'h@nope.io']);
    }

    public function test_admin_settings_password_update_requires_strong_password(): void
    {
        $admin = $this->user('admin', null);

        $this->actingAs($admin)->put(route('admin.settings.updatePassword'), [
            'current_password' => 'Password1!',
            'password' => 'password1',
            'password_confirmation' => 'password1',
        ])->assertSessionHasErrors('password');
    }

    // ------------------------------------------------------------------
    //  Super-Admin school monitoring (Show page)
    // ------------------------------------------------------------------

    public function test_super_admin_school_show_returns_view_only_students(): void
    {
        $sa = $this->user('super_admin', null);

        LrnRegistry::create([
            'lrn' => '111111111111',
            'name' => 'Alpha Student',
            'school_id' => $this->schoolA->id,
            'enrollment_status' => 'enrolled',
        ]);
        LrnRegistry::create([
            'lrn' => '222222222222',
            'name' => 'Beta Student',
            'school_id' => $this->schoolB->id, // other school — must NOT appear
            'enrollment_status' => 'enrolled',
        ]);

        $resp = $this->actingAs($sa)->get(route('admin.schools.show', $this->schoolA->id));
        $resp->assertOk();

        // Inertia component name + props
        $resp->assertInertia(fn ($page) => $page
            ->component('Admin/Schools/Show')
            ->where('school.id', $this->schoolA->id)
            ->has('students.data', 1) // only school A's row
            ->where('students.data.0.lrn', '111111111111'));
    }

    public function test_school_admin_cannot_access_show_page(): void
    {
        $admin = $this->user('school_admin', $this->schoolA->id);
        $this->actingAs($admin)->get(route('admin.schools.show', $this->schoolA->id))
            ->assertForbidden();
    }

    // ------------------------------------------------------------------
    //  Schools form: phone regex
    // ------------------------------------------------------------------

    public function test_school_create_rejects_phone_letters(): void
    {
        $admin = $this->user('admin', null);

        $this->actingAs($admin)->post(route('admin.schools.store'), [
            'name' => 'Test School',
            'code' => 'TSCH',
            'phone' => 'not-a-phone',
        ])->assertSessionHasErrors('phone');
    }

    public function test_school_create_accepts_valid_phone(): void
    {
        $admin = $this->user('admin', null);

        $this->actingAs($admin)->post(route('admin.schools.store'), [
            'name' => 'Test School Phone',
            'code' => 'TSCHP',
            'address' => 'Sinsuat Avenue, Cotabato City',
            'phone' => '09181234567',
        ])->assertRedirect(route('admin.schools.index'));
    }

    // ------------------------------------------------------------------
    //  Cotabato auto-fill is a frontend concern — verify Create page renders
    //  ------------------------------------------------------------------

    public function test_admin_schools_create_page_renders(): void
    {
        $sa = $this->user('super_admin', null);
        $this->actingAs($sa)->get(route('admin.schools.create'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Admin/Schools/Create'));
    }

    public function test_super_admin_school_admins_create_page_renders(): void
    {
        $sa = $this->user('super_admin', null);
        $this->actingAs($sa)->get(route('superadmin.school-admins.create'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('SuperAdmin/SchoolAdmins/Create'));
    }
}
