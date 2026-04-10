import CustomerLayout from '@/components/layout/customer-layout';
import { useAuth } from '@/context/AuthContext';
import { useCustomerBilling } from '@/hooks/useCustomerBilling';
import { useCustomerJobOrders } from '@/hooks/useCustomerJobOrders';
import { useCustomerProfile } from '@/hooks/useCustomerProfile';
import { type BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/customer' }];

export default function CustomerDashboard() {
    const { user } = useAuth();
    const { customer, loading: profileLoading } = useCustomerProfile();
    const { pendingItems, outstandingBalance, loading: billingLoading } = useCustomerBilling();
    const { activeJobOrders, loading: jobOrdersLoading } = useCustomerJobOrders();

    const vehicleCount = customer?.vehicles?.length ?? 0;
    const pendingPaymentsCount = pendingItems.length;
    const activeServicesCount = activeJobOrders.length;

    const loading = profileLoading || billingLoading || jobOrdersLoading;

    return (
        <CustomerLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user?.name?.split(' ')[0] ?? 'Customer'}!</h1>
                    <p className="text-muted-foreground">Here's an overview of your account.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* Active Services Card */}
                    <div className="profile-card rounded-xl p-6">
                        <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-[#d4af37]/10 p-2">
                                <svg className="h-5 w-5 text-[#d4af37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-sm font-medium text-muted-foreground">Active Services</h3>
                        </div>
                        <p className="mt-3 text-3xl font-bold">{jobOrdersLoading ? '—' : activeServicesCount}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {jobOrdersLoading ? 'Loading…' : activeServicesCount === 0 ? 'No active services' : `${activeServicesCount} in progress`}
                        </p>
                    </div>

                    {/* Pending Payments Card */}
                    <div className="profile-card rounded-xl p-6">
                        <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-[#d4af37]/10 p-2">
                                <svg className="h-5 w-5 text-[#d4af37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-sm font-medium text-muted-foreground">Pending Payments</h3>
                        </div>
                        <p className="mt-3 text-3xl font-bold">
                            {billingLoading ? '—' : `₱${outstandingBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {billingLoading
                                ? 'Loading…'
                                : pendingPaymentsCount === 0
                                  ? 'No pending payments'
                                  : `${pendingPaymentsCount} unpaid invoice${pendingPaymentsCount > 1 ? 's' : ''}`}
                        </p>
                    </div>

                    {/* Vehicles Card */}
                    <div className="profile-card rounded-xl p-6">
                        <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-[#d4af37]/10 p-2">
                                <svg className="h-5 w-5 text-[#d4af37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-sm font-medium text-muted-foreground">My Vehicles</h3>
                        </div>
                        <p className="mt-3 text-3xl font-bold">{profileLoading ? '—' : vehicleCount}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {profileLoading
                                ? 'Loading…'
                                : vehicleCount === 0
                                  ? 'No vehicles registered'
                                  : `${vehicleCount} registered vehicle${vehicleCount > 1 ? 's' : ''}`}
                        </p>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="profile-card rounded-xl p-6">
                    <h2 className="text-lg font-semibold">Recent Activity</h2>
                    <div className="mt-4">
                        {loading ? (
                            <div className="flex items-center justify-center py-8 text-muted-foreground">
                                <p>Loading activity…</p>
                            </div>
                        ) : activeJobOrders.length === 0 && pendingItems.length === 0 ? (
                            <div className="flex items-center justify-center py-8 text-muted-foreground">
                                <p>No recent activity</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-border">
                                {activeJobOrders.slice(0, 3).map((jo) => (
                                    <li key={jo.id} className="flex items-center justify-between py-3">
                                        <div>
                                            <p className="text-sm font-medium">{jo.jo_number}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {jo.vehicle ? `${jo.vehicle.make} ${jo.vehicle.model}` : 'Vehicle'} — {jo.status_label}
                                            </p>
                                        </div>
                                        <span
                                            className="rounded-full px-2 py-0.5 text-xs font-medium"
                                            style={{ backgroundColor: `${jo.status_color}20`, color: jo.status_color }}
                                        >
                                            {jo.status_label}
                                        </span>
                                    </li>
                                ))}
                                {pendingItems.slice(0, 2).map((tx) => (
                                    <li key={tx.id} className="flex items-center justify-between py-3">
                                        <div>
                                            <p className="text-sm font-medium">{tx.notes ?? `Invoice #${tx.id}`}</p>
                                            <p className="text-xs text-muted-foreground">Pending payment</p>
                                        </div>
                                        <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-500">
                                            ₱{Number(tx.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </CustomerLayout>
    );
}
