import AdminLayout from '@/components/layout/admin-layout';
import { type BreadcrumbItem } from '@/types';
import { Bell, CheckCheck, Info, ShieldAlert, UserCheck } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin Dashboard', href: '/admin' },
    { title: 'Notifications', href: '/admin/notifications' },
];

type AdminNotifCategory = 'all' | 'alerts' | 'approvals' | 'system';

const SAMPLE_NOTIFICATIONS = [
    {
        id: 1,
        category: 'alerts' as const,
        title: 'Queue pressure warning on midday slots',
        message: 'Booking volume exceeded target threshold for 11:00 AM to 1:00 PM. Consider temporary slot adjustments.',
        time: '24 minutes ago',
        read: false,
    },
    {
        id: 2,
        category: 'approvals' as const,
        title: 'Front desk account awaiting admin review',
        message: 'A new front desk staff account request is pending approval and role assignment.',
        time: '1 hour ago',
        read: false,
    },
    {
        id: 3,
        category: 'system' as const,
        title: 'Daily backup completed successfully',
        message: 'Automated system backup for inventory and booking records finished without errors.',
        time: '5 hours ago',
        read: true,
    },
    {
        id: 4,
        category: 'alerts' as const,
        title: 'Booking slot conflict detected',
        message: 'Duplicate slot time was prevented during update. Audit log captured for review.',
        time: '8 hours ago',
        read: true,
    },
    {
        id: 5,
        category: 'approvals' as const,
        title: 'Customer account approval backlog',
        message: 'There are 3 customer accounts pending verification by front desk operations.',
        time: '1 day ago',
        read: true,
    },
    {
        id: 6,
        category: 'system' as const,
        title: 'Policy update reminder',
        message: 'Review role policy templates before next deployment window.',
        time: '2 days ago',
        read: true,
    },
];

const CATEGORY_LABELS: Record<AdminNotifCategory, string> = {
    all: 'All',
    alerts: 'Alerts',
    approvals: 'Approvals',
    system: 'System',
};

const CATEGORY_ICON: Record<string, typeof Bell> = {
    alerts: ShieldAlert,
    approvals: UserCheck,
    system: Info,
};

export default function AdminNotifications() {
    const [activeTab, setActiveTab] = useState<AdminNotifCategory>('all');

    const filtered = SAMPLE_NOTIFICATIONS.filter((notification) => activeTab === 'all' || notification.category === activeTab);

    const unreadCount = SAMPLE_NOTIFICATIONS.filter((notification) => !notification.read).length;

    const totalByCategory = (Object.keys(CATEGORY_LABELS) as AdminNotifCategory[]).reduce(
        (accumulator, key) => {
            accumulator[key] =
                key === 'all' ? SAMPLE_NOTIFICATIONS.length : SAMPLE_NOTIFICATIONS.filter((notification) => notification.category === key).length;
            return accumulator;
        },
        {} as Record<AdminNotifCategory, number>,
    );

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full min-h-0 flex-1 flex-col gap-6 overflow-hidden p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <button className="flex items-center gap-1.5 rounded-lg border border-[#2a2a2e] px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-[#2a2a2e] hover:text-foreground">
                            <CheckCheck className="h-4 w-4" />
                            Mark all as read
                        </button>
                    )}
                </div>

                <div className="flex min-h-0 flex-1 gap-6 overflow-hidden lg:items-start">
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
                        <div className="flex gap-1 overflow-x-auto rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-1">
                            {(Object.keys(CATEGORY_LABELS) as AdminNotifCategory[]).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                                        activeTab === tab ? 'bg-[#d4af37] text-black shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {CATEGORY_LABELS[tab]}
                                </button>
                            ))}
                        </div>

                        {filtered.length === 0 ? (
                            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-[#2a2a2e] bg-[#0d0d10] py-24 text-center">
                                <Bell className="h-10 w-10 text-muted-foreground/30" />
                                <p className="text-sm text-muted-foreground">No notifications here yet.</p>
                            </div>
                        ) : (
                            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                                {filtered.map((notification) => {
                                    const Icon = CATEGORY_ICON[notification.category] ?? Bell;

                                    return (
                                        <div
                                            key={notification.id}
                                            className={`relative flex items-start gap-4 rounded-xl border p-4 transition-colors ${
                                                notification.read
                                                    ? 'border-[#2a2a2e] bg-[#0d0d10]'
                                                    : 'border-[#d4af37]/30 bg-[#d4af37]/5'
                                            }`}
                                        >
                                            {!notification.read && <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-[#d4af37]" />}

                                            <div
                                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                                    notification.read ? 'bg-[#1e1e22]' : 'bg-[#d4af37]/10'
                                                }`}
                                            >
                                                <Icon className={`h-4 w-4 ${notification.read ? 'text-muted-foreground' : 'text-[#d4af37]'}`} />
                                            </div>

                                            <div className="min-w-0 flex-1 pr-4">
                                                <p
                                                    className={`text-sm leading-snug font-semibold ${
                                                        notification.read ? 'text-foreground/70' : 'text-foreground'
                                                    }`}
                                                >
                                                    {notification.title}
                                                </p>
                                                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{notification.message}</p>
                                                <p className="mt-1.5 text-xs text-muted-foreground/60">{notification.time}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto lg:flex">
                        <div className="rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-5">
                            <p className="mb-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Summary</p>
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Total</span>
                                    <span className="text-sm font-semibold">{SAMPLE_NOTIFICATIONS.length}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Unread</span>
                                    <span className={`text-sm font-semibold ${unreadCount > 0 ? 'text-[#d4af37]' : ''}`}>{unreadCount}</span>
                                </div>
                                <div className="my-1 h-px bg-[#2a2a2e]" />
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <ShieldAlert className="h-3.5 w-3.5" /> Alerts
                                    </span>
                                    <span className="text-sm font-semibold">{totalByCategory.alerts}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <UserCheck className="h-3.5 w-3.5" /> Approvals
                                    </span>
                                    <span className="text-sm font-semibold">{totalByCategory.approvals}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Info className="h-3.5 w-3.5" /> System
                                    </span>
                                    <span className="text-sm font-semibold">{totalByCategory.system}</span>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-5">
                            <p className="mb-1.5 text-xs font-semibold text-[#d4af37]">Placeholder Feed</p>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                This notification stream currently uses static placeholder data and will be connected to real admin events soon.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}