import AppLayout from '@/components/layout/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Bell, ChevronRight, CreditCard, Lock, ReceiptText, ShieldCheck, SlidersHorizontal, UserCircle2 } from 'lucide-react';
import { useState } from 'react';

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
    const [activeSection, setActiveSection] = useState(SETTING_SECTIONS[0].id);

    const currentSection = SETTING_SECTIONS.find((section) => section.id === activeSection) ?? SETTING_SECTIONS[0];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full min-h-0 flex-1 flex-col gap-6 overflow-hidden p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">Manage frontdesk account preferences and billing workspace defaults.</p>
                </div>

                <div className="flex min-h-0 flex-1 gap-6 overflow-hidden lg:items-start">
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
                                                onClick={() => setActiveSection(section.id)}
                                                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                                                    activeSection === section.id ? 'text-[#d4af37]' : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                <item.icon
                                                    className={`h-4 w-4 shrink-0 ${activeSection === section.id ? 'text-[#d4af37]' : 'text-muted-foreground'}`}
                                                />
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </nav>
                    </div>

                    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
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

                        <p className="mt-2 text-xs text-muted-foreground/40">Settings functionality is coming soon.</p>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
