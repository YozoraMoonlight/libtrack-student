import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import UserLayout from '@/layouts/user-layout';
import { Fine, PaginatedResponse, User } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Receipt } from 'lucide-react';

interface FinesIndexProps {
    user: User;
    fines: PaginatedResponse<Fine>;
    totalUnpaid: number;
}

export default function FinesIndex({ user, fines, totalUnpaid }: FinesIndexProps) {
    useLiveRefresh();
    const flash = (usePage().props as any).flash || {};

    return (
        <UserLayout user={user}>
            <Head title="My Fines" />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6 dark:bg-gray-900">
                <div className="flex flex-col gap-6">
                    {/* Page header */}
                    <div className="flex flex-col gap-2">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Fines</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {fines.total} fine{fines.total !== 1 ? 's' : ''} total
                        </p>
                    </div>

                    {/* Flash messages */}
                    {flash.success && (
                        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400">
                            {flash.success}
                        </div>
                    )}
                    {flash.error && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
                            {flash.error}
                        </div>
                    )}

                    {/* Summary card */}
                    <Card className="dark:border-gray-700 dark:bg-gray-800">
                        <CardContent className="flex items-center gap-4 p-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                                <Receipt size={22} className="text-red-600 dark:text-red-400" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Total Unpaid
                                </p>
                                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                                    ₱{totalUnpaid.toFixed(2)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Table */}
                    <div className="rounded-xl border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Book Title</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Paid</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fines.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-16 text-center">
                                            <Receipt size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                                            <p className="text-base font-medium text-gray-500 dark:text-gray-400">No fines</p>
                                            <p className="text-sm text-gray-400 dark:text-gray-500">
                                                You have no outstanding fines
                                            </p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    fines.data.map((fine) => (
                                        <TableRow key={fine.id}>
                                            <TableCell className="font-medium">
                                                {fine.transaction?.book?.title
                                                    ?? fine.description
                                                    ?? (fine.type === 'lost' ? 'Lost book fee' : fine.type === 'damaged' ? 'Damaged book fee' : 'Manual fine')}
                                            </TableCell>
                                            <TableCell className="capitalize">{fine.type}</TableCell>
                                            <TableCell>₱{parseFloat(fine.amount).toFixed(2)}</TableCell>
                                            <TableCell>₱{parseFloat(fine.paid_amount).toFixed(2)}</TableCell>
                                            <TableCell>
                                                <StatusBadge status={fine.status} />
                                            </TableCell>
                                            <TableCell>
                                                {new Date(fine.created_at).toLocaleDateString()}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {fines.last_page > 1 && (
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                            <span>
                                Showing {fines.from ?? 0}–{fines.to ?? 0} of {fines.total} results
                            </span>
                            <div className="flex gap-1">
                                {fines.links.map((link, i) => (
                                    <Button
                                        key={i}
                                        variant={link.active ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url)}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className="min-w-8"
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </UserLayout>
    );
}
