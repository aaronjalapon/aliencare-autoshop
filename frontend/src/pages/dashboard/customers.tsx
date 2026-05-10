import AppLayout from '@/components/layout/app-layout';
import { flattenValidationErrors } from '@/lib/validation-errors';
import { ApiError } from '@/services/api';
import { frontdeskCustomerService } from '@/services/frontdeskCustomerService';
import { type BreadcrumbItem } from '@/types';
import {
    CustomerTier,
    CustomerTierMode,
    CustomerUiStatus,
    FrontdeskCustomer,
    FrontdeskCustomerMutationPayload,
    FrontdeskVehicle,
    FrontdeskVehiclePayload,
} from '@/types/frontdesk/customers';
import { Car, Check, Crown, Download, Loader2, Mail, Minus, Phone, Plus, Search, UserPlus, X } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

type SegmentFilter = 'all' | 'active' | 'vip' | 'fleet' | 'inactive' | 'pending';
type FormMode = 'create' | 'edit';
type VehicleFormMode = 'create' | 'edit';
type TierBadge = CustomerTier | CustomerUiStatus | 'Pending';

interface CustomerFormState {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    address: string;
    licenseNumber: string;
}

type CustomerFormErrors = Partial<Record<keyof CustomerFormState, string>>;

interface VehicleFormState {
    make: string;
    model: string;
    year: string;
    plateNumber: string;
    color: string;
    vin: string;
}

type VehicleFormErrors = Partial<Record<keyof VehicleFormState, string>>;

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Customers', href: '/customers' }];

const initialCustomerForm: CustomerFormState = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    address: '',
    licenseNumber: '',
};

const initialVehicleForm: VehicleFormState = {
    make: '',
    model: '',
    year: '',
    plateNumber: '',
    color: '',
    vin: '',
};

const customerApiFieldMap: Record<string, keyof CustomerFormState> = {
    first_name: 'firstName',
    last_name: 'lastName',
    email: 'email',
    phone_number: 'phoneNumber',
    address: 'address',
    license_number: 'licenseNumber',
};

const vehicleApiFieldMap: Record<string, keyof VehicleFormState> = {
    make: 'make',
    model: 'model',
    year: 'year',
    plate_number: 'plateNumber',
    color: 'color',
    vin: 'vin',
};

