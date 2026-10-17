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
 * Sections are now records a school owns, not free text typed per student.
 *
 * Covers the CRUD page itself and the knock-on rule it exists for: the
 * manual-register form only accepts a section the school actually offers.
 */
class SectionManagementTest extends TestCase
{
    use RefreshDatabase;

    protected School $schoolA;
    protected School $schoolB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->schoolA = School::create(['code' => 'SEC', 'name' => 'Section High', 'is_active' => true]);
        $this->schoolB = School::create(['code' => 'OTH', 'name' => 'Other High', 'is_active' => true]);
    }

    private function admin(?School $school = null): User
    {
        return User::factory()->create([
            'user_role' => 'school_admin',
            'is_active' => true,
            'school_id' => ($school ?? $this->schoolA)->id,
            'password' => Hash::make('Password1!'),
            'phone' => '09171234500',
        ]);
    }

    // ------------------------------------------------------------------
    //  Create
    // ------------------------------------------------------------------

    public function test_school_admin_can_add_a_section(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.sections.store'), ['grade_level' => 'Grade 7', 'name' => 'G7-A'])
            ->assertRedirect();

        $this->assertDatabaseHas('sections', [
            'school_id' => $this->schoolA->id,
            'grade_level' => 'Grade 7',
            'name' => 'G7-A',
        ]);
    }

    public function test_section_name_is_trimmed_and_duplicates_are_rejected_case_insensitively(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.sections.store'), ['grade_level' => 'Grade 7', 'name' => '  G7-A  ']);
        $this->assertDatabaseHas('sections', ['name' => 'G7-A']);

        $this->actingAs($admin)
            ->post(route('admin.sections.store'), ['grade_level' => 'Grade 7', 'name' => 'g7-a'])
            ->assertSessionHasErrors('name');

        $this->assertSame(1, Section::where('school_id', $this->schoolA->id)->count());
    }

    public function test_the_same_section_name_may_exist_under_a_different_grade(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.sections.store'), ['grade_level' => 'Grade 7', 'name' => 'Mabini']);
        $this->actingAs($admin)->post(route('admin.sections.store'), ['grade_level' => 'Grade 8', 'name' => 'Mabini']);

        $this->assertSame(2, Section::where('school_id', $this->schoolA->id)->count());
    }

    public function test_grade_level_must_be_one_the_school_offers(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.sections.store'), ['grade_level' => 'Grade 99', 'name' => 'G99-A'])
            ->assertSessionHasErrors('grade_level');
    }

    public function test_section_name_rejects_junk_characters(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.sections.store'), ['grade_level' => 'Grade 7', 'name' => '<script>x</script>'])
            ->assertSessionHasErrors('name');
    }

    // ------------------------------------------------------------------
    //  Rename — the students have to come along
    // ------------------------------------------------------------------

    public function test_renaming_a_section_moves_its_students_with_it(): void
    {
        $section = Section::create(['school_id' => $this->schoolA->id, 'grade_level' => 'Grade 7', 'name' => 'G7-A']);

        $inSection = LrnRegistry::create([
            'lrn' => '111111111111', 'name' => 'Alice', 'school_id' => $this->schoolA->id,
            'grade_level' => 'Grade 7', 'section' => 'G7-A', 'enrollment_status' => 'enrolled',
        ]);
        $elsewhere = LrnRegistry::create([
            'lrn' => '222222222222', 'name' => 'Bob', 'school_id' => $this->schoolA->id,
            'grade_level' => 'Grade 8', 'section' => 'G7-A', 'enrollment_status' => 'enrolled',
        ]);
        $otherSchool = LrnRegistry::create([
            'lrn' => '333333333333', 'name' => 'Carol', 'school_id' => $this->schoolB->id,
            'grade_level' => 'Grade 7', 'section' => 'G7-A', 'enrollment_status' => 'enrolled',
        ]);

        $this->actingAs($this->admin())
            ->put(route('admin.sections.update', $section->id), ['grade_level' => 'Grade 7', 'name' => 'Sampaguita'])
            ->assertRedirect();

        $this->assertSame('Sampaguita', $inSection->fresh()->section);
        // A same-named section in another grade is a different class entirely.
        $this->assertSame('G7-A', $elsewhere->fresh()->section);
        // And another school's roster is never touched.
        $this->assertSame('G7-A', $otherSchool->fresh()->section);
    }

    public function test_moving_a_section_to_another_grade_moves_its_students_grade_too(): void
    {
        $section = Section::create(['school_id' => $this->schoolA->id, 'grade_level' => 'Grade 7', 'name' => 'Mabini']);
        $student = LrnRegistry::create([
            'lrn' => '444444444444', 'name' => 'Dan', 'school_id' => $this->schoolA->id,
            'grade_level' => 'Grade 7', 'section' => 'Mabini', 'enrollment_status' => 'enrolled',
        ]);

        $this->actingAs($this->admin())
            ->put(route('admin.sections.update', $section->id), ['grade_level' => 'Grade 8', 'name' => 'Mabini']);

        $student->refresh();
        $this->assertSame('Grade 8', $student->grade_level);
        $this->assertSame('Mabini', $student->section);
    }

    // ------------------------------------------------------------------
    //  Delete
    // ------------------------------------------------------------------

    public function test_a_section_with_students_cannot_be_deleted(): void
    {
        $section = Section::create(['school_id' => $this->schoolA->id, 'grade_level' => 'Grade 7', 'name' => 'G7-A']);
        LrnRegistry::create([
            'lrn' => '555555555555', 'name' => 'Eve', 'school_id' => $this->schoolA->id,
            'grade_level' => 'Grade 7', 'section' => 'G7-A', 'enrollment_status' => 'enrolled',
        ]);

        $this->actingAs($this->admin())
            ->delete(route('admin.sections.destroy', $section->id))
            ->assertRedirect();

        $this->assertDatabaseHas('sections', ['id' => $section->id]);
    }

    public function test_an_empty_section_can_be_deleted(): void
    {
        $section = Section::create(['school_id' => $this->schoolA->id, 'grade_level' => 'Grade 7', 'name' => 'G7-B']);

        $this->actingAs($this->admin())
            ->delete(route('admin.sections.destroy', $section->id))
            ->assertRedirect();

        $this->assertDatabaseMissing('sections', ['id' => $section->id]);
    }

    // ------------------------------------------------------------------
    //  Move students — what makes the delete guard actionable
    // ------------------------------------------------------------------

    public function test_students_can_be_moved_into_another_section_and_the_source_then_deletes(): void
    {
        $from = Section::create(['school_id' => $this->schoolA->id, 'grade_level' => 'Grade 7', 'name' => 'G7-A']);
        $to = Section::create(['school_id' => $this->schoolA->id, 'grade_level' => 'Grade 7', 'name' => 'G7-B']);
        $student = LrnRegistry::create([
            'lrn' => '121212121212', 'name' => 'Mover', 'school_id' => $this->schoolA->id,
            'grade_level' => 'Grade 7', 'section' => 'G7-A', 'enrollment_status' => 'enrolled',
        ]);
        $admin = $this->admin();

        $this->actingAs($admin)
            ->post(route('admin.sections.move-students', $from->id), ['target_section_id' => $to->id])
            ->assertRedirect();

        $student->refresh();
        $this->assertSame('G7-B', $student->section);
        $this->assertSame('Grade 7', $student->grade_level);

        $this->actingAs($admin)->delete(route('admin.sections.destroy', $from->id));
        $this->assertDatabaseMissing('sections', ['id' => $from->id]);
    }

    /** Reported: a Grade 9 section's students could be moved into Grade 7, 11 or 12. */
    public function test_students_cannot_be_moved_into_a_section_of_another_grade(): void
    {
        $from = Section::create(['school_id' => $this->schoolA->id, 'grade_level' => 'Grade 9', 'name' => 'Bonifacio']);
        $sameGrade = Section::create(['school_id' => $this->schoolA->id, 'grade_level' => 'Grade 9', 'name' => 'Miswari']);
        $admin = $this->admin();
        $student = LrnRegistry::create([
            'lrn' => '191919191919', 'name' => 'Grade Nine', 'school_id' => $this->schoolA->id,
            'grade_level' => 'Grade 9', 'section' => 'Bonifacio', 'enrollment_status' => 'enrolled',
        ]);

        foreach (['Grade 7' => 'Mabini', 'Grade 11' => 'Matabalao', 'Grade 12' => 'Rizal'] as $grade => $name) {
            $other = Section::create(['school_id' => $this->schoolA->id, 'grade_level' => $grade, 'name' => $name]);

            $this->actingAs($admin)
                ->post(route('admin.sections.move-students', $from->id), ['target_section_id' => $other->id])
                ->assertRedirect()
                ->assertSessionHas('error');

            $student->refresh();
            $this->assertSame('Grade 9', $student->grade_level, "A move into {$grade} must be refused.");
            $this->assertSame('Bonifacio', $student->section);
        }

        // The same-grade move is still allowed.
        $this->actingAs($admin)
            ->post(route('admin.sections.move-students', $from->id), ['target_section_id' => $sameGrade->id])
            ->assertSessionHas('success');

        $student->refresh();
        $this->assertSame('Grade 9', $student->grade_level);
        $this->assertSame('Miswari', $student->section);
    }

    public function test_students_can_be_moved_out_of_any_section(): void
    {
        $from = Section::create(['school_id' => $this->schoolA->id, 'grade_level' => 'Grade 7', 'name' => 'G7-A']);
        $student = LrnRegistry::create([
            'lrn' => '131313131313', 'name' => 'Loose', 'school_id' => $this->schoolA->id,
            'grade_level' => 'Grade 7', 'section' => 'G7-A', 'enrollment_status' => 'enrolled',
        ]);

        $this->actingAs($this->admin())
            ->post(route('admin.sections.move-students', $from->id), ['target_section_id' => null])
            ->assertRedirect();

        $student->refresh();
        $this->assertNull($student->section);
        // Their grade is untouched: they are still a Grade 7 student, just unassigned.
        $this->assertSame('Grade 7', $student->grade_level);
    }

    public function test_students_cannot_be_moved_into_another_schools_section(): void
    {
        $from = Section::create(['school_id' => $this->schoolA->id, 'grade_level' => 'Grade 7', 'name' => 'G7-A']);
        $foreign = Section::create(['school_id' => $this->schoolB->id, 'grade_level' => 'Grade 7', 'name' => 'B7-A']);
        $student = LrnRegistry::create([
            'lrn' => '141414141414', 'name' => 'Stay', 'school_id' => $this->schoolA->id,
            'grade_level' => 'Grade 7', 'section' => 'G7-A', 'enrollment_status' => 'enrolled',
        ]);

        $this->actingAs($this->admin())
            ->post(route('admin.sections.move-students', $from->id), ['target_section_id' => $foreign->id])
            ->assertRedirect();

        $this->assertSame('G7-A', $student->fresh()->section);
    }

    public function test_moving_another_schools_section_is_forbidden(): void
    {
        $foreign = Section::create(['school_id' => $this->schoolB->id, 'grade_level' => 'Grade 7', 'name' => 'B7-A']);

        $this->actingAs($this->admin())
            ->post(route('admin.sections.move-students', $foreign->id), ['target_section_id' => null])
            ->assertForbidden();
    }

    // ------------------------------------------------------------------
    //  Scoping
    // ------------------------------------------------------------------

    public function test_an_admin_cannot_touch_another_schools_section(): void
    {
        $foreign = Section::create(['school_id' => $this->schoolB->id, 'grade_level' => 'Grade 7', 'name' => 'B7-A']);
        $admin = $this->admin();

        $this->actingAs($admin)
            ->put(route('admin.sections.update', $foreign->id), ['grade_level' => 'Grade 7', 'name' => 'Hijacked'])
            ->assertForbidden();

        $this->actingAs($admin)
            ->delete(route('admin.sections.destroy', $foreign->id))
            ->assertForbidden();

        $this->assertSame('B7-A', $foreign->fresh()->name);
    }

    public function test_the_index_only_lists_the_admins_own_sections(): void
    {
        Section::create(['school_id' => $this->schoolA->id, 'grade_level' => 'Grade 7', 'name' => 'Mine']);
        Section::create(['school_id' => $this->schoolB->id, 'grade_level' => 'Grade 7', 'name' => 'Theirs']);

        $this->actingAs($this->admin())
            ->get(route('admin.sections.index'))
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Sections/Index')
                ->has('sections', 1)
                ->where('sections.0.name', 'Mine'));
    }

    public function test_sections_are_listed_by_grade_in_reading_order_not_alphabetically(): void
    {
        foreach ([['Grade 10', 'X'], ['Grade 7', 'B'], ['Grade 7', 'A']] as [$grade, $name]) {
            Section::create(['school_id' => $this->schoolA->id, 'grade_level' => $grade, 'name' => $name]);
        }

        $this->actingAs($this->admin())
            ->get(route('admin.sections.index'))
            ->assertInertia(fn ($page) => $page
                ->where('sections.0.name', 'A')
                ->where('sections.1.name', 'B')
                ->where('sections.2.grade_level', 'Grade 10'));
    }

    public function test_the_index_reports_how_many_students_are_in_each_section(): void
    {
        Section::create(['school_id' => $this->schoolA->id, 'grade_level' => 'Grade 7', 'name' => 'G7-A']);
        foreach (['666666666666', '777777777777'] as $lrn) {
            LrnRegistry::create([
                'lrn' => $lrn, 'name' => 'Student ' . $lrn, 'school_id' => $this->schoolA->id,
                // Mixed case on purpose: legacy rows carry whatever was typed.
                'grade_level' => 'Grade 7', 'section' => 'g7-a', 'enrollment_status' => 'enrolled',
            ]);
        }

        $this->actingAs($this->admin())
            ->get(route('admin.sections.index'))
            ->assertInertia(fn ($page) => $page->where('sections.0.students_count', 2));
    }

    // ------------------------------------------------------------------
    //  Manual register — section is now a whitelist, not free text
    // ------------------------------------------------------------------

    public function test_manual_register_form_offers_only_the_schools_sections(): void
    {
        Section::create(['school_id' => $this->schoolA->id, 'grade_level' => 'Grade 7', 'name' => 'G7-A']);
        Section::create(['school_id' => $this->schoolB->id, 'grade_level' => 'Grade 7', 'name' => 'B7-A']);

        $this->actingAs($this->admin())
            ->get(route('admin.students.manual-register'))
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Students/ManualRegister')
                ->has('sections', 1)
                ->where('sections.0.name', 'G7-A'));
    }

    /** @return array<string, string> */
    private function studentPayload(array $overrides = []): array
    {
        return array_merge([
            'first_name' => 'Juan',
            'last_name' => 'Montenegro',
            'birthdate' => '2005-04-12',
            'email' => 'juan.montenegro@example.com',
            'phone' => '09171234567',
            'password' => 'Montenegro2005',
        ], $overrides);
    }

    public function test_manual_register_rejects_a_section_the_school_does_not_have(): void
    {
        Section::create(['school_id' => $this->schoolA->id, 'grade_level' => 'Grade 7', 'name' => 'G7-A']);

        $this->actingAs($this->admin())
            ->post(route('admin.students.manual-register.store'), $this->studentPayload([
                'grade_level' => 'Grade 7',
                'section' => 'Invented',
            ]))
            ->assertSessionHasErrors('section');

        $this->assertDatabaseCount('users', 1); // just the admin
    }

    public function test_manual_register_rejects_a_section_belonging_to_a_different_grade(): void
    {
        Section::create(['school_id' => $this->schoolA->id, 'grade_level' => 'Grade 7', 'name' => 'G7-A']);

        $this->actingAs($this->admin())
            ->post(route('admin.students.manual-register.store'), $this->studentPayload([
                'grade_level' => 'Grade 8',
                'section' => 'G7-A',
            ]))
            ->assertSessionHasErrors('section');
    }

    public function test_manual_register_rejects_another_schools_section(): void
    {
        Section::create(['school_id' => $this->schoolB->id, 'grade_level' => 'Grade 7', 'name' => 'B7-A']);

        $this->actingAs($this->admin())
            ->post(route('admin.students.manual-register.store'), $this->studentPayload([
                'grade_level' => 'Grade 7',
                'section' => 'B7-A',
            ]))
            ->assertSessionHasErrors('section');
    }

    public function test_manual_register_needs_a_grade_level_when_a_section_is_given(): void
    {
        Section::create(['school_id' => $this->schoolA->id, 'grade_level' => 'Grade 7', 'name' => 'G7-A']);

        $this->actingAs($this->admin())
            ->post(route('admin.students.manual-register.store'), $this->studentPayload(['section' => 'G7-A']))
            ->assertSessionHasErrors('grade_level');
    }

    public function test_manual_register_stores_the_section_with_the_casing_the_school_set_up(): void
    {
        Section::create(['school_id' => $this->schoolA->id, 'grade_level' => 'Grade 7', 'name' => 'G7-A']);

        $this->actingAs($this->admin())
            ->post(route('admin.students.manual-register.store'), $this->studentPayload([
                'lrn' => '888888888888',
                'grade_level' => 'Grade 7',
                'section' => 'g7-a',
            ]))
            ->assertRedirect(route('admin.students.index'));

        $this->assertDatabaseHas('lrn_registry', ['lrn' => '888888888888', 'section' => 'G7-A']);
    }

    // ------------------------------------------------------------------
    //  Page-level smoke: every screen the change touches actually renders
    // ------------------------------------------------------------------

    public function test_the_batch_upload_page_knows_about_the_schools_sections(): void
    {
        Section::create(['school_id' => $this->schoolA->id, 'grade_level' => 'Grade 7', 'name' => 'G7-A']);

        $this->actingAs($this->admin())
            ->get(route('admin.students.import'))
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Students/Import')
                ->has('sections', 1)
                ->where('sections.0.name', 'G7-A')
                ->has('gradeLevels', 6));
    }

    public function test_librarians_have_no_sections_page_at_all(): void
    {
        $librarian = User::factory()->create([
            'user_role' => 'librarian',
            'is_active' => true,
            'school_id' => $this->schoolA->id,
            'password' => Hash::make('Password1!'),
            'phone' => '09171234501',
        ]);
        Section::create(['school_id' => $this->schoolA->id, 'grade_level' => 'Grade 7', 'name' => 'G7-A']);

        // Sections belong to the school admin. The route is not registered under
        // the librarian prefix, and /admin/* GETs are bounced there.
        $this->actingAs($librarian)->get('/librarian/sections')->assertNotFound();
        $this->actingAs($librarian)->get('/admin/sections')->assertRedirect('/librarian/sections');
    }

    public function test_a_librarian_cannot_write_sections_through_the_admin_prefix(): void
    {
        $librarian = User::factory()->create([
            'user_role' => 'librarian',
            'is_active' => true,
            'school_id' => $this->schoolA->id,
            'password' => Hash::make('Password1!'),
            'phone' => '09171234502',
        ]);
        $section = Section::create(['school_id' => $this->schoolA->id, 'grade_level' => 'Grade 7', 'name' => 'G7-A']);

        // Only GETs are redirected off /admin/*, so the writes need their own gate.
        $this->actingAs($librarian)
            ->post(route('admin.sections.store'), ['grade_level' => 'Grade 8', 'name' => 'Sneaky'])
            ->assertForbidden();
        $this->actingAs($librarian)
            ->delete(route('admin.sections.destroy', $section->id))
            ->assertForbidden();

        $this->assertDatabaseMissing('sections', ['name' => 'Sneaky']);
        $this->assertDatabaseHas('sections', ['id' => $section->id]);
    }

    public function test_a_staff_account_with_no_school_gets_an_empty_state_not_a_crash(): void
    {
        $unassigned = User::factory()->create([
            'user_role' => 'school_admin',
            'is_active' => true,
            'school_id' => null,
            'password' => Hash::make('Password1!'),
            'phone' => '09171234502',
        ]);
        Section::create(['school_id' => $this->schoolA->id, 'grade_level' => 'Grade 7', 'name' => 'G7-A']);

        $this->actingAs($unassigned)
            ->get(route('admin.sections.index'))
            ->assertInertia(fn ($page) => $page->where('hasSchool', false)->has('sections', 0));

        // …and it refuses to create one rather than orphaning a row.
        $this->actingAs($unassigned)
            ->post(route('admin.sections.store'), ['grade_level' => 'Grade 7', 'name' => 'Nope'])
            ->assertRedirect();
        $this->assertDatabaseMissing('sections', ['name' => 'Nope']);
    }

    public function test_students_are_not_lost_when_their_section_is_renamed_end_to_end(): void
    {
        $admin = $this->admin();

        // 1. Admin sets the section up.
        $this->actingAs($admin)->post(route('admin.sections.store'), ['grade_level' => 'Grade 7', 'name' => 'G7-A']);
        $section = Section::where('name', 'G7-A')->firstOrFail();

        // 2. It shows up as a choice on the register form…
        $this->actingAs($admin)
            ->get(route('admin.students.manual-register'))
            ->assertInertia(fn ($page) => $page->where('sections.0.name', 'G7-A'));

        // 3. …and a student can be filed under it.
        $this->actingAs($admin)->post(route('admin.students.manual-register.store'), $this->studentPayload([
            'lrn' => '101010101010',
            'grade_level' => 'Grade 7',
            'section' => 'G7-A',
        ]))->assertRedirect(route('admin.students.index'));

        // 4. Renaming carries the student across.
        $this->actingAs($admin)->put(route('admin.sections.update', $section->id), [
            'grade_level' => 'Grade 7',
            'name' => 'Sampaguita',
        ]);
        $this->assertDatabaseHas('lrn_registry', ['lrn' => '101010101010', 'section' => 'Sampaguita']);

        // 5. And the now-occupied section still refuses to be deleted.
        $this->actingAs($admin)->delete(route('admin.sections.destroy', $section->id));
        $this->assertDatabaseHas('sections', ['id' => $section->id]);
    }

    public function test_the_students_list_shows_which_class_each_student_is_in(): void
    {
        LrnRegistry::create([
            'lrn' => '171717171717', 'name' => 'Listed', 'school_id' => $this->schoolA->id,
            'grade_level' => 'Grade 7', 'section' => 'G7-A', 'enrollment_status' => 'enrolled',
        ]);

        $this->actingAs($this->admin())
            ->get(route('admin.students.index'))
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Students/Index')
                ->where('students.data.0.grade_level', 'Grade 7')
                ->where('students.data.0.section', 'G7-A'));
    }

    public function test_moving_a_student_to_a_new_grade_does_not_resurrect_their_old_section(): void
    {
        // The form clears the Section select when the grade changes, so it posts
        // grade_level=<new>, section=''. Carrying the registry's old section
        // across would file the student under a (grade, section) pair no section
        // record backs — invisible to the dropdown, the counts, the rename
        // cascade and the delete guard alike.
        Section::create(['school_id' => $this->schoolA->id, 'grade_level' => 'Grade 7', 'name' => 'G7-A']);
        Section::create(['school_id' => $this->schoolA->id, 'grade_level' => 'Grade 10', 'name' => 'G10-A']);
        LrnRegistry::create([
            'lrn' => '151515151515', 'name' => 'Promoted Kid', 'school_id' => $this->schoolA->id,
            'grade_level' => 'Grade 7', 'section' => 'G7-A', 'enrollment_status' => 'enrolled',
        ]);

        $this->actingAs($this->admin())
            ->post(route('admin.students.manual-register.store'), $this->studentPayload([
                'lrn' => '151515151515',
                'grade_level' => 'Grade 10',
                'section' => '',
            ]))
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('lrn_registry', [
            'lrn' => '151515151515',
            'grade_level' => 'Grade 10',
            'section' => null,
        ]);
    }

    public function test_registering_against_an_existing_row_without_a_grade_keeps_its_placement(): void
    {
        // The other half of the rule: supply neither field and nothing moves.
        Section::create(['school_id' => $this->schoolA->id, 'grade_level' => 'Grade 7', 'name' => 'G7-A']);
        LrnRegistry::create([
            'lrn' => '161616161616', 'name' => 'Stay Put', 'school_id' => $this->schoolA->id,
            'grade_level' => 'Grade 7', 'section' => 'G7-A', 'enrollment_status' => 'enrolled',
        ]);

        $this->actingAs($this->admin())
            ->post(route('admin.students.manual-register.store'), $this->studentPayload([
                'lrn' => '161616161616',
            ]))
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('lrn_registry', [
            'lrn' => '161616161616',
            'grade_level' => 'Grade 7',
            'section' => 'G7-A',
        ]);
    }

    public function test_a_student_can_still_be_registered_with_no_section_at_all(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.students.manual-register.store'), $this->studentPayload([
                'lrn' => '999999999999',
                'grade_level' => 'Grade 7',
            ]))
            ->assertRedirect(route('admin.students.index'));

        $this->assertDatabaseHas('lrn_registry', ['lrn' => '999999999999', 'section' => null]);
    }
}
