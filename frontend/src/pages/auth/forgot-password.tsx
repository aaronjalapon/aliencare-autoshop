import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '@/services/authService';
import { ApiError } from '@/services/api';
import { flattenValidationErrors } from '@/lib/validation-errors';
import InputError from '@/components/shared/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/components/layout/auth-layout';
import { LoaderCircle } from 'lucide-react';

export default function ForgotPassword({ status: initialStatus }: { status?: string }) {
    const [email, setEmail] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [status, setStatus] = useState(initialStatus || '');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});
        try {
            const response = await authService.forgotPassword(email);
            setStatus(response.message || 'We have emailed your password reset link.');
        } catch (error) {
            if (error instanceof ApiError && error.status === 422) {
                const flatErrors = flattenValidationErrors(error.validationErrors);
                if (Object.keys(flatErrors).length > 0) {
                    setErrors(flatErrors);
                }
            }
        } finally {
            setProcessing(false);
        }
    };

    return (
        <AuthLayout title="Forgot password" description="Enter your email to receive a password reset link">
            {status && <div className="mb-4 text-center text-sm font-medium text-green-600">{status}</div>}

            <div className="space-y-6">
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email address</Label>
                        <Input
                            id="email"
                            type="email"
                            autoComplete="off"
                            autoFocus
                            placeholder="email@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <InputError message={errors.email} />
                    </div>

                    <div className="my-6 flex items-center justify-start">
                        <Button className="w-full" disabled={processing}>
                            {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                            Email password reset link
                        </Button>
                    </div>
                </form>

                <div className="space-x-1 text-center text-sm text-muted-foreground">
                    <span>Or, return to</span>
                    <Link
                        to="/login"
                        className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                    >
                        log in
                    </Link>
                </div>
            </div>
        </AuthLayout>
    );
}
