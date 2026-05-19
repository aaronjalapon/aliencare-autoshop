import AppLayout from '@/components/layout/app-layout';
import InputError from '@/components/shared/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/context/AuthContext';
import { flattenValidationErrors } from '@/lib/validation-errors';
import { ApiError } from '@/services/api';
import { authService, type UpdateProfileData } from '@/services/authService';
import { settingsService } from '@/services/settingsService';
import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { ArrowLeft, Bell, ChevronRight, CreditCard, Lock, ReceiptText, ShieldCheck, SlidersHorizontal, UserCircle2 } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/toast';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Settings', href: '/settings' },
];

const SETTING_SECTIONS = [
    {
        id: 'account',
        title: 'Account',
        items: [
            { icon: UserCircle2, label: 'Profile Information', description: 'Update your frontdesk display name, email, and contact details' },
            { icon: Lock, label: 'Password and Login', description: 'Manage password updates and account sign-in protection' },
            { icon: ShieldCheck, label: 'Session Security', description: 'Control session timeout and account safety preferences' },
        ],
    },
    {
        id: 'billing',
        title: 'Billing and POS',
        items: [
            { icon: CreditCard, label: 'Payment Methods', description: 'Enable and configure accepted payment channels at the counter' },
            { icon: ReceiptText, label: 'Invoice and Receipt Format', description: 'Set default notes and print behavior for customer documents' },
            {
                icon: SlidersHorizontal,
                label: 'Counter Workflow Defaults',
                description: 'Adjust payment flow and frontdesk billing operation defaults',
            },
        ],
    },
    {
        id: 'notifications',
        title: 'Notifications',
        items: [
            { icon: Bell, label: 'Payment Alerts', description: 'Get notified when invoices are settled or payment links are completed' },
            { icon: Bell, label: 'Service Completion Alerts', description: 'Receive updates when service tickets are ready for release billing' },
        ],
    },
];

