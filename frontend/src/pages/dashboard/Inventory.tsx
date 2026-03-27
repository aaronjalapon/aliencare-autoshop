import { AuditLog } from '@/components/inventory/AuditLog';
import { Dashboard } from '@/components/inventory/Dashboard';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { ReservationPanel } from '@/components/inventory/ReservationPanel';
import { StockAlerts } from '@/components/inventory/StockAlerts';
import { UsageReports } from '@/components/inventory/UsageReports';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAlerts } from '@/hooks/useAlerts';
import AppLayout from '@/components/layout/app-layout';
import { type BreadcrumbItem } from '@/types';
import { AlertTriangle, BookOpen, FileText, LayoutDashboard, Package, Shield } from 'lucide-react';

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

    // Ensure alerts is always an array and calculate unacknowledged count
    const safeAlerts = Array.isArray(alerts) ? alerts : [];
    const unacknowledgedAlerts = safeAlerts.filter(alert => !alert.acknowledged).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    <div className="h-full bg-background">
                        <div className="border-b border-border">
                            <div className="container mx-auto px-4 py-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h1 className="text-3xl font-bold text-foreground">Alien Care Autoshop</h1>
                                        <p className="text-muted-foreground">Inventory Management System</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="container mx-auto px-4 py-6">
                            <Tabs defaultValue="dashboard" className="space-y-6">
                                <TabsList className="grid w-full grid-cols-6 bg-muted">
                                    <TabsTrigger value="dashboard" className="flex items-center gap-2">
                                        <LayoutDashboard className="h-4 w-4" />
                                        Dashboard
                                    </TabsTrigger>
                                    <TabsTrigger value="inventory" className="flex items-center gap-2">
                                        <Package className="h-4 w-4" />
                                        Inventory
                                    </TabsTrigger>
                                    <TabsTrigger value="alerts" className="flex items-center gap-2 relative">
                                        <AlertTriangle className="h-4 w-4" />
                                        Alerts
                                        {unacknowledgedAlerts > 0 && (
                                            <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                                                {unacknowledgedAlerts}
                                            </Badge>
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger value="reservations" className="flex items-center gap-2">
                                        <BookOpen className="h-4 w-4" />
                                        Reservations
                                    </TabsTrigger>
                                    <TabsTrigger value="reports" className="flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Reports
                                    </TabsTrigger>
                                    <TabsTrigger value="audit" className="flex items-center gap-2">
                                        <Shield className="h-4 w-4" />
                                        Audit Log
                                    </TabsTrigger>
                                </TabsList>

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
                </div>
            </div>
        </AppLayout>
    );
}
