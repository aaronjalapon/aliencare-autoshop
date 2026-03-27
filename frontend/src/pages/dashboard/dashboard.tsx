import { Dashboard as InventoryDashboard } from '@/components/inventory/Dashboard';
import AppLayout from '@/components/layout/app-layout';
import { type BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

export default function Dashboard() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <InventoryDashboard />
            </div>
        </AppLayout>
    );
}
