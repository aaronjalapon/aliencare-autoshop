import { AppSharedSidebar } from './app-shared-sidebar';
import { type NavItem } from '@/types';
import { CreditCard, Home, ScrollText, ShoppingCart, Wrench } from 'lucide-react';

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
            homeHref="/customer"
        />
    );
}
