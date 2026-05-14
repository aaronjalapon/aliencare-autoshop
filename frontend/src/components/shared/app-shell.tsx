import { SidebarProvider } from '@/components/ui/sidebar';
import { useState } from 'react';

interface AppShellProps {
    children: React.ReactNode;
    variant?: 'header' | 'sidebar';
    className?: string;
}

export function AppShell({ children, variant = 'header', className }: AppShellProps) {
    const [isOpen] = useState(() => {
        // SidebarProvider persists to a cookie named 'sidebar_state'.
        // Read the same cookie so defaultOpen always matches the user's last state.
        const match = document.cookie.match(/(?:^|;\s*)sidebar_state=([^;]*)/);
        const saved = match ? match[1] : null;
        return saved !== null ? saved === 'true' : true;
    });

    if (variant === 'header') {
        return <div className={`flex min-h-screen w-full flex-col ${className ?? ''}`}>{children}</div>;
    }

    return (
        <SidebarProvider defaultOpen={isOpen} className={className}>
            {children}
        </SidebarProvider>
    );
}
