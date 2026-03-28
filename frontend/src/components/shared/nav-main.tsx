import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { LucideBell, Search, Settings, UserCircle2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const { pathname } = useLocation();
    return (
        <SidebarGroup className="-mt-2 px-2 py-0">
            <SidebarGroupLabel className="mb-0 justify-center text-center text-base text-sidebar-primary">Front Desk</SidebarGroupLabel>

            {/* Icons Row */}
            <div className="flex items-center justify-center gap-4 px-2 pb-2">
                <UserCircle2 className="h-5 w-5 cursor-pointer text-white transition-colors hover:text-sidebar-primary" />
                <Settings className="h-5 w-5 cursor-pointer text-white transition-colors hover:text-sidebar-primary" />
                <LucideBell className="h-5 w-5 cursor-pointer text-white transition-colors hover:text-sidebar-primary" />
            </div>

            {/* Search Bar */}
            <div className="px-2 pb-2">
                <div className="relative">
                    <Search className="absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="flex h-10 w-full rounded-[40px] border border-input bg-white px-8 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>
            </div>

            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                            asChild
                            isActive={pathname.startsWith(typeof item.href === 'string' ? item.href : item.href)}
                            tooltip={{ children: item.title }}
                        >
                            <Link to={item.href}>
                                {item.icon && <item.icon />}
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
