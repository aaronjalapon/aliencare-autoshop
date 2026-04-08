import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/context/AuthContext';
import { type NavItem } from '@/types';
import { LucideBell, LogOut, Settings, UserCircle2 } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AppLogo from './app-logo';

interface AppSharedSidebarProps {
    navItems: NavItem[];
    role: string;
    profileHref: string;
    homeHref: string;
}

export function AppSharedSidebar({ navItems, role, profileHref, homeHref }: AppSharedSidebarProps) {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const { toggleSidebar, state } = useSidebar();
    const { pathname } = useLocation();

    const handleSignOut = async () => {
        await logout();
        navigate('/');
    };

    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader className="m-0 p-0">
                <SidebarMenu className="m-0 p-0">
                    <SidebarMenuItem className="m-0 p-0">
                        <button onClick={toggleSidebar} className="block h-full w-full cursor-pointer">
                            {state === 'collapsed'
                                ? <img src="/images/iconlogo.svg" alt="AlienCare AutoShop" className="block h-full w-full object-contain p-1" />
                                : <AppLogo />
                            }
                        </button>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup className="-mt-2 px-2 py-0">
                    <SidebarGroupLabel className="mb-0 justify-center text-center text-base text-sidebar-primary group-data-[collapsible=icon]:hidden">
                        {role}
                    </SidebarGroupLabel>

                    {/* Icons Row */}
                    <div className="flex items-center justify-center gap-4 px-2 pb-6 pt-1 group-data-[collapsible=icon]:pb-2 group-data-[collapsible=icon]:pt-0">
                        <UserCircle2
                            className="h-5 w-5 cursor-pointer text-white transition-colors hover:text-sidebar-primary"
                            onClick={() => navigate(profileHref)}
                        />
                        <Settings className="h-5 w-5 cursor-pointer text-white transition-colors hover:text-sidebar-primary" />
                        <LucideBell className="h-5 w-5 cursor-pointer text-white transition-colors hover:text-sidebar-primary" />
                    </div>

                    <SidebarMenu>
                        {navItems.map((item) => (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={item.href === homeHref ? pathname === homeHref : pathname.startsWith(item.href)}
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
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem className="mb-2">
                        <SidebarMenuButton
                            onClick={handleSignOut}
                            tooltip={{ children: 'Sign Out' }}
                        >
                            <LogOut />
                            <span>Sign Out</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
