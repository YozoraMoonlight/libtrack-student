<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBookRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Only librarians manage the catalogue (panel requirement). This gate is
        // prefix-independent, so it covers both /admin and /librarian POSTs.
        return $this->user()?->isLibrarian() ?? false;
    }

    public function rules(): array
    {
        $user = $this->user();
        // Only super_admin and admin pick the school explicitly. School admins
        // and librarians are scoped to their own school server-side.
        $picksSchool = $user && in_array($user->user_role, ['super_admin', 'admin']);
        $schoolRule = $picksSchool ? 'required|exists:schools,id' : 'nullable';

        // ISBN is unique per school (same ISBN may exist at other schools).
        $effectiveSchoolId = $picksSchool ? $this->input('school_id') : $user?->school_id;

        return [
            'title' => 'required|string|max:255',
            'author' => 'required|string|max:255',
            'isbn' => ['nullable', 'string', 'max:50', Rule::unique('books', 'isbn')->where(fn ($q) => $q->where('school_id', $effectiveSchoolId))],
            'publisher' => 'nullable|string|max:255',
            'publication_year' => 'nullable|integer|min:1000|max:' . date('Y'),
            'category_id' => 'nullable|exists:categories,id',
            'school_id' => $schoolRule,
            'description' => 'nullable|string',
            'cover_image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
            // Upper bound matters now: each copy becomes a book_copies row with
            // its own QR label, so an unbounded value would fan out into that
            // many inserts and that many printed labels.
            'total_copies' => 'required|integer|min:1|max:1000',
            'location' => 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return ['isbn.unique' => 'A book with this ISBN already exists in this school.'];
    }
}
