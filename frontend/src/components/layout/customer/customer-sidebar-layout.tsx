import { AppContent } from '@/components/shared/app-content';
import { AppShell } from '@/components/shared/app-shell';
import { CustomerSidebar } from '@/components/shared/customer-sidebar';
import { PageHeader } from '@/components/shared/page-header';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren } from 'react';

export default function CustomerSidebarLayout({ children }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    return (
        <AppShell variant="sidebar">
            <CustomerSidebar />
            <AppContent variant="sidebar" className="overflow-x-hidden">
                <PageHeader />
                {children}
            </AppContent>
        </AppShell>
    );
}
