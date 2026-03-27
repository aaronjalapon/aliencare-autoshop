import AppLayoutTemplate from '@/components/layout/app/app-sidebar-layout';
import { type BreadcrumbItem } from '@/types';
import { type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

interface AppLayoutProps {
    children?: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

export default ({ children, breadcrumbs, ...props }: AppLayoutProps) => (
    <AppLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
        {children || <Outlet />}
    </AppLayoutTemplate>
);
