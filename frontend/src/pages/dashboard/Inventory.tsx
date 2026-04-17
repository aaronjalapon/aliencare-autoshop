import { AuditLog } from '@/components/inventory/AuditLog';
import { Dashboard } from '@/components/inventory/Dashboard';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { ReservationPanel } from '@/components/inventory/ReservationPanel';
import { StockAlerts } from '@/components/inventory/StockAlerts';
import { UsageReports } from '@/components/inventory/UsageReports';
import AppLayout from '@/components/layout/app-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAlerts } from '@/hooks/useAlerts';
import { type BreadcrumbItem } from '@/types';
import { AlertTriangle, BookOpen, FileText, LayoutDashboard, Package, Shield } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Inventory',
        href: '/inventory',
    },
];

export default function Inventory() {
    const { alerts } = useAlerts();
    const [activeTab, setActiveTab] = useState('dashboard');

    const safeAlerts = Array.isArray(alerts) ? alerts : [];
    const unacknowledgedAlerts = safeAlerts.filter((alert) => !alert.acknowledged).length;
    const hasUnacknowledgedAlerts = unacknowledgedAlerts > 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-5">
                <div className="flex min-h-0 w-full flex-1 flex-col gap-5 overflow-y-auto pr-1">
                    <div className="profile-card relative overflow-hidden rounded-2xl p-6">
                        <div className="absolute top-0 right-0 h-full w-64 bg-linear-to-l from-[#d4af37]/15 to-transparent" />
                        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <p className="text-xs font-semibold tracking-[0.18em] text-[#d4af37] uppercase">Frontdesk Workspace</p>
                                <h1 className="mt-2 text-2xl font-bold tracking-tight">Inventory Operations</h1>
                                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                                    Monitor stock health, reservations, alerts, reports, and audit activity from one workspace.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('alerts')}
                                    className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                                        hasUnacknowledgedAlerts
                                            ? 'border-red-500/35 bg-red-500/10 text-red-300 hover:bg-red-500/20'
                                            : 'border-[#2a2a2e] bg-[#0d0d10] text-foreground hover:border-[#d4af37]/40'
                                    }`}
                                >
                                    <AlertTriangle className="h-4 w-4" />
                                    {hasUnacknowledgedAlerts
                                        ? `${unacknowledgedAlerts} alert${unacknowledgedAlerts === 1 ? '' : 's'} to review`
                                        : 'All alerts acknowledged'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveTab('inventory')}
                                    className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90"
                                >
                                    <Package className="h-4 w-4" /> Open Inventory Table
                                </button>
                            </div>
                        </div>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                        <div className="profile-card rounded-xl p-1.5">
                            <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-lg bg-[#0d0d10] p-1">
                                <TabsTrigger
                                    value="dashboard"
                                    className="h-10 min-w-36 flex-none justify-start gap-2 rounded-md border border-transparent px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase data-[state=active]:border-[#d4af37]/30 data-[state=active]:bg-[#d4af37] data-[state=active]:text-black data-[state=active]:shadow-[0_0_12px_rgba(212,175,55,0.3)]"
                                >
                                    <LayoutDashboard className="h-4 w-4" />
                                    Dashboard
                                </TabsTrigger>

                                <TabsTrigger
                                    value="inventory"
                                    className="h-10 min-w-36 flex-none justify-start gap-2 rounded-md border border-transparent px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase data-[state=active]:border-[#d4af37]/30 data-[state=active]:bg-[#d4af37] data-[state=active]:text-black data-[state=active]:shadow-[0_0_12px_rgba(212,175,55,0.3)]"
                                >
                                    <Package className="h-4 w-4" />
                                    Inventory
                                </TabsTrigger>

                                <TabsTrigger
                                    value="alerts"
                                    className="h-10 min-w-36 flex-none justify-start gap-2 rounded-md border border-transparent px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase data-[state=active]:border-[#d4af37]/30 data-[state=active]:bg-[#d4af37] data-[state=active]:text-black data-[state=active]:shadow-[0_0_12px_rgba(212,175,55,0.3)]"
                                >
                                    <AlertTriangle className="h-4 w-4" />
                                    Alerts
                                    {hasUnacknowledgedAlerts && (
                                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500/20 px-1 text-[10px] font-bold text-red-300">
                                            {unacknowledgedAlerts}
                                        </span>
                                    )}
                                </TabsTrigger>

                                <TabsTrigger
                                    value="reservations"
                                    className="h-10 min-w-40 flex-none justify-start gap-2 rounded-md border border-transparent px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase data-[state=active]:border-[#d4af37]/30 data-[state=active]:bg-[#d4af37] data-[state=active]:text-black data-[state=active]:shadow-[0_0_12px_rgba(212,175,55,0.3)]"
                                >
                                    <BookOpen className="h-4 w-4" />
                                    Reservations
                                </TabsTrigger>

                                <TabsTrigger
                                    value="reports"
                                    className="h-10 min-w-32 flex-none justify-start gap-2 rounded-md border border-transparent px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase data-[state=active]:border-[#d4af37]/30 data-[state=active]:bg-[#d4af37] data-[state=active]:text-black data-[state=active]:shadow-[0_0_12px_rgba(212,175,55,0.3)]"
                                >
                                    <FileText className="h-4 w-4" />
                                    Reports
                                </TabsTrigger>

                                <TabsTrigger
                                    value="audit"
                                    className="h-10 min-w-32 flex-none justify-start gap-2 rounded-md border border-transparent px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase data-[state=active]:border-[#d4af37]/30 data-[state=active]:bg-[#d4af37] data-[state=active]:text-black data-[state=active]:shadow-[0_0_12px_rgba(212,175,55,0.3)]"
                                >
                                    <Shield className="h-4 w-4" />
                                    Audit Log
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="dashboard">
                            <Dashboard />
                        </TabsContent>

                        <TabsContent value="inventory">
                            <InventoryTable />
                        </TabsContent>

                        <TabsContent value="alerts">
                            <StockAlerts />
                        </TabsContent>

                        <TabsContent value="reservations">
                            <ReservationPanel />
                        </TabsContent>

                        <TabsContent value="reports">
                            <UsageReports />
                        </TabsContent>

                        <TabsContent value="audit">
                            <AuditLog />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </AppLayout>
    );
}
