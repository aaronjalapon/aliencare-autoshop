import { AppContent } from '@/components/shared/app-content';
import { AppShell } from '@/components/shared/app-shell';
import { AppSidebar } from '@/components/shared/app-sidebar';
import { PageHeader } from '@/components/shared/page-header';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren, type ReactNode } from 'react';

export default function AppSidebarLayout({ children, actions }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[]; actions?: ReactNode }>) {
    return (
        <AppShell variant="sidebar" className="h-svh overflow-hidden">
            <AppSidebar />
            <AppContent variant="sidebar" className="overflow-hidden">
                <PageHeader actions={actions} />
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
            </AppContent>
        </AppShell>
    );
}
