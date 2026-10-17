import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link, usePage } from '@inertiajs/react';
import {
    ArrowLeftRight,
    BookOpen,
    ChevronDown,
    FolderTree,
    LayoutDashboard,
    Library,
    Lock,
    LogOut,
    Menu,
    Receipt,
    Settings,
    Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

interface User {
    name: string;
    email: string;
    school_name?: string | null;
}

interface LibrarianLayoutProps {
    user?: User;
    children: ReactNode;
}

const NAV_ITEMS = [
    { name: 'Dashboard', href: '/librarian/dashboard', icon: LayoutDashboard, prefix: '/librarian/dashboard' },
    { name: 'Circulation', href: '/librarian/circulation', icon: ArrowLeftRight, prefix: '/librarian/circulation' },
    { name: 'Books', href: '/librarian/books', icon: BookOpen, prefix: '/librarian/books' },
    { name: 'Categories', href: '/librarian/categories', icon: FolderTree, prefix: '/librarian/categories' },
    { name: 'Students', href: '/librarian/students', icon: Users, prefix: '/librarian/students' },
    { name: 'Fines', href: '/librarian/fines', icon: Receipt, prefix: '/librarian/fines' },
    { name: 'Credential Holds', href: '/librarian/credential-holds', icon: Lock, prefix: '/librarian/credential-holds' },
];

export default function LibrarianLayout({ user: userProp, children }: LibrarianLayoutProps) {
    const { url, props } = usePage();
    const auth = (props as any).auth;
    const user: User = userProp || auth?.user || { name: 'Librarian', email: '' };
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const isActive = (prefix: string) => url.startsWith(prefix);

    const SidebarContent = () => (
        <div className="flex h-full flex-col bg-[#0d3330]">
            {/* Brand */}
            <div className="flex h-14 items-center gap-3 border-b border-white/[0.07] px-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-400/10">
                    <Library className="h-4 w-4 text-teal-300" />
                </div>
                <div>
                    <span className="block text-sm font-bold tracking-tight text-white">LIBTRACK</span>
                    <span className="block text-[10px] font-semibold uppercase tracking-widest text-teal-300/70">Librarian Desk</span>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-auto py-3">
                <nav className="grid gap-0.5 px-3">
                    {NAV_ITEMS.map((item) => {
                        const active = isActive(item.prefix);
                        return (
                            <Link href={item.href} key={item.name} className="w-full" onClick={() => setSidebarOpen(false)}>
                                <div className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                                    active
                                        ? 'bg-teal-400/10 text-teal-300 font-medium'
                                        : 'text-teal-100/40 hover:bg-white/[0.05] hover:text-teal-100'
                                }`}>
                                    <item.icon size={16} />
                                    {item.name}
                                </div>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* User footer */}
            <div className="border-t border-white/[0.07] p-3">
                <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8 border border-white/10">
                        <AvatarFallback className="bg-teal-400/10 text-xs font-bold text-teal-300">
                            {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-xs font-semibold text-teal-100">{user.name}</span>
                        <span className="truncate text-[10px] text-teal-300/50">{user.school_name ?? 'Librarian'}</span>
                    </div>
                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                            <button className="flex h-7 w-7 items-center justify-center rounded-md text-teal-300/40 transition-colors hover:bg-white/[0.05] hover:text-teal-200">
                                <ChevronDown size={14} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/librarian/settings" className="flex w-full cursor-pointer items-center gap-2">
                                    <Settings size={16} />Settings
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href={route('auth.logout')} className="flex w-full cursor-pointer items-center gap-2 text-red-600">
                                    <LogOut size={16} />Logout
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-[#f0faf8]">
            <div className="hidden w-64 shrink-0 flex-col md:flex">
                <SidebarContent />
            </div>

            {sidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
                    <div className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col"><SidebarContent /></div>
                </div>
            )}

            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="flex h-14 items-center border-b border-teal-100 bg-white px-4 md:px-6">
                    <Button variant="ghost" size="icon" className="mr-2 text-stone-500 md:hidden" onClick={() => setSidebarOpen(true)}>
                        <Menu size={20} />
                    </Button>
                    {user.school_name && (
                        <span className="hidden text-xs font-medium text-teal-700 md:inline">{user.school_name}</span>
                    )}
                    <div className="flex flex-1 items-center justify-end">
                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-stone-600 transition-colors hover:bg-teal-50">
                                    <Avatar className="h-8 w-8 border border-teal-200">
                                        <AvatarFallback className="bg-teal-50 text-xs font-semibold text-teal-700">
                                            {user.name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="hidden text-sm font-medium md:inline-flex">{user.name}</span>
                                    <ChevronDown size={14} className="text-stone-400" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>
                                    <div className="flex flex-col">
                                        <span>{user.name}</span>
                                        <span className="text-xs font-normal text-stone-500">{user.email}</span>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/librarian/settings" className="flex w-full cursor-pointer items-center gap-2">
                                        <Settings size={16} />Settings
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href={route('auth.logout')} className="flex w-full cursor-pointer items-center gap-2 text-red-600">
                                        <LogOut size={16} />Logout
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
