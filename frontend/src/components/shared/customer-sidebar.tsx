import { type NavItem } from '@/types';
import { ClipboardList, CreditCard, Home, ScrollText, ShoppingCart, Wrench } from 'lucide-react';
import { AppSharedSidebar } from './app-shared-sidebar';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/customer',
        icon: Home,
    },
    {
        title: 'Services',
        href: '/customer/services',
        icon: Wrench,
    },
    {
        title: 'My Services',
        href: '/customer/my-services',
        icon: ClipboardList,
    },
    {
        title: 'Shop',
        href: '/customer/shop',
        icon: ShoppingCart,
    },
    {
        title: 'Billing & Payment',
        href: '/customer/billing',
        icon: CreditCard,
    },
    {
        title: 'Logs',
        href: '/customer/logs',
        icon: ScrollText,
    },
];

export function CustomerSidebar() {
    return (
        <AppSharedSidebar
            navItems={mainNavItems}
            role="Customer"
            profileHref="/customer/profile"
            settingsHref="/customer/settings"
            notificationsHref="/customer/notifications"
            homeHref="/customer"
        />
    );
}
