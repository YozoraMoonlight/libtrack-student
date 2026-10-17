<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Found in the 2026-09-16 run-through: `categories/{category}` was routed to a
 * CategoryController::show() that didn't exist, so the URL returned HTTP 500.
 */
class CategoryPagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_category_url_opens_its_edit_screen_instead_of_erroring(): void
    {
        $school = School::create(['code' => 'CAT', 'name' => 'Category High', 'is_active' => true]);
        $category = Category::create(['name' => 'Fiction']);

        $admin = User::create([
            'name' => 'School Admin', 'email' => 'cat-admin@example.com', 'password' => Hash::make('Password123!'),
            'user_role' => 'school_admin', 'school_id' => $school->id, 'is_active' => true,
        ]);
        $this->actingAs($admin)
            ->get(route('admin.categories.show', $category))
            ->assertRedirect(route('admin.categories.edit', $category));

        $librarian = User::create([
            'name' => 'Librarian', 'email' => 'cat-lib@example.com', 'password' => Hash::make('Password123!'),
            'user_role' => 'librarian', 'school_id' => $school->id, 'is_active' => true,
        ]);
        $this->actingAs($librarian)
            ->followingRedirects()
            ->get(route('librarian.categories.show', $category))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Admin/Categories/Edit')->where('category.id', $category->id));
    }
}
