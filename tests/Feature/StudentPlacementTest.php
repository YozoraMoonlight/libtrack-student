<?php

namespace Tests\Feature;

use App\Models\LrnRegistry;
use App\Models\School;
use App\Models\Section;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Moving ONE student to another grade level — the promotion the Sections page
 * cannot express, because moving there takes a whole section at a time.
 */
class StudentPlacementTest extends TestCase
{
    use RefreshDatabase;

    protected School $school;
    protected School $otherSchool;

    protected function setUp(): void
    {
        parent::setUp();
        $this->school = School::create(['code' => 'PLC', 'name' => 'Placement High', 'is_active' => true]);
        $this->otherSchool = School::create(['code' => 'OTR', 'name' => 'Other High', 'is_active' => true]);
    }

    private function admin(?School $school = null): User
    {
        return User::factory()->create([
            'user_role' => 'school_admin',
            'is_active' => true,
            'school_id' => ($school ?? $this->school)->id,
            'password' => Hash::make('Password1!'),
            'phone' => '09171234500',
        ]);
    }

    private function student(array $overrides = []): LrnRegistry
    {
        return LrnRegistry::create(array_merge([
            'lrn' => '123456789012',
            'name' => 'Juan Cruz',
            'first_name' => 'Juan',
            'last_name' => 'Cruz',
            'school_id' => $this->school->id,
            'grade_level' => 'Grade 7',
            'section' => 'Mabini',
            'enrollment_status' => 'enrolled',
        ], $overrides));
    }

    public function test_a_grade_7_student_can_be_moved_into_a_grade_8_section(): void
    {
        Section::create(['school_id' => $this->school->id, 'grade_level' => 'Grade 7', 'name' => 'Mabini']);
        $rizal = Section::create(['school_id' => $this->school->id, 'grade_level' => 'Grade 8', 'name' => 'Rizal']);
        $student = $this->student();

        $this->actingAs($this->admin())
            ->put(route('admin.students.placement', $student->id), [
                'grade_level' => 'Grade 8',
                'section_id' => $rizal->id,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('lrn_registry', [
            'id' => $student->id,
            'grade_level' => 'Grade 8',
            'section' => 'Rizal',
        ]);
    }

    public function test_a_student_can_be_promoted_without_picking_a_section_yet(): void
    {
        $student = $this->student();

        $this->actingAs($this->admin())
            ->put(route('admin.students.placement', $student->id), ['grade_level' => 'Grade 8'])
            ->assertRedirect();

        $student->refresh();
        $this->assertSame('Grade 8', $student->grade_level);
        $this->assertNull($student->section);
    }

    public function test_the_section_has_to_belong_to_the_grade_being_moved_into(): void
    {
        $g7 = Section::create(['school_id' => $this->school->id, 'grade_level' => 'Grade 7', 'name' => 'Mabini']);
        $student = $this->student();

        $this->actingAs($this->admin())
            ->put(route('admin.students.placement', $student->id), [
                'grade_level' => 'Grade 8',
                'section_id' => $g7->id,
            ])
            ->assertSessionHasErrors('section_id');

        $this->assertDatabaseHas('lrn_registry', ['id' => $student->id, 'grade_level' => 'Grade 7']);
    }

    public function test_another_schools_section_is_not_a_destination(): void
    {
        $foreign = Section::create(['school_id' => $this->otherSchool->id, 'grade_level' => 'Grade 8', 'name' => 'Rizal']);
        $student = $this->student();

        $this->actingAs($this->admin())
            ->put(route('admin.students.placement', $student->id), [
                'grade_level' => 'Grade 8',
                'section_id' => $foreign->id,
            ])
            ->assertSessionHasErrors('section_id');
    }

    public function test_an_admin_cannot_move_another_schools_student(): void
    {
        $student = $this->student(['school_id' => $this->otherSchool->id]);

        $this->actingAs($this->admin())
            ->put(route('admin.students.placement', $student->id), ['grade_level' => 'Grade 8'])
            ->assertForbidden();

        $this->assertDatabaseHas('lrn_registry', ['id' => $student->id, 'grade_level' => 'Grade 7']);
    }

    public function test_the_grade_level_has_to_be_one_of_the_offered_ones(): void
    {
        $student = $this->student();

        $this->actingAs($this->admin())
            ->put(route('admin.students.placement', $student->id), ['grade_level' => 'Grade 99'])
            ->assertSessionHasErrors('grade_level');
    }

    public function test_the_students_page_ships_the_grades_and_sections_the_move_control_needs(): void
    {
        Section::create(['school_id' => $this->school->id, 'grade_level' => 'Grade 8', 'name' => 'Rizal']);
        $this->student();

        $this->actingAs($this->admin())
            ->get(route('admin.students.index'))
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Students/Index')
                ->has('gradeLevels')
                ->has('sections', 1)
                ->where('sections.0.name', 'Rizal'));
    }
}
