import { SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { type ComponentPropsWithoutRef } from 'react';
import { Link } from 'react-router-dom';

export function NavFooter({
    items,
    className,
    ...props
}: ComponentPropsWithoutRef<typeof SidebarGroup> & {
    items: NavItem[];
}) {
    return (
        <SidebarGroup {...props} className={`group-data-[collapsible=icon]:p-0 ${className || ''}`}>
            <SidebarGroupContent>
                <SidebarMenu>
                    {items.map((item) => {
                        const href = typeof item.href === 'string' ? item.href : item.href;
                        const isExternal = href.startsWith('http');

                        return (
                            <SidebarMenuItem key={item.title}>
                                {isExternal ? (
                                    <SidebarMenuButton asChild>
                                        <a
                                            href={href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sidebar-foreground hover:text-sidebar-accent"
                                        >
                                            {item.icon && <item.icon className="text-sidebar-foreground" />}
                                            <span className="text-sidebar-foreground">{item.title}</span>
                                        </a>
                                    </SidebarMenuButton>
                                ) : (
                                    <SidebarMenuButton asChild>
                                        <Link to={href} className="text-sidebar-foreground hover:text-sidebar-accent">
                                            {item.icon && <item.icon className="text-sidebar-foreground" />}
                                            <span className="text-sidebar-foreground">{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                )}
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
