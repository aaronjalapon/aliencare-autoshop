import { AdminSidebar } from '@/components/shared/admin-sidebar';
import { AppContent } from '@/components/shared/app-content';
import { AppShell } from '@/components/shared/app-shell';
import { PageHeader } from '@/components/shared/page-header';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren } from 'react';

export default function AdminSidebarLayout({ children }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    return (
        <AppShell variant="sidebar">
            <AdminSidebar />
            <AppContent variant="sidebar" className="overflow-hidden">
                <PageHeader />
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
            </AppContent>
        </AppShell>
    );
}
