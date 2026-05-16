import CustomerLayout from '@/components/layout/customer-layout';
import AppearanceTabs from '@/components/shared/appearance-tabs';
import InputError from '@/components/shared/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/context/AuthContext';
import { flattenValidationErrors } from '@/lib/validation-errors';
import { ApiError } from '@/services/api';
import { authService, type UpdateProfileData } from '@/services/authService';
import { customerService } from '@/services/customerService';
import { settingsService } from '@/services/settingsService';
import type { Vehicle } from '@/types/customer';
import { Transition } from '@headlessui/react';
import { ArrowLeft, Bell, ChevronRight, Lock, Moon, Shield, Smartphone, User } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const SETTING_SECTIONS = [
    {
        id: 'account',
        title: 'Account',
        items: [
            { icon: User, label: 'Personal Information', description: 'Update your name, email, and contact number' },
            { icon: Lock, label: 'Change Password', description: 'Update your account password' },
            { icon: Smartphone, label: 'Linked Vehicles', description: 'Manage your registered vehicles' },
        ],
    },
    {
        id: 'notifications',
        title: 'Notifications',
        items: [
            { icon: Bell, label: 'Push Notifications', description: 'Manage in-app and browser alerts' },
            { icon: Bell, label: 'Email Notifications', description: 'Choose which updates you receive by email' },
        ],
    },
    {
        id: 'preferences',
        title: 'Preferences',
        items: [
            { icon: Moon, label: 'Appearance', description: 'Light, dark, or system default' },
            { icon: Shield, label: 'Privacy & Security', description: 'Control your data and security settings' },
        ],
    },
];

