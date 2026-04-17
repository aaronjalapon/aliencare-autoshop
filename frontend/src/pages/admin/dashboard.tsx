import AdminLayout from '@/components/layout/admin-layout';
import { useAuth } from '@/context/AuthContext';
import { type BreadcrumbItem } from '@/types';
import { CalendarClock, Shield, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Admin Dashboard', href: '/admin' }];

export default function AdminDashboard() {
    const { user } = useAuth();

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full min-h-0 flex-1 flex-col gap-6 overflow-hidden p-6">
                <p className="text-sm text-muted-foreground">Welcome back, {user?.name?.split(' ')[0] ?? 'Admin'}.</p>

                <div className="min-h-0 flex-1 overflow-auto pr-1">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Link to="/admin/frontdesk-accounts" className="profile-card group rounded-xl p-6 transition-all hover:-translate-y-0.5">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-[#d4af37]/10 p-2.5">
                                    <Users className="h-6 w-6 text-[#d4af37]" />
                                </div>
                                <div>
                                    <h3 className="font-semibold group-hover:text-[#d4af37]">Front Desk Accounts</h3>
                                    <p className="text-sm text-muted-foreground">Manage front desk staff accounts</p>
                                </div>
                            </div>
                        </Link>

                        <Link to="/admin/booking-slots" className="profile-card group rounded-xl p-6 transition-all hover:-translate-y-0.5">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-[#d4af37]/10 p-2.5">
                                    <CalendarClock className="h-6 w-6 text-[#d4af37]" />
                                </div>
                                <div>
                                    <h3 className="font-semibold group-hover:text-[#d4af37]">Booking Slots</h3>
                                    <p className="text-sm text-muted-foreground">Manage live slot capacities and schedules</p>
                                </div>
                            </div>
                        </Link>

                        <div className="profile-card rounded-xl p-6">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-[#d4af37]/10 p-2.5">
                                    <Shield className="h-6 w-6 text-[#d4af37]" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">System Status</h3>
                                    <p className="text-sm text-muted-foreground">All systems operational</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
