import CustomerLayout from '@/components/layout/customer-layout';
import { Bell, ChevronRight, Lock, Moon, Shield, Smartphone, User } from 'lucide-react';
import { useState } from 'react';

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
    const [activeSection, setActiveSection] = useState(SETTING_SECTIONS[0].id);

    const currentSection = SETTING_SECTIONS.find((s) => s.id === activeSection) ?? SETTING_SECTIONS[0];

    return (
        <CustomerLayout>
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Page header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">Manage your account preferences and app settings.</p>
                </div>

                {/* Two-column settings layout on lg+, stacked on smaller screens */}
                <div className="flex flex-1 gap-6 lg:items-start">
                    {/* Left: Section navigation */}
                    <div className="w-full shrink-0 lg:w-56">
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

                    {/* Right: Section content */}
                    <div className="flex min-w-0 flex-1 flex-col gap-4">
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

                        <p className="mt-2 text-xs text-muted-foreground/40">Settings functionality is coming soon.</p>
                    </div>
                </div>
            </div>
        </CustomerLayout>
    );
}
