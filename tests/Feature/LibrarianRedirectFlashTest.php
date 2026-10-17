<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Found in the 2026-09-16 run-through: some actions redirect everyone to an
 * admin.* route, and a librarian is then bounced from /admin/* to /librarian/*.
 * That extra hop spent the one-request flash, so a librarian saving a category
 * or their profile saw no confirmation at all.
 */
class LibrarianRedirectFlashTest extends TestCase
{
    use RefreshDatabase;

    private function librarian(): User
    {
        $school = School::create(['code' => 'FLS', 'name' => 'Flash High', 'is_active' => true]);

        return User::create([
            'name' => 'Maria Santos', 'email' => 'maria@example.com', 'password' => Hash::make('Password123!'),
            'user_role' => 'librarian', 'school_id' => $school->id, 'is_active' => true,
        ]);
    }

    public function test_a_librarian_sees_the_message_after_creating_a_category(): void
    {
        $this->actingAs($this->librarian())
            ->followingRedirects()
            ->post(route('librarian.categories.store'), ['name' => 'Philippine History'])
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Categories/Index')
                ->where('flash.success', 'Category created successfully.'));

        $this->assertDatabaseHas('categories', ['name' => 'Philippine History']);
    }

    public function test_a_librarian_sees_the_message_after_deleting_a_category(): void
    {
        $category = Category::create(['name' => 'Old Shelf']);

        $this->actingAs($this->librarian())
            ->followingRedirects()
            ->delete(route('librarian.categories.destroy', $category))
            ->assertInertia(fn ($page) => $page->where('flash.success', 'Category deleted successfully.'));
    }

    public function test_a_librarian_sees_the_message_after_saving_their_profile(): void
    {
        $this->actingAs($this->librarian())
            ->followingRedirects()
            ->put(route('librarian.settings.updateProfile'), ['name' => 'Maria L. Santos'])
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Settings')
                ->where('success', 'Profile updated successfully.'));
    }

    public function test_a_plain_admin_url_still_redirects_a_librarian_to_their_own_prefix(): void
    {
        $this->actingAs($this->librarian())
            ->get('/admin/books?search=gatsby')
            ->assertRedirect('/librarian/books?search=gatsby');
    }
}
