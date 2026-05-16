import { type NavItem } from '@/types';
import { BarChart4, FoldersIcon, Home, LucideFileBarChart2, LucideReceiptText, Package, Tags, Users } from 'lucide-react';
import { AppSharedSidebar } from './app-shared-sidebar';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: Home,
    },
    {
        title: 'Services',
        href: '/services',
        icon: FoldersIcon,
    },
    {
        title: 'Job Orders',
        href: '/job-orders',
        icon: Tags,
    },
    {
        title: 'Point of Sale',
        href: '/pos',
        icon: BarChart4,
    },
    {
        title: 'Billing & Payment',
        href: '/billing',
        icon: LucideReceiptText,
    },
    {
        title: 'Inventory',
        href: '/inventory',
        icon: Package,
    },
    {
        title: 'Customers',
        href: '/customers',
        icon: Users,
    },
    {
        title: 'Reports and Analytics',
        href: '/reports',
        icon: LucideFileBarChart2,
    },
];

export function AppSidebar() {
    return (
        <AppSharedSidebar
            navItems={mainNavItems}
            role="Front Desk"
            profileHref="/profile"
            settingsHref="/settings"
            notificationsHref="/notifications"
            homeHref="/dashboard"
        />
    );
}
