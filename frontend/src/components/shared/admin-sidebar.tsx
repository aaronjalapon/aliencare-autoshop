import { AppSharedSidebar } from './app-shared-sidebar';
import { type NavItem } from '@/types';
import { Home, Users } from 'lucide-react';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/admin',
        icon: Home,
    },
    {
        title: 'Front Desk Accounts',
        href: '/admin/frontdesk-accounts',
        icon: Users,
    },
];

export function AdminSidebar() {
    return (
        <AppSharedSidebar
            navItems={mainNavItems}
            role="Admin"
            profileHref="/admin/profile"
            homeHref="/admin"
        />
    );
}
