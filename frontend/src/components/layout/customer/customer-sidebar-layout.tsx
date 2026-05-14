import { AppContent } from '@/components/shared/app-content';
import { AppShell } from '@/components/shared/app-shell';
import { CustomerSidebar } from '@/components/shared/customer-sidebar';
import { PageHeader } from '@/components/shared/page-header';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren } from 'react';

export default function CustomerSidebarLayout({ children }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    return (
        <AppShell variant="sidebar" className="h-svh overflow-hidden">
            <CustomerSidebar />
            <AppContent variant="sidebar" className="overflow-hidden">
                <PageHeader />
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
            </AppContent>
        </AppShell>
    );
}
