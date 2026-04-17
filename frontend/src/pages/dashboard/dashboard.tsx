import AppLayout from '@/components/layout/app-layout';
import { useAuth } from '@/context/AuthContext';
import { cloneServicePlaceholders } from '@/data/servicePlaceholders';
import { useDashboardAnalytics } from '@/hooks/useInventory';
import { type BreadcrumbItem } from '@/types';
import { ArrowRight, ClipboardList, Loader2, Package, Sparkles, TriangleAlert, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

export default function Dashboard() {
    const { user } = useAuth();
    const { data: analytics, loading: analyticsLoading, error: analyticsError } = useDashboardAnalytics();
    const services = cloneServicePlaceholders();

    const isLoading = analyticsLoading;
    const activeServices = services.filter((service) => service.is_active);
    const recommendedCount = activeServices.filter((service) => service.recommended).length;
    const totalServiceValue = activeServices.reduce((sum, service) => sum + service.price_fixed, 0);
    const averageServicePrice = activeServices.length > 0 ? totalServiceValue / activeServices.length : 0;

    const topQueueServices = activeServices.filter((service) => Boolean(service.queue_label)).slice(0, 4);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-5">
                <div className="flex min-h-0 w-full flex-1 flex-col gap-5 overflow-y-auto pr-1">
                    <div className="profile-card relative overflow-hidden rounded-2xl p-6">
                        <div className="absolute top-0 right-0 h-full w-56 bg-linear-to-l from-[#d4af37]/15 to-transparent" />
                        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <p className="text-xs font-semibold tracking-[0.18em] text-[#d4af37] uppercase">Frontdesk Dashboard</p>
                                <h1 className="mt-2 text-2xl font-bold tracking-tight">Welcome back, {user?.name?.split(' ')[0] ?? 'Frontdesk'}</h1>
                                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                                    Keep service operations moving with a live snapshot of offerings, inventory pressure, and quick action shortcuts.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Link
                                    to="/services"
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90"
                                >
                                    Manage Services <ArrowRight className="h-4 w-4" />
                                </Link>
                                <Link
                                    to="/job-orders"
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-[#d4af37]/40"
                                >
                                    Job Orders
                                </Link>
                            </div>
                        </div>
                    </div>

                    {analyticsError && (
                        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400">{analyticsError}</div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="profile-card rounded-xl p-5">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Services Offered</p>
                                <div className="rounded-lg bg-[#d4af37]/10 p-2">
                                    <Wrench className="h-4 w-4 text-[#d4af37]" />
                                </div>
                            </div>
                            {isLoading ? (
                                <Loader2 className="mt-4 h-5 w-5 animate-spin text-[#d4af37]" />
                            ) : (
                                <>
                                    <p className="mt-3 text-3xl font-bold">{activeServices.length}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Active services in catalog</p>
                                </>
                            )}
                        </div>

                        <div className="profile-card rounded-xl p-5">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Recommended Picks</p>
                                <div className="rounded-lg bg-[#d4af37]/10 p-2">
                                    <Sparkles className="h-4 w-4 text-[#d4af37]" />
                                </div>
                            </div>
                            {isLoading ? (
                                <Loader2 className="mt-4 h-5 w-5 animate-spin text-[#d4af37]" />
                            ) : (
                                <>
                                    <p className="mt-3 text-3xl font-bold">{recommendedCount}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Promoted services live</p>
                                </>
                            )}
                        </div>

                        <div className="profile-card rounded-xl p-5">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Avg Service Price</p>
                                <div className="rounded-lg bg-[#d4af37]/10 p-2">
                                    <ClipboardList className="h-4 w-4 text-[#d4af37]" />
                                </div>
                            </div>
                            {isLoading ? (
                                <Loader2 className="mt-4 h-5 w-5 animate-spin text-[#d4af37]" />
                            ) : (
                                <>
                                    <p className="mt-3 text-3xl font-bold">P{Math.round(averageServicePrice).toLocaleString('en-US')}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Across current offerings</p>
                                </>
                            )}
                        </div>

                        <div className="profile-card rounded-xl p-5">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Low Stock Alerts</p>
                                <div className="rounded-lg bg-[#d4af37]/10 p-2">
                                    <TriangleAlert className="h-4 w-4 text-[#d4af37]" />
                                </div>
                            </div>
                            {analyticsLoading ? (
                                <Loader2 className="mt-4 h-5 w-5 animate-spin text-[#d4af37]" />
                            ) : (
                                <>
                                    <p className="mt-3 text-3xl font-bold">{analytics?.low_stock_count ?? 0}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Inventory items need attention</p>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
                        <div className="profile-card rounded-xl p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-base font-semibold">Queue Snapshot</h2>
                                <Link to="/services" className="text-xs font-semibold text-[#d4af37] hover:underline">
                                    Open service manager
                                </Link>
                            </div>

                            {topQueueServices.length > 0 ? (
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {topQueueServices.map((service) => (
                                        <div key={service.id} className="rounded-lg border border-[#2a2a2e] bg-[#0d0d10] p-3">
                                            <p className="text-sm font-semibold">{service.name}</p>
                                            <p className="mt-1 text-xs text-muted-foreground">{service.queue_label}</p>
                                            <p className="mt-2 text-xs font-semibold text-[#d4af37]">
                                                P{service.price_fixed.toLocaleString('en-US')}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No queue labels have been set for active services yet.</p>
                            )}
                        </div>

                        <div className="profile-card rounded-xl p-5">
                            <h2 className="text-base font-semibold">Operations Pulse</h2>
                            <div className="mt-4 space-y-3">
                                <div className="rounded-lg border border-[#2a2a2e] bg-[#0d0d10] p-3">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">Inventory Items</p>
                                    <p className="mt-1 text-lg font-bold">{analyticsLoading ? '...' : (analytics?.total_items ?? 0)}</p>
                                </div>
                                <div className="rounded-lg border border-[#2a2a2e] bg-[#0d0d10] p-3">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">Active Reservations</p>
                                    <p className="mt-1 text-lg font-bold">{analyticsLoading ? '...' : (analytics?.active_reservations ?? 0)}</p>
                                </div>
                                <div className="rounded-lg border border-[#2a2a2e] bg-[#0d0d10] p-3">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">Inventory Value</p>
                                    <p className="mt-1 text-lg font-bold">
                                        {analyticsLoading
                                            ? '...'
                                            : `P${(analytics?.total_value ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                                    </p>
                                </div>
                            </div>

                            <Link
                                to="/inventory"
                                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#d4af37] transition-opacity hover:opacity-80"
                            >
                                <Package className="h-3.5 w-3.5" /> Open inventory workspace
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
