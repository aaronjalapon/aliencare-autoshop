import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { getRoleHome } from '@/router';
import { authService } from '@/services/authService';
import { LoaderCircle } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function VerifyEmail() {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const [processing, setProcessing] = useState(false);
    const [status, setStatus] = useState('');
    const [error, setError] = useState<string | null>(null);
    const autoSendRef = useRef(false);

    useEffect(() => {
        if (!user?.email_verified_at) {
            return;
        }

        navigate(getRoleHome(user.role), { replace: true });
    }, [navigate, user]);

    useEffect(() => {
        if (autoSendRef.current) {
            return;
        }

        autoSendRef.current = true;

        if (user?.email_verified_at) {
            return;
        }

        const windowMs = 2 * 60 * 1000;
        const storageKey = 'aliencare.verifyEmail.autoSentAt';
        const lastSent = Number(sessionStorage.getItem(storageKey) ?? 0);

        if (Date.now() - lastSent < windowMs) {
            return;
        }

        const sendVerification = async () => {
            setProcessing(true);
            setError(null);
            try {
                await authService.sendVerificationEmail();
                setStatus('verification-link-sent');
                sessionStorage.setItem(storageKey, String(Date.now()));
            } catch {
                setError('Could not send verification email. Please try again.');
            } finally {
                setProcessing(false);
            }
        };

        sendVerification();
    }, [user]);

    const handleResend = async (e: FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setError(null);
        try {
            await authService.sendVerificationEmail();
            setStatus('verification-link-sent');
        } catch {
            setError('Could not send verification email. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    const handleLogout = async () => {
        await logout();
    };

    return (
        <div className="relative flex min-h-dvh items-center justify-center bg-[#050505] px-4 py-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.18),_transparent_55%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(59,130,246,0.12),_transparent_50%)]" />

            <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur">
                <div className="flex flex-col items-center text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
                        <img src="/images/iconlogo.svg" alt="AlienCare AutoShop" className="h-8 w-8" />
                    </div>
                    <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/50">AlienCare AutoShop</p>
                    <h1 className="mt-3 text-2xl font-semibold text-white">Verify your email</h1>
                    <p className="mt-2 text-sm text-white/60">We just sent you a verification link. Open your inbox to activate your account.</p>
                </div>

                {status === 'verification-link-sent' && (
                    <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm font-medium text-emerald-200">
                        A new verification link has been sent to the email address you provided during registration.
                    </div>
                )}

                {error && (
                    <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm font-medium text-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleResend} className="mt-6 space-y-4 text-center">
                    <Button
                        disabled={processing}
                        className="h-11 w-full rounded-xl bg-[#d4af37] text-sm font-semibold text-black transition hover:bg-[#e6c24e]"
                    >
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        Resend verification email
                    </Button>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="mx-auto block text-sm text-white/60 underline decoration-white/30 underline-offset-4 transition hover:text-white"
                    >
                        Log out
                    </button>
                </form>

                <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-xs text-white/55">
                    Check your spam folder if the message does not appear within a minute.
                </div>
            </div>
        </div>
    );
}
