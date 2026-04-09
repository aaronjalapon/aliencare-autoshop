import CustomerLayout from '@/components/layout/customer-layout';
import { Bell, CheckCheck, Info, Tag, Wrench } from 'lucide-react';
import { useState } from 'react';

type NotifCategory = 'all' | 'service' | 'promo' | 'system';

const SAMPLE_NOTIFICATIONS = [
    {
        id: 1,
        category: 'service' as const,
        title: 'Your vehicle is ready for pick-up',
        message: 'Your Toyota Innova (CAV 1234) has completed its Full Detail Wash. You may claim your vehicle at the shop.',
        time: '2 hours ago',
        read: false,
    },
    {
        id: 2,
        category: 'service' as const,
        title: 'Booking Confirmed — Oil Change',
        message: 'Your oil change appointment is confirmed for Mon, Apr 24 at 10:00 AM. Please arrive 10 minutes early.',
        time: '1 day ago',
        read: false,
    },
    {
        id: 3,
        category: 'promo' as const,
        title: '15% off on all Cleaning Services this weekend!',
        message: 'Book any cleaning service from April 12–13 and get 15% off. Limited slots only.',
        time: '2 days ago',
        read: true,
    },
    {
        id: 4,
        category: 'system' as const,
        title: 'Your payment was received',
        message: 'We received your reservation fee of ₱200 for Oil Change. Your booking reference is JO-10234.',
        time: '3 days ago',
        read: true,
    },
    {
        id: 5,
        category: 'promo' as const,
        title: 'New service available: Engine Carbon Cleaning',
        message: 'We now offer Engine Carbon Cleaning starting at ₱1,500. Check it out in the Services tab.',
        time: '5 days ago',
        read: true,
    },
    {
        id: 6,
        category: 'system' as const,
        title: 'Reminder: Upcoming service appointment',
        message: 'You have an Oil Change scheduled tomorrow at 10:00 AM. Tap here to view your booking details.',
        time: '6 days ago',
        read: true,
    },
];

const CATEGORY_LABELS: Record<NotifCategory, string> = {
    all: 'All',
    service: 'Services',
    promo: 'Promotions',
    system: 'System',
};

const CATEGORY_ICON: Record<string, typeof Bell> = {
    service: Wrench,
    promo: Tag,
    system: Info,
};

export default function CustomerNotifications() {
    const [activeTab, setActiveTab] = useState<NotifCategory>('all');

    const filtered = SAMPLE_NOTIFICATIONS.filter((n) => activeTab === 'all' || n.category === activeTab);

    const unreadCount = SAMPLE_NOTIFICATIONS.filter((n) => !n.read).length;

    const totalByCategory = (Object.keys(CATEGORY_LABELS) as NotifCategory[]).reduce(
        (acc, key) => {
            acc[key] = key === 'all' ? SAMPLE_NOTIFICATIONS.length : SAMPLE_NOTIFICATIONS.filter((n) => n.category === key).length;
            return acc;
        },
        {} as Record<NotifCategory, number>,
    );

    return (
        <CustomerLayout>
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Page header */}
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

                {/* Main content — two-column on large screens */}
                <div className="flex flex-1 gap-6 lg:items-start">
                    {/* Left: notification feed */}
                    <div className="flex min-w-0 flex-1 flex-col gap-4">
                        {/* Category tabs */}
                        <div className="flex gap-1 overflow-x-auto rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-1">
                            {(Object.keys(CATEGORY_LABELS) as NotifCategory[]).map((tab) => (
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

                        {/* Notification list */}
                        {filtered.length === 0 ? (
                            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-[#2a2a2e] bg-[#0d0d10] py-24 text-center">
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
                                                <p
                                                    className={`text-sm leading-snug font-semibold ${notif.read ? 'text-foreground/70' : 'text-foreground'}`}
                                                >
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

                    {/* Right: summary sidebar (visible on lg+) */}
                    <div className="hidden w-72 shrink-0 flex-col gap-4 lg:flex">
                        {/* Summary card */}
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
                                        <Wrench className="h-3.5 w-3.5" /> Services
                                    </span>
                                    <span className="text-sm font-semibold">{totalByCategory.service}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Tag className="h-3.5 w-3.5" /> Promotions
                                    </span>
                                    <span className="text-sm font-semibold">{totalByCategory.promo}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Info className="h-3.5 w-3.5" /> System
                                    </span>
                                    <span className="text-sm font-semibold">{totalByCategory.system}</span>
                                </div>
                            </div>
                        </div>

                        {/* Tip card */}
                        <div className="rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-5">
                            <p className="mb-1.5 text-xs font-semibold text-[#d4af37]">Stay Updated</p>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                Enable push notifications to get real-time updates on your service bookings and promotions.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </CustomerLayout>
    );
}
