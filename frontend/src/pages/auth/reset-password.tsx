import { FormEvent, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { authService } from '@/services/authService';
import { ApiError } from '@/services/api';
import { flattenValidationErrors } from '@/lib/validation-errors';
import InputError from '@/components/shared/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/components/layout/auth-layout';
import { LoaderCircle } from 'lucide-react';

export default function ResetPassword() {
    const { token } = useParams<{ token: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const emailFromQuery = searchParams.get('email') || '';

    const [email] = useState(emailFromQuery);
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});
        try {
            await authService.resetPassword({
                token: token || '',
                email,
                password,
                password_confirmation: passwordConfirmation,
            });
            navigate('/login');
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
        <AuthLayout title="Reset password" description="Please enter your new password below">
            <form onSubmit={handleSubmit}>
                <div className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" autoComplete="email" value={email} className="mt-1 block w-full" readOnly />
                        <InputError message={errors.email} className="mt-2" />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            autoComplete="new-password"
                            className="mt-1 block w-full"
                            autoFocus
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <InputError message={errors.password} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password_confirmation">Confirm password</Label>
                        <Input
                            id="password_confirmation"
                            type="password"
                            autoComplete="new-password"
                            className="mt-1 block w-full"
                            placeholder="Confirm password"
                            value={passwordConfirmation}
                            onChange={(e) => setPasswordConfirmation(e.target.value)}
                        />
                        <InputError message={errors.password_confirmation} className="mt-2" />
                    </div>

                    <Button type="submit" className="mt-4 w-full" disabled={processing}>
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        Reset password
                    </Button>
                </div>
            </form>
        </AuthLayout>
    );
}