function formatPeso(amount: number): string {
    return `P${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatRelativeTime(iso: string | null, fallback = 'No record yet'): string {
    if (!iso) {
        return fallback;
    }

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return fallback;
    }

    const diffMs = Date.now() - date.getTime();
    const minuteMs = 60 * 1000;
    const hourMs = 60 * minuteMs;
    const dayMs = 24 * hourMs;

    if (diffMs < minuteMs) {
        return 'Just now';
    }

    if (diffMs < hourMs) {
        const minutes = Math.max(1, Math.floor(diffMs / minuteMs));
        return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    }

    if (diffMs < dayMs) {
        const hours = Math.max(1, Math.floor(diffMs / hourMs));
        return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }

    const days = Math.max(1, Math.floor(diffMs / dayMs));
    return `${days} day${days === 1 ? '' : 's'} ago`;
}

function toCustomerFormState(customer: FrontdeskCustomer): CustomerFormState {
    return {
        firstName: customer.first_name,
        lastName: customer.last_name,
        email: customer.email ?? '',
        phoneNumber: customer.phone_number ?? '',
        address: customer.address ?? '',
        licenseNumber: customer.license_number ?? '',
    };
}

function toCustomerPayload(form: CustomerFormState): FrontdeskCustomerMutationPayload {
    return {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim() || null,
        phone_number: form.phoneNumber.trim(),
        address: form.address.trim() || null,
        license_number: form.licenseNumber.trim() || null,
    };
}

function toVehicleFormState(vehicle: FrontdeskVehicle): VehicleFormState {
    return {
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year.toString(),
        plateNumber: vehicle.plate_number,
        color: vehicle.color ?? '',
        vin: vehicle.vin ?? '',
    };
}

function toVehiclePayload(form: VehicleFormState): FrontdeskVehiclePayload {
    return {
        make: form.make.trim(),
        model: form.model.trim(),
        year: Number.parseInt(form.year, 10),
        plate_number: form.plateNumber.trim(),
        color: form.color.trim() || null,
        vin: form.vin.trim() || null,
    };
}

function mapCustomerValidationErrors(validationErrors?: Record<string, string[]>): CustomerFormErrors {
    const flatErrors = flattenValidationErrors(validationErrors);

    return Object.entries(flatErrors).reduce<CustomerFormErrors>((acc, [field, message]) => {
        const mappedField = customerApiFieldMap[field];
        if (mappedField) {
            acc[mappedField] = message;
        }

        return acc;
    }, {});
}

function mapVehicleValidationErrors(validationErrors?: Record<string, string[]>): VehicleFormErrors {
    const flatErrors = flattenValidationErrors(validationErrors);

    return Object.entries(flatErrors).reduce<VehicleFormErrors>((acc, [field, message]) => {
        const mappedField = vehicleApiFieldMap[field];
        if (mappedField) {
            acc[mappedField] = message;
        }

        return acc;
    }, {});
}

function buildCustomerBadges(customer: FrontdeskCustomer): TierBadge[] {
    const badges: TierBadge[] = [...customer.tiers];

    if (customer.account_status === 'pending') {
        badges.push('Pending');
    } else {
        badges.push(customer.ui_status);
    }

    return Array.from(new Set(badges));
}

function TierChip({ tier }: { tier: TierBadge }) {
    const config: Record<TierBadge, { label: string; className: string; dot: string }> = {
        VIP: {
            label: 'VIP',
            className: 'border-[#d4af37]/35 bg-[#d4af37]/12 text-[#d4af37]',
            dot: 'bg-[#d4af37]',
        },
        Fleet: {
            label: 'Fleet',
            className: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
            dot: 'bg-blue-400',
        },
        Active: {
            label: 'Active',
            className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
            dot: 'bg-emerald-400',
        },
        Inactive: {
            label: 'Inactive',
            className: 'border-zinc-500/40 bg-zinc-500/10 text-zinc-300',
            dot: 'bg-zinc-400',
        },
        Pending: {
            label: 'Pending',
            className: 'border-amber-500/35 bg-amber-500/12 text-amber-300',
            dot: 'bg-amber-400',
        },
    };

    const tierConfig = config[tier];

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${tierConfig.className}`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${tierConfig.dot}`} />
            {tierConfig.label}
        </span>
    );
}

export default function Customers() {
    const [customers, setCustomers] = useState<FrontdeskCustomer[]>([]);
    const [totalCustomers, setTotalCustomers] = useState(0);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
    const [customersError, setCustomersError] = useState<string | null>(null);

    const [searchValue, setSearchValue] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [segment, setSegment] = useState<SegmentFilter>('all');
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<FrontdeskCustomer | null>(null);
    const [isLoadingSelected, setIsLoadingSelected] = useState(false);

    const [actionError, setActionError] = useState<string | null>(null);
    const [isTogglingActivation, setIsTogglingActivation] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);

    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [customerFormMode, setCustomerFormMode] = useState<FormMode>('create');
    const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
    const [customerForm, setCustomerForm] = useState<CustomerFormState>(initialCustomerForm);
    const [customerFormErrors, setCustomerFormErrors] = useState<CustomerFormErrors>({});
    const [customerSubmitError, setCustomerSubmitError] = useState<string | null>(null);
    const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);

    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    const [tierModeDraft, setTierModeDraft] = useState<CustomerTierMode>('auto');
    const [tierOverridesDraft, setTierOverridesDraft] = useState<CustomerTier[]>([]);
    const [isSavingTiers, setIsSavingTiers] = useState(false);

    const [showVehicleModal, setShowVehicleModal] = useState(false);
    const [vehicleFormMode, setVehicleFormMode] = useState<VehicleFormMode>('create');
    const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
    const [vehicleForm, setVehicleForm] = useState<VehicleFormState>(initialVehicleForm);
    const [vehicleFormErrors, setVehicleFormErrors] = useState<VehicleFormErrors>({});
    const [vehicleSubmitError, setVehicleSubmitError] = useState<string | null>(null);
    const [isSubmittingVehicle, setIsSubmittingVehicle] = useState(false);
    const [deletingVehicleId, setDeletingVehicleId] = useState<number | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchValue.trim());
        }, 350);

        return () => clearTimeout(timer);
    }, [searchValue]);

    const loadCustomers = useCallback(async () => {
        try {
            setIsLoadingCustomers(true);
            setCustomersError(null);
            setActionError(null);

            const filters: Record<string, string | number> = { per_page: 100 };

            if (debouncedSearch) {
                filters.search = debouncedSearch;
            }

            if (segment === 'active' || segment === 'inactive' || segment === 'pending') {
                filters.segment = segment;
            }

            if (segment === 'vip' || segment === 'fleet') {
                filters.tier = segment;
            }

            const response = await frontdeskCustomerService.getCustomers(filters);
            const paginated = response.data as unknown as {
                data: FrontdeskCustomer[];
                total?: number;
                meta?: { total?: number };
            };

            const rows = Array.isArray(paginated.data) ? paginated.data : [];
            const total =
                typeof paginated.total === 'number'
                    ? paginated.total
                    : typeof paginated.meta?.total === 'number'
                      ? paginated.meta.total
                      : rows.length;

            setCustomers(rows);
            setTotalCustomers(total);

            setSelectedId((current) => {
                if (current !== null && rows.some((row) => row.id === current)) {
                    return current;
                }

                return rows[0]?.id ?? null;
            });
        } catch (error) {
            setCustomersError(error instanceof Error ? error.message : 'Failed to load customers.');
            setCustomers([]);
            setTotalCustomers(0);
            setSelectedId(null);
        } finally {
            setIsLoadingCustomers(false);
        }
    }, [debouncedSearch, segment]);

    const loadCustomerDetail = useCallback(async (customerId: number) => {
        try {
            setIsLoadingSelected(true);
            const response = await frontdeskCustomerService.getCustomer(customerId);
            setSelectedCustomerDetail(response.data);
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Failed to load customer details.');
            setSelectedCustomerDetail(null);
        } finally {
            setIsLoadingSelected(false);
        }
    }, []);

    useEffect(() => {
        void loadCustomers();
    }, [loadCustomers]);

    useEffect(() => {
        if (selectedId === null) {
            setSelectedCustomerDetail(null);
            return;
        }

        void loadCustomerDetail(selectedId);
    }, [selectedId, loadCustomerDetail]);

    const selectedFromList = useMemo(() => customers.find((customer) => customer.id === selectedId) ?? null, [customers, selectedId]);

    const selectedCustomer = useMemo(() => {
        if (selectedCustomerDetail && selectedCustomerDetail.id === selectedId) {
            return selectedCustomerDetail;
        }

        return selectedFromList;
    }, [selectedCustomerDetail, selectedFromList, selectedId]);

    useEffect(() => {
        if (!selectedCustomer) {
            return;
        }

        setTierModeDraft(selectedCustomer.tier_mode);
        setTierOverridesDraft(selectedCustomer.tier_overrides);
    }, [selectedCustomer]);

    const totals = useMemo(() => {
        return {
            total: totalCustomers || customers.length,
            active: customers.filter((customer) => customer.ui_status === 'Active').length,
            vip: customers.filter((customer) => customer.tiers.includes('VIP')).length,
            fleet: customers.filter((customer) => customer.tiers.includes('Fleet')).length,
            pending: customers.filter((customer) => customer.account_status === 'pending').length,
        };
    }, [customers, totalCustomers]);

    const closeCustomerModal = () => {
        setShowCustomerModal(false);
        setCustomerFormErrors({});
        setCustomerSubmitError(null);
    };

    const openCreateCustomerModal = () => {
        setCustomerFormMode('create');
        setEditingCustomerId(null);
        setCustomerForm(initialCustomerForm);
        setCustomerFormErrors({});
        setCustomerSubmitError(null);
        setShowCustomerModal(true);
    };

    const openEditCustomerModal = () => {
        if (!selectedCustomer) {
            return;
        }

        setCustomerFormMode('edit');
        setEditingCustomerId(selectedCustomer.id);
        setCustomerForm(toCustomerFormState(selectedCustomer));
        setCustomerFormErrors({});
        setCustomerSubmitError(null);
        setShowCustomerModal(true);
    };

    const handleSubmitCustomer = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        setCustomerFormErrors({});
        setCustomerSubmitError(null);
        setIsSubmittingCustomer(true);

        try {
            const payload = toCustomerPayload(customerForm);

            if (customerFormMode === 'create') {
                const response = await frontdeskCustomerService.createCustomer(payload);
                const created = response.data;

                setSelectedId(created.id);
                closeCustomerModal();
                await loadCustomers();
                await loadCustomerDetail(created.id);

                return;
            }

            if (editingCustomerId === null) {
                setCustomerSubmitError('No customer selected for update.');
                return;
            }

            const response = await frontdeskCustomerService.updateCustomer(editingCustomerId, payload);
            const updated = response.data;

            setSelectedId(updated.id);
            closeCustomerModal();
            await loadCustomers();
            await loadCustomerDetail(updated.id);
        } catch (error) {
            if (error instanceof ApiError && error.status === 422) {
                setCustomerFormErrors(mapCustomerValidationErrors(error.validationErrors));
            }

            setCustomerSubmitError(error instanceof Error ? error.message : 'Failed to save customer.');
        } finally {
            setIsSubmittingCustomer(false);
        }
    };

    const handleApproveCustomer = async () => {
        if (!selectedCustomer) {
            return;
        }

        setActionError(null);
        setIsApproving(true);

        try {
            await frontdeskCustomerService.approveCustomer(selectedCustomer.id);
            await loadCustomers();
            await loadCustomerDetail(selectedCustomer.id);
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Failed to approve customer.');
        } finally {
            setIsApproving(false);
        }
    };

    const openRejectModal = () => {
        setRejectReason('');
        setActionError(null);
        setShowRejectModal(true);
    };

    const closeRejectModal = () => {
        setShowRejectModal(false);
        setRejectReason('');
    };

    const handleRejectCustomer = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!selectedCustomer) {
            return;
        }

        setActionError(null);
        setIsRejecting(true);

        try {
            await frontdeskCustomerService.rejectCustomer(selectedCustomer.id, rejectReason.trim());
            closeRejectModal();
            await loadCustomers();
            await loadCustomerDetail(selectedCustomer.id);
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Failed to reject customer.');
        } finally {
            setIsRejecting(false);
        }
    };

    const handleToggleActivation = async () => {
        if (!selectedCustomer) {
            return;
        }

        setActionError(null);
        setIsTogglingActivation(true);

        try {
            await frontdeskCustomerService.setActivation(selectedCustomer.id, !selectedCustomer.is_active);
            await loadCustomers();
            await loadCustomerDetail(selectedCustomer.id);
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Failed to update customer activation.');
        } finally {
            setIsTogglingActivation(false);
        }
    };

    const handleToggleTierOverride = (tier: CustomerTier) => {
        setTierOverridesDraft((prev) => {
            if (prev.includes(tier)) {
                return prev.filter((current) => current !== tier);
            }

            return [...prev, tier];
        });
    };

    const handleSaveTierSettings = async () => {
        if (!selectedCustomer) {
            return;
        }

        setActionError(null);
        setIsSavingTiers(true);

        try {
            await frontdeskCustomerService.updateTiers(selectedCustomer.id, {
                tier_mode: tierModeDraft,
                tier_overrides: tierModeDraft === 'manual' ? tierOverridesDraft : undefined,
            });
            await loadCustomers();
            await loadCustomerDetail(selectedCustomer.id);
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Failed to update customer tiers.');
        } finally {
            setIsSavingTiers(false);
        }
    };

    const closeVehicleModal = () => {
        setShowVehicleModal(false);
        setVehicleFormErrors({});
        setVehicleSubmitError(null);
    };

    const openAddVehicleModal = () => {
        if (!selectedCustomer) {
            return;
        }

        setVehicleFormMode('create');
        setEditingVehicleId(null);
        setVehicleForm(initialVehicleForm);
        setVehicleFormErrors({});
        setVehicleSubmitError(null);
        setShowVehicleModal(true);
    };

    const openEditVehicleModal = (vehicle: FrontdeskVehicle) => {
        setVehicleFormMode('edit');
        setEditingVehicleId(vehicle.id);
        setVehicleForm(toVehicleFormState(vehicle));
        setVehicleFormErrors({});
        setVehicleSubmitError(null);
        setShowVehicleModal(true);
    };

    const handleSubmitVehicle = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!selectedCustomer) {
            return;
        }

        setVehicleFormErrors({});
        setVehicleSubmitError(null);
        setIsSubmittingVehicle(true);

        try {
            const payload = toVehiclePayload(vehicleForm);

            if (!Number.isFinite(payload.year) || payload.year < 1900) {
                setVehicleSubmitError('Please enter a valid vehicle year.');
                return;
            }

            if (vehicleFormMode === 'create') {
                await frontdeskCustomerService.addVehicle(selectedCustomer.id, payload);
                closeVehicleModal();
                await loadCustomers();
                await loadCustomerDetail(selectedCustomer.id);
                return;
            }

            if (editingVehicleId === null) {
                setVehicleSubmitError('No vehicle selected for update.');
                return;
            }

            await frontdeskCustomerService.updateVehicle(editingVehicleId, payload);
            closeVehicleModal();
            await loadCustomers();
            await loadCustomerDetail(selectedCustomer.id);
        } catch (error) {
            if (error instanceof ApiError && error.status === 422) {
                setVehicleFormErrors(mapVehicleValidationErrors(error.validationErrors));
            }

            setVehicleSubmitError(error instanceof Error ? error.message : 'Failed to save vehicle.');
        } finally {
            setIsSubmittingVehicle(false);
        }
    };

    const handleDeleteVehicle = async (vehicle: FrontdeskVehicle) => {
        if (!selectedCustomer) {
            return;
        }

        const confirmed = window.confirm(`Remove ${vehicle.make} ${vehicle.model} (${vehicle.plate_number}) from this customer?`);
        if (!confirmed) {
            return;
        }

        setActionError(null);
        setDeletingVehicleId(vehicle.id);

        try {
            await frontdeskCustomerService.deleteVehicle(vehicle.id);
            await loadCustomers();
            await loadCustomerDetail(selectedCustomer.id);
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Failed to delete vehicle.');
        } finally {
            setDeletingVehicleId(null);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="h-full min-h-0 flex-1 overflow-hidden p-5">
                <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-4 overflow-hidden">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold tracking-[0.18em] text-[#d4af37] uppercase">Frontdesk Workspace</p>
                            <h1 className="mt-2 text-3xl font-bold tracking-tight">Customers</h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Know your customers — look up profiles, manage vehicles and membership tiers, and keep contact details current.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={openCreateCustomerModal}
                                className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
                            >
                                <UserPlus className="h-4 w-4" /> New Customer
                            </button>
                            <button
                                disabled
                                className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 py-2 text-sm text-muted-foreground"
                            >
                                <Download className="h-4 w-4" /> Export
                            </button>
                        </div>
                    </div>

                    {(customersError || actionError) && (
                        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                            {customersError ?? actionError}
                        </div>
                    )}

                    <div className="grid min-h-0 flex-1 gap-4 overflow-hidden xl:grid-cols-[1.9fr_0.72fr]">
                        <div className="flex min-w-0 flex-col gap-3">
                            <div className="flex flex-col gap-3 rounded-xl border border-[#2a2a2e] bg-[#0d0d10]/80 p-3">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        value={searchValue}
                                        onChange={(event) => setSearchValue(event.target.value)}
                                        placeholder="Search by name, phone, email, or customer code..."
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#090a0d] pr-3 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#d4af37]/70 focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none"
                                    />
                                </div>

                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                                    <div className="rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/7 px-3 py-2.5">
                                        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Total</p>
                                        <p className="mt-1 text-2xl font-bold text-[#d4af37]">{totals.total}</p>
                                    </div>
                                    <div className="rounded-lg border border-[#2a2a2e] bg-[#090a0d] px-3 py-2.5">
                                        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Active</p>
                                        <p className="mt-1 text-2xl font-bold">{totals.active}</p>
                                    </div>
                                    <div className="rounded-lg border border-[#2a2a2e] bg-[#090a0d] px-3 py-2.5">
                                        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">VIP</p>
                                        <p className="mt-1 text-2xl font-bold">{totals.vip}</p>
                                    </div>
                                    <div className="rounded-lg border border-[#2a2a2e] bg-[#090a0d] px-3 py-2.5">
                                        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Fleet</p>
                                        <p className="mt-1 text-2xl font-bold">{totals.fleet}</p>
                                    </div>
                                    <div className="rounded-lg border border-[#2a2a2e] bg-[#090a0d] px-3 py-2.5">
                                        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Pending</p>
                                        <p className="mt-1 text-2xl font-bold">{totals.pending}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-1.5 rounded-xl border border-[#2a2a2e] bg-[#0d0d10]/70 p-1.5">
                                {(
                                    [
                                        { key: 'all', label: 'All Customers' },
                                        { key: 'active', label: 'Active' },
                                        { key: 'vip', label: 'VIP' },
                                        { key: 'fleet', label: 'Fleet' },
                                        { key: 'inactive', label: 'Inactive' },
                                        { key: 'pending', label: 'Pending' },
                                    ] as Array<{ key: SegmentFilter; label: string }>
                                ).map((item) => (
                                    <button
                                        key={item.key}
                                        onClick={() => setSegment(item.key)}
                                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                                            segment === item.key
                                                ? 'bg-[#d4af37] text-black shadow-[0_0_12px_rgba(212,175,55,0.35)]'
                                                : 'text-muted-foreground hover:bg-[#1e1e22] hover:text-foreground'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>

                            <div className="overflow-hidden rounded-xl border border-[#2a2a2e] bg-[#0d0d10]/80">
                                <div className="hidden grid-cols-[1.1fr_1.2fr_1.5fr_0.9fr_0.8fr_0.8fr] border-b border-[#2a2a2e] px-4 py-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase lg:grid">
                                    <span>Customer</span>
                                    <span>Contact</span>
                                    <span>Primary Vehicle</span>
                                    <span>Last Visit</span>
                                    <span>Total Jobs</span>
                                    <span>Status</span>
                                </div>

                                <div className="max-h-140 overflow-y-auto">
                                    {isLoadingCustomers ? (
                                        <div className="flex items-center justify-center gap-2 px-5 py-20 text-sm text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" /> Loading customers...
                                        </div>
                                    ) : customers.length === 0 ? (
                                        <div className="px-5 py-20 text-center text-sm text-muted-foreground">No customers matched your filter.</div>
                                    ) : (
                                        customers.map((customer) => {
                                            const selected = selectedId === customer.id;

                                            return (
                                                <button
                                                    key={customer.id}
                                                    onClick={() => setSelectedId(customer.id)}
                                                    className={`grid w-full border-b border-[#1b1d22] px-4 py-3 text-left transition-colors last:border-b-0 lg:grid-cols-[1.1fr_1.2fr_1.5fr_0.9fr_0.8fr_0.8fr] ${
                                                        selected
                                                            ? 'bg-[#d4af37]/7 shadow-[inset_0_0_0_1px_rgba(212,175,55,0.55)]'
                                                            : 'hover:bg-[#1a1b20]/65'
                                                    }`}
                                                >
                                                    <div className="mb-2 lg:mb-0">
                                                        <p className="text-sm font-semibold">{customer.full_name}</p>
                                                        <p className="mt-0.5 text-[11px] text-muted-foreground">{customer.code}</p>
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {buildCustomerBadges(customer).map((tier) => (
                                                                <TierChip key={`${customer.id}-${tier}`} tier={tier} />
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="mb-2 lg:mb-0">
                                                        <p className="text-sm text-foreground/90">{customer.phone_number ?? 'No phone number'}</p>
                                                        <p className="text-xs text-muted-foreground">{customer.email ?? 'No email address'}</p>
                                                    </div>

                                                    <div className="mb-2 lg:mb-0">
                                                        <p className="text-sm">{customer.primary_vehicle ?? 'No registered vehicle'}</p>
                                                        {customer.extra_vehicles > 0 && (
                                                            <p className="text-xs text-muted-foreground">+{customer.extra_vehicles} more</p>
                                                        )}
                                                    </div>

                                                    <div className="mb-2 text-sm text-muted-foreground lg:mb-0">
                                                        {formatRelativeTime(customer.last_visit_at)}
                                                    </div>

                                                    <div className="mb-2 lg:mb-0">
                                                        <p className="text-sm font-semibold">{customer.total_jobs} jobs</p>
                                                        <p className="text-xs text-muted-foreground">{formatPeso(customer.total_spent)}</p>
                                                    </div>

                                                    <div>
                                                        {customer.account_status === 'pending' ? (
                                                            <span className="inline-flex rounded-full border border-amber-500/35 bg-amber-500/12 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                                                                Pending
                                                            </span>
                                                        ) : customer.ui_status === 'Active' ? (
                                                            <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                                                                Active
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex rounded-full border border-zinc-500/35 bg-zinc-500/12 px-2 py-0.5 text-[11px] font-semibold text-zinc-300">
                                                                Inactive
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        <aside className="flex min-h-0 flex-col rounded-xl border border-[#2a2a2e] bg-[#0d0d10]/90 p-4">
                            {selectedCustomer ? (
                                <>
                                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                {selectedCustomer.code}
                                            </p>
                                            <h2 className="mt-2 text-2xl leading-tight font-bold">{selectedCustomer.full_name}</h2>
                                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                {buildCustomerBadges(selectedCustomer).map((tier) => (
                                                    <TierChip key={`selected-${selectedCustomer.id}-${tier}`} tier={tier} />
                                                ))}
                                            </div>
                                        </div>
                                        {isLoadingSelected && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                    </div>

                                    <div className="rounded-xl border border-[#2a2a2e] bg-[#0a0b0f] p-3">
                                        <button
                                            disabled
                                            className="mb-2 inline-flex w-full cursor-not-allowed items-center justify-center rounded-lg border border-[#2a2a2e] px-3 py-2 text-sm text-muted-foreground"
                                        >
                                            New Job Order (From Job Orders Page)
                                        </button>
                                        {selectedCustomer.account_status === 'pending' && (
                                            <div className="mb-2 grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={handleApproveCustomer}
                                                    disabled={isApproving}
                                                    className="inline-flex items-center justify-center gap-1 rounded-md bg-emerald-500/20 px-2 py-1.5 text-xs font-semibold text-emerald-300 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    {isApproving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}{' '}
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={openRejectModal}
                                                    disabled={isRejecting}
                                                    className="inline-flex items-center justify-center gap-1 rounded-md bg-red-500/15 px-2 py-1.5 text-xs font-semibold text-red-300 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    <X className="h-3 w-3" /> Reject
                                                </button>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-3 gap-2">
                                            <button className="rounded-md border border-[#2a2a2e] px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
                                                Call
                                            </button>
                                            <button className="rounded-md border border-[#2a2a2e] px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
                                                SMS
                                            </button>
                                            <button className="rounded-md border border-[#2a2a2e] px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
                                                Email
                                            </button>
                                        </div>
                                        <button
                                            onClick={openEditCustomerModal}
                                            className="mt-2 w-full rounded-md border border-[#2a2a2e] px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                                        >
                                            Edit Customer
                                        </button>
                                    </div>

                                    <div className="rounded-xl border border-[#2a2a2e] bg-[#0a0b0f] p-3">
                                        <div className="mb-3 flex items-center justify-between">
                                            <p className="text-sm font-semibold">Contact Information</p>
                                            <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                                        </div>
                                        <div className="space-y-3 text-sm">
                                            <div className="flex items-center justify-between gap-2 text-muted-foreground">
                                                <span className="inline-flex items-center gap-1 text-xs uppercase">
                                                    <Phone className="h-3.5 w-3.5" /> Phone
                                                </span>
                                                <span className="text-right text-foreground">{selectedCustomer.phone_number ?? 'Not set'}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-2 text-muted-foreground">
                                                <span className="inline-flex items-center gap-1 text-xs uppercase">
                                                    <Mail className="h-3.5 w-3.5" /> Email
                                                </span>
                                                <span className="text-right text-foreground">{selectedCustomer.email ?? 'Not set'}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-2 text-muted-foreground">
                                                <span className="text-xs uppercase">Address</span>
                                                <span className="text-right text-foreground">{selectedCustomer.address ?? 'Not set'}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-2 text-muted-foreground">
                                                <span className="text-xs uppercase">Customer Since</span>
                                                <span className="text-right text-foreground">
                                                    {formatRelativeTime(selectedCustomer.customer_since, 'Unknown')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-[#2a2a2e] bg-[#0a0b0f] p-3">
                                        <div className="mb-3 flex items-center justify-between">
                                            <p className="text-sm font-semibold">Tier Rules</p>
                                            <Crown className="h-3.5 w-3.5 text-[#d4af37]" />
                                        </div>
                                        <div className="rounded-md border border-dashed border-[#2a2a2e] bg-[#111217] p-2 text-xs text-muted-foreground">
                                            Auto rules: VIP when total spent is at least P50,000; Fleet when vehicle count is at least 2.
                                        </div>
                                        <div className="mt-2 grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => setTierModeDraft('auto')}
                                                className={`rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors ${
                                                    tierModeDraft === 'auto'
                                                        ? 'border-[#d4af37]/45 bg-[#d4af37]/15 text-[#d4af37]'
                                                        : 'border-[#2a2a2e] text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                Auto
                                            </button>
                                            <button
                                                onClick={() => setTierModeDraft('manual')}
                                                className={`rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors ${
                                                    tierModeDraft === 'manual'
                                                        ? 'border-[#d4af37]/45 bg-[#d4af37]/15 text-[#d4af37]'
                                                        : 'border-[#2a2a2e] text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                Manual
                                            </button>
                                        </div>

                                        <div className="mt-2 grid grid-cols-2 gap-2">
                                            {(['VIP', 'Fleet'] as CustomerTier[]).map((tier) => {
                                                const checked = tierOverridesDraft.includes(tier);

                                                return (
                                                    <button
                                                        key={tier}
                                                        disabled={tierModeDraft !== 'manual'}
                                                        onClick={() => handleToggleTierOverride(tier)}
                                                        className={`rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors ${
                                                            checked
                                                                ? 'border-[#d4af37]/45 bg-[#d4af37]/15 text-[#d4af37]'
                                                                : 'border-[#2a2a2e] text-muted-foreground'
                                                        } ${tierModeDraft !== 'manual' ? 'cursor-not-allowed opacity-50' : 'hover:text-foreground'}`}
                                                    >
                                                        {tier}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <button
                                            onClick={handleSaveTierSettings}
                                            disabled={isSavingTiers}
                                            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#2a2a2e] px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {isSavingTiers ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}{' '}
                                            Save Tier Settings
                                        </button>
                                    </div>

                                    <div className="rounded-xl border border-[#2a2a2e] bg-[#0a0b0f] p-3">
                                        <div className="mb-3 flex items-center justify-between">
                                            <p className="text-sm font-semibold">Vehicles ({selectedCustomer.vehicles?.length ?? 0})</p>
                                            <button
                                                onClick={openAddVehicleModal}
                                                className="rounded-full border border-[#2a2a2e] p-1 text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                                            >
                                                <Plus className="h-3 w-3" />
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            {(selectedCustomer.vehicles ?? []).length === 0 ? (
                                                <div className="rounded-lg border border-dashed border-[#2a2a2e] p-3 text-center text-xs text-muted-foreground">
                                                    No vehicles registered.
                                                </div>
                                            ) : (
                                                (selectedCustomer.vehicles ?? []).map((vehicle) => (
                                                    <div
                                                        key={`${selectedCustomer.id}-${vehicle.id}`}
                                                        className="rounded-lg border border-[#23252b] bg-[#111217] p-2.5"
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <button onClick={() => openEditVehicleModal(vehicle)} className="text-left">
                                                                <p className="inline-flex items-center gap-1 text-sm font-semibold">
                                                                    <Car className="h-3.5 w-3.5 text-[#d4af37]" />
                                                                    {vehicle.make} {vehicle.model}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">{vehicle.year}</p>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteVehicle(vehicle)}
                                                                disabled={deletingVehicleId === vehicle.id}
                                                                className="rounded p-0.5 text-red-400/75 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                                                            >
                                                                {deletingVehicleId === vehicle.id ? (
                                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                ) : (
                                                                    <X className="h-3.5 w-3.5" />
                                                                )}
                                                            </button>
                                                        </div>
                                                        <div className="mt-2 space-y-1 text-xs">
                                                            <div className="flex items-center justify-between text-muted-foreground">
                                                                <span>Plate</span>
                                                                <span className="text-foreground">{vehicle.plate_number}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between text-muted-foreground">
                                                                <span>Last Service</span>
                                                                <span className="text-foreground">
                                                                    {formatRelativeTime(vehicle.last_service_at, 'No service yet')}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between text-muted-foreground">
                                                                <span>Next Due</span>
                                                                <span className="text-foreground">Needs scheduling</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                </div>
                                <div className="shrink-0 pt-4">
                                    <button
                                        onClick={handleToggleActivation}
                                        disabled={isTogglingActivation}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#2a2a2e] px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isTogglingActivation ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : selectedCustomer.is_active ? (
                                            <Crown className="h-4 w-4" />
                                        ) : (
                                            <Crown className="h-4 w-4 text-[#d4af37]" />
                                        )}
                                        {selectedCustomer.is_active ? 'Deactivate Customer' : 'Activate Customer'}
                                    </button>
                                </div>
                                </>
                            ) : (
                                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[#2a2a2e] p-6 text-sm text-muted-foreground">
                                    Select a customer to view details.
                                </div>
                            )}
                        </aside>
                    </div>
                </div>
            </div>

            {showCustomerModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
                    <div className="w-full max-w-lg rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-5 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold tracking-wide text-[#d4af37] uppercase">Customers</p>
                                <h3 className="text-xl font-bold">{customerFormMode === 'create' ? 'Create Customer' : 'Update Customer'}</h3>
                            </div>
                            <button
                                onClick={closeCustomerModal}
                                className="rounded-full border border-[#2a2a2e] p-1.5 text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {customerSubmitError && (
                            <div className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                                {customerSubmitError}
                            </div>
                        )}

                        <form onSubmit={handleSubmitCustomer} className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="space-y-1">
                                    <span className="text-xs text-muted-foreground">First Name</span>
                                    <input
                                        value={customerForm.firstName}
                                        onChange={(event) =>
                                            setCustomerForm((prev) => ({
                                                ...prev,
                                                firstName: event.target.value,
                                            }))
                                        }
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#090a0d] px-3 text-sm"
                                    />
                                    {customerFormErrors.firstName && <p className="text-xs text-red-300">{customerFormErrors.firstName}</p>}
                                </label>

                                <label className="space-y-1">
                                    <span className="text-xs text-muted-foreground">Last Name</span>
                                    <input
                                        value={customerForm.lastName}
                                        onChange={(event) =>
                                            setCustomerForm((prev) => ({
                                                ...prev,
                                                lastName: event.target.value,
                                            }))
                                        }
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#090a0d] px-3 text-sm"
                                    />
                                    {customerFormErrors.lastName && <p className="text-xs text-red-300">{customerFormErrors.lastName}</p>}
                                </label>
                            </div>

                            <label className="space-y-1">
                                <span className="text-xs text-muted-foreground">Email</span>
                                <input
                                    type="email"
                                    value={customerForm.email}
                                    onChange={(event) =>
                                        setCustomerForm((prev) => ({
                                            ...prev,
                                            email: event.target.value,
                                        }))
                                    }
                                    className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#090a0d] px-3 text-sm"
                                />
                                {customerFormErrors.email && <p className="text-xs text-red-300">{customerFormErrors.email}</p>}
                            </label>

                            <label className="space-y-1">
                                <span className="text-xs text-muted-foreground">Phone Number</span>
                                <input
                                    value={customerForm.phoneNumber}
                                    onChange={(event) =>
                                        setCustomerForm((prev) => ({
                                            ...prev,
                                            phoneNumber: event.target.value,
                                        }))
                                    }
                                    className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#090a0d] px-3 text-sm"
                                />
                                {customerFormErrors.phoneNumber && <p className="text-xs text-red-300">{customerFormErrors.phoneNumber}</p>}
                            </label>

                            <label className="space-y-1">
                                <span className="text-xs text-muted-foreground">Address</span>
                                <input
                                    value={customerForm.address}
                                    onChange={(event) =>
                                        setCustomerForm((prev) => ({
                                            ...prev,
                                            address: event.target.value,
                                        }))
                                    }
                                    className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#090a0d] px-3 text-sm"
                                />
                                {customerFormErrors.address && <p className="text-xs text-red-300">{customerFormErrors.address}</p>}
                            </label>

                            <label className="space-y-1">
                                <span className="text-xs text-muted-foreground">License Number</span>
                                <input
                                    value={customerForm.licenseNumber}
                                    onChange={(event) =>
                                        setCustomerForm((prev) => ({
                                            ...prev,
                                            licenseNumber: event.target.value,
                                        }))
                                    }
                                    className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#090a0d] px-3 text-sm"
                                />
                                {customerFormErrors.licenseNumber && <p className="text-xs text-red-300">{customerFormErrors.licenseNumber}</p>}
                            </label>

                            <div className="mt-4 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={closeCustomerModal}
                                    className="rounded-lg border border-[#2a2a2e] px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingCustomer}
                                    className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSubmittingCustomer && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {customerFormMode === 'create' ? 'Create Customer' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showRejectModal && selectedCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
                    <div className="w-full max-w-md rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-5 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold">Reject Customer Approval</h3>
                            <button
                                onClick={closeRejectModal}
                                className="rounded-full border border-[#2a2a2e] p-1.5 text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleRejectCustomer} className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                Provide a reason for rejecting {selectedCustomer.full_name}'s account request.
                            </p>
                            <textarea
                                value={rejectReason}
                                onChange={(event) => setRejectReason(event.target.value)}
                                rows={4}
                                required
                                className="w-full rounded-lg border border-[#2a2a2e] bg-[#090a0d] px-3 py-2 text-sm"
                            />

                            <div className="flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={closeRejectModal}
                                    className="rounded-lg border border-[#2a2a2e] px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isRejecting}
                                    className="inline-flex items-center gap-2 rounded-lg bg-red-500/90 px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isRejecting && <Loader2 className="h-4 w-4 animate-spin" />} Reject Account
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showVehicleModal && selectedCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
                    <div className="w-full max-w-lg rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-5 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold tracking-wide text-[#d4af37] uppercase">Vehicles</p>
                                <h3 className="text-xl font-bold">{vehicleFormMode === 'create' ? 'Add Vehicle' : 'Update Vehicle'}</h3>
                            </div>
                            <button
                                onClick={closeVehicleModal}
                                className="rounded-full border border-[#2a2a2e] p-1.5 text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {vehicleSubmitError && (
                            <div className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                                {vehicleSubmitError}
                            </div>
                        )}

                        <form onSubmit={handleSubmitVehicle} className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="space-y-1">
                                    <span className="text-xs text-muted-foreground">Make</span>
                                    <input
                                        value={vehicleForm.make}
                                        onChange={(event) =>
                                            setVehicleForm((prev) => ({
                                                ...prev,
                                                make: event.target.value,
                                            }))
                                        }
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#090a0d] px-3 text-sm"
                                    />
                                    {vehicleFormErrors.make && <p className="text-xs text-red-300">{vehicleFormErrors.make}</p>}
                                </label>

                                <label className="space-y-1">
                                    <span className="text-xs text-muted-foreground">Model</span>
                                    <input
                                        value={vehicleForm.model}
                                        onChange={(event) =>
                                            setVehicleForm((prev) => ({
                                                ...prev,
                                                model: event.target.value,
                                            }))
                                        }
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#090a0d] px-3 text-sm"
                                    />
                                    {vehicleFormErrors.model && <p className="text-xs text-red-300">{vehicleFormErrors.model}</p>}
                                </label>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="space-y-1">
                                    <span className="text-xs text-muted-foreground">Year</span>
                                    <input
                                        value={vehicleForm.year}
                                        onChange={(event) =>
                                            setVehicleForm((prev) => ({
                                                ...prev,
                                                year: event.target.value,
                                            }))
                                        }
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#090a0d] px-3 text-sm"
                                    />
                                    {vehicleFormErrors.year && <p className="text-xs text-red-300">{vehicleFormErrors.year}</p>}
                                </label>

                                <label className="space-y-1">
                                    <span className="text-xs text-muted-foreground">Plate Number</span>
                                    <input
                                        value={vehicleForm.plateNumber}
                                        onChange={(event) =>
                                            setVehicleForm((prev) => ({
                                                ...prev,
                                                plateNumber: event.target.value,
                                            }))
                                        }
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#090a0d] px-3 text-sm"
                                    />
                                    {vehicleFormErrors.plateNumber && <p className="text-xs text-red-300">{vehicleFormErrors.plateNumber}</p>}
                                </label>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="space-y-1">
                                    <span className="text-xs text-muted-foreground">Color</span>
                                    <input
                                        value={vehicleForm.color}
                                        onChange={(event) =>
                                            setVehicleForm((prev) => ({
                                                ...prev,
                                                color: event.target.value,
                                            }))
                                        }
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#090a0d] px-3 text-sm"
                                    />
                                    {vehicleFormErrors.color && <p className="text-xs text-red-300">{vehicleFormErrors.color}</p>}
                                </label>

                                <label className="space-y-1">
                                    <span className="text-xs text-muted-foreground">VIN</span>
                                    <input
                                        value={vehicleForm.vin}
                                        onChange={(event) =>
                                            setVehicleForm((prev) => ({
                                                ...prev,
                                                vin: event.target.value,
                                            }))
                                        }
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#090a0d] px-3 text-sm"
                                    />
                                    {vehicleFormErrors.vin && <p className="text-xs text-red-300">{vehicleFormErrors.vin}</p>}
                                </label>
                            </div>

                            <div className="mt-4 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={closeVehicleModal}
                                    className="rounded-lg border border-[#2a2a2e] px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingVehicle}
                                    className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSubmittingVehicle && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {vehicleFormMode === 'create' ? 'Add Vehicle' : 'Save Vehicle'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
