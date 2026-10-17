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
import { BookOpen, ChevronDown, LayoutDashboard, LogOut, Menu, Receipt, Search, Settings } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

interface User {
    name: string;
    email: string;
}

interface UserLayoutProps {
    user?: User;
    children: ReactNode;
}

const navItems = [
    { name: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard, routePrefix: '/student/dashboard' },
    { name: 'Browse Books', href: '/books', icon: Search, routePrefix: '/books' },
    { name: 'My Borrowings', href: '/borrowings', icon: BookOpen, routePrefix: '/borrowings' },
    { name: 'My Fines', href: '/my-fines', icon: Receipt, routePrefix: '/my-fines' },
];

export default function UserLayout({ user: userProp, children }: UserLayoutProps) {
    const { url, props } = usePage();
    const auth = (props as any).auth;
    const user: User = userProp || auth?.user || { name: 'User', email: '' };
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const isActive = (prefix: string) => url === prefix || url.startsWith(prefix + '/') || url.startsWith(prefix + '?');

    const SidebarContent = () => (
        <div className="flex h-full flex-col border-r border-stone-200 bg-white">
            {/* Brand */}
            <div className="flex h-14 items-center gap-3 border-b border-stone-100 px-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                    <BookOpen className="h-4 w-4 text-amber-700" />
                </div>
                <div>
                    <span className="block text-sm font-bold tracking-tight text-stone-900">LIBTRACK</span>
                    <span className="block text-[10px] font-semibold uppercase tracking-widest text-amber-600/70">Student</span>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-auto py-3">
                <nav className="grid gap-0.5 px-3">
                    {navItems.map((item) => {
                        const active = isActive(item.routePrefix);
                        return (
                            <Link href={item.href} key={item.name} className="w-full" onClick={() => setSidebarOpen(false)}>
                                <div className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                                    active
                                        ? 'bg-amber-50 text-amber-800 font-medium'
                                        : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
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
            <div className="border-t border-stone-100 p-3">
                <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8 border border-stone-200">
                        <AvatarFallback className="bg-amber-50 text-xs font-bold text-amber-800">
                            {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-xs font-semibold text-stone-800">{user.name}</span>
                        <span className="truncate text-[10px] text-stone-400">{user.email}</span>
                    </div>
                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                            <button className="flex h-7 w-7 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600">
                                <ChevronDown size={14} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href={route('user.settings')} className="flex w-full cursor-pointer items-center gap-2">
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
        <div className="flex h-screen bg-stone-50">
            <div className="hidden w-60 shrink-0 flex-col md:flex">
                <SidebarContent />
            </div>

            {sidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
                    <div className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col"><SidebarContent /></div>
                </div>
            )}

            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="flex h-14 items-center border-b border-stone-200 bg-white px-4 md:px-6">
                    <Button variant="ghost" size="icon" className="mr-2 text-stone-500 md:hidden" onClick={() => setSidebarOpen(true)}>
                        <Menu size={20} />
                    </Button>
                    <div className="flex flex-1 items-center justify-end">
                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-stone-600 transition-colors hover:bg-stone-100">
                                    <Avatar className="h-8 w-8 border border-stone-200">
                                        <AvatarFallback className="bg-amber-50 text-xs font-semibold text-amber-800">
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
                                    <Link href={route('user.settings')} className="flex w-full cursor-pointer items-center gap-2">
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
