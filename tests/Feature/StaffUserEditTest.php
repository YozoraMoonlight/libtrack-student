<?php

namespace Tests\Feature;

use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * The Users page a school admin gets lists their librarians AND their students.
 *
 * The edit form used to allow only 'librarian' as a role, so saving a student
 * came back as "The selected user role is invalid" and threw away the password,
 * student ID, phone and department changes with it.
 */
class StaffUserEditTest extends TestCase
{
    use RefreshDatabase;

    protected School $school;
    protected School $otherSchool;

    protected function setUp(): void
    {
        parent::setUp();
        $this->school = School::create(['code' => 'EDT', 'name' => 'Edit High', 'is_active' => true]);
        $this->otherSchool = School::create(['code' => 'OTH', 'name' => 'Other High', 'is_active' => true]);
    }

    private function admin(): User
    {
        return User::factory()->create([
            'user_role' => 'school_admin',
            'is_active' => true,
            'school_id' => $this->school->id,
            'password' => Hash::make('Password1!'),
            'phone' => '09171234500',
        ]);
    }

    private function student(array $overrides = []): User
    {
        return User::factory()->create(array_merge([
            'user_role' => 'user',
            'is_active' => true,
            'school_id' => $this->school->id,
            'first_name' => 'Albert',
            'middle_name' => 'Santiago',
            'last_name' => 'Palao',
            'name' => 'Albert Santiago Palao',
            'email' => 'albert@example.com',
            'birthdate' => '2011-06-05',
            'password' => Hash::make('Palao2011'),
            'phone' => '09557267615',
        ], $overrides));
    }

    /** @return array<string, mixed> */
    private function payload(User $student, array $overrides = []): array
    {
        return array_merge([
            'first_name' => $student->first_name,
            'middle_name' => $student->middle_name,
            'last_name' => $student->last_name,
            'birthdate' => '2011-06-05',
            'email' => $student->email,
            'user_role' => 'user',
            'school_id' => $this->school->id,
            'student_id' => '2024-00001',
            'phone' => '09171234567',
            'department' => 'Grade 7',
            'password' => '',
        ], $overrides);
    }

    public function test_a_school_admin_can_save_a_students_id_phone_and_department(): void
    {
        $student = $this->student();

        $this->actingAs($this->admin())
            ->put(route('admin.users.update', $student->id), $this->payload($student))
            ->assertRedirect(route('admin.users.index'))
            ->assertSessionHasNoErrors();

        $student->refresh();
        $this->assertSame('2024-00001', $student->student_id);
        $this->assertSame('09171234567', $student->phone);
        $this->assertSame('Grade 7', $student->department);
        $this->assertSame('user', $student->user_role);
    }

    public function test_a_school_admin_can_change_a_students_password(): void
    {
        $student = $this->student();

        $this->actingAs($this->admin())
            ->put(route('admin.users.update', $student->id), $this->payload($student, ['password' => 'NewPass1!']))
            ->assertSessionHasNoErrors();

        $this->assertTrue(Hash::check('NewPass1!', $student->fresh()->password));
    }

    public function test_the_edit_page_offers_the_student_role_so_the_form_is_not_locked_to_librarian(): void
    {
        $student = $this->student();

        $this->actingAs($this->admin())
            ->get(route('admin.users.edit', $student->id))
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Users/Edit')
                ->where('allowedRoles', ['librarian', 'user'])
                ->where('user.user_role', 'user'));
    }

    public function test_the_birthdate_is_shown_and_can_be_corrected(): void
    {
        $student = $this->student(['birthdate' => null]);

        $this->actingAs($this->admin())
            ->put(route('admin.users.update', $student->id), $this->payload($student, ['birthdate' => '2010-01-15']))
            ->assertSessionHasNoErrors();

        $this->assertSame('2010-01-15', $student->fresh()->birthdate->toDateString());

        $this->actingAs($this->admin())
            ->get(route('admin.users.edit', $student->id))
            ->assertInertia(fn ($page) => $page->where('user.birthdate', fn ($value) => str_starts_with((string) $value, '2010-01-15')));
    }

    public function test_a_future_birthdate_is_rejected(): void
    {
        $student = $this->student();

        $this->actingAs($this->admin())
            ->put(route('admin.users.update', $student->id), $this->payload($student, [
                'birthdate' => now()->addYear()->toDateString(),
            ]))
            ->assertSessionHasErrors('birthdate');
    }

    public function test_a_school_admin_still_cannot_mint_an_admin(): void
    {
        $student = $this->student();

        $this->actingAs($this->admin())
            ->put(route('admin.users.update', $student->id), $this->payload($student, ['user_role' => 'admin']))
            ->assertSessionHasErrors('user_role');

        $this->assertSame('user', $student->fresh()->user_role);
    }

    public function test_a_school_admin_still_cannot_touch_another_schools_student(): void
    {
        $foreign = $this->student([
            'school_id' => $this->otherSchool->id,
            'email' => 'foreign@example.com',
        ]);

        $this->actingAs($this->admin())
            ->put(route('admin.users.update', $foreign->id), $this->payload($foreign))
            ->assertForbidden();
    }
}
