import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { getRoleHome } from '@/router';
import { CheckCircle2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function VerifyComplete() {
    const { user, refreshUser } = useAuth();
    const [params] = useSearchParams();
    const navigate = useNavigate();

    const nextPath = useMemo(() => {
        const next = params.get('next');
        if (next && next.startsWith('/')) {
            return next;
        }
        return user ? getRoleHome(user.role) : '/login';
    }, [params, user]);

    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    useEffect(() => {
        try {
            localStorage.setItem('aliencare.emailVerifiedAt', String(Date.now()));
            localStorage.setItem('aliencare.verificationComplete', String(Date.now()));
        } catch {
            // ignore storage errors
        }
    }, []);

    useEffect(() => {
        if (!user) {
            return;
        }

        navigate(nextPath, { replace: true });
    }, [navigate, nextPath, user]);

    const title = user ? 'Email verified' : 'Verification complete';
    const subtitle = user
        ? 'Your account is verified. Redirecting you to the app now.'
        : 'Your email is verified. Log in to continue.';

    return (
        <div className="relative flex min-h-dvh items-center justify-center bg-[#050505] px-4 py-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.18),_transparent_55%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(59,130,246,0.12),_transparent_50%)]" />

            <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-200">
                    <CheckCircle2 className="h-6 w-6" />
                </div>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/50">AlienCare AutoShop</p>
                <h1 className="mt-3 text-2xl font-semibold text-white">{title}</h1>
                <p className="mt-2 text-sm text-white/60">{subtitle}</p>

                <Button
                    onClick={() => navigate(nextPath, { replace: true })}
                    className="mt-6 h-11 w-full rounded-xl bg-[#d4af37] text-sm font-semibold text-black transition hover:bg-[#e6c24e]"
                >
                    Return to app
                </Button>

                <p className="mt-4 text-xs text-white/45">You can close the email tab after the app loads.</p>
            </div>
        </div>
    );
}