export default function CustomerSettings() {
    const { user, refreshUser } = useAuth();
    const [activeSection, setActiveSection] = useState(SETTING_SECTIONS[0].id);
    const [selectedItem, setSelectedItem] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    // User preferences (per-user)
    const [userPreferences, setUserPreferences] = useState<Record<string, unknown>>({});
    // Customer vehicles
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);

    const loadData = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const [prefRes, profileRes] = await Promise.all([settingsService.getUserPreferences(), customerService.getMe().catch(() => null)]);

            setUserPreferences(prefRes.preferences);

            if (profileRes?.data) {
                // Load vehicles
                try {
                    const vehicleRes = await customerService.getVehicles(profileRes.data.id);
                    setVehicles(vehicleRes.data ?? []);
                } catch {
                    setVehicles([]);
                }
            }
        } catch {
            setLoadError('Unable to load settings. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const currentSection = SETTING_SECTIONS.find((s) => s.id === activeSection) ?? SETTING_SECTIONS[0];

    const renderForm = () => {
        if (!selectedItem) return null;

        switch (selectedItem) {
            case 'Personal Information':
                return <PersonalInfoForm user={user} refreshUser={refreshUser} onBack={() => setSelectedItem(null)} />;
            case 'Change Password':
                return <PasswordForm onBack={() => setSelectedItem(null)} />;
            case 'Linked Vehicles':
                return <LinkedVehiclesList vehicles={vehicles} onBack={() => setSelectedItem(null)} />;
            case 'Push Notifications':
                return (
                    <NotificationToggleForm
                        prefKey="push_notifications"
                        label="Push Notifications"
                        description="Manage in-app and browser alerts."
                        preferences={userPreferences}
                        onUpdate={setUserPreferences}
                        onBack={() => setSelectedItem(null)}
                    />
                );
            case 'Email Notifications':
                return (
                    <NotificationToggleForm
                        prefKey="email_notifications"
                        label="Email Notifications"
                        description="Choose which updates you receive by email."
                        preferences={userPreferences}
                        onUpdate={setUserPreferences}
                        onBack={() => setSelectedItem(null)}
                    />
                );
            case 'Appearance':
                return <AppearanceForm onBack={() => setSelectedItem(null)} />;
            case 'Privacy & Security':
                return <PrivacyForm preferences={userPreferences} onUpdate={setUserPreferences} onBack={() => setSelectedItem(null)} />;
            default:
                return null;
        }
    };

    return (
        <CustomerLayout>
            <div className="flex h-full min-h-0 flex-1 flex-col gap-6 overflow-hidden p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">Manage your account preferences and app settings.</p>
                </div>

                <div className="flex min-h-0 flex-1 gap-6 overflow-hidden lg:items-start">
                    {/* Left: Section navigation */}
                    <div className="w-full shrink-0 lg:min-h-0 lg:w-56 lg:overflow-y-auto">
                        <nav className="overflow-hidden rounded-xl border border-[#2a2a2e] bg-[#0d0d10]">
                            {SETTING_SECTIONS.map((section, sIdx) => (
                                <div key={section.id}>
                                    <p
                                        className={`px-4 pt-4 text-xs font-semibold tracking-wider text-muted-foreground/60 uppercase ${sIdx !== 0 ? 'border-t border-[#2a2a2e]' : ''}`}
                                    >
                                        {section.title}
                                    </p>
                                    <div className="pt-1 pb-2">
                                        {section.items.map((item) => (
                                            <button
                                                key={item.label}
                                                onClick={() => {
                                                    setActiveSection(section.id);
                                                    setSelectedItem(null);
                                                }}
                                                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                                                    activeSection === section.id && !selectedItem
                                                        ? 'text-[#d4af37]'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                <item.icon
                                                    className={`h-4 w-4 shrink-0 ${activeSection === section.id && !selectedItem ? 'text-[#d4af37]' : 'text-muted-foreground'}`}
                                                />
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </nav>
                    </div>

                    {/* Right: Section content */}
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
                        {loading ? (
                            <div className="flex flex-col gap-4">
                                <div className="h-7 w-48 animate-pulse rounded-md bg-[#1e1e22]" />
                                <div className="rounded-xl border border-[#2a2a2e] bg-[#0d0d10]">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex animate-pulse items-center gap-4 border-b border-[#2a2a2e] px-6 py-5">
                                            <div className="h-10 w-10 shrink-0 rounded-lg bg-[#1e1e22]" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 w-32 rounded bg-[#1e1e22]" />
                                                <div className="h-3 w-64 rounded bg-[#1e1e22]" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : loadError ? (
                            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                                <p className="text-sm text-red-400">{loadError}</p>
                                <Button variant="outline" onClick={loadData}>
                                    Retry
                                </Button>
                            </div>
                        ) : selectedItem ? (
                            renderForm()
                        ) : (
                            <>
                                <div>
                                    <h2 className="text-lg font-semibold">{currentSection.title}</h2>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {currentSection.id === 'account' && 'Manage your personal details and linked vehicles.'}
                                        {currentSection.id === 'notifications' && 'Control how and when you receive alerts.'}
                                        {currentSection.id === 'preferences' && 'Customize the app experience to your liking.'}
                                    </p>
                                </div>

                                <div className="overflow-hidden rounded-xl border border-[#2a2a2e] bg-[#0d0d10]">
                                    {currentSection.items.map((item, idx) => (
                                        <button
                                            key={item.label}
                                            onClick={() => setSelectedItem(item.label)}
                                            className={`flex w-full items-center gap-4 px-6 py-5 text-left transition-colors hover:bg-[#1e1e22] ${
                                                idx !== currentSection.items.length - 1 ? 'border-b border-[#2a2a2e]' : ''
                                            }`}
                                        >
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1e1e22]">
                                                <item.icon className="h-5 w-5 text-[#d4af37]" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                                                <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                                            </div>
                                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </CustomerLayout>
    );
}

// ─── Form Shell ────────────────────────────────────────────────────────────────

function FormShell({ title, description, onBack, children }: { title: string; description: string; onBack: () => void; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-4">
            <button
                onClick={onBack}
                className="flex w-fit items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
            </button>
            <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            </div>
            <div className="rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-6">{children}</div>
        </div>
    );
}

function SuccessBadge({ show }: { show: boolean }) {
    return (
        <Transition show={show} enter="transition ease-in-out" enterFrom="opacity-0" leave="transition ease-in-out" leaveTo="opacity-0">
            <p className="text-sm text-green-500">Saved</p>
        </Transition>
    );
}

// ─── Inline Form Components ────────────────────────────────────────────────────

function PersonalInfoForm({
    user,
    refreshUser,
    onBack,
}: {
    user: import('@/types').User | null;
    refreshUser: () => Promise<void>;
    onBack: () => void;
}) {
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState((user?.phone_number as string) || '');
    const [address, setAddress] = useState((user?.address as string) || '');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [recentlySuccessful, setRecentlySuccessful] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});
        setFormError(null);
        try {
            const payload: UpdateProfileData = { name, email };
            if (phone) payload.phone_number = phone;
            if (address) payload.address = address;
            await authService.updateProfile(payload);
            await refreshUser();
            setRecentlySuccessful(true);
            setTimeout(() => setRecentlySuccessful(false), 2000);
        } catch (error) {
            if (error instanceof ApiError && error.status === 422) {
                const flatErrors = flattenValidationErrors(error.validationErrors);
                if (Object.keys(flatErrors).length > 0) setErrors(flatErrors);
            } else {
                setFormError('Unable to save your information. Please try again.');
            }
        } finally {
            setProcessing(false);
        }
    };

    return (
        <FormShell title="Personal Information" description="Update your name, email, and contact number." onBack={onBack}>
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-2">
                    <Label htmlFor="cust-name">Name</Label>
                    <Input id="cust-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Full name" />
                    <InputError message={errors.name} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="cust-email">Email address</Label>
                    <Input
                        id="cust-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="Email address"
                    />
                    <InputError message={errors.email} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="cust-phone">Phone number</Label>
                    <Input id="cust-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Contact number" />
                    <InputError message={errors.phone_number} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="cust-address">Address</Label>
                    <Input id="cust-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Your address" />
                    <InputError message={errors.address} />
                </div>
                {formError && <InputError message={formError} />}
                <div className="flex items-center gap-4">
                    <Button disabled={processing}>Save</Button>
                    <SuccessBadge show={recentlySuccessful} />
                </div>
            </form>
        </FormShell>
    );
}

function PasswordForm({ onBack }: { onBack: () => void }) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [recentlySuccessful, setRecentlySuccessful] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});
        setFormError(null);
        try {
            await authService.updatePassword({
                current_password: currentPassword,
                password,
                password_confirmation: passwordConfirmation,
            });
            setRecentlySuccessful(true);
            setCurrentPassword('');
            setPassword('');
            setPasswordConfirmation('');
            setTimeout(() => setRecentlySuccessful(false), 2000);
        } catch (error) {
            if (error instanceof ApiError && error.status === 422) {
                const flatErrors = flattenValidationErrors(error.validationErrors);
                if (Object.keys(flatErrors).length > 0) setErrors(flatErrors);
            } else {
                setFormError('Unable to update password. Please try again.');
            }
        } finally {
            setProcessing(false);
        }
    };

    return (
        <FormShell title="Change Password" description="Update your account password." onBack={onBack}>
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-2">
                    <Label htmlFor="cust-current-pw">Current password</Label>
                    <Input
                        id="cust-current-pw"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                    />
                    <InputError message={errors.current_password} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="cust-new-pw">New password</Label>
                    <Input
                        id="cust-new-pw"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                    />
                    <InputError message={errors.password} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="cust-confirm-pw">Confirm password</Label>
                    <Input
                        id="cust-confirm-pw"
                        type="password"
                        value={passwordConfirmation}
                        onChange={(e) => setPasswordConfirmation(e.target.value)}
                        required
                        autoComplete="new-password"
                    />
                    <InputError message={errors.password_confirmation} />
                </div>
                {formError && <InputError message={formError} />}
                <div className="flex items-center gap-4">
                    <Button disabled={processing}>Save</Button>
                    <SuccessBadge show={recentlySuccessful} />
                </div>
            </form>
        </FormShell>
    );
}

function LinkedVehiclesList({ vehicles, onBack }: { vehicles: Vehicle[]; onBack: () => void }) {
    return (
        <FormShell title="Linked Vehicles" description="Manage your registered vehicles." onBack={onBack}>
            <div className="space-y-4">
                {vehicles.length === 0 ? (
                    <div className="py-8 text-center">
                        <p className="text-sm text-muted-foreground">No vehicles registered yet.</p>
                        <Button variant="outline" className="mt-3" asChild>
                            <Link to="/customer/profile">Add your first vehicle</Link>
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="divide-y divide-[#2a2a2e]">
                            {vehicles.map((v) => (
                                <div key={v.id} className="flex items-center justify-between py-3">
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            {v.make} {v.model} ({v.year})
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Plate: {v.plate_number}
                                            {v.color ? ` | Color: ${v.color}` : ''}
                                        </p>
                                    </div>
                                    <span
                                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                            v.approval_status === 'approved'
                                                ? 'bg-green-500/10 text-green-400'
                                                : v.approval_status === 'rejected'
                                                  ? 'bg-red-500/10 text-red-400'
                                                  : 'bg-yellow-500/10 text-yellow-400'
                                        }`}
                                    >
                                        {v.approval_status}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <Button variant="outline" asChild>
                            <Link to="/customer/profile">Manage Vehicles</Link>
                        </Button>
                    </>
                )}
            </div>
        </FormShell>
    );
}

function NotificationToggleForm({
    prefKey,
    label,
    description,
    preferences,
    onUpdate,
    onBack,
}: {
    prefKey: string;
    label: string;
    description: string;
    preferences: Record<string, unknown>;
    onUpdate: (prefs: Record<string, unknown>) => void;
    onBack: () => void;
}) {
    const [enabled, setEnabled] = useState(preferences[prefKey] === true);
    const [processing, setProcessing] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [recentlySuccessful, setRecentlySuccessful] = useState(false);

    const handleSave = async () => {
        setProcessing(true);
        setFormError(null);
        try {
            const res = await settingsService.updateUserPreferences({ [prefKey]: enabled });
            onUpdate(res.preferences);
            setRecentlySuccessful(true);
            setTimeout(() => setRecentlySuccessful(false), 2000);
        } catch {
            setFormError('Unable to save. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <FormShell title={label} description={description} onBack={onBack}>
            <div className="space-y-5">
                <SettingToggle label={label} description={description} checked={enabled} onChange={setEnabled} />
                {formError && <InputError message={formError} />}
                <div className="flex items-center gap-4">
                    <Button disabled={processing} onClick={handleSave}>
                        Save
                    </Button>
                    <SuccessBadge show={recentlySuccessful} />
                </div>
            </div>
        </FormShell>
    );
}

function AppearanceForm({ onBack }: { onBack: () => void }) {
    return (
        <FormShell title="Appearance" description="Light, dark, or system default." onBack={onBack}>
            <AppearanceTabs />
        </FormShell>
    );
}

function PrivacyForm({
    preferences,
    onUpdate,
    onBack,
}: {
    preferences: Record<string, unknown>;
    onUpdate: (prefs: Record<string, unknown>) => void;
    onBack: () => void;
}) {
    const [shareData, setShareData] = useState(preferences.share_data !== false);
    const [processing, setProcessing] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [recentlySuccessful, setRecentlySuccessful] = useState(false);

    const handleSave = async () => {
        setProcessing(true);
        setFormError(null);
        try {
            const res = await settingsService.updateUserPreferences({ share_data: shareData });
            onUpdate(res.preferences);
            setRecentlySuccessful(true);
            setTimeout(() => setRecentlySuccessful(false), 2000);
        } catch {
            setFormError('Unable to save. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <FormShell title="Privacy & Security" description="Control your data and security settings." onBack={onBack}>
            <div className="space-y-5">
                <SettingToggle
                    label="Share Usage Data"
                    description="Help us improve AlienCare by sharing anonymous usage data."
                    checked={shareData}
                    onChange={setShareData}
                />
                {formError && <InputError message={formError} />}
                <div className="flex items-center gap-4">
                    <Button disabled={processing} onClick={handleSave}>
                        Save
                    </Button>
                    <SuccessBadge show={recentlySuccessful} />
                </div>
            </div>
        </FormShell>
    );
}

// ─── Shared Toggle ─────────────────────────────────────────────────────────────

function SettingToggle({
    label,
    description,
    checked,
    onChange,
    disabled,
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange?: (checked: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-4 py-2">
            <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <Switch checked={checked} onCheckedChange={onChange ?? (() => {})} disabled={disabled} className="shrink-0" />
        </div>
    );
}
