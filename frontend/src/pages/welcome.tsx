import PublicFooter from '@/components/shared/public-footer';
import PublicNavbar from '@/components/shared/public-navbar';
import { useLandingScroll } from '@/hooks/use-landing-scroll';
import { ArrowRight, CheckCircle, ChevronDown, Clock, Settings, Shield, Star, Thermometer, Wrench, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const services = [
    {
        title: 'Engine Repair',
        description: 'Complete engine diagnostics, repair, and rebuilds to keep your vehicle running at peak performance.',
        icon: <Settings className="h-7 w-7" />,
    },
    {
        title: 'Oil Change',
        description: 'Regular oil changes with premium synthetic and conventional oils to extend engine life.',
        icon: <Zap className="h-7 w-7" />,
    },
    {
        title: 'Brake Service',
        description: 'Brake pad replacement, rotor resurfacing, and complete brake system inspections for your safety.',
        icon: (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7"
            >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
        ),
    },
    {
        title: 'Diagnostics',
        description: 'Advanced computer diagnostics to identify issues accurately and save you time and money.',
        icon: (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7"
            >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4M7 10l2 2 4-4" />
            </svg>
        ),
    },
    {
        title: 'Tire Services',
        description: 'Tire rotation, balancing, alignment, and replacement to ensure a smooth and safe ride.',
        icon: (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7"
            >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
            </svg>
        ),
    },
    {
        title: 'AC Repair',
        description: 'Air conditioning inspection, recharging, and repair to keep you cool all year round.',
        icon: <Thermometer className="h-7 w-7" />,
    },
];

const stats = [
    { value: '10+', label: 'Years in Business' },
    { value: '2,000+', label: 'Vehicles Serviced' },
    { value: '98%', label: 'Client Satisfaction' },
    { value: '6+', label: 'Expert Services' },
];

const whyUs = [
    {
        icon: <Wrench className="h-6 w-6" />,
        title: 'Expert Technicians',
        description: 'Skilled mechanics with years of hands-on expertise across every make and model.',
    },
    {
        icon: <Shield className="h-6 w-6" />,
        title: 'Quality Parts Only',
        description: 'We use OEM-grade or top-tier aftermarket parts — never cheap substitutes.',
    },
    {
        icon: <Clock className="h-6 w-6" />,
        title: 'Fast Turnaround',
        description: 'We respect your schedule. Most jobs are completed same-day or next-day.',
    },
    {
        icon: <CheckCircle className="h-6 w-6" />,
        title: 'Transparent Pricing',
        description: 'No hidden fees, no surprises. You approve the quote before we ever start.',
    },
];

export default function Welcome() {
    useLandingScroll();

    return (
        <div className="text-[#EDEDEC]">
            <PublicNavbar activePage="home" />

            {/* ── Hero Section ──────────────────────────────────────────── */}
            <section
                data-section
                className="relative flex h-screen flex-col overflow-hidden bg-[#080808]"
                style={{
                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            >
                {/* Gold beam spotlight */}
                <div className="pointer-events-none absolute inset-0 z-0">
                    <div
                        className="absolute top-0 left-1/2 h-130 w-225 max-w-[200vw] -translate-x-1/2 bg-linear-to-b from-[#D9AF01]/30 via-[#D9AF01]/10 to-transparent blur-3xl"
                        style={{ clipPath: 'polygon(30% 0%, 70% 0%, 85% 100%, 15% 100%)' }}
                    />
                    {/* Side ambient glows */}
                    <div className="absolute top-1/3 -left-32 h-64 w-64 rounded-full bg-[#D9AF01]/8 blur-3xl" />
                    <div className="absolute top-1/2 -right-32 h-80 w-80 rounded-full bg-[#D9AF01]/6 blur-3xl" />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pt-24 lg:flex-row lg:items-center lg:gap-0 lg:px-16 lg:pt-20">
                    {/* Left: Copy */}
                    <div className="flex flex-col items-center text-center lg:flex-1 lg:items-start lg:text-left">
                        {/* Trust badge */}
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#D9AF01]/30 bg-[#D9AF01]/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-[#D9AF01] uppercase">
                            <Star className="h-3 w-3 fill-[#D9AF01]" />
                            Trusted by Davao's Drivers Since 2015
                        </div>

                        {/* Headline */}
                        <h1 className="mb-4 text-5xl leading-[1.05] font-black tracking-tight text-[#EDEDEC] lg:text-7xl">
                            Your Car.
                            <br />
                            <span
                                className="bg-linear-to-r from-[#D9AF01] via-[#f0cc30] to-[#D9AF01] bg-clip-text text-transparent"
                                style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                            >
                                Cosmic Care.
                            </span>
                        </h1>

                        {/* Sub-headline */}
                        <p className="mb-8 max-w-md text-base leading-relaxed text-gray-400 lg:text-lg">
                            Your car deserves more than a tune-up — it deserves out-of-this-world attention. AlienCare Autoshop is Davao's trusted pit
                            stop for drivers who want the absolute best.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Link
                                to="/register"
                                className="group inline-flex items-center gap-2 rounded-sm bg-[#D9AF01] px-7 py-3 text-sm font-bold text-[#0a0a0a] transition-all duration-300 hover:bg-[#f0cc30] hover:shadow-[0_0_24px_rgba(217,175,1,0.4)]"
                            >
                                Book a Service
                                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                            </Link>
                            <a
                                href="#services"
                                onClick={(e) => {
                                    e.preventDefault();
                                    const el = document.getElementById('services');
                                    if (el) window.scrollTo({ top: el.offsetTop, behavior: 'smooth' });
                                }}
                                className="inline-flex items-center gap-2 rounded-sm border border-white/20 px-7 py-3 text-sm font-semibold text-[#EDEDEC] transition-all duration-300 hover:border-[#D9AF01]/60 hover:text-[#D9AF01]"
                            >
                                Explore Services
                            </a>
                        </div>
                    </div>

                    {/* Right: Car Visual */}
                    <div className="relative mt-6 flex w-full max-w-sm items-end justify-center lg:mt-0 lg:max-w-none lg:flex-1">
                        {/* Glow under car */}
                        <div className="absolute bottom-0 left-1/2 h-20 w-3/4 -translate-x-1/2 rounded-full bg-[#D9AF01]/20 blur-2xl" />
                        <img
                            src="/images/hondacar.png"
                            alt="AlienCare Auto Shop Vehicle"
                            className="relative z-10 h-auto w-full drop-shadow-2xl"
                            style={{ filter: 'drop-shadow(0 20px 60px rgba(217,175,1,0.15))' }}
                        />
                        <img
                            src="/images/certified-mechanics-badge.svg"
                            alt="AlienCare Certified Mechanics Badge"
                            className="absolute top-4 right-4 hidden w-24 drop-shadow-[0_12px_30px_rgba(0,0,0,0.45)] lg:block"
                        />
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="relative z-10 border-t border-white/8 bg-black/40 backdrop-blur-sm">
                    <div className="mx-auto grid max-w-4xl grid-cols-2 divide-x divide-white/8 lg:grid-cols-4">
                        {stats.map((stat) => (
                            <div key={stat.label} className="flex flex-col items-center py-4">
                                <span className="text-2xl font-black text-[#D9AF01] lg:text-3xl">{stat.value}</span>
                                <span className="mt-0.5 text-xs text-gray-500">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Scroll Indicator */}
                <a
                    href="#services"
                    onClick={(e) => {
                        e.preventDefault();
                        const el = document.getElementById('services');
                        if (el) window.scrollTo({ top: el.offsetTop, behavior: 'smooth' });
                    }}
                    className="hero-scroll-indicator absolute bottom-28 left-1/2 z-20 hidden -translate-x-1/2 flex-col items-center gap-2 text-[#D9AF01] transition-colors duration-300 hover:text-[#f0cc30] md:flex"
                    aria-label="Scroll down to services"
                >
                    <span className="text-[10px] font-semibold tracking-[0.22em] uppercase">Scroll</span>
                    <span className="hero-scroll-mouse relative flex h-10 w-6 items-start justify-center rounded-full border border-[#D9AF01]/55 bg-black/55 pt-2 backdrop-blur-md">
                        <span className="hero-scroll-dot h-1.5 w-1.5 rounded-full bg-[#D9AF01]" />
                    </span>
                    <ChevronDown className="hero-scroll-chevron h-4 w-4" />
                </a>
            </section>

            {/* ── Services Section ──────────────────────────────────────── */}
            <section
                data-section
                id="services"
                className="flex min-h-screen w-full flex-col items-center justify-center bg-[#050505] px-6 py-24 lg:px-8"
            >
                <div className="mx-auto w-full max-w-5xl">
                    {/* Section label */}
                    <div className="mb-3 flex items-center justify-center gap-3">
                        <span className="h-px w-8 bg-[#D9AF01]/50" />
                        <span className="text-xs font-semibold tracking-[0.2em] text-[#D9AF01] uppercase">What We Offer</span>
                        <span className="h-px w-8 bg-[#D9AF01]/50" />
                    </div>
                    <div className="mb-14 text-center">
                        <h2 className="text-4xl font-black tracking-tight text-[#EDEDEC] lg:text-5xl">
                            Built for{' '}
                            <span
                                className="bg-linear-to-r from-[#D9AF01] to-[#f0cc30] bg-clip-text text-transparent"
                                style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                            >
                                Every Make
                            </span>
                        </h2>
                        <p className="mt-3 text-base text-gray-500">Comprehensive automotive care — whatever you drive, we've got you covered.</p>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {services.map((service, i) => (
                            <div
                                key={service.title}
                                className="group relative overflow-hidden rounded-xl border border-white/5 bg-[#111111] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#D9AF01]/25 hover:shadow-[0_8px_40px_rgba(217,175,1,0.08)]"
                            >
                                {/* Number watermark */}
                                <span className="pointer-events-none absolute top-3 right-4 text-6xl font-black text-white/3 select-none">
                                    {String(i + 1).padStart(2, '0')}
                                </span>
                                {/* Gold accent bar */}
                                <div className="absolute top-0 left-0 h-0.5 w-0 bg-linear-to-r from-[#D9AF01] to-[#f0cc30] transition-all duration-500 group-hover:w-full" />
                                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#D9AF01]/10 text-[#D9AF01] transition-all duration-300 group-hover:bg-[#D9AF01]/20">
                                    {service.icon}
                                </div>
                                <h3 className="mb-2 text-base font-bold text-[#EDEDEC]">{service.title}</h3>
                                <p className="text-sm leading-relaxed text-gray-500">{service.description}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 text-center">
                        <Link
                            to="/register"
                            className="group inline-flex items-center gap-2 rounded-sm border border-[#D9AF01]/40 px-8 py-3 text-sm font-semibold text-[#D9AF01] transition-all duration-300 hover:bg-[#D9AF01] hover:text-[#0a0a0a]"
                        >
                            Book Any Service
                            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── About Section ─────────────────────────────────────────── */}
            <section data-section id="about" className="flex min-h-screen w-full flex-col items-center justify-center bg-black px-6 py-24 lg:px-8">
                <div className="mx-auto w-full max-w-5xl">
                    {/* Section label */}
                    <div className="mb-3 flex items-center justify-center gap-3">
                        <span className="h-px w-8 bg-[#D9AF01]/50" />
                        <span className="text-xs font-semibold tracking-[0.2em] text-[#D9AF01] uppercase">Our Story</span>
                        <span className="h-px w-8 bg-[#D9AF01]/50" />
                    </div>

                    <div className="mb-12 text-center">
                        <h2 className="text-4xl font-black tracking-tight text-[#EDEDEC] lg:text-5xl">
                            More Than an{' '}
                            <span
                                className="bg-linear-to-r from-[#D9AF01] to-[#f0cc30] bg-clip-text text-transparent"
                                style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                            >
                                Auto Shop
                            </span>
                        </h2>
                        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-gray-400">
                            Founded in 2015, AlienCare Autoshop was built on a simple belief: every vehicle deserves out-of-this-world care. We blend
                            cutting-edge technology with old-fashioned dedication to consistently exceed expectations.
                        </p>
                    </div>

                    {/* Mission & Vision */}
                    <div className="mb-12 grid gap-6 md:grid-cols-2">
                        <div className="relative overflow-hidden rounded-xl border border-white/5 bg-[#0f0f0f] p-8">
                            {/* Accent corner */}
                            <div className="absolute top-0 left-0 h-px w-24 bg-linear-to-r from-[#D9AF01] to-transparent" />
                            <div className="absolute top-0 left-0 h-24 w-px bg-linear-to-b from-[#D9AF01] to-transparent" />
                            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#D9AF01]/10">
                                <Zap className="h-5 w-5 text-[#D9AF01]" />
                            </div>
                            <h3 className="mb-3 text-xl font-bold text-[#EDEDEC]">Our Mission</h3>
                            <p className="text-sm leading-relaxed text-gray-400">
                                To provide exceptional automotive care through expert craftsmanship, honest service, and innovative solutions that
                                keep our customers safe and confident on every journey.
                            </p>
                        </div>
                        <div className="relative overflow-hidden rounded-xl border border-white/5 bg-[#0f0f0f] p-8">
                            <div className="absolute top-0 right-0 h-px w-24 bg-linear-to-l from-[#D9AF01] to-transparent" />
                            <div className="absolute top-0 right-0 h-24 w-px bg-linear-to-b from-[#D9AF01] to-transparent" />
                            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#D9AF01]/10">
                                <Star className="h-5 w-5 text-[#D9AF01]" />
                            </div>
                            <h3 className="mb-3 text-xl font-bold text-[#EDEDEC]">Our Vision</h3>
                            <p className="text-sm leading-relaxed text-gray-400">
                                To be the region's premier automotive service provider — recognized for excellence, integrity, and a level of customer
                                care that's truly out of this world.
                            </p>
                        </div>
                    </div>

                    <div className="text-center">
                        <Link
                            to="/about"
                            className="group inline-flex items-center gap-2 rounded-sm border border-white/15 px-8 py-3 text-sm font-semibold text-[#EDEDEC] transition-all duration-300 hover:border-[#D9AF01]/50 hover:text-[#D9AF01]"
                        >
                            Learn More About Us
                            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Why AlienCare + CTA Section ───────────────────────────── */}
            <section data-section className="flex min-h-screen w-full flex-col items-center justify-center bg-[#050505] px-6 py-24 lg:px-8">
                <div className="mx-auto w-full max-w-5xl">
                    {/* Section label */}
                    <div className="mb-3 flex items-center justify-center gap-3">
                        <span className="h-px w-8 bg-[#D9AF01]/50" />
                        <span className="text-xs font-semibold tracking-[0.2em] text-[#D9AF01] uppercase">Why Choose Us</span>
                        <span className="h-px w-8 bg-[#D9AF01]/50" />
                    </div>
                    <div className="mb-14 text-center">
                        <h2 className="text-4xl font-black tracking-tight text-[#EDEDEC] lg:text-5xl">
                            The AlienCare{' '}
                            <span
                                className="bg-linear-to-r from-[#D9AF01] to-[#f0cc30] bg-clip-text text-transparent"
                                style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                            >
                                Difference
                            </span>
                        </h2>
                        <p className="mt-3 text-base text-gray-500">Four reasons why Davao's drivers keep coming back.</p>
                    </div>

                    {/* 4 Pillars */}
                    <div className="mb-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {whyUs.map((item) => (
                            <div
                                key={item.title}
                                className="group flex flex-col rounded-xl border border-white/5 bg-[#0d0d0d] p-6 transition-all duration-300 hover:border-[#D9AF01]/20 hover:bg-[#111111]"
                            >
                                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#D9AF01]/10 text-[#D9AF01] transition-colors duration-300 group-hover:bg-[#D9AF01]/20">
                                    {item.icon}
                                </div>
                                <h3 className="mb-2 text-sm font-bold text-[#EDEDEC]">{item.title}</h3>
                                <p className="text-xs leading-relaxed text-gray-500">{item.description}</p>
                            </div>
                        ))}
                    </div>

                    {/* CTA Banner */}
                    <div
                        className="relative overflow-hidden rounded-2xl border border-[#D9AF01]/20 p-10 text-center"
                        style={{
                            background: 'linear-gradient(135deg, rgba(217,175,1,0.12) 0%, rgba(217,175,1,0.04) 50%, rgba(217,175,1,0.08) 100%)',
                        }}
                    >
                        {/* Decorative glows */}
                        <div className="pointer-events-none absolute -top-10 left-1/4 h-32 w-32 rounded-full bg-[#D9AF01]/15 blur-2xl" />
                        <div className="pointer-events-none absolute right-1/4 -bottom-10 h-32 w-32 rounded-full bg-[#D9AF01]/10 blur-2xl" />

                        <div className="relative z-10">
                            <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-[#D9AF01] uppercase">Get Started Today</p>
                            <h3 className="mb-3 text-3xl font-black text-[#EDEDEC] lg:text-4xl">
                                Ready for Cosmic-Level
                                <br className="hidden sm:block" /> Car Care?
                            </h3>
                            <p className="mx-auto mb-8 max-w-md text-sm text-gray-400">
                                Create a free account and book your first service in minutes. Your car will thank you.
                            </p>
                            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                                <Link
                                    to="/register"
                                    className="group inline-flex items-center gap-2 rounded-sm bg-[#D9AF01] px-8 py-3.5 text-sm font-bold text-[#0a0a0a] transition-all duration-300 hover:bg-[#f0cc30] hover:shadow-[0_0_30px_rgba(217,175,1,0.5)]"
                                >
                                    Create Free Account
                                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                                </Link>
                                <Link
                                    to="/login"
                                    className="text-sm font-semibold text-gray-400 underline-offset-4 transition-colors duration-300 hover:text-[#D9AF01] hover:underline"
                                >
                                    Already have an account? Log in
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Footer ────────────────────────────────────────────────── */}
            <div data-section>
                <PublicFooter />
            </div>
        </div>
    );
}
