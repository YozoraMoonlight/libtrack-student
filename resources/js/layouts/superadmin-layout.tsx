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
    Building2,
    ChevronDown,
    Crown,
    LayoutDashboard,
    LogOut,
    Menu,
    Settings,
    UserCog,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

interface User {
    name: string;
    email: string;
    user_role?: string;
}

interface SuperAdminLayoutProps {
    user?: User;
    children: ReactNode;
}

const NAV_ITEMS = [
    { name: 'Dashboard', href: '/superadmin/dashboard', icon: LayoutDashboard, prefix: '/superadmin/dashboard' },
    { name: 'Schools', href: '/admin/schools', icon: Building2, prefix: '/admin/schools' },
    { name: 'School Admins', href: '/superadmin/school-admins', icon: UserCog, prefix: '/superadmin/school-admins' },
];

export default function SuperAdminLayout({ user: userProp, children }: SuperAdminLayoutProps) {
    const { url, props } = usePage();
    const auth = (props as any).auth;
    const user: User = userProp || auth?.user || { name: 'User', email: '' };
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const isActive = (prefix: string) => url.startsWith(prefix);

    const SidebarContent = () => (
        <div className="flex h-full flex-col bg-[#1c1917]">
            {/* Brand */}
            <div className="flex h-14 items-center gap-3 border-b border-white/[0.06] px-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                    <Crown className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                    <span className="block text-sm font-bold tracking-tight text-white">LIBTRACK</span>
                    <span className="block text-[10px] font-semibold uppercase tracking-widest text-amber-400/70">Super Admin</span>
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
                                        ? 'bg-amber-500/10 text-amber-400 font-medium'
                                        : 'text-stone-400 hover:bg-white/[0.05] hover:text-stone-200'
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
            <div className="border-t border-white/[0.06] p-3">
                <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8 border border-white/10">
                        <AvatarFallback className="bg-amber-500/10 text-xs font-bold text-amber-400">
                            {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-xs font-semibold text-stone-200">{user.name}</span>
                        <span className="truncate text-[10px] text-stone-500">Platform Owner</span>
                    </div>
                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                            <button className="flex h-7 w-7 items-center justify-center rounded-md text-stone-500 transition-colors hover:bg-white/[0.05] hover:text-stone-300">
                                <ChevronDown size={14} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/admin/settings" className="flex w-full cursor-pointer items-center gap-2">
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
        <div className="flex h-screen bg-[#f5f5f4]">
            <div className="hidden w-56 shrink-0 flex-col md:flex">
                <SidebarContent />
            </div>

            {sidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
                    <div className="fixed inset-y-0 left-0 z-50 flex w-56 flex-col"><SidebarContent /></div>
                </div>
            )}

            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="flex h-14 items-center border-b border-stone-200 bg-white px-4 md:px-6">
                    <Button variant="ghost" size="icon" className="mr-2 text-stone-500 md:hidden" onClick={() => setSidebarOpen(true)}>
                        <Menu size={20} />
                    </Button>
                    <div className="flex flex-1 items-center justify-end gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                            <Crown size={11} />
                            Super Admin
                        </span>
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
