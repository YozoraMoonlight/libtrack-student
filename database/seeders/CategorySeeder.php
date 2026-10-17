<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Category;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Fiction', 'description' => 'Novels, short stories, and literary works of imagination'],
            ['name' => 'Non-Fiction', 'description' => 'Factual works including essays, biographies, and documentaries'],
            ['name' => 'Science', 'description' => 'Natural sciences, physics, chemistry, biology, and earth sciences'],
            ['name' => 'Technology', 'description' => 'Computer science, engineering, and information technology'],
            ['name' => 'History', 'description' => 'Historical events, civilizations, and cultural heritage'],
            ['name' => 'Mathematics', 'description' => 'Pure and applied mathematics, statistics, and calculus'],
            ['name' => 'Literature', 'description' => 'Classic and contemporary literary works and poetry'],
            ['name' => 'Reference', 'description' => 'Encyclopedias, dictionaries, atlases, and almanacs'],
            ['name' => 'Education', 'description' => 'Teaching methods, curriculum, and educational theory'],
            ['name' => 'Social Sciences', 'description' => 'Psychology, sociology, political science, and economics'],
            ['name' => 'Philosophy', 'description' => 'Philosophical works, ethics, and logic'],
            ['name' => 'Arts', 'description' => 'Visual arts, music, performing arts, and design'],
        ];

        foreach ($categories as $category) {
            Category::create($category);
        }
    }
}
