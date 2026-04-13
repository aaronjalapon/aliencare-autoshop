import { Link } from 'react-router-dom';

export default function PublicFooter() {
    return (
        <footer className="w-full bg-black">
            {/* Top border accent */}
            <div className="h-px w-full bg-linear-to-r from-transparent via-[#D9AF01]/40 to-transparent" />

            <div className="mx-auto max-w-6xl px-8 py-16">
                <div className="grid gap-12 md:grid-cols-3">
                    {/* Brand */}
                    <div>
                        <Link to="/" className="mb-5 inline-block">
                            <img src="/images/iconlogo.svg" alt="AlienCare Auto Shop Logo" className="h-10 w-auto" />
                        </Link>
                        <p className="mb-6 text-sm leading-relaxed text-gray-500">
                            Your car deserves cosmic-level care. AlienCare Autoshop is Davao's trusted pit stop for drivers who demand the best.
                        </p>
                        {/* Social or tagline badge */}
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#D9AF01]/20 bg-[#D9AF01]/5 px-3 py-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#D9AF01]" />
                            <span className="text-xs font-medium text-[#D9AF01]">Est. 2015 · Davao City</span>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="mb-5 text-xs font-semibold tracking-[0.15em] text-[#D9AF01] uppercase">Quick Links</h3>
                        <ul className="space-y-3">
                            {[
                                { label: 'Home', to: '/' },
                                { label: 'About Us', to: '/about' },
                                { label: 'Services', to: '/#services' },
                                { label: 'FAQs', to: '/faqs' },
                                { label: 'Sign Up', to: '/register' },
                            ].map((link) => (
                                <li key={link.label}>
                                    <Link
                                        to={link.to}
                                        className="group flex items-center gap-2 text-sm text-gray-500 transition-colors duration-300 hover:text-[#D9AF01]"
                                    >
                                        <span className="h-px w-3 bg-gray-700 transition-all duration-300 group-hover:w-4 group-hover:bg-[#D9AF01]" />
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h3 className="mb-5 text-xs font-semibold tracking-[0.15em] text-[#D9AF01] uppercase">Get in Touch</h3>
                        <ul className="space-y-4 text-sm">
                            <li className="flex items-start gap-3 text-gray-500">
                                <svg
                                    className="mt-0.5 h-4 w-4 shrink-0 text-[#D9AF01]"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                                TBCI Compound Purok 13 Terminal Ma-a, Davao City, Philippines 8000
                            </li>
                            <li className="flex items-center gap-3 text-gray-500">
                                <svg
                                    className="h-4 w-4 shrink-0 text-[#D9AF01]"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12 19.79 19.79 0 0 1 1.93 3.5 2 2 0 0 1 3.9 1.32h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9a16 16 0 0 0 6.95 6.95l1.1-1.1a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                                (+63) 954 160 0424
                            </li>
                            <li className="flex items-center gap-3 text-gray-500">
                                <svg
                                    className="h-4 w-4 shrink-0 text-[#D9AF01]"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <rect width="20" height="16" x="2" y="4" rx="2" />
                                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                </svg>
                                info@aliencare-autoshop.com
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Copyright Bar */}
            <div className="border-t border-white/5 px-8 py-5">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 sm:flex-row">
                    <p className="text-xs text-gray-600">&copy; {new Date().getFullYear()} AlienCare Autoshop. All rights reserved.</p>
                    <p className="text-xs text-gray-700">Built with cosmic precision.</p>
                </div>
            </div>
        </footer>
    );
}
