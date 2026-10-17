<?php

namespace Tests\Feature;

use App\Models\LrnRegistry;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Coverage for the inline enrollment-status editor on the Students list.
 * Staff (admin + librarian) can change a student's enrollment status; the
 * change syncs the LRN-registry row and the linked user account.
 */
class EnrollmentStatusTest extends TestCase
{
    use RefreshDatabase;

    private School $schoolA;
    private School $schoolB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->schoolA = School::create(['code' => 'AAA', 'name' => 'Alpha School', 'is_active' => true]);
        $this->schoolB = School::create(['code' => 'BBB', 'name' => 'Bravo School', 'is_active' => true]);
    }

    private function staff(string $role, ?int $schoolId): User
    {
        return User::factory()->create([
            'user_role' => $role,
            'is_active' => true,
            'school_id' => $schoolId,
            'password' => Hash::make('Password1!'),
        ]);
    }

    private function registry(array $overrides = []): LrnRegistry
    {
        return LrnRegistry::create(array_merge([
            'lrn' => '111111111111',
            'name' => 'Juan Dela Cruz',
            'school_id' => $this->schoolA->id,
            'enrollment_status' => 'enrolled',
        ], $overrides));
    }

    public function test_admin_can_update_enrollment_and_syncs_linked_user(): void
    {
        $admin = $this->staff('school_admin', $this->schoolA->id);
        $registry = $this->registry(['lrn' => '123456789012']);
        $student = User::factory()->create([
            'user_role' => 'user',
            'lrn' => '123456789012',
            'school_id' => $this->schoolA->id,
            'enrollment_status' => 'enrolled',
        ]);

        $this->actingAs($admin)
            ->put(route('admin.students.enrollment', $registry->id), ['enrollment_status' => 'graduated'])
            ->assertRedirect();

        $this->assertDatabaseHas('lrn_registry', ['id' => $registry->id, 'enrollment_status' => 'graduated']);
        $this->assertDatabaseHas('users', ['id' => $student->id, 'enrollment_status' => 'graduated']);
    }

    public function test_librarian_can_update_enrollment_via_librarian_prefix(): void
    {
        // Proves the PUT route exists under the librarian prefix (not GET-redirect dependent).
        $librarian = $this->staff('librarian', $this->schoolA->id);
        $registry = $this->registry();

        $this->actingAs($librarian)
            ->put(route('librarian.students.enrollment', $registry->id), ['enrollment_status' => 'not_enrolled'])
            ->assertRedirect();

        $this->assertDatabaseHas('lrn_registry', ['id' => $registry->id, 'enrollment_status' => 'not_enrolled']);
    }

    public function test_invalid_enrollment_status_is_rejected(): void
    {
        $admin = $this->staff('school_admin', $this->schoolA->id);
        $registry = $this->registry();

        $this->actingAs($admin)
            ->put(route('admin.students.enrollment', $registry->id), ['enrollment_status' => 'expelled'])
            ->assertSessionHasErrors('enrollment_status');

        $this->assertDatabaseHas('lrn_registry', ['id' => $registry->id, 'enrollment_status' => 'enrolled']);
    }

    public function test_cannot_update_enrollment_for_another_school(): void
    {
        $admin = $this->staff('school_admin', $this->schoolB->id); // different school
        $registry = $this->registry(); // belongs to school A

        $this->actingAs($admin)
            ->put(route('admin.students.enrollment', $registry->id), ['enrollment_status' => 'graduated'])
            ->assertForbidden();

        $this->assertDatabaseHas('lrn_registry', ['id' => $registry->id, 'enrollment_status' => 'enrolled']);
    }

    public function test_marking_not_enrolled_then_deleting_succeeds(): void
    {
        // The delete guard reads the USER's enrollment_status, so the editor must
        // sync the user — otherwise an "unenrolled" student still can't be deleted.
        $admin = $this->staff('school_admin', $this->schoolA->id);
        $registry = $this->registry(['lrn' => '123456789012']);
        $student = User::factory()->create([
            'user_role' => 'user',
            'lrn' => '123456789012',
            'school_id' => $this->schoolA->id,
            'enrollment_status' => 'enrolled',
        ]);

        // While enrolled, delete is blocked (student stays).
        $this->actingAs($admin)->delete(route('admin.students.destroy', $student->id))->assertRedirect();
        $this->assertDatabaseHas('users', ['id' => $student->id]);

        // Flip to not_enrolled (syncs the user), then delete goes through.
        $this->actingAs($admin)->put(route('admin.students.enrollment', $registry->id), ['enrollment_status' => 'not_enrolled']);
        $this->actingAs($admin)->delete(route('admin.students.destroy', $student->id))->assertRedirect();
        $this->assertDatabaseMissing('users', ['id' => $student->id]);
    }
}
