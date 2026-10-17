import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';
import { BookOpen, QrCode, BarChart3, Bell, Search, ShieldCheck, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

const features = [
    {
        icon: BookOpen,
        title: 'Catalog Management',
        description: 'Manage your entire collection with rich metadata, categories, and real-time availability tracking.',
        accent: 'from-amber-500 to-orange-600',
    },
    {
        icon: QrCode,
        title: 'QR Code System',
        description: 'Generate unique QR codes for every book. Scan to borrow, return, or look up details instantly.',
        accent: 'from-emerald-500 to-teal-600',
    },
    {
        icon: Search,
        title: 'Search & Browse',
        description: 'Students browse the catalog, check availability, and track borrowings — all self-service.',
        accent: 'from-sky-500 to-blue-600',
    },
    {
        icon: BarChart3,
        title: 'Reports & Analytics',
        description: 'Borrowing trends, overdue reports, and inventory insights at your fingertips.',
        accent: 'from-violet-500 to-purple-600',
    },
    {
        icon: Bell,
        title: 'Fine Automation',
        description: 'Overdue detection runs automatically. Fines calculate on the spot. No manual work.',
        accent: 'from-rose-500 to-red-600',
    },
    {
        icon: ShieldCheck,
        title: 'Role-Based Access',
        description: 'Three tiers — admin, librarian, student — each with a tailored dashboard and permissions.',
        accent: 'from-slate-500 to-gray-700',
    },
];

const stats = [
    { value: '10', label: 'Modules', suffix: '' },
    { value: '3', label: 'User Roles', suffix: '' },
    { value: 'QR', label: 'Powered', suffix: '' },
    { value: '100', label: 'Uptime', suffix: '%' },
];

function AnimatedCounter({ target, suffix = '' }: { target: string; suffix?: string }) {
    const [count, setCount] = useState(0);
    const [visible, setVisible] = useState(false);
    const isNumeric = !isNaN(Number(target));

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 300);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!visible || !isNumeric) return;
        const end = parseInt(target);
        const duration = 1200;
        const steps = 30;
        const increment = end / steps;
        let current = 0;
        const interval = setInterval(() => {
            current += increment;
            if (current >= end) {
                setCount(end);
                clearInterval(interval);
            } else {
                setCount(Math.floor(current));
            }
        }, duration / steps);
        return () => clearInterval(interval);
    }, [visible, target]);

    if (!isNumeric) return <>{target}</>;
    return <>{count}{suffix}</>;
}

