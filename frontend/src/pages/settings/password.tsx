import AppLayout from '@/components/layout/app-layout';
import SettingsLayout from '@/components/layout/settings/layout';
import InputError from '@/components/shared/input-error';
import { flattenValidationErrors } from '@/lib/validation-errors';
import { ApiError } from '@/services/api';
import { authService } from '@/services/authService';
import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { FormEvent, useRef, useState } from 'react';

import HeadingSmall from '@/components/shared/heading-small';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Password settings',
        href: '/settings/password',
    },
];

export default function Password() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const [currentPassword, setCurrentPassword] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [recentlySuccessful, setRecentlySuccessful] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});
        try {
            await authService.updatePassword({
                current_password: currentPassword,
                password,
                password_confirmation: passwordConfirmation,
            });
            setCurrentPassword('');
            setPassword('');
            setPasswordConfirmation('');
            setRecentlySuccessful(true);
            setTimeout(() => setRecentlySuccessful(false), 2000);
        } catch (error) {
            if (error instanceof ApiError && error.status === 422) {
                const flatErrors = flattenValidationErrors(error.validationErrors);
                if (Object.keys(flatErrors).length > 0) {
                    setErrors(flatErrors);

                    if (flatErrors.password) {
                        passwordInput.current?.focus();
                    }
                    if (flatErrors.current_password) {
                        currentPasswordInput.current?.focus();
                    }
                }
            }
        } finally {
            setProcessing(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title="Update password" description="Ensure your account is using a long, random password to stay secure" />

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="current_password">Current password</Label>

                            <Input
                                id="current_password"
                                ref={currentPasswordInput}
                                type="password"
                                className="mt-1 block w-full"
                                autoComplete="current-password"
                                placeholder="Current password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                            />

                            <InputError message={errors.current_password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">New password</Label>

                            <Input
                                id="password"
                                ref={passwordInput}
                                type="password"
                                className="mt-1 block w-full"
                                autoComplete="new-password"
                                placeholder="New password"
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
                                className="mt-1 block w-full"
                                autoComplete="new-password"
                                placeholder="Confirm password"
                                value={passwordConfirmation}
                                onChange={(e) => setPasswordConfirmation(e.target.value)}
                            />

                            <InputError message={errors.password_confirmation} />
                        </div>

                        <div className="flex items-center gap-4">
                            <Button disabled={processing}>Save password</Button>

                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p className="text-sm text-neutral-600">Saved</p>
                            </Transition>
                        </div>
                    </form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
