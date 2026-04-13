import { useAuth } from '@/context/AuthContext';
import { Link, useLocation } from 'react-router-dom';

interface PublicNavbarProps {
    activePage?: 'home' | 'about' | 'services' | 'faqs';
}

export default function PublicNavbar({ activePage }: PublicNavbarProps) {
    const { user } = useAuth();
    const location = useLocation();

    const linkClass = (page: string) =>
        `text-sm leading-normal transition-colors duration-300 ${activePage === page ? 'text-[#D9AF01]' : 'text-[#EDEDEC] hover:text-[#D9AF01]'}`;

    const handleAnchorClick = (e: React.MouseEvent, hash: string) => {
        if (location.pathname === '/') {
            e.preventDefault();
            const el = document.getElementById(hash);
            if (el) {
                window.scrollTo({ top: el.offsetTop, behavior: 'smooth' });
            }
        }
    };

    return (
        <header className="fixed top-0 right-0 left-0 z-50 w-full px-6 pt-4 text-sm lg:px-12">
            <nav className="flex items-center justify-between rounded-xl border border-white/8 bg-[#080808]/80 px-5 py-3.5 shadow-[0_4px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                <div className="flex items-center gap-8">
                    <Link to="/" className="flex items-center">
                        <img src="/images/iconlogo.svg" alt="AlienCare Auto Shop Logo" className="h-9 w-auto" />
                    </Link>
                    <div className="hidden items-center gap-6 md:flex">
                        <Link to="/" className={linkClass('home')}>
                            Home
                        </Link>
                        <Link to="/#about" className={linkClass('about')} onClick={(e) => handleAnchorClick(e, 'about')}>
                            About Us
                        </Link>
                        <Link to="/#services" className={linkClass('services')} onClick={(e) => handleAnchorClick(e, 'services')}>
                            Services
                        </Link>
                        <Link to="/faqs" className={linkClass('faqs')}>
                            FAQs
                        </Link>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {user ? (
                        <Link
                            to="/dashboard"
                            className="inline-block rounded-sm border border-[#D9AF01]/40 px-5 py-1.5 text-sm leading-normal font-semibold text-[#D9AF01] transition-all duration-300 hover:bg-[#D9AF01] hover:text-[#0a0a0a]"
                        >
                            Dashboard
                        </Link>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="inline-block px-4 py-1.5 text-sm leading-normal font-semibold text-gray-400 transition-colors duration-300 hover:text-[#EDEDEC]"
                            >
                                Log in
                            </Link>
                            <Link
                                to="/register"
                                className="inline-block rounded-sm bg-[#D9AF01] px-5 py-1.5 text-sm leading-normal font-bold text-[#0a0a0a] transition-all duration-300 hover:bg-[#f0cc30] hover:shadow-[0_0_16px_rgba(217,175,1,0.35)]"
                            >
                                Sign up
                            </Link>
                        </>
                    )}
                </div>
            </nav>
        </header>
    );
}