export default function Welcome() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <>
            <Head title="LIBTRACK - Library Management System">
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=General+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </Head>

            <style>{`
                .font-display { font-family: 'DM Serif Display', serif; }
                .font-body { font-family: 'General Sans', sans-serif; }

                @keyframes fade-up {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scale-in {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes slide-right {
                    from { opacity: 0; transform: translateX(-20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-8px); }
                }
                @keyframes grain {
                    0%, 100% { transform: translate(0, 0); }
                    10% { transform: translate(-5%, -10%); }
                    20% { transform: translate(-15%, 5%); }
                    30% { transform: translate(7%, -25%); }
                    40% { transform: translate(-5%, 25%); }
                    50% { transform: translate(-15%, 10%); }
                    60% { transform: translate(15%, 0%); }
                    70% { transform: translate(0%, 15%); }
                    80% { transform: translate(3%, 35%); }
                    90% { transform: translate(-10%, 10%); }
                }

                .animate-fade-up { animation: fade-up 0.8s ease-out both; }
                .animate-fade-in { animation: fade-in 0.6s ease-out both; }
                .animate-scale-in { animation: scale-in 0.6s ease-out both; }
                .animate-slide-right { animation: slide-right 0.6s ease-out both; }
                .animate-float { animation: float 3s ease-in-out infinite; }

                .delay-100 { animation-delay: 100ms; }
                .delay-200 { animation-delay: 200ms; }
                .delay-300 { animation-delay: 300ms; }
                .delay-400 { animation-delay: 400ms; }
                .delay-500 { animation-delay: 500ms; }
                .delay-600 { animation-delay: 600ms; }
                .delay-700 { animation-delay: 700ms; }

                .hero-grain::after {
                    content: '';
                    position: absolute;
                    inset: -200%;
                    width: 400%;
                    height: 400%;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E");
                    opacity: 0.03;
                    pointer-events: none;
                    animation: grain 8s steps(10) infinite;
                }

                .feature-card {
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .feature-card:hover {
                    transform: translateY(-4px);
                }
                .feature-card:hover .feature-icon-ring {
                    transform: scale(1.1) rotate(5deg);
                }
                .feature-icon-ring {
                    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }
            `}</style>

            <div className="font-body min-h-screen bg-[#faf9f7]">
                {/* ─── Navbar ─── */}
                <nav className={`fixed top-0 z-50 w-full transition-all duration-300 ${
                    scrolled
                        ? 'bg-[#faf9f7]/90 shadow-sm backdrop-blur-xl border-b border-stone-200/60'
                        : 'bg-transparent'
                }`}>
                    <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6 lg:px-8">
                        <Link href="/" className="flex items-center gap-2.5 group">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all group-hover:scale-105 ${
                                scrolled ? 'bg-stone-900' : 'bg-white/10 backdrop-blur-sm border border-white/20'
                            }`}>
                                <BookOpen className="h-4.5 w-4.5 text-amber-400" />
                            </div>
                            <span className={`text-xl font-bold tracking-tight transition-colors ${
                                scrolled ? 'text-stone-900' : 'text-white'
                            }`}>LIBTRACK</span>
                        </Link>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" className={`transition-colors ${
                                scrolled
                                    ? 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                                    : 'text-stone-300 hover:text-white hover:bg-white/10'
                            }`} asChild>
                                <Link href={route('auth.login')}>Log in</Link>
                            </Button>
                            <Button className={`shadow-md rounded-lg px-5 transition-all ${
                                scrolled
                                    ? 'bg-stone-900 text-white hover:bg-stone-800 shadow-stone-900/10'
                                    : 'bg-amber-500 text-stone-950 hover:bg-amber-400 shadow-amber-500/20'
                            }`} asChild>
                                <Link href={route('auth.register')}>Get Started <ArrowRight className="ml-1 h-4 w-4" /></Link>
                            </Button>
                        </div>
                    </div>
                </nav>

                {/* ─── Hero ─── */}
                <section className="relative min-h-[100vh] overflow-hidden">
                    {/* Layered gradient background */}
                    <div className="absolute inset-0">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1612] via-[#1e1a15] to-[#15120e]" />
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(180,130,50,0.15),transparent)]" />
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_75%_50%,rgba(180,140,60,0.06),transparent)]" />
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_20%_80%,rgba(120,80,40,0.08),transparent)]" />
                    </div>

                    {/* Grain overlay */}
                    <div className="hero-grain absolute inset-0 pointer-events-none" />

                    {/* Grid pattern overlay */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                        backgroundSize: '60px 60px',
                    }} />

                    {/* Decorative geometric elements */}
                    <div className="absolute top-[15%] right-[15%] h-96 w-96 rounded-full border border-amber-500/[0.07] animate-float" />
                    <div className="absolute top-[25%] right-[20%] h-64 w-64 rounded-full border border-amber-500/[0.05] animate-float delay-500" />
                    <div className="absolute top-[35%] right-[25%] h-40 w-40 rounded-full border border-amber-500/[0.03] animate-float delay-300" />
                    <div className="absolute bottom-[20%] left-[3%] h-48 w-48 rounded-full bg-amber-500/[0.04] blur-3xl" />
                    <div className="absolute top-[10%] left-[10%] h-24 w-24 rounded-full bg-amber-600/[0.03] blur-2xl" />

                    {/* Floating decorative line accents */}
                    <div className="absolute top-[30%] left-0 w-[200px] h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
                    <div className="absolute bottom-[40%] right-0 w-[150px] h-px bg-gradient-to-l from-transparent via-amber-500/15 to-transparent" />

                    <div className="relative mx-auto flex min-h-[100vh] max-w-7xl flex-col items-start justify-center px-6 lg:px-8">
                        <div className="max-w-3xl pt-20 lg:pt-0">
                            <div className="animate-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 py-1.5 pl-2 pr-4 backdrop-blur-sm">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20">
                                    <BookOpen className="h-3.5 w-3.5 text-amber-400" />
                                </span>
                                <span className="text-sm font-medium text-amber-300/90">Library Management System</span>
                            </div>

                            <h1 className="font-display animate-fade-up delay-100 text-5xl leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl">
                                Where every book<br />
                                <span className="text-amber-400">finds its reader.</span>
                            </h1>

                            <p className="animate-fade-up delay-200 mt-7 max-w-xl text-lg leading-relaxed text-stone-400">
                                LIBTRACK is the modern library platform that brings together catalog management, QR-powered circulation, and real-time analytics — so your library runs itself.
                            </p>

                            {/* Trust indicators */}
                            <div className="animate-fade-up delay-400 mt-10 flex flex-wrap items-center gap-6 sm:gap-8">
                                {[
                                    { icon: QrCode, text: 'QR Scanning' },
                                    { icon: ShieldCheck, text: 'Role-Based Access' },
                                    { icon: BarChart3, text: 'Real-Time Analytics' },
                                    { icon: Bell, text: 'Auto Alerts' },
                                ].map((item) => (
                                    <div key={item.text} className="flex items-center gap-2">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.06] border border-white/[0.08]">
                                            <item.icon className="h-3.5 w-3.5 text-amber-500/70" />
                                        </div>
                                        <span className="text-sm font-medium text-stone-500">{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right side — decorative book composition */}
                        <div className="animate-scale-in delay-500 absolute right-6 top-1/2 -translate-y-1/2 hidden lg:block lg:right-8 xl:right-12">
                            <div className="relative w-[320px] h-[420px]">
                                {/* Glow behind books */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-amber-600/[0.06] blur-[60px]" />

                                {/* Book 1 — deep amber (back) */}
                                <div className="absolute z-10 w-44 h-60 bg-gradient-to-br from-amber-800 via-amber-700 to-amber-900 rounded-lg shadow-2xl shadow-black/40 -rotate-12 top-16 left-4">
                                    <div className="absolute left-0 top-0 bottom-0 w-5 bg-gradient-to-r from-black/30 to-transparent rounded-l-lg" />
                                    <div className="absolute inset-x-6 top-8 bottom-8 rounded border border-amber-400/15" />
                                    <div className="absolute top-10 left-8 right-8 space-y-1.5">
                                        <div className="h-1.5 w-3/4 rounded-full bg-amber-400/20" />
                                        <div className="h-1 w-1/2 rounded-full bg-amber-400/10" />
                                    </div>
                                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
                                        <BookOpen className="h-6 w-6 text-amber-400/20" />
                                    </div>
                                </div>

                                {/* Book 2 — dark teal (middle) */}
                                <div className="absolute z-20 w-44 h-60 bg-gradient-to-br from-emerald-900 via-teal-800 to-emerald-950 rounded-lg shadow-2xl shadow-black/40 rotate-3 top-8 left-16">
                                    <div className="absolute left-0 top-0 bottom-0 w-5 bg-gradient-to-r from-black/30 to-transparent rounded-l-lg" />
                                    <div className="absolute inset-x-6 top-8 bottom-8 rounded border border-emerald-400/10" />
                                    <div className="absolute top-10 left-8 right-8 space-y-1.5">
                                        <div className="h-1.5 w-2/3 rounded-full bg-emerald-400/15" />
                                        <div className="h-1 w-2/5 rounded-full bg-emerald-400/10" />
                                    </div>
                                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
                                        <Search className="h-5 w-5 text-emerald-400/20" />
                                    </div>
                                </div>

                                {/* Book 3 — rich navy (front) */}
                                <div className="absolute z-30 w-44 h-60 bg-gradient-to-br from-stone-700 via-stone-600 to-stone-800 rounded-lg shadow-2xl shadow-black/50 -rotate-2 top-0 left-28">
                                    <div className="absolute left-0 top-0 bottom-0 w-5 bg-gradient-to-r from-black/30 to-transparent rounded-l-lg" />
                                    <div className="absolute inset-x-6 top-8 bottom-8 rounded border border-white/[0.08]" />
                                    <div className="absolute top-10 left-8 right-8 space-y-1.5">
                                        <div className="h-1.5 w-4/5 rounded-full bg-white/10" />
                                        <div className="h-1 w-3/5 rounded-full bg-white/[0.06]" />
                                    </div>
                                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
                                        <BarChart3 className="h-5 w-5 text-white/15" />
                                    </div>
                                </div>

                                {/* QR Code floating card */}
                                <div className="absolute z-40 -top-2 right-2 bg-white rounded-xl p-3 shadow-xl shadow-black/20 animate-float delay-200">
                                    <div className="flex items-center gap-2">
                                        <div className="grid grid-cols-3 gap-0.5">
                                            {[...Array(9)].map((_, i) => (
                                                <div key={i} className={`h-2 w-2 rounded-[2px] ${
                                                    [0,1,2,3,5,6,8].includes(i) ? 'bg-stone-800' : 'bg-stone-200'
                                                }`} />
                                            ))}
                                        </div>
                                        <div className="pl-1">
                                            <div className="text-[9px] font-bold text-stone-800 uppercase tracking-wider">Scan</div>
                                            <div className="text-[8px] text-stone-400">QR Code</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Status floating badge */}
                                <div className="absolute z-40 bottom-4 -left-4 bg-white rounded-xl px-3.5 py-2.5 shadow-xl shadow-black/20 animate-float delay-600">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                        <span className="text-xs font-semibold text-stone-700">Available</span>
                                        <span className="text-xs text-stone-400">3 copies</span>
                                    </div>
                                </div>

                                {/* Analytics mini card */}
                                <div className="absolute z-40 bottom-20 -right-6 bg-white rounded-xl p-3 shadow-xl shadow-black/20 animate-float delay-400">
                                    <div className="text-[9px] font-semibold text-stone-500 uppercase tracking-wider mb-1.5">This Week</div>
                                    <div className="flex items-end gap-1">
                                        {[40, 65, 45, 80, 60, 90, 70].map((h, i) => (
                                            <div key={i} className="w-2 rounded-full bg-amber-400/80" style={{ height: `${h * 0.28}px` }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ─── Stats Band ─── */}
                <section className="relative -mt-1 border-y border-stone-200 bg-white py-10">
                    <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 sm:grid-cols-4 lg:px-8">
                        {stats.map((stat, i) => (
                            <div key={stat.label} className={`animate-fade-up text-center`} style={{ animationDelay: `${i * 100 + 100}ms` }}>
                                <div className="font-display text-4xl text-stone-900">
                                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                                </div>
                                <div className="mt-1 text-sm font-medium text-stone-500 uppercase tracking-wider">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ─── Features ─── */}
                <section className="py-24 lg:py-32">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="mb-16 max-w-2xl">
                            <p className="text-sm font-semibold uppercase tracking-widest text-amber-600">Capabilities</p>
                            <h2 className="font-display mt-3 text-4xl text-stone-900 sm:text-5xl">
                                Everything your<br />library needs.
                            </h2>
                            <p className="mt-5 text-lg leading-relaxed text-stone-500">
                                Ten integrated modules covering every aspect of library operations, from shelf to student.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {features.map((feature, i) => (
                                <div
                                    key={feature.title}
                                    className="feature-card group rounded-2xl border border-stone-200/80 bg-white p-7 shadow-sm hover:shadow-md hover:border-stone-300/80"
                                    style={{ animationDelay: `${i * 100}ms` }}
                                >
                                    <div className={`feature-icon-ring mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${feature.accent} shadow-sm`}>
                                        <feature.icon className="h-5 w-5 text-white" />
                                    </div>
                                    <h3 className="mb-2 text-lg font-semibold text-stone-900">{feature.title}</h3>
                                    <p className="text-[15px] leading-relaxed text-stone-500">{feature.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ─── How It Works ─── */}
                <section className="relative overflow-hidden bg-stone-900 py-24 lg:py-32">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(180,140,60,0.08),transparent)]" />
                    <div className="hero-grain absolute inset-0 pointer-events-none" />

                    <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="mb-16 max-w-2xl">
                            <p className="text-sm font-semibold uppercase tracking-widest text-amber-500">How it works</p>
                            <h2 className="font-display mt-3 text-4xl text-white sm:text-5xl">
                                Three roles,<br />one platform.
                            </h2>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-3">
                            {[
                                {
                                    role: 'School Admin',
                                    desc: 'Full school control. Manage librarians and students, configure settings, view reports and analytics, oversee the entire library ecosystem.',
                                    items: ['Librarian management', 'School settings', 'School reports', 'Fine management'],
                                    accent: 'border-amber-500/30',
                                    tag: 'bg-amber-500/10 text-amber-400',
                                },
                                {
                                    role: 'Librarian',
                                    desc: 'Operational command center. Process borrows and returns with QR scanning, manage the catalog, and monitor inventory.',
                                    items: ['QR scanning', 'Borrow & return', 'Catalog editing', 'Inventory checks'],
                                    accent: 'border-emerald-500/30',
                                    tag: 'bg-emerald-500/10 text-emerald-400',
                                },
                                {
                                    role: 'Student',
                                    desc: 'Self-service portal. Browse the catalog, track borrowings, and view outstanding fines — all independently.',
                                    items: ['Book search', 'Reservations', 'Borrowing history', 'Fine tracking'],
                                    accent: 'border-sky-500/30',
                                    tag: 'bg-sky-500/10 text-sky-400',
                                },
                            ].map((card, i) => (
                                <div
                                    key={card.role}
                                    className={`rounded-2xl border ${card.accent} bg-white/[0.03] p-7 backdrop-blur-sm transition-all hover:bg-white/[0.06]`}
                                >
                                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${card.tag}`}>
                                        {card.role}
                                    </span>
                                    <p className="mt-4 text-[15px] leading-relaxed text-stone-400">{card.desc}</p>
                                    <ul className="mt-6 space-y-2.5">
                                        {card.items.map((item) => (
                                            <li key={item} className="flex items-center gap-2.5 text-sm text-stone-500">
                                                <div className="h-1 w-1 rounded-full bg-stone-600" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ─── Highlight strip ─── */}
                <section className="border-b border-stone-200 bg-white py-20 lg:py-24">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="grid items-center gap-16 lg:grid-cols-2">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-widest text-amber-600">Why LIBTRACK</p>
                                <h2 className="font-display mt-3 text-4xl text-stone-900 sm:text-5xl">
                                    Built for libraries<br />that move fast.
                                </h2>
                                <p className="mt-5 text-lg leading-relaxed text-stone-500">
                                    No more paper logs. No more guessing who has what. LIBTRACK digitizes every
                                    touchpoint — from the moment a book is cataloged to the second it's returned.
                                </p>
                                <ul className="mt-8 space-y-4">
                                    {[
                                        { title: 'Instant QR circulation', desc: 'Scan a QR code to borrow or return. The entire transaction takes seconds.' },
                                        { title: 'Auto-calculated fines', desc: 'Overdue detection runs daily. Fines compute automatically based on your rules.' },
                                        { title: 'Real-time inventory', desc: 'See exactly what\'s available, borrowed, or missing — live.' },
                                        { title: 'Student self-service', desc: 'Students search and track borrowings without needing librarian assistance.' },
                                    ].map((item) => (
                                        <li key={item.title} className="flex gap-4">
                                            <div className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                                                <svg className="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                            <div>
                                                <span className="font-semibold text-stone-900">{item.title}</span>
                                                <p className="mt-0.5 text-sm text-stone-500">{item.desc}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Visual: stylized dashboard preview */}
                            <div className="relative">
                                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 shadow-xl shadow-stone-200/50">
                                    {/* Mock dashboard header */}
                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="h-3 w-3 rounded-full bg-red-400" />
                                        <div className="h-3 w-3 rounded-full bg-amber-400" />
                                        <div className="h-3 w-3 rounded-full bg-emerald-400" />
                                        <div className="ml-4 h-5 w-48 rounded bg-stone-200" />
                                    </div>
                                    {/* Mock stat cards */}
                                    <div className="grid grid-cols-3 gap-3 mb-5">
                                        {[
                                            { label: 'Total Books', val: '2,847', color: 'bg-amber-50 border-amber-200' },
                                            { label: 'Active Borrows', val: '156', color: 'bg-sky-50 border-sky-200' },
                                            { label: 'Overdue', val: '12', color: 'bg-rose-50 border-rose-200' },
                                        ].map((card) => (
                                            <div key={card.label} className={`rounded-lg border ${card.color} p-3`}>
                                                <div className="text-[10px] font-medium uppercase tracking-wide text-stone-400">{card.label}</div>
                                                <div className="mt-1 font-display text-xl text-stone-800">{card.val}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Mock table */}
                                    <div className="rounded-lg border border-stone-200 bg-white">
                                        <div className="grid grid-cols-4 border-b border-stone-100 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                                            <span>Book</span><span>Student</span><span>Due</span><span>Status</span>
                                        </div>
                                        {[
                                            { book: 'Clean Code', student: 'J. Dela Cruz', due: 'Apr 18', status: 'Active', dot: 'bg-emerald-400' },
                                            { book: '1984', student: 'A. Reyes', due: 'Apr 15', status: 'Overdue', dot: 'bg-red-400' },
                                            { book: 'Noli Me Tangere', student: 'C. Garcia', due: 'Apr 22', status: 'Active', dot: 'bg-emerald-400' },
                                        ].map((row) => (
                                            <div key={row.book} className="grid grid-cols-4 items-center border-b border-stone-50 px-4 py-2.5 text-xs text-stone-600">
                                                <span className="font-medium text-stone-800">{row.book}</span>
                                                <span>{row.student}</span>
                                                <span>{row.due}</span>
                                                <span className="flex items-center gap-1.5">
                                                    <div className={`h-1.5 w-1.5 rounded-full ${row.dot}`} />
                                                    {row.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* Floating QR element */}
                                <div className="absolute -bottom-4 -left-4 rounded-xl border border-stone-200 bg-white p-3.5 shadow-lg animate-float">
                                    <QrCode className="h-8 w-8 text-stone-700" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ─── CTA Band ─── */}
                <section className="relative overflow-hidden bg-stone-950 py-20 lg:py-24">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(180,140,60,0.12),transparent)]" />
                    <div className="hero-grain absolute inset-0 pointer-events-none" />
                    <div className="absolute top-[20%] left-[10%] h-40 w-40 rounded-full bg-amber-500/[0.06] blur-3xl" />
                    <div className="absolute bottom-[20%] right-[10%] h-56 w-56 rounded-full bg-amber-600/[0.05] blur-3xl" />

                    <div className="relative mx-auto max-w-4xl px-6 text-center lg:px-8">
                        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 py-1.5 pl-2 pr-4 backdrop-blur-sm">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20">
                                <BookOpen className="h-3.5 w-3.5 text-amber-400" />
                            </span>
                            <span className="text-sm font-medium text-amber-300/90">Ready when you are</span>
                        </div>
                        <h2 className="font-display text-4xl text-white sm:text-5xl lg:text-6xl">
                            Bring your library<br />into the present.
                        </h2>
                        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-stone-400">
                            Sign in to manage your catalog, process circulation in seconds, and keep every borrow accountable.
                        </p>
                        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                            <Button
                                size="lg"
                                className="h-12 rounded-xl bg-amber-500 px-7 text-base font-semibold text-stone-950 shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400 hover:shadow-amber-500/30"
                                asChild
                            >
                                <Link href={route('auth.register')}>Get Started <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
                            </Button>
                            <Button
                                size="lg"
                                variant="ghost"
                                className="h-12 rounded-xl px-7 text-base text-stone-300 hover:bg-white/5 hover:text-white"
                                asChild
                            >
                                <Link href={route('auth.login')}>I already have an account</Link>
                            </Button>
                        </div>
                    </div>
                </section>

                {/* ─── Footer ─── */}
                <footer className="border-t border-stone-200 bg-white py-8">
                    <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row lg:px-8">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-stone-900">
                                <BookOpen className="h-3.5 w-3.5 text-amber-400" />
                            </div>
                            <span className="font-semibold text-stone-900">LIBTRACK</span>
                        </div>
                        <p className="text-sm text-stone-400">
                            Library Management System with QR Integration
                        </p>
                    </div>
                </footer>
            </div>
        </>
    );
}
