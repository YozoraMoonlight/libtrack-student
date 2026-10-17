import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AdminLayout from '@/layouts/admin-layout';
import { PHONE_MAX_LENGTH, PHONE_PATTERN, PHONE_PLACEHOLDER, formatPhoneInput } from '@/lib/phone';
import { User } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useRef } from 'react';

// Address type-ahead options, sourced live from the schools table by the
// controller. Because they come from real records, a deleted school can no
// longer auto-fill an address or appear as a suggestion.
interface AddressOption {
    name: string;
    address: string;
}

interface CreateSchoolProps {
    addressOptions?: AddressOption[];
}

export default function CreateSchool({ addressOptions = [] }: CreateSchoolProps) {
    const { auth } = usePage().props as any;
    const currentUser: User = auth?.user;

    // Distinct, non-empty addresses that power the datalist suggestions.
    const addressSuggestions = Array.from(
        new Set(addressOptions.map((option) => option.address).filter(Boolean)),
    );

    // Resolve an address from an existing school whose name matches what's been
    // typed (substring match either direction, so it works as you type). Live DB
    // data means a deleted school never resurfaces here.
    const officialAddressFor = (name: string): string | null => {
        const typed = name.trim().toLowerCase();
        if (typed.length < 3) return null;
        for (const option of addressOptions) {
            const optionName = option.name.toLowerCase();
            if (option.address && (optionName.includes(typed) || typed.includes(optionName))) {
                return option.address;
            }
        }
        return null;
    };

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        code: '',
        address: '',
        phone: '',
        email: '',
        is_active: true as boolean,
    });

    // Tracks the address we last auto-filled from the school name. While the
    // address field still holds that exact value (or is empty), it stays under
    // auto-fill control: changing the name re-fills it, clearing the name clears
    // it. The moment the user edits the address themselves, this ref diverges
    // from data.address and we stop overwriting their input.
    const autoFilledAddress = useRef('');

    const handleNameChange = (value: string) => {
        setData('name', value);
        // Only manage the address while it still holds our auto-filled value
        // (or is empty). If the user has typed their own address, leave it alone.
        if (data.address !== autoFilledAddress.current) return;
        // officialAddressFor returns null when the name matches nothing (incl.
        // when it's been cleared), so the address follows the name: a new match
        // replaces it, no match clears it.
        const official = officialAddressFor(value) ?? '';
        autoFilledAddress.current = official;
        setData('address', official);
    };

    const handleAddressChange = (value: string) => {
        setData('address', value);
        // If the user clears the address back to empty, let auto-fill resume.
        if (value === '') autoFilledAddress.current = '';
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.schools.store'));
    };

    return (
        <AdminLayout user={currentUser}>
            <Head title="Add School" />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6 dark:bg-gray-900">
                <div className="mx-auto flex max-w-3xl flex-col gap-6">
                    <div className="flex items-center gap-4">
                        <Link href={route('admin.schools.index')}>
                            <Button variant="outline" size="sm">Back</Button>
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Add School</h1>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>School Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="name">School Name <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="name"
                                            value={data.name}
                                            onChange={(e) => handleNameChange(e.target.value)}
                                            placeholder="e.g. Lumbia National High School"
                                            aria-invalid={!!errors.name}
                                        />
                                        {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="code">Code <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="code"
                                            value={data.code}
                                            onChange={(e) => setData('code', e.target.value)}
                                            placeholder="e.g. LNHS"
                                            aria-invalid={!!errors.code}
                                        />
                                        {errors.code && <p className="text-xs text-red-500">{errors.code}</p>}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="address">Address <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="address"
                                        list="cotabato-address-list"
                                        value={data.address}
                                        onChange={(e) => handleAddressChange(e.target.value)}
                                        placeholder="Street, barangay, city"
                                        aria-invalid={!!errors.address}
                                    />
                                    <datalist id="cotabato-address-list">
                                        {addressSuggestions.map((addr) => (
                                            <option key={addr} value={addr} />
                                        ))}
                                    </datalist>
                                    {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="phone">Phone</Label>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            inputMode="numeric"
                                            maxLength={PHONE_MAX_LENGTH}
                                            pattern={PHONE_PATTERN}
                                            value={data.phone}
                                            onChange={(e) => setData('phone', formatPhoneInput(e.target.value))}
                                            placeholder={PHONE_PLACEHOLDER}
                                            aria-invalid={!!errors.phone}
                                        />
                                        {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            placeholder="office@school.edu.ph"
                                            aria-invalid={!!errors.email}
                                        />
                                        {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        id="is_active"
                                        type="checkbox"
                                        checked={data.is_active}
                                        onChange={(e) => setData('is_active', e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
                                </div>

                                <div className="flex items-center justify-end gap-3">
                                    <Link href={route('admin.schools.index')}>
                                        <Button type="button" variant="outline">Cancel</Button>
                                    </Link>
                                    <Button type="submit" disabled={processing}>
                                        {processing ? 'Creating...' : 'Create School'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </AdminLayout>
    );
}
