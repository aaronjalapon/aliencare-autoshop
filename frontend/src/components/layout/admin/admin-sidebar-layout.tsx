import { AppContent } from '@/components/shared/app-content';
import { AppShell } from '@/components/shared/app-shell';
import { AdminSidebar } from '@/components/shared/admin-sidebar';
import { PageHeader } from '@/components/shared/page-header';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren } from 'react';

export default function AdminSidebarLayout({ children, breadcrumbs = [] }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    return (
        <AppShell variant="sidebar">
            <AdminSidebar />
            <AppContent variant="sidebar" className="overflow-x-hidden">
                <PageHeader />
                {children}
            </AppContent>
        </AppShell>
    );
}
