<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Book;
use App\Models\Category;
use App\Models\School;

class BookSeeder extends Seeder
{
    public function run(): void
    {
        $categories = Category::pluck('id', 'name');
        $lnhsId = School::where('code', 'LNHS')->value('id');
        $xuhsId = School::where('code', 'XUHS')->value('id');
        $schoolIds = array_values(array_filter([$lnhsId, $xuhsId]));

        $books = [
            // Fiction
            ['title' => 'To Kill a Mockingbird', 'author' => 'Harper Lee', 'isbn' => '978-0061120084', 'category' => 'Fiction', 'publisher' => 'Harper Perennial', 'publication_year' => 1960, 'total_copies' => 3, 'location' => 'Shelf A1'],
            ['title' => '1984', 'author' => 'George Orwell', 'isbn' => '978-0451524935', 'category' => 'Fiction', 'publisher' => 'Signet Classic', 'publication_year' => 1949, 'total_copies' => 2, 'location' => 'Shelf A1'],
            ['title' => 'The Great Gatsby', 'author' => 'F. Scott Fitzgerald', 'isbn' => '978-0743273565', 'category' => 'Fiction', 'publisher' => 'Scribner', 'publication_year' => 1925, 'total_copies' => 2, 'location' => 'Shelf A2'],
            ['title' => 'Pride and Prejudice', 'author' => 'Jane Austen', 'isbn' => '978-0141439518', 'category' => 'Fiction', 'publisher' => 'Penguin Classics', 'publication_year' => 1813, 'total_copies' => 2, 'location' => 'Shelf A2'],
            ['title' => 'The Catcher in the Rye', 'author' => 'J.D. Salinger', 'isbn' => '978-0316769488', 'category' => 'Fiction', 'publisher' => 'Little, Brown', 'publication_year' => 1951, 'total_copies' => 2, 'location' => 'Shelf A3'],

            // Science
            ['title' => 'A Brief History of Time', 'author' => 'Stephen Hawking', 'isbn' => '978-0553380163', 'category' => 'Science', 'publisher' => 'Bantam', 'publication_year' => 1988, 'total_copies' => 2, 'location' => 'Shelf B1'],
            ['title' => 'The Selfish Gene', 'author' => 'Richard Dawkins', 'isbn' => '978-0199291151', 'category' => 'Science', 'publisher' => 'Oxford University Press', 'publication_year' => 1976, 'total_copies' => 1, 'location' => 'Shelf B1'],
            ['title' => 'Cosmos', 'author' => 'Carl Sagan', 'isbn' => '978-0345539434', 'category' => 'Science', 'publisher' => 'Ballantine Books', 'publication_year' => 1980, 'total_copies' => 2, 'location' => 'Shelf B2'],
            ['title' => 'The Origin of Species', 'author' => 'Charles Darwin', 'isbn' => '978-0451529060', 'category' => 'Science', 'publisher' => 'Signet', 'publication_year' => 1859, 'total_copies' => 1, 'location' => 'Shelf B2'],

            // Technology
            ['title' => 'Clean Code', 'author' => 'Robert C. Martin', 'isbn' => '978-0132350884', 'category' => 'Technology', 'publisher' => 'Prentice Hall', 'publication_year' => 2008, 'total_copies' => 3, 'location' => 'Shelf C1'],
            ['title' => 'The Pragmatic Programmer', 'author' => 'David Thomas & Andrew Hunt', 'isbn' => '978-0135957059', 'category' => 'Technology', 'publisher' => 'Addison-Wesley', 'publication_year' => 2019, 'total_copies' => 2, 'location' => 'Shelf C1'],
            ['title' => 'Introduction to Algorithms', 'author' => 'Thomas H. Cormen', 'isbn' => '978-0262033848', 'category' => 'Technology', 'publisher' => 'MIT Press', 'publication_year' => 2009, 'total_copies' => 3, 'location' => 'Shelf C2'],
            ['title' => 'Design Patterns', 'author' => 'Erich Gamma et al.', 'isbn' => '978-0201633610', 'category' => 'Technology', 'publisher' => 'Addison-Wesley', 'publication_year' => 1994, 'total_copies' => 2, 'location' => 'Shelf C2'],
            ['title' => 'Database System Concepts', 'author' => 'Abraham Silberschatz', 'isbn' => '978-0078022159', 'category' => 'Technology', 'publisher' => 'McGraw-Hill', 'publication_year' => 2019, 'total_copies' => 2, 'location' => 'Shelf C3'],

            // History
            ['title' => 'Sapiens: A Brief History of Humankind', 'author' => 'Yuval Noah Harari', 'isbn' => '978-0062316097', 'category' => 'History', 'publisher' => 'Harper', 'publication_year' => 2015, 'total_copies' => 2, 'location' => 'Shelf D1'],
            ['title' => 'Guns, Germs, and Steel', 'author' => 'Jared Diamond', 'isbn' => '978-0393354324', 'category' => 'History', 'publisher' => 'W.W. Norton', 'publication_year' => 1997, 'total_copies' => 1, 'location' => 'Shelf D1'],
            ['title' => 'The Art of War', 'author' => 'Sun Tzu', 'isbn' => '978-1599869773', 'category' => 'History', 'publisher' => 'Filiquarian', 'publication_year' => -500, 'total_copies' => 2, 'location' => 'Shelf D2'],
            ['title' => 'Rizal Without the Overcoat', 'author' => 'Ambeth Ocampo', 'isbn' => '978-9712700491', 'category' => 'History', 'publisher' => 'Anvil Publishing', 'publication_year' => 2000, 'total_copies' => 3, 'location' => 'Shelf D2'],

            // Mathematics
            ['title' => 'Calculus: Early Transcendentals', 'author' => 'James Stewart', 'isbn' => '978-1285741550', 'category' => 'Mathematics', 'publisher' => 'Cengage Learning', 'publication_year' => 2015, 'total_copies' => 4, 'location' => 'Shelf E1'],
            ['title' => 'Linear Algebra and Its Applications', 'author' => 'David C. Lay', 'isbn' => '978-0321982384', 'category' => 'Mathematics', 'publisher' => 'Pearson', 'publication_year' => 2015, 'total_copies' => 3, 'location' => 'Shelf E1'],
            ['title' => 'Probability and Statistics', 'author' => 'Morris DeGroot', 'isbn' => '978-0321500465', 'category' => 'Mathematics', 'publisher' => 'Pearson', 'publication_year' => 2011, 'total_copies' => 2, 'location' => 'Shelf E2'],

            // Literature
            ['title' => 'Noli Me Tangere', 'author' => 'Jose Rizal', 'isbn' => '978-9712700125', 'category' => 'Literature', 'publisher' => 'Anvil Publishing', 'publication_year' => 1887, 'total_copies' => 5, 'location' => 'Shelf F1'],
            ['title' => 'El Filibusterismo', 'author' => 'Jose Rizal', 'isbn' => '978-9712700132', 'category' => 'Literature', 'publisher' => 'Anvil Publishing', 'publication_year' => 1891, 'total_copies' => 5, 'location' => 'Shelf F1'],
            ['title' => 'The Complete Works of Shakespeare', 'author' => 'William Shakespeare', 'isbn' => '978-0141000589', 'category' => 'Literature', 'publisher' => 'Penguin', 'publication_year' => 1623, 'total_copies' => 2, 'location' => 'Shelf F2'],

            // Education
            ['title' => 'The Art of Teaching', 'author' => 'Gilbert Highet', 'isbn' => '978-0679723141', 'category' => 'Education', 'publisher' => 'Vintage', 'publication_year' => 1989, 'total_copies' => 2, 'location' => 'Shelf G1'],
            ['title' => 'Pedagogy of the Oppressed', 'author' => 'Paulo Freire', 'isbn' => '978-0826412768', 'category' => 'Education', 'publisher' => 'Bloomsbury', 'publication_year' => 1968, 'total_copies' => 2, 'location' => 'Shelf G1'],

            // Social Sciences
            ['title' => 'Thinking, Fast and Slow', 'author' => 'Daniel Kahneman', 'isbn' => '978-0374533557', 'category' => 'Social Sciences', 'publisher' => 'Farrar, Straus and Giroux', 'publication_year' => 2011, 'total_copies' => 2, 'location' => 'Shelf H1'],
            ['title' => 'Outliers', 'author' => 'Malcolm Gladwell', 'isbn' => '978-0316017930', 'category' => 'Social Sciences', 'publisher' => 'Little, Brown', 'publication_year' => 2008, 'total_copies' => 2, 'location' => 'Shelf H1'],

            // Philosophy
            ['title' => 'Meditations', 'author' => 'Marcus Aurelius', 'isbn' => '978-0140449334', 'category' => 'Philosophy', 'publisher' => 'Penguin Classics', 'publication_year' => 180, 'total_copies' => 2, 'location' => 'Shelf I1'],
            ['title' => 'The Republic', 'author' => 'Plato', 'isbn' => '978-0140455113', 'category' => 'Philosophy', 'publisher' => 'Penguin Classics', 'publication_year' => -380, 'total_copies' => 2, 'location' => 'Shelf I1'],

            // Reference
            ['title' => 'Merriam-Webster Dictionary', 'author' => 'Merriam-Webster', 'isbn' => '978-0877792956', 'category' => 'Reference', 'publisher' => 'Merriam-Webster', 'publication_year' => 2016, 'total_copies' => 3, 'location' => 'Shelf J1'],
            ['title' => 'World Atlas', 'author' => 'National Geographic', 'isbn' => '978-1426220586', 'category' => 'Reference', 'publisher' => 'National Geographic', 'publication_year' => 2018, 'total_copies' => 2, 'location' => 'Shelf J1'],

            // Arts
            ['title' => 'The Story of Art', 'author' => 'E.H. Gombrich', 'isbn' => '978-0714832470', 'category' => 'Arts', 'publisher' => 'Phaidon Press', 'publication_year' => 1950, 'total_copies' => 1, 'location' => 'Shelf K1'],
            ['title' => 'Ways of Seeing', 'author' => 'John Berger', 'isbn' => '978-0140135152', 'category' => 'Arts', 'publisher' => 'Penguin', 'publication_year' => 1972, 'total_copies' => 1, 'location' => 'Shelf K1'],

            // Non-Fiction
            ['title' => 'Atomic Habits', 'author' => 'James Clear', 'isbn' => '978-0735211292', 'category' => 'Non-Fiction', 'publisher' => 'Avery', 'publication_year' => 2018, 'total_copies' => 3, 'location' => 'Shelf L1'],
            ['title' => 'The 7 Habits of Highly Effective People', 'author' => 'Stephen Covey', 'isbn' => '978-1982137274', 'category' => 'Non-Fiction', 'publisher' => 'Simon & Schuster', 'publication_year' => 1989, 'total_copies' => 2, 'location' => 'Shelf L1'],
            ['title' => 'Rich Dad Poor Dad', 'author' => 'Robert Kiyosaki', 'isbn' => '978-1612680194', 'category' => 'Non-Fiction', 'publisher' => 'Plata Publishing', 'publication_year' => 1997, 'total_copies' => 2, 'location' => 'Shelf L2'],
        ];

        foreach ($books as $i => $bookData) {
            $categoryName = $bookData['category'];
            unset($bookData['category']);
            $bookData['category_id'] = $categories[$categoryName] ?? null;
            $bookData['available_copies'] = $bookData['total_copies'];
            $bookData['status'] = 'available';
            if (!empty($schoolIds)) {
                $bookData['school_id'] = $schoolIds[$i % count($schoolIds)];
            }

            Book::create($bookData);
        }
    }
}
