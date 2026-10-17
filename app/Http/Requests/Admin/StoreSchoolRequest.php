<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreSchoolRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255|unique:schools,name',
            'code' => 'required|string|max:50|unique:schools,code',
            'address' => 'required|string|max:255',
            'phone' => ['nullable', 'regex:/^09\d{9}$/'],
            'email' => 'nullable|email|max:255',
            'is_active' => 'boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'address.required' => 'Enter the school\'s exact address.',
            'phone.regex' => 'Use the 09XXXXXXXXX format (e.g. 09171234567).',
        ];
    }
}
