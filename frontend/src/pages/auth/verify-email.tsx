import AuthLayout from '@/components/layout/auth-layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/authService';
import { LoaderCircle } from 'lucide-react';
import { FormEvent, useState } from 'react';

export default function VerifyEmail() {
    const { logout } = useAuth();
    const [processing, setProcessing] = useState(false);
    const [status, setStatus] = useState('');

    const handleResend = async (e: FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            await authService.sendVerificationEmail();
            setStatus('verification-link-sent');
        } catch {
            // Silently handle errors
        } finally {
            setProcessing(false);
        }
    };

    const handleLogout = async () => {
        await logout();
    };

    return (
        <AuthLayout title="Verify email" description="Please verify your email address by clicking on the link we just emailed to you.">
            {status === 'verification-link-sent' && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    A new verification link has been sent to the email address you provided during registration.
                </div>
            )}

            <form onSubmit={handleResend} className="space-y-6 text-center">
                <Button disabled={processing} variant="secondary">
                    {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    Resend verification email
                </Button>

                <button
                    type="button"
                    onClick={handleLogout}
                    className="mx-auto block text-sm text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                >
                    Log out
                </button>
            </form>
        </AuthLayout>
    );
}
