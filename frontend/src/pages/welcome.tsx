import PublicFooter from '@/components/shared/public-footer';
import PublicNavbar from '@/components/shared/public-navbar';
import { useLandingScroll } from '@/hooks/use-landing-scroll';
import { Link } from 'react-router-dom';

const services = [
    {
        title: 'Engine Repair',
        description: 'Complete engine diagnostics, repair, and rebuilds to keep your vehicle running at peak performance.',
        icon: (
            <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V4a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3" />
                <circle cx="12" cy="14" r="3" />
            </svg>
        ),
    },
    {
        title: 'Oil Change',
        description: 'Regular oil changes with premium synthetic and conventional oils to extend engine life.',
        icon: (
            <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M12 2v6l3 3" />
                <path d="M6 12a6 6 0 0 0 12 0c0-3-2-6-6-9-4 3-6 6-6 9Z" />
            </svg>
        ),
    },
    {
        title: 'Brake Service',
        description: 'Brake pad replacement, rotor resurfacing, and complete brake system inspections for your safety.',
        icon: (
            <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v4" />
                <path d="M12 18v4" />
                <path d="M2 12h4" />
                <path d="M18 12h4" />
            </svg>
        ),
    },
    {
        title: 'Diagnostics',
        description: 'Advanced computer diagnostics to identify issues accurately and save you time and money.',
        icon: (
            <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8" />
                <path d="M12 17v4" />
                <path d="M7 10l2 2 4-4" />
            </svg>
        ),
    },
    {
        title: 'Tire Services',
        description: 'Tire rotation, balancing, alignment, and replacement to ensure a smooth and safe ride.',
        icon: (
            <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
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
        icon: (
            <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M12 2v20" />
                <path d="M2 12h20" />
                <path d="m4.93 4.93 14.14 14.14" />
                <path d="m19.07 4.93-14.14 14.14" />
            </svg>
        ),
    },
];

export default function Welcome() {
    useLandingScroll();

    return (
        <div className="text-[#EDEDEC]">
            <PublicNavbar activePage="home" />

            {/* Hero Section */}
            <section
                data-section
                className="relative flex h-screen flex-col items-center overflow-hidden bg-gradient-to-br from-[#242424] to-[#000000] p-6 lg:justify-center lg:p-8"
            >
                {/* Spotlight Effect */}
                <div className="pointer-events-none absolute top-0 left-1/2 z-0 h-full w-full max-w-full -translate-x-1/2 overflow-hidden">
                    <div className="bg-gradient-radial absolute top-0 left-1/2 h-64 w-[1603px] max-w-[200vw] -translate-x-1/2 rounded-full from-[#DFB400]/25 via-[#DFB400]/15 to-transparent blur-3xl"></div>
                    <div
                        className="absolute top-0 left-1/2 h-[600px] w-[1283px] max-w-[200vw] -translate-x-1/2 bg-gradient-to-b from-[#DFB400]/35 via-[#DFB400]/8 via-[#DFB400]/15 to-transparent blur-2xl"
                        style={{ clipPath: 'polygon(32% 0%, 68% 0%, 80% 100%, 20% 100%)' }}
                    ></div>
                </div>

                <div className="h-24"></div>

                <main className="relative z-10 w-full max-w-[335px] lg:max-w-4xl">
                    <div className="relative flex flex-col items-center justify-center gap-8">
                        <div className="relative z-10 mt-8 w-full max-w-sm">
                            <img src="/images/wordlogo.svg" alt="Word Logo" className="h-auto w-full drop-shadow-2xl" />
                        </div>
                        <div className="relative z-10 text-center">
                            <p className="text-lg text-gray-300">
                                Your car deserves more than just a tune-up it deserves cosmic-level care. Discover why AlienCare Autoshop is the
                                trusted pit stop for drivers who want the best
                            </p>
                        </div>
                        <div className="relative z-10 -mt-6 w-full max-w-md">
                            <img src="/images/hondacar.png" alt="Auto Shop Car" className="h-auto w-full" />
                        </div>
                    </div>
                </main>
            </section>

            {/* About Us Section */}
            <section data-section id="about" className="flex h-screen w-full items-center bg-black px-6 lg:px-8">
                <div className="mx-auto w-full max-w-5xl">
                    <div className="mb-10 text-center">
                        <h2 className="mb-3 text-4xl font-bold text-[#D9AF01]">About Us</h2>
                        <p className="text-lg text-gray-400">Where Cosmic Care Meets Automotive Excellence</p>
                    </div>

                    <p className="mx-auto mb-10 max-w-3xl text-center text-lg leading-relaxed text-gray-300">
                        Founded in 2015, AlienCare Autoshop emerged from a simple belief: every vehicle deserves out-of-this-world care. We combine
                        cutting-edge technology with old-fashioned dedication to deliver service that exceeds expectations.
                    </p>

                    {/* Mission & Vision */}
                    <div className="mb-10 grid gap-6 md:grid-cols-2">
                        <div className="rounded-lg bg-[#625959]/10 p-8 backdrop-blur-sm">
                            <h3 className="mb-3 text-2xl font-semibold text-[#D9AF01]">Our Mission</h3>
                            <p className="text-base leading-relaxed text-gray-300">
                                To provide exceptional automotive care through expert craftsmanship, honest service, and innovative solutions that
                                keep our customers safe and satisfied on every journey.
                            </p>
                        </div>
                        <div className="rounded-lg bg-[#625959]/10 p-8 backdrop-blur-sm">
                            <h3 className="mb-3 text-2xl font-semibold text-[#D9AF01]">Our Vision</h3>
                            <p className="text-base leading-relaxed text-gray-300">
                                To be the galaxy's premier automotive service provider, recognized for excellence, integrity, and customer care that's
                                truly out of this world.
                            </p>
                        </div>
                    </div>

                    <div className="text-center">
                        <Link
                            to="/about"
                            className="inline-block rounded-sm border border-[#D9AF01] px-8 py-3 text-sm font-semibold text-[#D9AF01] transition-all duration-300 hover:bg-[#D9AF01] hover:text-[#1b1b18]"
                        >
                            Learn More About Us
                        </Link>
                    </div>
                </div>
            </section>

            {/* Services Section */}
            <section data-section id="services" className="flex h-screen w-full items-center bg-black px-6 lg:px-8">
                <div className="mx-auto w-full max-w-5xl">
                    <div className="mb-12 text-center">
                        <h2 className="mb-3 text-4xl font-bold text-[#D9AF01]">Our Services</h2>
                        <p className="text-lg text-gray-400">Comprehensive automotive care for every make and model</p>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {services.map((service) => (
                            <div
                                key={service.title}
                                className="group rounded-lg border border-white/5 bg-[#625959]/10 p-6 backdrop-blur-sm transition-all duration-300 hover:border-[#D9AF01]/30 hover:bg-[#625959]/20"
                            >
                                <div className="mb-4 text-[#D9AF01] transition-transform duration-300 group-hover:scale-110">{service.icon}</div>
                                <h3 className="mb-2 text-lg font-semibold text-[#EDEDEC]">{service.title}</h3>
                                <p className="text-sm leading-relaxed text-gray-400">{service.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div data-section>
                <PublicFooter />
            </div>
        </div>
    );
}
