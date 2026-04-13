import { RoleAvatar } from '@/components/shared/role-avatar';
import { useAuth } from '@/context/AuthContext';
import { useCustomerProfile } from '@/hooks/useCustomerProfile';
import { customerService } from '@/services/customerService';
import type { Vehicle } from '@/types/customer';
import { CalendarDays, Car, FileText, History, Mail, MapPin, Phone, SquarePen } from 'lucide-react';
import { useState } from 'react';
import { AddVehicleModal } from './add-vehicle-modal';
import { type EditField, ProfileEditModal } from './profile-edit-modal';

export function UserProfileContent() {
    const { user } = useAuth();
    const { customer, loading, refetch } = useCustomerProfile();

    const [personalEditOpen, setPersonalEditOpen] = useState(false);
    const [specialEditOpen, setSpecialEditOpen] = useState(false);
    const [vehicleEditTarget, setVehicleEditTarget] = useState<Vehicle | null>(null);
    const [addVehicleOpen, setAddVehicleOpen] = useState(false);

    // For non-customer roles — keep existing edit capability (non-functional placeholder)
    const [nonCustomerSection, setNonCustomerSection] = useState<'personal' | 'account' | 'special' | null>(null);

    const isCustomer = user?.role === 'customer';
    const isFrontdesk = user?.role === 'frontdesk';
    const isAdmin = user?.role === 'admin';

    const roleLabel = isCustomer ? 'Customer' : isFrontdesk ? 'Front Desk' : 'Admin';

    const memberSince = user?.created_at
        ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : '—';

    // ── Customer: Personal Information save ──────────────────────────────────
    const handlePersonalSave = async (values: Record<string, string>) => {
        if (!customer) return;
        await customerService.updatePersonalInfo(customer.id, {
            phone_number: values.phone || undefined,
            address: values.address || undefined,
        });
        await refetch();
    };

    // ── Customer: Vehicle edit save ──────────────────────────────────────────
    const handleVehicleSave = async (values: Record<string, string>) => {
        if (!vehicleEditTarget) return;
        await customerService.updateVehicle(vehicleEditTarget.id, {
            make: values.make || undefined,
            model: values.model || undefined,
            year: values.year ? parseInt(values.year, 10) : undefined,
            plate_number: values.plate_number || undefined,
            color: values.color || undefined,
        });
        await refetch();
    };

    // ── Customer: Special Information save ─────────────────────────────────
    const handleSpecialSave = async (values: Record<string, string>) => {
        if (!customer) return;

        const preferredContact = values.preferred_contact_method?.trim().toLowerCase();
        if (!preferredContact || !['sms', 'call', 'email'].includes(preferredContact)) {
            throw new Error('Preferred contact must be one of: sms, call, or email.');
        }

        await customerService.updateSpecialInfo(customer.id, {
            preferred_contact_method: preferredContact as 'sms' | 'call' | 'email',
            special_notes: values.special_notes?.trim() || null,
        });
        await refetch();
    };

    const vehicleEditFields = (v: Vehicle): EditField[] => [
        { label: 'Brand / Make', key: 'make', value: v.make, type: 'text' },
        { label: 'Model', key: 'model', value: v.model, type: 'text' },
        { label: 'Year', key: 'year', value: String(v.year), type: 'text' },
        { label: 'Plate Number', key: 'plate_number', value: v.plate_number, type: 'text' },
        { label: 'Color', key: 'color', value: v.color ?? '', type: 'text' },
    ];

    // ── Hero stats ───────────────────────────────────────────────────────────
    const vehicleCount = customer?.vehicles.length ?? 0;

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
                        {isCustomer && !loading && (
                            <span className="flex items-center gap-1.5 text-xs font-medium">
                                <span className="h-2 w-2 rounded-full bg-blue-400" />
                                {vehicleCount} {vehicleCount === 1 ? 'Vehicle' : 'Vehicles'}
                            </span>
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
                            {isCustomer ? (
                                <button
                                    onClick={() => setPersonalEditOpen(true)}
                                    aria-label="Edit Personal Information"
                                    disabled={loading || !customer}
                                >
                                    <SquarePen className="h-4 w-4 text-[#d4af37] transition-opacity hover:opacity-70 disabled:opacity-30" />
                                </button>
                            ) : (
                                <button onClick={() => setNonCustomerSection('personal')} aria-label="Edit Personal Information">
                                    <SquarePen className="h-4 w-4 text-[#d4af37] transition-opacity hover:opacity-70" />
                                </button>
                            )}
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="text-muted-foreground">Phone:</span>
                                <span className="font-medium">{isCustomer ? (loading ? '…' : (customer?.phone_number ?? '—')) : '—'}</span>
                            </div>
                            <div className="flex min-w-0 items-center gap-2">
                                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="text-muted-foreground">Email:</span>
                                <span className="truncate font-medium">{user?.email ?? '—'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="text-muted-foreground">Address:</span>
                                <span className="font-medium">{isCustomer ? (loading ? '…' : (customer?.address ?? '—')) : '—'}</span>
                            </div>
                        </div>
                    </div>

                    {/* My Vehicles — customer only */}
                    {isCustomer && (
                        <div className="profile-card rounded-xl p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="font-semibold">My Vehicles</h3>
                            </div>
                            <div className="space-y-1">
                                {loading && <p className="text-sm text-muted-foreground">Loading vehicles…</p>}
                                {!loading && customer?.vehicles.length === 0 && (
                                    <p className="text-sm text-muted-foreground">No vehicles registered yet.</p>
                                )}
                                {!loading &&
                                    customer?.vehicles.map((vehicle) => (
                                        <div key={vehicle.id} className="flex items-center justify-between rounded-lg py-2">
                                            <div className="flex items-center gap-3">
                                                <Car className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {vehicle.make} {vehicle.model}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">{vehicle.plate_number}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setVehicleEditTarget(vehicle)}
                                                    aria-label={`Edit ${vehicle.make} ${vehicle.model}`}
                                                >
                                                    <SquarePen className="h-3.5 w-3.5 text-[#d4af37] transition-opacity hover:opacity-70" />
                                                </button>
                                                <button className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
                                                    <History className="h-3 w-3" />
                                                    <span>Service History</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                <button
                                    onClick={() => setAddVehicleOpen(true)}
                                    disabled={!customer}
                                    className="mt-3 w-full rounded-lg bg-[#d4af37] py-2 text-sm font-semibold text-black transition-colors hover:bg-[#e6c24e] disabled:opacity-50"
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
                            {!isCustomer && (
                                <button onClick={() => setNonCustomerSection('account')} aria-label="Edit Account Details">
                                    <SquarePen className="h-4 w-4 text-[#d4af37] transition-opacity hover:opacity-70" />
                                </button>
                            )}
                        </div>
                        <div className="space-y-3 text-sm">
                            {isCustomer && (
                                <>
                                    <div className="flex items-center gap-2">
                                        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <span className="text-muted-foreground">Member Since:</span>
                                        <span className="font-medium">{memberSince}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">Account Status:</span>
                                        <span className="font-medium capitalize">{loading ? '…' : (customer?.account_status ?? '—')}</span>
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
                            {isCustomer ? (
                                <button
                                    onClick={() => setSpecialEditOpen(true)}
                                    aria-label="Edit Special Information"
                                    disabled={loading || !customer}
                                >
                                    <SquarePen className="h-4 w-4 text-[#d4af37] transition-opacity hover:opacity-70 disabled:opacity-30" />
                                </button>
                            ) : (
                                <button onClick={() => setNonCustomerSection('special')} aria-label="Edit Special Information">
                                    <SquarePen className="h-4 w-4 text-[#d4af37] transition-opacity hover:opacity-70" />
                                </button>
                            )}
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="text-muted-foreground">Preferred Contact:</span>
                                <span className="font-medium">
                                    {isCustomer ? (loading ? '…' : (customer?.preferred_contact_method?.toUpperCase() ?? '—')) : 'SMS'}
                                </span>
                            </div>
                            <div className="flex items-start gap-2">
                                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="text-muted-foreground">Notes:</span>
                                <span className="italic">{isCustomer ? (loading ? '…' : (customer?.special_notes ?? '—')) : 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Customer: Personal Information modal */}
            {isCustomer && customer && (
                <ProfileEditModal
                    open={personalEditOpen}
                    onClose={() => setPersonalEditOpen(false)}
                    title="Edit Personal Information"
                    fields={[
                        { label: 'Phone Number', key: 'phone', value: customer.phone_number ?? '', type: 'tel' },
                        { label: 'Address', key: 'address', value: customer.address ?? '', type: 'text' },
                    ]}
                    onSave={handlePersonalSave}
                />
            )}

            {/* Customer: Special Information modal */}
            {isCustomer && customer && (
                <ProfileEditModal
                    open={specialEditOpen}
                    onClose={() => setSpecialEditOpen(false)}
                    title="Edit Special Information"
                    fields={[
                        {
                            label: 'Preferred Contact (sms, call, email)',
                            key: 'preferred_contact_method',
                            value: customer.preferred_contact_method ?? 'sms',
                            type: 'text',
                        },
                        {
                            label: 'Notes',
                            key: 'special_notes',
                            value: customer.special_notes ?? '',
                            type: 'textarea',
                        },
                    ]}
                    onSave={handleSpecialSave}
                />
            )}

            {/* Customer: Vehicle edit modal */}
            {vehicleEditTarget && (
                <ProfileEditModal
                    open={vehicleEditTarget !== null}
                    onClose={() => setVehicleEditTarget(null)}
                    title={`Edit ${vehicleEditTarget.make} ${vehicleEditTarget.model}`}
                    fields={vehicleEditFields(vehicleEditTarget)}
                    onSave={handleVehicleSave}
                />
            )}

            {/* Customer: Add Vehicle modal */}
            {isCustomer && customer && (
                <AddVehicleModal open={addVehicleOpen} onClose={() => setAddVehicleOpen(false)} customerId={customer.id} onSuccess={refetch} />
            )}

            {/* Non-customer: placeholder modals (edit icon opens modal, save is no-op) */}
            {!isCustomer && nonCustomerSection === 'personal' && (
                <ProfileEditModal
                    open={true}
                    onClose={() => setNonCustomerSection(null)}
                    title="Edit Personal Information"
                    fields={[
                        { label: 'Phone Number', key: 'phone', value: '', type: 'tel' },
                        { label: 'Address', key: 'address', value: '', type: 'text' },
                    ]}
                    onSave={async () => {}}
                />
            )}
            {!isCustomer && nonCustomerSection === 'account' && (
                <ProfileEditModal
                    open={true}
                    onClose={() => setNonCustomerSection(null)}
                    title="Edit Account Details"
                    fields={
                        isFrontdesk
                            ? [{ label: 'Department', key: 'department', value: 'Operations', type: 'text' }]
                            : [{ label: 'System Access', key: 'access', value: 'Full Access', type: 'text' }]
                    }
                    onSave={async () => {}}
                />
            )}
            {!isCustomer && nonCustomerSection === 'special' && (
                <ProfileEditModal
                    open={true}
                    onClose={() => setNonCustomerSection(null)}
                    title="Edit Special Information"
                    fields={[
                        { label: 'Preferred Contact', key: 'contact', value: 'SMS', type: 'text' },
                        { label: 'Notes', key: 'notes', value: 'N/A', type: 'textarea' },
                    ]}
                    onSave={async () => {}}
                />
            )}
        </div>
    );
}
