import { useAuth } from '@/context/AuthContext';
import { useLocation } from 'react-router-dom';

const ROUTE_LABELS: Record<string, string> = {
    // Customer
    '/customer': 'Dashboard',
    '/customer/services': 'Services',
    '/customer/my-services': 'My Services',
    '/customer/shop': 'Shop',
    '/customer/billing': 'Billing & Payment',
    '/customer/profile': 'Profile',
    '/customer/logs': 'Logs',
    // Front Desk
    '/dashboard': 'Dashboard',
    '/profile': 'Profile',
    '/inventory': 'Inventory',
    '/services': 'Services',
    '/job-orders': 'Job Orders',
    '/pos': 'Point of Sale',
    '/billing': 'Billing',
    '/customers': 'Customers',
    '/reports': 'Reports',
    '/settings/profile': 'Settings',
    '/settings/password': 'Settings',
    '/settings/appearance': 'Settings',
    // Admin
    '/admin': 'Dashboard',
    '/admin/profile': 'Profile',
    '/admin/frontdesk-accounts': 'Front Desk Accounts',
};

const ROLE_LABELS: Record<string, string> = {
    admin: 'Admin',
    frontdesk: 'Front Desk',
    customer: 'Customer',
};

export function PageHeader() {
    const { user } = useAuth();
    const { pathname } = useLocation();

    const pageLabel = ROUTE_LABELS[pathname] ?? pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') ?? 'Page';

    const roleLabel = user ? (ROLE_LABELS[user.role] ?? user.role) : '';

    return (
        <>
            {/* Role / Page title */}
            <div className="px-6 pt-8 pb-2 md:px-6">
                <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-muted-foreground">{roleLabel}</span>
                    <span className="text-sm text-muted-foreground/40">/</span>
                    <h1 className="text-2xl font-bold capitalize">{pageLabel}</h1>
                </div>
            </div>
        </>
    );
}
