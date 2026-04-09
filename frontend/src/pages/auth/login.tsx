import InputError from '@/components/shared/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { flattenValidationErrors } from '@/lib/validation-errors';
import { ApiError } from '@/services/api';
import { ArrowLeft, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';

function GoogleIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
            <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.24 1.25-.96 2.3-2.04 3.01l3.3 2.56c1.92-1.77 3.03-4.37 3.03-7.46 0-.71-.06-1.39-.19-2H12Z" />
            <path
                fill="#34A853"
                d="M12 22c2.7 0 4.96-.89 6.61-2.42l-3.3-2.56c-.92.62-2.09.98-3.31.98-2.55 0-4.72-1.72-5.49-4.03l-3.41 2.64A10 10 0 0 0 12 22Z"
            />
            <path
                fill="#4A90E2"
                d="M6.51 13.97A6.02 6.02 0 0 1 6.2 12c0-.68.12-1.34.31-1.97l-3.41-2.64A10 10 0 0 0 2 12c0 1.61.38 3.13 1.1 4.39l3.41-2.42Z"
            />
            <path
                fill="#FBBC05"
                d="M12 5.98c1.47 0 2.79.51 3.83 1.51l2.87-2.87C16.95 2.99 14.7 2 12 2a10 10 0 0 0-8.9 5.39l3.41 2.64C7.28 7.7 9.45 5.98 12 5.98Z"
            />
        </svg>
    );
}

function FacebookIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
            <path
                fill="#1877F2"
                d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.03 4.39 11.03 10.13 11.93v-8.43H7.08v-3.5h3.05V9.41c0-3.03 1.79-4.71 4.53-4.71 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.5 0-1.97.94-1.97 1.9v2.27h3.35l-.54 3.5h-2.81V24C19.61 23.1 24 18.1 24 12.07Z"
            />
        </svg>
    );
}

export default function Login({ status }: { status?: string }) {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});
        setFormError(null);
        try {
            await login(email, password, remember);
        } catch (error) {
            if (error instanceof ApiError && error.status === 422) {
                const flatErrors = flattenValidationErrors(error.validationErrors);
                if (Object.keys(flatErrors).length > 0) {
                    setErrors(flatErrors);
                } else {
                    setFormError(error.message || 'Unable to log in with the provided credentials.');
                }
            } else {
                setFormError(error instanceof Error ? error.message : 'Unable to log in right now. Please try again.');
            }
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="relative flex min-h-dvh items-center justify-center bg-[#050505] px-4 py-8">
            {/* Back button */}
            <Link
                to="/"
                className="absolute top-5 left-5 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/[0.07] px-3 py-2 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
            >
                <ArrowLeft className="h-4 w-4" />
                Back
            </Link>

            <div className="w-full max-w-md space-y-8">
                {/* Logo */}
                <div className="flex flex-col items-center gap-3">
                    <img src="/images/iconlogo.svg" alt="AlienCare Autoshop" className="h-14 w-14" />
                    <div className="text-center">
                        <h1 className="text-2xl font-semibold tracking-tight text-white">Welcome back</h1>
                        <p className="mt-1 text-sm text-white/50">Login to your account to continue</p>
                    </div>
                </div>

                {/* Social login buttons */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        className="inline-flex h-11 cursor-not-allowed items-center justify-center gap-2.5 rounded-xl border border-white/20 bg-white/[0.07] px-4 text-sm font-medium text-white/85 transition hover:border-white/30 hover:bg-white/10"
                    >
                        <GoogleIcon />
                        Google
                    </button>
                    <button
                        type="button"
                        className="inline-flex h-11 cursor-not-allowed items-center justify-center gap-2.5 rounded-xl border border-white/20 bg-white/[0.07] px-4 text-sm font-medium text-white/85 transition hover:border-white/30 hover:bg-white/10"
                    >
                        <FacebookIcon />
                        Facebook
                    </button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-white/20" />
                    <span className="text-xs tracking-widest text-white/45 uppercase">or</span>
                    <div className="h-px flex-1 bg-white/20" />
                </div>

                {/* Status message */}
                {status && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{status}</div>
                )}

                {/* Login form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <InputError
                        message={formError ?? undefined}
                        className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-red-200"
                    />

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium text-white/90">
                                Email
                            </Label>
                            <div className="group flex items-center gap-3 rounded-xl border border-white/20 bg-white/[0.07] px-3.5 transition focus-within:border-[#d4af37]/60 focus-within:ring-1 focus-within:ring-[#d4af37]/20">
                                <Mail className="h-4 w-4 shrink-0 text-white/50 transition group-focus-within:text-[#d4af37]" />
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-11 border-0 bg-transparent px-0 text-sm text-white shadow-none placeholder:text-white/40 focus-visible:ring-0"
                                />
                            </div>
                            <InputError message={errors.email} className="text-xs text-red-400" />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-sm font-medium text-white/90">
                                    Password
                                </Label>
                                <Link to="/forgot-password" className="text-xs text-white/50 transition hover:text-[#d4af37]" tabIndex={5}>
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="group flex items-center gap-3 rounded-xl border border-white/20 bg-white/[0.07] px-3.5 transition focus-within:border-[#d4af37]/60 focus-within:ring-1 focus-within:ring-[#d4af37]/20">
                                <LockKeyhole className="h-4 w-4 shrink-0 text-white/50 transition group-focus-within:text-[#d4af37]" />
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-11 border-0 bg-transparent px-0 text-sm text-white shadow-none placeholder:text-white/40 focus-visible:ring-0"
                                />
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="shrink-0 text-white/40 transition hover:text-white/70"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <InputError message={errors.password} className="text-xs text-red-400" />
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <Checkbox
                            id="remember"
                            tabIndex={3}
                            checked={remember}
                            onCheckedChange={(checked) => setRemember(checked === true)}
                            className="border-white/35 data-[state=checked]:border-[#d4af37] data-[state=checked]:bg-[#d4af37] data-[state=checked]:text-black"
                        />
                        <Label htmlFor="remember" className="text-sm text-white/75">
                            Remember me
                        </Label>
                    </div>

                    <Button
                        type="submit"
                        className="h-11 w-full rounded-xl bg-[#d4af37] text-sm font-semibold text-black transition hover:bg-[#e6c24e]"
                        tabIndex={4}
                        disabled={processing}
                    >
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        {processing ? 'Logging in...' : 'Login'}
                    </Button>
                </form>

                {/* Footer */}
                <p className="text-center text-sm text-white/55">
                    Don't have an account?{' '}
                    <Link to="/register" className="font-medium text-white/80 transition hover:text-[#d4af37]" tabIndex={6}>
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}
