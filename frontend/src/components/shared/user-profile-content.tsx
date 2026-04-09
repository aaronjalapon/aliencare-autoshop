import { RoleAvatar } from '@/components/shared/role-avatar';
import { useAuth } from '@/context/AuthContext';
import { CalendarDays, Car, FileText, History, Mail, MapPin, Phone, SquarePen } from 'lucide-react';
import { useState } from 'react';
import { AddVehicleModal } from './add-vehicle-modal';
import { type EditField, ProfileEditModal } from './profile-edit-modal';

type SectionKey = 'personal' | 'vehicles' | 'account' | 'special';

export function UserProfileContent() {
    const { user } = useAuth();
    const [activeModal, setActiveModal] = useState<SectionKey | null>(null);
    const [addVehicleOpen, setAddVehicleOpen] = useState(false);

    const isCustomer = user?.role === 'customer';
    const isFrontdesk = user?.role === 'frontdesk';
    const isAdmin = user?.role === 'admin';

    const roleLabel = isCustomer ? 'Customer' : isFrontdesk ? 'Front Desk' : 'Admin';

    const memberSince = user?.created_at
        ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : '—';

    const modalConfig: Record<SectionKey, { title: string; fields: EditField[] }> = {
        personal: {
            title: 'Edit Personal Information',
            fields: [
                { label: 'Phone Number', key: 'phone', value: '0912 345 6789', type: 'tel' },
                { label: 'Email Address', key: 'email', value: user?.email ?? '', type: 'email' },
                { label: 'Address', key: 'address', value: 'Davao Street, Mindanao', type: 'text' },
            ],
        },
        vehicles: {
            title: 'Edit My Vehicles',
            fields: [
                { label: 'Vehicle 1 – Make / Model', key: 'v1_model', value: 'Toyota Innova', type: 'text' },
                { label: 'Vehicle 1 – Plate Number', key: 'v1_plate', value: 'CAV 1234', type: 'text' },
                { label: 'Vehicle 2 – Make / Model', key: 'v2_model', value: 'Honda Civic', type: 'text' },
                { label: 'Vehicle 2 – Plate Number', key: 'v2_plate', value: 'XYZ 4567', type: 'text' },
            ],
        },
        account: {
            title: 'Edit Account Details',
            fields: isCustomer
                ? [
                      { label: 'Last Service Date', key: 'last_service', value: 'Sep 1, 2025', type: 'text' },
                      { label: 'Outstanding Balance', key: 'balance', value: '₱ 0.00', type: 'text' },
                  ]
                : isFrontdesk
                  ? [{ label: 'Department', key: 'department', value: 'Operations', type: 'text' }]
                  : [{ label: 'System Access', key: 'access', value: 'Full Access', type: 'text' }],
        },
        special: {
            title: 'Edit Special Information',
            fields: [
                { label: 'Preferred Contact', key: 'contact', value: 'SMS', type: 'text' },
                { label: 'Notes', key: 'notes', value: isCustomer ? 'Uses synthetic oil only' : 'N/A', type: 'textarea' },
            ],
        },
    };

    const editBtn = (section: SectionKey) => (
        <button onClick={() => setActiveModal(section)} aria-label={`Edit ${modalConfig[section].title}`}>
            <SquarePen className="h-4 w-4 text-[#d4af37] transition-opacity hover:opacity-70" />
        </button>
    );

    const active = activeModal ? modalConfig[activeModal] : null;

    return (
        <div className="flex h-full flex-1 flex-col gap-4 p-6">
            <h1 className="text-xl font-bold tracking-tight">User Profile</h1>

            {/* Hero */}
            <div className="profile-card flex items-center gap-5 rounded-xl p-5">
                <div className="h-20 w-20 shrink-0">
                    {user ? (
                        <RoleAvatar role={user.role} className="h-full w-full" />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-[#2a2a2e] text-2xl font-bold text-white">
                            ?
                        </div>
                    )}
                </div>
                <div>
                    <h2 className="text-xl font-bold">{user?.name ?? '—'}</h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">{user?.email ?? '—'}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1.5 text-xs font-medium">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            Active {roleLabel}
                        </span>
                        {isCustomer && (
                            <>
                                <span className="flex items-center gap-1.5 text-xs font-medium">
                                    <span className="h-2 w-2 rounded-full bg-blue-400" />2 Vehicles
                                </span>
                                <span className="flex items-center gap-1.5 text-xs font-medium">
                                    <span className="h-2 w-2 rounded-full bg-yellow-400" />4 Visits
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Two-column grid */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* Left column */}
                <div className="flex flex-col gap-4">
                    {/* Personal Information */}
                    <div className="profile-card rounded-xl p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-semibold">Personal Information</h3>
                            {editBtn('personal')}
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="text-muted-foreground">Phone:</span>
                                <span className="font-medium">0912 345 6789</span>
                            </div>
                            <div className="flex min-w-0 items-center gap-2">
                                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="text-muted-foreground">Email:</span>
                                <span className="truncate font-medium">{user?.email ?? '—'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="text-muted-foreground">Address:</span>
                                <span className="font-medium">Davao Street, Mindanao</span>
                            </div>
                        </div>
                    </div>

                    {/* My Vehicles — customer only */}
                    {isCustomer && (
                        <div className="profile-card rounded-xl p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="font-semibold">My Vehicles</h3>
                                {editBtn('vehicles')}
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center justify-between rounded-lg py-2">
                                    <div className="flex items-center gap-3">
                                        <Car className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Toyota Innova</p>
                                            <p className="text-xs text-muted-foreground">CAV 1234</p>
                                        </div>
                                    </div>
                                    <button className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
                                        <History className="h-3 w-3" />
                                        <span>Service History</span>
                                    </button>
                                </div>
                                <div className="flex items-center justify-between rounded-lg py-2">
                                    <div className="flex items-center gap-3">
                                        <Car className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Honda Civic</p>
                                            <p className="text-xs text-muted-foreground">XYZ 4567</p>
                                        </div>
                                    </div>
                                    <button className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
                                        <History className="h-3 w-3" />
                                        <span>Service History</span>
                                    </button>
                                </div>
                                <button
                                    onClick={() => setAddVehicleOpen(true)}
                                    className="mt-3 w-full rounded-lg bg-[#d4af37] py-2 text-sm font-semibold text-black transition-colors hover:bg-[#e6c24e]"
                                >
                                    Add Vehicle
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right column */}
                <div className="flex flex-col gap-4">
                    {/* Account Details */}
                    <div className="profile-card rounded-xl p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-semibold">Account Details</h3>
                            {editBtn('account')}
                        </div>
                        <div className="space-y-3 text-sm">
                            {isCustomer && (
                                <>
                                    <div className="flex items-center gap-2">
                                        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <span className="text-muted-foreground">Last Service:</span>
                                        <span className="font-medium">Sep 1, 2025</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-4 shrink-0 text-center text-muted-foreground">₱</span>
                                        <span className="text-muted-foreground">Outstanding Balance:</span>
                                        <span className="font-medium">₱ 0.00</span>
                                    </div>
                                </>
                            )}
                            {isFrontdesk && (
                                <>
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">Role:</span>
                                        <span className="font-medium">Front Desk</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">Department:</span>
                                        <span className="font-medium">Operations</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <span className="text-muted-foreground">Member Since:</span>
                                        <span className="font-medium">{memberSince}</span>
                                    </div>
                                </>
                            )}
                            {isAdmin && (
                                <>
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">Role:</span>
                                        <span className="font-medium">System Administrator</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">System Access:</span>
                                        <span className="font-medium">Full Access</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <span className="text-muted-foreground">Member Since:</span>
                                        <span className="font-medium">{memberSince}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Special Information */}
                    <div className="profile-card rounded-xl p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-semibold">Special Information</h3>
                            {editBtn('special')}
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="text-muted-foreground">Preferred Contact:</span>
                                <span className="font-medium">SMS</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="text-muted-foreground">Notes:</span>
                                <span className="italic">{isCustomer ? 'Uses synthetic oil only' : 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Shared edit modal */}
            {active && (
                <ProfileEditModal open={activeModal !== null} onClose={() => setActiveModal(null)} title={active.title} fields={active.fields} />
            )}

            {/* Add Vehicle modal */}
            <AddVehicleModal open={addVehicleOpen} onClose={() => setAddVehicleOpen(false)} />
        </div>
    );
}
