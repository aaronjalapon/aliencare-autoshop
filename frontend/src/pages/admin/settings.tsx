import AdminLayout from '@/components/layout/admin-layout';
import { type BreadcrumbItem } from '@/types';
import { Bell, ChevronRight, Database, KeyRound, Megaphone, Shield, Users, Workflow } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin Dashboard', href: '/admin' },
    { title: 'Settings', href: '/admin/settings' },
];

const SETTING_SECTIONS = [
    {
        id: 'administration',
        title: 'Administration',
        items: [
            { icon: Users, label: 'User and Role Control', description: 'Manage admin and front desk access privileges' },
            { icon: Shield, label: 'Security Policies', description: 'Configure password, session, and account protection rules' },
            { icon: KeyRound, label: 'Access Keys', description: 'Maintain internal keys and integration credentials' },
        ],
    },
    {
        id: 'notifications',
        title: 'Notifications',
        items: [
            { icon: Bell, label: 'System Alerts', description: 'Control alert rules for outages and critical incidents' },
            { icon: Megaphone, label: 'Broadcast Messages', description: 'Draft announcements for operations and staff' },
        ],
    },
    {
        id: 'operations',
        title: 'Operations',
        items: [
            { icon: Workflow, label: 'Workflow Rules', description: 'Define approval and scheduling behavior' },
            { icon: Database, label: 'Backup and Retention', description: 'Set archival and retention policy defaults' },
        ],
    },
];

export default function AdminSettings() {
    const [activeSection, setActiveSection] = useState(SETTING_SECTIONS[0].id);

    const currentSection = SETTING_SECTIONS.find((section) => section.id === activeSection) ?? SETTING_SECTIONS[0];

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full min-h-0 flex-1 flex-col gap-6 overflow-hidden p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">Manage platform preferences and administrative controls.</p>
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
                                {currentSection.id === 'administration' && 'Core account, security, and access controls for admin operations.'}
                                {currentSection.id === 'notifications' && 'Configure internal alerts and system message preferences.'}
                                {currentSection.id === 'operations' && 'Manage process defaults and operational policy templates.'}
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
        </AdminLayout>
    );
}
