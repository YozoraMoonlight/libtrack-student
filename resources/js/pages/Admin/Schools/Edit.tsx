import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AdminLayout from '@/layouts/admin-layout';
import { PHONE_MAX_LENGTH, PHONE_PATTERN, PHONE_PLACEHOLDER, formatPhoneInput } from '@/lib/phone';
import { User } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';

// Address suggestions are sourced live from the schools table by the
// controller, so a deleted school no longer appears as a type-ahead option.
interface AddressOption {
    name: string;
    address: string;
}

interface School {
    id: number;
    name: string;
    code: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    is_active: boolean;
}

interface EditSchoolProps {
    school: School;
    addressOptions?: AddressOption[];
}

export default function EditSchool({ school, addressOptions = [] }: EditSchoolProps) {
    const { auth } = usePage().props as any;
    const currentUser: User = auth?.user;

    // Distinct, non-empty addresses that power the datalist suggestions.
    const addressSuggestions = Array.from(
        new Set(addressOptions.map((option) => option.address).filter(Boolean)),
    );

    const { data, setData, put, processing, errors } = useForm({
        name: school.name,
        code: school.code,
        address: school.address ?? '',
        phone: school.phone ?? '',
        email: school.email ?? '',
        is_active: school.is_active,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('admin.schools.update', school.id));
    };

    return (
        <AdminLayout user={currentUser}>
            <Head title={`Edit: ${school.name}`} />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6 dark:bg-gray-900">
                <div className="mx-auto flex max-w-3xl flex-col gap-6">
                    <div className="flex items-center gap-4">
                        <Link href={route('admin.schools.index')}>
                            <Button variant="outline" size="sm">Back</Button>
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit School</h1>
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
                                            onChange={(e) => setData('name', e.target.value)}
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
                                        onChange={(e) => setData('address', e.target.value)}
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
                                        {processing ? 'Saving...' : 'Save Changes'}
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
