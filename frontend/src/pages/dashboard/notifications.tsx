import AppLayout from '@/components/layout/app-layout';
import { Bell, CheckCheck, Info, Tag, Wrench } from 'lucide-react';
import { useState } from 'react';

type NotifCategory = 'all' | 'service' | 'alert' | 'system';

const SAMPLE_NOTIFICATIONS = [
    {
        id: 1,
        category: 'service' as const,
        title: 'New booking request — Oil Change',
        message: 'Juan dela Cruz booked an Oil Change for Toyota Innova (CAV 1234) on Mon, Apr 24 at 10:00 AM. Awaiting confirmation.',
        time: '30 minutes ago',
        read: false,
    },
    {
        id: 2,
        category: 'alert' as const,
        title: 'Low stock: Synthetic Oil 5W-30',
        message: 'Synthetic Oil 5W-30 has only 3 units left. Consider restocking before the next service day.',
        time: '2 hours ago',
        read: false,
    },
    {
        id: 3,
        category: 'service' as const,
        title: 'Job Order #JO-10234 marked as completed',
        message: 'Full Detail Wash for Maria Santos (Honda Civic - XYZ 5678) has been marked as completed by the technician.',
        time: '4 hours ago',
        read: false,
    },
    {
        id: 4,
        category: 'system' as const,
        title: 'Daily report generated',
        message: 'The daily revenue report for April 8, 2026 is ready. Total revenue: ₱18,450 across 12 job orders.',
        time: '1 day ago',
        read: true,
    },
    {
        id: 5,
        category: 'alert' as const,
        title: 'Queue alert: 6 vehicles currently waiting',
        message: 'The current service queue has reached 6 vehicles. Consider opening an additional bay if available.',
        time: '1 day ago',
        read: true,
    },
    {
        id: 6,
        category: 'system' as const,
        title: 'Customer payment received',
        message: 'Payment of ₱1,200 received from Pedro Reyes for Job Order #JO-10228. Balance cleared.',
        time: '2 days ago',
        read: true,
    },
    {
        id: 7,
        category: 'service' as const,
        title: 'Booking cancelled — Air-Con Repair',
        message: 'Ana Gonzales cancelled her Air-Con Repair appointment scheduled for Apr 22 at 2:00 PM.',
        time: '3 days ago',
        read: true,
    },
];

const CATEGORY_LABELS: Record<NotifCategory, string> = {
    all: 'All',
    service: 'Services',
    alert: 'Alerts',
    system: 'System',
};

const CATEGORY_ICON: Record<string, typeof Bell> = {
    service: Wrench,
    alert: Tag,
    system: Info,
};

export default function FrontdeskNotifications() {
    const [activeTab, setActiveTab] = useState<NotifCategory>('all');

    const filtered = SAMPLE_NOTIFICATIONS.filter((n) => activeTab === 'all' || n.category === activeTab);

    const unreadCount = SAMPLE_NOTIFICATIONS.filter((n) => !n.read).length;

    return (
        <AppLayout>
            <div className="mx-auto max-w-2xl p-5">
                {/* Page header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold">Notifications</h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <button className="flex items-center gap-1.5 rounded-lg border border-[#2a2a2e] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-[#2a2a2e] hover:text-foreground">
                            <CheckCheck className="h-3.5 w-3.5" />
                            Mark all as read
                        </button>
                    )}
                </div>

                {/* Category tabs */}
                <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-1">
                    {(Object.keys(CATEGORY_LABELS) as NotifCategory[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                                activeTab === tab ? 'bg-[#d4af37] text-black shadow-sm' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {CATEGORY_LABELS[tab]}
                        </button>
                    ))}
                </div>

                {/* Notification list */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                        <Bell className="h-10 w-10 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">No notifications here yet.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {filtered.map((notif) => {
                            const Icon = CATEGORY_ICON[notif.category] ?? Bell;
                            return (
                                <div
                                    key={notif.id}
                                    className={`relative flex items-start gap-4 rounded-xl border p-4 transition-colors ${
                                        notif.read ? 'border-[#2a2a2e] bg-[#0d0d10]' : 'border-[#d4af37]/30 bg-[#d4af37]/5'
                                    }`}
                                >
                                    {/* Unread dot */}
                                    {!notif.read && <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-[#d4af37]" />}

                                    {/* Icon */}
                                    <div
                                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                            notif.read ? 'bg-[#1e1e22]' : 'bg-[#d4af37]/10'
                                        }`}
                                    >
                                        <Icon className={`h-4 w-4 ${notif.read ? 'text-muted-foreground' : 'text-[#d4af37]'}`} />
                                    </div>

                                    {/* Content */}
                                    <div className="min-w-0 flex-1 pr-4">
                                        <p className={`text-sm leading-snug font-semibold ${notif.read ? 'text-foreground/70' : 'text-foreground'}`}>
                                            {notif.title}
                                        </p>
                                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{notif.message}</p>
                                        <p className="mt-1.5 text-xs text-muted-foreground/60">{notif.time}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