export default function FrontdeskSettings() {
    const { user, refreshUser } = useAuth();
    const [activeSection, setActiveSection] = useState(SETTING_SECTIONS[0].id);
    const [selectedItem, setSelectedItem] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    // System settings (global config - read only for frontdesk)
    const [systemSettings, setSystemSettings] = useState<Record<string, unknown>>({});
    const [canManage, setCanManage] = useState(false);
    // User preferences (per-user)
    const [userPreferences, setUserPreferences] = useState<Record<string, unknown>>({});

    const loadData = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const [sysRes, prefRes] = await Promise.all([settingsService.getSystemSettings(), settingsService.getUserPreferences()]);
            setSystemSettings(sysRes.settings);
            setCanManage(sysRes.can_manage);
            setUserPreferences(prefRes.preferences);
        } catch {
            setLoadError('Unable to load settings. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const currentSection = SETTING_SECTIONS.find((section) => section.id === activeSection) ?? SETTING_SECTIONS[0];

    const handleBack = () => setSelectedItem(null);

    const renderForm = () => {
        if (!selectedItem) return null;

        switch (selectedItem) {
            case 'Profile Information':
                return <ProfileInformationForm user={user} refreshUser={refreshUser} onBack={handleBack} />;
            case 'Password and Login':
                return <PasswordForm onBack={handleBack} />;
            case 'Session Security':
                return <SessionSecurityForm preferences={userPreferences} onUpdate={setUserPreferences} onBack={handleBack} />;
            case 'Payment Methods':
                return <PaymentMethodsForm settings={systemSettings} canManage={canManage} onBack={handleBack} />;
            case 'Invoice and Receipt Format':
                return <InvoiceFormatForm settings={systemSettings} canManage={canManage} onUpdate={setSystemSettings} onBack={handleBack} />;
            case 'Counter Workflow Defaults':
                return <CounterWorkflowForm settings={systemSettings} canManage={canManage} onUpdate={setSystemSettings} onBack={handleBack} />;
            case 'Payment Alerts':
                return (
                    <NotificationToggleForm
                        prefKey="payment_alerts"
                        label="Payment Alerts"
                        description="Get notified when invoices are settled or payment links are completed."
                        preferences={userPreferences}
                        onUpdate={setUserPreferences}
                        onBack={handleBack}
                    />
                );
            case 'Service Completion Alerts':
                return (
                    <NotificationToggleForm
                        prefKey="service_completion_alerts"
                        label="Service Completion Alerts"
                        description="Receive updates when service tickets are ready for release billing."
                        preferences={userPreferences}
                        onUpdate={setUserPreferences}
                        onBack={handleBack}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full min-h-0 flex-1 flex-col gap-6 overflow-hidden p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Customize your workspace — update your profile, set payment channels, adjust receipt formats, and choose your alert
                        preferences.
                    </p>
                </div>

                <div className="flex min-h-0 flex-1 gap-6 overflow-hidden lg:items-start">
                    {/* Left: Section navigation */}
                    <div className="w-full shrink-0 lg:min-h-0 lg:w-64 lg:overflow-y-auto">
                        <nav className="overflow-hidden rounded-xl border border-[#2a2a2e] bg-[#0d0d10]">
                            {SETTING_SECTIONS.map((section, sectionIndex) => (
                                <div key={section.id}>
                                    <p
                                        className={`px-4 pt-4 text-xs font-semibold tracking-wider text-muted-foreground/60 uppercase ${sectionIndex !== 0 ? 'border-t border-[#2a2a2e]' : ''}`}
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
                                        {currentSection.id === 'account' && 'Update account identity and keep frontdesk access secure.'}
                                        {currentSection.id === 'billing' && 'Configure billing behavior, payment channels, and receipt defaults.'}
                                        {currentSection.id === 'notifications' && 'Control real-time updates for payments and service releases.'}
                                    </p>
                                </div>

                                <div className="overflow-hidden rounded-xl border border-[#2a2a2e] bg-[#0d0d10]">
                                    {currentSection.items.map((item, index) => (
                                        <button
                                            key={item.label}
                                            onClick={() => {
                                                setSelectedItem(item.label);
                                            }}
                                            className={`flex w-full items-center gap-4 px-6 py-5 text-left transition-colors hover:bg-[#1e1e22] ${
                                                index !== currentSection.items.length - 1 ? 'border-b border-[#2a2a2e]' : ''
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
        </AppLayout>
    );
}

// ─── Inline Form Components ───────────────────────────────────────────────────

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

function ProfileInformationForm({
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
    const { success, error: toastError } = useToast();

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
            success('Profile updated.');
            setTimeout(() => setRecentlySuccessful(false), 2000);
        } catch (error) {
            if (error instanceof ApiError && error.status === 422) {
                const flatErrors = flattenValidationErrors(error.validationErrors);
                if (Object.keys(flatErrors).length > 0) setErrors(flatErrors);
            } else {
                const message = 'Unable to save your profile. Please try again.';
                setFormError(message);
                toastError(message);
            }
        } finally {
            setProcessing(false);
        }
    };

    return (
        <FormShell title="Profile Information" description="Update your frontdesk display name, email, and contact details." onBack={onBack}>
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-2">
                    <Label htmlFor="fd-name">Name</Label>
                    <Input id="fd-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Full name" />
                    <InputError message={errors.name} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="fd-email">Email address</Label>
                    <Input id="fd-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email address" />
                    <InputError message={errors.email} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="fd-phone">Phone number</Label>
                    <Input id="fd-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Contact number" />
                    <InputError message={errors.phone_number} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="fd-address">Address</Label>
                    <Input id="fd-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Your address" />
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
    const { success, error: toastError } = useToast();

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
            success('Password updated.');
            setCurrentPassword('');
            setPassword('');
            setPasswordConfirmation('');
            setTimeout(() => setRecentlySuccessful(false), 2000);
        } catch (error) {
            if (error instanceof ApiError && error.status === 422) {
                const flatErrors = flattenValidationErrors(error.validationErrors);
                if (Object.keys(flatErrors).length > 0) setErrors(flatErrors);
            } else {
                const message = 'Unable to update password. Please try again.';
                setFormError(message);
                toastError(message);
            }
        } finally {
            setProcessing(false);
        }
    };

    return (
        <FormShell title="Password and Login" description="Manage password updates and account sign-in protection." onBack={onBack}>
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-2">
                    <Label htmlFor="fd-current-pw">Current password</Label>
                    <Input
                        id="fd-current-pw"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                    />
                    <InputError message={errors.current_password} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="fd-new-pw">New password</Label>
                    <Input
                        id="fd-new-pw"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                    />
                    <InputError message={errors.password} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="fd-confirm-pw">Confirm password</Label>
                    <Input
                        id="fd-confirm-pw"
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

function SessionSecurityForm({
    preferences,
    onUpdate,
    onBack,
}: {
    preferences: Record<string, unknown>;
    onUpdate: (prefs: Record<string, unknown>) => void;
    onBack: () => void;
}) {
    const [timeoutMinutes, setTimeoutMinutes] = useState(String(preferences.session_timeout_minutes ?? '30'));
    const [processing, setProcessing] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [recentlySuccessful, setRecentlySuccessful] = useState(false);
    const { success, error: toastError } = useToast();

    const handleSave = async () => {
        setProcessing(true);
        setFormError(null);
        try {
            const res = await settingsService.updateUserPreferences({ session_timeout_minutes: Number(timeoutMinutes) });
            onUpdate(res.preferences);
            setRecentlySuccessful(true);
            success('Session preferences saved.');
            setTimeout(() => setRecentlySuccessful(false), 2000);
        } catch {
            const message = 'Unable to save. Please try again.';
            setFormError(message);
            toastError(message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <FormShell title="Session Security" description="Control session timeout and account safety preferences." onBack={onBack}>
            <div className="space-y-5">
                <div className="grid gap-2">
                    <Label htmlFor="fd-timeout">Session timeout</Label>
                    <select
                        id="fd-timeout"
                        value={timeoutMinutes}
                        onChange={(e) => setTimeoutMinutes(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="60">60 minutes</option>
                    </select>
                    <p className="text-xs text-muted-foreground">You will be logged out after this period of inactivity.</p>
                </div>
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

function PaymentMethodsForm({ settings, canManage, onBack }: { settings: Record<string, unknown>; canManage: boolean; onBack: () => void }) {
    // Read-only display for frontdesk
    return (
        <FormShell title="Payment Methods" description="Enable and configure accepted payment channels at the counter." onBack={onBack}>
            <div className="space-y-5">
                <p className="text-xs text-muted-foreground">
                    {canManage
                        ? 'Toggle which payment methods are accepted.'
                        : 'These settings are managed by the administrator. Payment methods shown below are read-only.'}
                </p>
                <SettingToggle
                    label="Cash"
                    description="Accept cash payments at the counter."
                    checked={settings['payment.cash_enabled'] === true || settings['payment.cash_enabled'] === 'true'}
                    disabled={!canManage}
                />
                <SettingToggle
                    label="Online (Xendit)"
                    description="Enable Xendit payment gateway for online invoice payments."
                    checked={settings['payment.xendit_enabled'] === true || settings['payment.xendit_enabled'] === 'true'}
                    disabled={!canManage}
                />
            </div>
        </FormShell>
    );
}

function InvoiceFormatForm({
    settings,
    canManage,
    onUpdate,
    onBack,
}: {
    settings: Record<string, unknown>;
    canManage: boolean;
    onUpdate: (s: Record<string, unknown>) => void;
    onBack: () => void;
}) {
    const [defaultNotes, setDefaultNotes] = useState(String(settings['invoice.default_notes'] ?? ''));
    const [footerText, setFooterText] = useState(String(settings['invoice.footer_text'] ?? ''));
    const [itemized, setItemized] = useState(
        settings['invoice.show_itemized_breakdown'] === true || settings['invoice.show_itemized_breakdown'] === 'true',
    );
    const [format, setFormat] = useState(String(settings['invoice.default_format'] ?? 'standard'));
    const [processing, setProcessing] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [recentlySuccessful, setRecentlySuccessful] = useState(false);
    const { success, error: toastError } = useToast();

    const handleSave = async () => {
        if (!canManage) return;
        setProcessing(true);
        setFormError(null);
        try {
            const res = await settingsService.updateSystemSettings({
                'invoice.default_notes': defaultNotes,
                'invoice.footer_text': footerText,
                'invoice.show_itemized_breakdown': itemized,
                'invoice.default_format': format,
            });
            onUpdate(res.settings);
            setRecentlySuccessful(true);
            success('Invoice format settings saved.');
            setTimeout(() => setRecentlySuccessful(false), 2000);
        } catch {
            const message = 'Unable to save. Only administrators can change these settings.';
            setFormError(message);
            toastError(message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <FormShell title="Invoice and Receipt Format" description="Set default notes and print behavior for customer documents." onBack={onBack}>
            <div className="space-y-5">
                {!canManage && (
                    <p className="text-xs text-muted-foreground">These settings are managed by the administrator and are shown as read-only.</p>
                )}
                <div className="grid gap-2">
                    <Label htmlFor="fd-notes">Default notes</Label>
                    <Input
                        id="fd-notes"
                        value={defaultNotes}
                        onChange={(e) => setDefaultNotes(e.target.value)}
                        placeholder="Notes to append to every invoice"
                        disabled={!canManage}
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="fd-footer">Footer text</Label>
                    <Input
                        id="fd-footer"
                        value={footerText}
                        onChange={(e) => setFooterText(e.target.value)}
                        placeholder="Thank you for your business!"
                        disabled={!canManage}
                    />
                </div>
                <SettingToggle
                    label="Itemized Breakdown"
                    description="Show individual line items (parts and labor) on invoices."
                    checked={itemized}
                    onChange={setItemized}
                    disabled={!canManage}
                />
                <div className="grid gap-2">
                    <Label htmlFor="fd-inv-format">Default invoice format</Label>
                    <select
                        id="fd-inv-format"
                        value={format}
                        onChange={(e) => setFormat(e.target.value)}
                        disabled={!canManage}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="standard">Standard (full details)</option>
                        <option value="simplified">Simplified (summary only)</option>
                    </select>
                </div>
                {formError && <InputError message={formError} />}
                {canManage && (
                    <div className="flex items-center gap-4">
                        <Button disabled={processing} onClick={handleSave}>
                            Save
                        </Button>
                        <SuccessBadge show={recentlySuccessful} />
                    </div>
                )}
            </div>
        </FormShell>
    );
}

function CounterWorkflowForm({
    settings,
    canManage,
    onUpdate,
    onBack,
}: {
    settings: Record<string, unknown>;
    canManage: boolean;
    onUpdate: (s: Record<string, unknown>) => void;
    onBack: () => void;
}) {
    const [paymentFlow, setPaymentFlow] = useState(String(settings['workflow.default_payment_flow'] ?? 'pay_at_counter'));
    const [autoDrawer, setAutoDrawer] = useState(
        settings['workflow.auto_open_cash_drawer'] === true || settings['workflow.auto_open_cash_drawer'] === 'true',
    );
    const [requireSignature, setRequireSignature] = useState(
        settings['workflow.require_customer_signature'] === true || settings['workflow.require_customer_signature'] === 'true',
    );
    const [processing, setProcessing] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [recentlySuccessful, setRecentlySuccessful] = useState(false);
    const { success, error: toastError } = useToast();

    const handleSave = async () => {
        if (!canManage) return;
        setProcessing(true);
        setFormError(null);
        try {
            const res = await settingsService.updateSystemSettings({
                'workflow.default_payment_flow': paymentFlow,
                'workflow.auto_open_cash_drawer': autoDrawer,
                'workflow.require_customer_signature': requireSignature,
            });
            onUpdate(res.settings);
            setRecentlySuccessful(true);
            success('Workflow settings saved.');
            setTimeout(() => setRecentlySuccessful(false), 2000);
        } catch {
            const message = 'Unable to save. Only administrators can change these settings.';
            setFormError(message);
            toastError(message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <FormShell title="Counter Workflow Defaults" description="Adjust payment flow and frontdesk billing operation defaults." onBack={onBack}>
            <div className="space-y-5">
                {!canManage && (
                    <p className="text-xs text-muted-foreground">These settings are managed by the administrator and are shown as read-only.</p>
                )}
                <div className="grid gap-2">
                    <Label htmlFor="fd-payment-flow">Default payment flow</Label>
                    <select
                        id="fd-payment-flow"
                        value={paymentFlow}
                        onChange={(e) => setPaymentFlow(e.target.value)}
                        disabled={!canManage}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="pay_at_counter">Pay at counter</option>
                        <option value="pay_first">Pay first before service</option>
                    </select>
                    <p className="text-xs text-muted-foreground">Whether customers pay at the counter or before service starts.</p>
                </div>
                <SettingToggle
                    label="Auto-Open Cash Drawer"
                    description="Automatically signal the cash drawer after a cash transaction."
                    checked={autoDrawer}
                    onChange={setAutoDrawer}
                    disabled={!canManage}
                />
                <SettingToggle
                    label="Require Customer Signature"
                    description="Prompt for customer signature on digital receipt before finalizing."
                    checked={requireSignature}
                    onChange={setRequireSignature}
                    disabled={!canManage}
                />
                {formError && <InputError message={formError} />}
                {canManage && (
                    <div className="flex items-center gap-4">
                        <Button disabled={processing} onClick={handleSave}>
                            Save
                        </Button>
                        <SuccessBadge show={recentlySuccessful} />
                    </div>
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
    const { success, error: toastError } = useToast();

    const handleSave = async () => {
        setProcessing(true);
        setFormError(null);
        try {
            const res = await settingsService.updateUserPreferences({ [prefKey]: enabled });
            onUpdate(res.preferences);
            setRecentlySuccessful(true);
            success('Preference saved.');
            setTimeout(() => setRecentlySuccessful(false), 2000);
        } catch {
            const message = 'Unable to save. Please try again.';
            setFormError(message);
            toastError(message);
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
