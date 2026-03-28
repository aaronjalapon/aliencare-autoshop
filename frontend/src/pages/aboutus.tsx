import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';

export default function AboutUs() {
    const { user } = useAuth();

    return (
        <>
            {/* Header - Same as welcome.tsx */}
            <header className="fixed top-0 right-0 left-0 z-50 w-full px-8 pt-6 text-sm lg:px-16">
                <nav className="flex items-center justify-between rounded-lg bg-[#625959]/20 px-6 py-4 backdrop-blur-md">
                    <div className="flex items-center gap-10">
                        <Link to="/" className="flex items-center">
                            <img src="/images/iconlogo.svg" alt="AlienCare Auto Shop Logo" className="h-10 w-auto" />
                        </Link>
                        <Link to="/" className="text-sm leading-normal text-[#EDEDEC] transition-colors duration-300 hover:text-[#D9AF01]">
                            Home
                        </Link>
                        <Link to="/about" className="text-sm leading-normal text-[#D9AF01]">
                            About Us
                        </Link>
                        <Link to="/services" className="text-sm leading-normal text-[#EDEDEC] transition-colors duration-300 hover:text-[#D9AF01]">
                            Services
                        </Link>
                        <Link to="/faqs" className="text-sm leading-normal text-[#EDEDEC] transition-colors duration-300 hover:text-[#D9AF01]">
                            FAQs
                        </Link>
                    </div>

                    <div className="flex items-center gap-4">
                        {user ? (
                            <Link
                                to="/dashboard"
                                className="inline-block rounded-sm border border-[#EDEDEC]/30 px-5 py-1.5 text-sm leading-normal text-[#EDEDEC] transition-all duration-300 hover:border-[#D9AF01] hover:text-[#D9AF01]"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="inline-block rounded-sm border border-[#EDEDEC]/30 px-5 py-1.5 text-sm leading-normal font-bold text-[#EDEDEC] transition-all duration-300 hover:border-[#D9AF01] hover:text-[#D9AF01]"
                                >
                                    Log in
                                </Link>
                                <Link
                                    to="/register"
                                    className="inline-block rounded-sm bg-[#D9AF01] px-5 py-1.5 text-sm leading-normal font-bold text-[#1b1b18] transition-all duration-300 hover:bg-[#c29d01]"
                                >
                                    Sign up
                                </Link>
                            </>
                        )}
                    </div>
                </nav>
            </header>

            <div className="flex min-h-screen flex-col items-center overflow-x-hidden bg-gradient-to-br from-[#242424] to-[#000000] p-6 text-[#EDEDEC] lg:p-8">
                {/* Spotlight Effect */}
                <div className="pointer-events-none absolute top-0 left-1/2 z-0 h-screen w-full max-w-full -translate-x-1/2 overflow-hidden">
                    <div className="bg-gradient-radial absolute top-0 left-1/2 h-64 w-[1603px] max-w-[200vw] -translate-x-1/2 rounded-full from-yellow-200/25 via-yellow-100/15 to-transparent blur-3xl"></div>
                </div>

                <div className="h-24"></div>

                <main className="relative z-10 w-full max-w-5xl px-4">
                    {/* Page Title */}
                    <div className="mb-16 text-center">
                        <h1 className="mb-4 text-5xl font-bold text-[#D9AF01]">About Us</h1>
                        <p className="text-xl text-gray-400">Where Cosmic Care Meets Automotive Excellence</p>
                    </div>

                    {/* Our Story Section */}
                    <section className="mb-16 rounded-lg bg-[#625959]/10 p-8 backdrop-blur-sm">
                        <h2 className="mb-6 text-3xl font-semibold text-[#D9AF01]">Our Story</h2>
                        <p className="mb-4 text-lg leading-relaxed text-gray-300">
                            Founded in 2015, AlienCare Autoshop emerged from a simple belief: every vehicle deserves out-of-this-world care. What
                            started as a small garage with big dreams has evolved into the region's most trusted automotive service center.
                        </p>
                        <p className="text-lg leading-relaxed text-gray-300">
                            Our name reflects our mission – to provide care that's simply otherworldly. We combine cutting-edge technology with
                            old-fashioned dedication to deliver service that exceeds expectations.
                        </p>
                    </section>

                    {/* Mission & Vision */}
                    <div className="mb-16 grid gap-8 md:grid-cols-2">
                        <div className="rounded-lg bg-[#625959]/10 p-8 backdrop-blur-sm">
                            <h2 className="mb-4 text-2xl font-semibold text-[#D9AF01]">Our Mission</h2>
                            <p className="text-lg leading-relaxed text-gray-300">
                                To provide exceptional automotive care through expert craftsmanship, honest service, and innovative solutions that
                                keep our customers safe and satisfied on every journey.
                            </p>
                        </div>
                        <div className="rounded-lg bg-[#625959]/10 p-8 backdrop-blur-sm">
                            <h2 className="mb-4 text-2xl font-semibold text-[#D9AF01]">Our Vision</h2>
                            <p className="text-lg leading-relaxed text-gray-300">
                                To be the galaxy's premier automotive service provider, recognized for excellence, integrity, and customer care that's
                                truly out of this world.
                            </p>
                        </div>
                    </div>

                    {/* Core Values */}
                    <section className="mb-16">
                        <h2 className="mb-8 text-center text-3xl font-semibold text-[#D9AF01]">Our Core Values</h2>
                        <div className="grid gap-6 md:grid-cols-3">
                            <div className="rounded-lg bg-[#625959]/10 p-6 text-center backdrop-blur-sm">
                                <div className="mb-4 text-4xl">🔧</div>
                                <h3 className="mb-3 text-xl font-semibold text-[#D9AF01]">Excellence</h3>
                                <p className="text-gray-300">We strive for perfection in every service, no matter how big or small.</p>
                            </div>
                            <div className="rounded-lg bg-[#625959]/10 p-6 text-center backdrop-blur-sm">
                                <div className="mb-4 text-4xl">🤝</div>
                                <h3 className="mb-3 text-xl font-semibold text-[#D9AF01]">Integrity</h3>
                                <p className="text-gray-300">Honest assessments and transparent pricing – always.</p>
                            </div>
                            <div className="rounded-lg bg-[#625959]/10 p-6 text-center backdrop-blur-sm">
                                <div className="mb-4 text-4xl">💡</div>
                                <h3 className="mb-3 text-xl font-semibold text-[#D9AF01]">Innovation</h3>
                                <p className="text-gray-300">Using the latest technology to solve automotive challenges.</p>
                            </div>
                        </div>
                    </section>

                    {/* Why Choose Us */}
                    <section className="mb-16 rounded-lg bg-[#625959]/10 p-8 backdrop-blur-sm">
                        <h2 className="mb-6 text-3xl font-semibold text-[#D9AF01]">Why Choose AlienCare?</h2>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <span className="mt-1 text-[#D9AF01]">✓</span>
                                <span className="text-lg text-gray-300">
                                    <strong>Certified Technicians:</strong> Our team is ASE certified with decades of combined experience
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="mt-1 text-[#D9AF01]">✓</span>
                                <span className="text-lg text-gray-300">
                                    <strong>State-of-the-Art Equipment:</strong> We invest in the latest diagnostic and repair technology
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="mt-1 text-[#D9AF01]">✓</span>
                                <span className="text-lg text-gray-300">
                                    <strong>Transparent Pricing:</strong> No hidden fees or surprise charges
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="mt-1 text-[#D9AF01]">✓</span>
                                <span className="text-lg text-gray-300">
                                    <strong>Warranty on All Work:</strong> We stand behind every service we provide
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="mt-1 text-[#D9AF01]">✓</span>
                                <span className="text-lg text-gray-300">
                                    <strong>Customer-First Approach:</strong> Your satisfaction is our top priority
                                </span>
                            </li>
                        </ul>
                    </section>

                    {/* Call to Action */}
                    <div className="mb-16 text-center">
                        <h2 className="mb-4 text-3xl font-semibold text-[#EDEDEC]">Ready to Experience the Difference?</h2>
                        <p className="mb-6 text-lg text-gray-300">Join thousands of satisfied customers who trust AlienCare with their vehicles.</p>
                        <Link
                            to="/services"
                            className="inline-block rounded-sm bg-[#D9AF01] px-8 py-3 text-lg font-bold text-[#1b1b18] transition-all duration-300 hover:bg-[#c29d01]"
                        >
                            View Our Services
                        </Link>
                    </div>
                </main>

                <div className="h-16"></div>
            </div>
        </>
    );
}
