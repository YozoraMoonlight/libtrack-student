import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import AdminLayout from '@/layouts/admin-layout';
import { Fine, Reservation, Transaction, User } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, Pencil, Trash2, User as UserIcon } from 'lucide-react';

interface ShowUserProps {
    user: User & {
        transactions?: Transaction[];
        fines?: Fine[];
        reservations?: Reservation[];
    };
    qrCode: string;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</span>
            <span className="text-sm text-gray-900 dark:text-gray-100">{value ?? '—'}</span>
        </div>
    );
}

export default function ShowUser({ user, qrCode }: ShowUserProps) {
    // Their QR never changes while the page is open.
    useLiveRefresh({ except: ['qrCode'] });
    // `user` is the record being viewed — the layout must use the logged-in user.
    const { auth } = usePage().props as { auth?: { user?: User } };
    const currentUser = auth?.user;
    const handleDelete = () => {
        if (!window.confirm(`Are you sure you want to delete "${user.name}"? This action cannot be undone.`)) return;
        router.delete(route('admin.users.destroy', user.id));
    };

    const unpaidFines = user.fines?.filter((f) => f.status === 'unpaid' || f.status === 'partial') ?? [];

    return (
        <AdminLayout user={currentUser}>
            <Head title={user.name} />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6 dark:bg-gray-900">
                <div className="mx-auto max-w-4xl flex flex-col gap-6">
                    {/* Header */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <Link href={route('admin.users.index')}>
                                <Button variant="outline" size="icon">
                                    <ArrowLeft size={16} />
                                </Button>
                            </Link>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">User Details</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link href={route('admin.users.edit', user.id)}>
                                <Button variant="outline" className="flex items-center gap-2">
                                    <Pencil size={15} />
                                    Edit
                                </Button>
                            </Link>
                            <Button
                                variant="destructive"
                                className="flex items-center gap-2"
                                onClick={handleDelete}
                            >
                                <Trash2 size={15} />
                                Delete
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Main info */}
                        <div className="flex flex-col gap-6 lg:col-span-2">
                            {/* User details card */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex flex-col gap-1">
                                            <CardTitle className="text-xl">{user.name}</CardTitle>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                                        </div>
                                        <StatusBadge status={user.is_active ? 'active' : 'inactive'} />
                                    </div>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-4">
                                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                        <DetailRow
                                            label="Role"
                                            value={
                                                <StatusBadge
                                                    status={user.user_role === 'user' ? 'student' : user.user_role}
                                                />
                                            }
                                        />
                                        {user.user_role === 'user' && <DetailRow label="LRN" value={user.lrn} />}
                                        <DetailRow label="Student ID" value={user.student_id} />
                                        <DetailRow label="Department" value={user.department} />
                                        <DetailRow label="Phone" value={user.phone} />
                                        <DetailRow
                                            label="Member Since"
                                            value={new Date(user.created_at).toLocaleDateString()}
                                        />
                                        <DetailRow
                                            label="Last Login"
                                            value={user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : null}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Borrowing history */}
                            {user.transactions && user.transactions.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Borrowing History</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0 pb-2">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Book</TableHead>
                                                    <TableHead>Borrowed</TableHead>
                                                    <TableHead>Due Date</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {user.transactions.map((tx) => (
                                                    <TableRow key={tx.id}>
                                                        <TableCell className="font-medium">
                                                            {tx.book?.title ?? `Book #${tx.book_id}`}
                                                        </TableCell>
                                                        <TableCell>
                                                            {new Date(tx.borrowed_at).toLocaleDateString()}
                                                        </TableCell>
                                                        <TableCell>
                                                            {new Date(tx.due_date).toLocaleDateString()}
                                                        </TableCell>
                                                        <TableCell>
                                                            <StatusBadge status={tx.status} />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Active fines */}
                            {unpaidFines.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Outstanding Fines</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0 pb-2">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead>Amount</TableHead>
                                                    <TableHead>Paid</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {unpaidFines.map((fine) => (
                                                    <TableRow key={fine.id}>
                                                        <TableCell className="capitalize">{fine.type}</TableCell>
                                                        <TableCell>${parseFloat(fine.amount).toFixed(2)}</TableCell>
                                                        <TableCell>${parseFloat(fine.paid_amount).toFixed(2)}</TableCell>
                                                        <TableCell>
                                                            <StatusBadge status={fine.status} />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Sidebar: avatar placeholder + QR */}
                        <div className="flex flex-col gap-6">
                            {/* Avatar card */}
                            <Card>
                                <CardContent className="flex items-center justify-center p-6">
                                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                                        <UserIcon size={40} className="text-gray-400" />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* QR code */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">QR Code</CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center gap-3">
                                    <img
                                        src={qrCode}
                                        alt={`QR code for ${user.name}`}
                                        className="h-40 w-40"
                                    />
                                    <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                                        Scan to identify this user
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
        </AdminLayout>
    );
}
