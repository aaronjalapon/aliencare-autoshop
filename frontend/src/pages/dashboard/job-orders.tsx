import AppLayout from '@/components/layout/app-layout';
import { flattenValidationErrors } from '@/lib/validation-errors';
import { ApiError } from '@/services/api';
import { BayOption, MechanicOption, frontdeskJobOrderService } from '@/services/jobOrderService';
import { type BreadcrumbItem } from '@/types';
import { type CustomerProfile, type JobOrder, type JobOrderStatus, type ServiceCatalogItem, type Vehicle } from '@/types/customer';
import { Car, CheckCircle2, Clock3, Loader2, Search, ShieldCheck, UserRoundPlus, Wrench, XCircle } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Job Orders', href: '/job-orders' }];

type SegmentFilter = 'all' | 'online' | 'walkin' | 'active' | 'completed';
type WalkInCustomerMode = 'existing' | 'new';
type WalkInVehicleMode = 'existing' | 'new';
type PrimaryAction = 'submit' | 'approve' | 'start' | 'complete' | 'settle' | 'none';

interface WalkInFormState {
    customerMode: WalkInCustomerMode;
    existingCustomerId: string;
    newCustomerFirstName: string;
    newCustomerLastName: string;
    newCustomerPhone: string;
    newCustomerEmail: string;
    vehicleMode: WalkInVehicleMode;
    existingVehicleId: string;
    vehicleMake: string;
    vehicleModel: string;
    vehicleYear: string;
    vehiclePlateNumber: string;
    vehicleColor: string;
    serviceTemplateId: string;
    serviceName: string;
    estimatedAmount: string;
    notes: string;
}

type WalkInFormErrors = Partial<Record<keyof WalkInFormState, string>>;

const initialWalkInForm: WalkInFormState = {
    customerMode: 'existing',
    existingCustomerId: '',
    newCustomerFirstName: '',
    newCustomerLastName: '',
    newCustomerPhone: '',
    newCustomerEmail: '',
    vehicleMode: 'existing',
    existingVehicleId: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    vehiclePlateNumber: '',
    vehicleColor: '',
    serviceTemplateId: '',
    serviceName: '',
    estimatedAmount: '',
    notes: '',
};

const statusMeta: Record<JobOrderStatus, { label: string; className: string }> = {
    created: { label: 'Created', className: 'border-zinc-500/40 bg-zinc-500/10 text-zinc-300' },
    pending_approval: { label: 'Pending Approval', className: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
    approved: { label: 'Approved', className: 'border-blue-500/30 bg-blue-500/10 text-blue-300' },
    in_progress: { label: 'In Progress', className: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300' },
    completed: { label: 'Completed', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
    settled: { label: 'Settled', className: 'border-emerald-600/35 bg-emerald-600/10 text-emerald-200' },
    cancelled: { label: 'Cancelled', className: 'border-rose-500/35 bg-rose-500/10 text-rose-300' },
};

const walkInApiFieldToFormField: Record<string, keyof WalkInFormState> = {
    customer_id: 'existingCustomerId',
    vehicle_id: 'existingVehicleId',
    first_name: 'newCustomerFirstName',
    last_name: 'newCustomerLastName',
    phone_number: 'newCustomerPhone',
    email: 'newCustomerEmail',
    make: 'vehicleMake',
    model: 'vehicleModel',
    year: 'vehicleYear',
    plate_number: 'vehiclePlateNumber',
    color: 'vehicleColor',
    service_fee: 'estimatedAmount',
    notes: 'notes',
};

function mapWalkInValidationErrors(validationErrors?: Record<string, string[]>): WalkInFormErrors {
    const flatErrors = flattenValidationErrors(validationErrors);

    return Object.entries(flatErrors).reduce<WalkInFormErrors>((acc, [field, message]) => {
        const mappedField = walkInApiFieldToFormField[field];
        if (mappedField) {
            acc[mappedField] = message;
        }

        return acc;
    }, {});
}

function formatPeso(amount: number): string {
    return `P${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatTimeLabel(time24: string): string {
    const [hourRaw, minuteRaw] = time24.split(':');
    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
        return time24;
    }

    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;

    return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

function formatRelativeTime(isoTimestamp: string): string {
    const date = new Date(isoTimestamp);
    if (Number.isNaN(date.getTime())) {
        return 'Unknown';
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
        return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
    }

    if (diffMs < dayMs) {
        const hours = Math.max(1, Math.floor(diffMs / hourMs));
        return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }

    const days = Math.max(1, Math.floor(diffMs / dayMs));
    return `${days} day${days === 1 ? '' : 's'} ago`;
}

function getSourceLabel(order: JobOrder): 'Online Booking' | 'Walk-in' {
    return order.source === 'Online Booking' ? 'Online Booking' : 'Walk-in';
}

function getEstimatedAmount(order: JobOrder): number {
    return order.total_cost ?? order.service_fee;
}

function getBalance(order: JobOrder): number {
    if (typeof order.balance === 'number') {
        return order.balance;
    }

    return order.settled_flag ? 0 : getEstimatedAmount(order);
}

function getServiceName(order: JobOrder): string {
    if (order.service?.name) {
        return order.service.name;
    }

    const notes = order.notes ?? '';
    const prefix = 'Service Request:';
    if (notes.startsWith(prefix)) {
        const firstSegment = notes.split('|')[0]?.replace(prefix, '').trim();
        if (firstSegment) {
            return firstSegment;
        }
    }

    return 'General Service';
}

function getVehicleLabel(order: JobOrder): string {
    if (!order.vehicle) {
        return 'Unregistered Vehicle';
    }

    return `${order.vehicle.make} ${order.vehicle.model} ${order.vehicle.year}`;
}

function getScheduleLabel(order: JobOrder): string {
    if (order.arrival_date && order.arrival_time) {
        const parsedDate = new Date(`${order.arrival_date}T00:00:00`);
        const dateLabel = Number.isNaN(parsedDate.getTime())
            ? order.arrival_date
            : parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return `${dateLabel} · ${formatTimeLabel(order.arrival_time)}`;
    }

    return `Created · ${formatRelativeTime(order.created_at)}`;
}

function statusForSegment(order: JobOrder, segment: SegmentFilter): boolean {
    if (segment === 'all') {
        return true;
    }

    if (order.status === 'cancelled') {
        return false;
    }

    if (segment === 'online') {
        return getSourceLabel(order) === 'Online Booking';
    }

    if (segment === 'walkin') {
        return getSourceLabel(order) === 'Walk-in';
    }

    if (segment === 'completed') {
        return order.status === 'completed' || order.status === 'settled';
    }

    return !['completed', 'settled', 'cancelled'].includes(order.status);
}

function getPrimaryAction(status: JobOrderStatus): PrimaryAction {
    if (status === 'created') return 'submit';
    if (status === 'pending_approval') return 'approve';
    if (status === 'approved') return 'start';
    if (status === 'in_progress') return 'complete';
    if (status === 'completed') return 'settle';

    return 'none';
}

function getPrimaryActionLabel(action: PrimaryAction): string {
    if (action === 'submit') return 'Submit for Approval';
    if (action === 'approve') return 'Approve Booking';
    if (action === 'start') return 'Start Service';
    if (action === 'complete') return 'Mark Complete';
    if (action === 'settle') return 'Settle Payment';

    return 'No Further Action';
}

function canCancel(status: JobOrderStatus): boolean {
    return status !== 'settled' && status !== 'cancelled';
}

export default function JobOrders() {
    const [jobOrders, setJobOrders] = useState<JobOrder[]>([]);
    const [isLoadingJobOrders, setIsLoadingJobOrders] = useState(true);
    const [jobOrdersError, setJobOrdersError] = useState<string | null>(null);

    const [searchValue, setSearchValue] = useState('');
    const [segment, setSegment] = useState<SegmentFilter>('all');
    const [selectedId, setSelectedId] = useState<number>(0);

    const [actionError, setActionError] = useState<string | null>(null);
    const [isProcessingAction, setIsProcessingAction] = useState(false);

    const [showWalkInModal, setShowWalkInModal] = useState(false);
    const [isSubmittingWalkIn, setIsSubmittingWalkIn] = useState(false);
    const [walkInSubmitError, setWalkInSubmitError] = useState<string | null>(null);
    const [walkInFormErrors, setWalkInFormErrors] = useState<WalkInFormErrors>({});
    const [walkInForm, setWalkInForm] = useState<WalkInFormState>(initialWalkInForm);

    const [customerSearch, setCustomerSearch] = useState('');
    const [customers, setCustomers] = useState<CustomerProfile[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [serviceOptions, setServiceOptions] = useState<ServiceCatalogItem[]>([]);
    const [isLoadingWalkInLookups, setIsLoadingWalkInLookups] = useState(false);

    const [showStartModal, setShowStartModal] = useState(false);
    const [startForm, setStartForm] = useState({ mechanicId: '', bayId: '' });
    const [startSubmitError, setStartSubmitError] = useState<string | null>(null);
    const [isSubmittingStart, setIsSubmittingStart] = useState(false);
    const [isLoadingStartLookups, setIsLoadingStartLookups] = useState(false);
    const [mechanics, setMechanics] = useState<MechanicOption[]>([]);
    const [bays, setBays] = useState<BayOption[]>([]);

    const [showSettleModal, setShowSettleModal] = useState(false);
    const [settleInvoiceId, setSettleInvoiceId] = useState('');
    const [settleSubmitError, setSettleSubmitError] = useState<string | null>(null);
    const [isSubmittingSettle, setIsSubmittingSettle] = useState(false);

    const [updateDraft, setUpdateDraft] = useState({ notes: '', serviceFee: '0' });
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [isSavingUpdate, setIsSavingUpdate] = useState(false);

    const loadJobOrders = useCallback(async () => {
        try {
            setIsLoadingJobOrders(true);
            setJobOrdersError(null);

            const response = await frontdeskJobOrderService.getJobOrders({ per_page: 200 });
            setJobOrders(response.data.data);
        } catch (error) {
            setJobOrdersError(error instanceof Error ? error.message : 'Failed to load job orders.');
            setJobOrders([]);
        } finally {
            setIsLoadingJobOrders(false);
        }
    }, []);

    useEffect(() => {
        void loadJobOrders();
    }, [loadJobOrders]);

    const loadWalkInLookups = useCallback(async (search = '') => {
        try {
            setIsLoadingWalkInLookups(true);

            const [customersResponse, servicesResponse] = await Promise.all([
                frontdeskJobOrderService.getCustomers({ search: search || undefined, per_page: 100 }),
                frontdeskJobOrderService.getServices({ per_page: 100 }),
            ]);

            setCustomers(customersResponse.data.data);
            setServiceOptions(servicesResponse.data.data);
        } catch {
            setCustomers([]);
            setServiceOptions([]);
        } finally {
            setIsLoadingWalkInLookups(false);
        }
    }, []);

    useEffect(() => {
        if (!showWalkInModal) {
            return;
        }

        void loadWalkInLookups(customerSearch.trim());
    }, [showWalkInModal, customerSearch, loadWalkInLookups]);

    const loadVehiclesForCustomer = useCallback(async (customerId: number) => {
        try {
            const response = await frontdeskJobOrderService.getVehiclesForCustomer(customerId);
            setVehicles(response.data);
        } catch {
            setVehicles([]);
        }
    }, []);

    useEffect(() => {
        if (!showWalkInModal || walkInForm.customerMode !== 'existing') {
            setVehicles([]);
            return;
        }

        const customerId = Number.parseInt(walkInForm.existingCustomerId, 10);
        if (!Number.isFinite(customerId) || customerId <= 0) {
            setVehicles([]);
            return;
        }

        void loadVehiclesForCustomer(customerId);
    }, [showWalkInModal, walkInForm.customerMode, walkInForm.existingCustomerId, loadVehiclesForCustomer]);

    const totals = useMemo(() => {
        return {
            active: jobOrders.filter((order) => !['completed', 'settled', 'cancelled'].includes(order.status)).length,
            onlinePending: jobOrders.filter((order) => getSourceLabel(order) === 'Online Booking' && order.status === 'pending_approval').length,
            walkInToday: jobOrders.filter((order) => getSourceLabel(order) === 'Walk-in').length,
            completedToday: jobOrders.filter((order) => ['completed', 'settled'].includes(order.status)).length,
        };
    }, [jobOrders]);

    const filteredOrders = useMemo(() => {
        const normalized = searchValue.trim().toLowerCase();

        return jobOrders.filter((order) => {
            if (!statusForSegment(order, segment)) {
                return false;
            }

            if (!normalized) {
                return true;
            }

            const searchable = [
                order.jo_number,
                order.customer?.full_name ?? '',
                order.customer?.phone_number ?? '',
                order.vehicle?.plate_number ?? '',
                getVehicleLabel(order),
                getServiceName(order),
                getSourceLabel(order),
            ]
                .join(' ')
                .toLowerCase();

            return searchable.includes(normalized);
        });
    }, [jobOrders, searchValue, segment]);

    useEffect(() => {
        if (filteredOrders.length === 0) {
            setSelectedId(0);
            return;
        }

        if (!filteredOrders.some((order) => order.id === selectedId)) {
            setSelectedId(filteredOrders[0].id);
        }
    }, [filteredOrders, selectedId]);

    const selectedOrder = useMemo(() => {
        const exact = filteredOrders.find((order) => order.id === selectedId);
        return exact ?? filteredOrders[0] ?? null;
    }, [filteredOrders, selectedId]);

    const selectedPrimaryAction = selectedOrder ? getPrimaryAction(selectedOrder.status) : 'none';

    useEffect(() => {
        if (!selectedOrder) {
            return;
        }

        setUpdateDraft({
            notes: selectedOrder.notes ?? '',
            serviceFee: selectedOrder.service_fee.toString(),
        });
        setUpdateError(null);
        setActionError(null);
    }, [selectedOrder]);

    const upsertJobOrder = useCallback((updatedOrder: JobOrder) => {
        setJobOrders((prev) => {
            const existingIndex = prev.findIndex((order) => order.id === updatedOrder.id);
            if (existingIndex === -1) {
                return [updatedOrder, ...prev];
            }

            const next = [...prev];
            next[existingIndex] = updatedOrder;
            return next;
        });
    }, []);

    const openStartModal = async () => {
        if (!selectedOrder) {
            return;
        }

        setStartForm({ mechanicId: '', bayId: '' });
        setStartSubmitError(null);
        setShowStartModal(true);
        setIsLoadingStartLookups(true);

        try {
            const [mechanicsResponse, baysResponse] = await Promise.all([
                frontdeskJobOrderService.getMechanics(),
                frontdeskJobOrderService.getBays(),
            ]);

            const availableMechanics = mechanicsResponse.data.filter((mechanic) => mechanic.availability_status.toLowerCase() !== 'busy');
            const availableBays = baysResponse.data.filter((bay) => bay.status.toLowerCase() === 'available');

            setMechanics(availableMechanics);
            setBays(availableBays);
        } catch {
            setStartSubmitError('Failed to load mechanics and bays. Please try again.');
            setMechanics([]);
            setBays([]);
        } finally {
            setIsLoadingStartLookups(false);
        }
    };

    const handlePrimaryAction = async () => {
        if (!selectedOrder) {
            return;
        }

        const action = getPrimaryAction(selectedOrder.status);
        if (action === 'none') {
            return;
        }

        if (action === 'start') {
            await openStartModal();
            return;
        }

        if (action === 'settle') {
            setSettleInvoiceId(selectedOrder.invoice_id ?? '');
            setSettleSubmitError(null);
            setShowSettleModal(true);
            return;
        }

        setActionError(null);
        setIsProcessingAction(true);

        try {
            let response;

            if (action === 'submit') {
                response = await frontdeskJobOrderService.submitJobOrder(selectedOrder.id);
            } else {
                response = await frontdeskJobOrderService.approveJobOrder(selectedOrder.id);
            }

            upsertJobOrder(response.data);
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Failed to process status action.');
        } finally {
            setIsProcessingAction(false);
        }
    };

    const handleStartJobOrder = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!selectedOrder) {
            return;
        }

        const mechanicId = Number.parseInt(startForm.mechanicId, 10);
        const bayId = Number.parseInt(startForm.bayId, 10);

        if (!Number.isFinite(mechanicId) || !Number.isFinite(bayId)) {
            setStartSubmitError('Select a mechanic and bay to start service.');
            return;
        }

        setIsSubmittingStart(true);
        setStartSubmitError(null);

        try {
            const response = await frontdeskJobOrderService.startJobOrder(selectedOrder.id, {
                mechanic_id: mechanicId,
                bay_id: bayId,
            });

            upsertJobOrder(response.data);
            setShowStartModal(false);
        } catch (error) {
            setStartSubmitError(error instanceof Error ? error.message : 'Failed to start job order.');
        } finally {
            setIsSubmittingStart(false);
        }
    };

    const handleSettleJobOrder = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!selectedOrder) {
            return;
        }

        setSettleSubmitError(null);
        setIsSubmittingSettle(true);

        try {
            const response = await frontdeskJobOrderService.settleJobOrder(selectedOrder.id, {
                invoice_id: settleInvoiceId.trim() || null,
            });

            upsertJobOrder(response.data);
            setShowSettleModal(false);
        } catch (error) {
            setSettleSubmitError(error instanceof Error ? error.message : 'Failed to settle job order.');
        } finally {
            setIsSubmittingSettle(false);
        }
    };

    const handleCancelJobOrder = async () => {
        if (!selectedOrder || !canCancel(selectedOrder.status)) {
            return;
        }

        if (!window.confirm(`Cancel ${selectedOrder.jo_number}? This cannot be undone.`)) {
            return;
        }

        setActionError(null);
        setIsProcessingAction(true);

        try {
            const response = await frontdeskJobOrderService.cancelJobOrder(selectedOrder.id);
            upsertJobOrder(response.data);
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Failed to cancel job order.');
        } finally {
            setIsProcessingAction(false);
        }
    };

    const handleSaveOrderUpdate = async () => {
        if (!selectedOrder) {
            return;
        }

        const parsedServiceFee = Number.parseFloat(updateDraft.serviceFee);
        if (!Number.isFinite(parsedServiceFee) || parsedServiceFee < 0) {
            setUpdateError('Service fee must be a valid non-negative number.');
            return;
        }

        setUpdateError(null);
        setIsSavingUpdate(true);

        try {
            const response = await frontdeskJobOrderService.updateJobOrder(selectedOrder.id, {
                notes: updateDraft.notes.trim() || null,
                service_fee: parsedServiceFee,
            });

            upsertJobOrder(response.data);
        } catch (error) {
            if (error instanceof ApiError && error.status === 422) {
                setUpdateError('Update failed due to validation errors.');
            } else {
                setUpdateError(error instanceof Error ? error.message : 'Failed to update job order.');
            }
        } finally {
            setIsSavingUpdate(false);
        }
    };

    const closeWalkInModal = () => {
        setShowWalkInModal(false);
        setWalkInSubmitError(null);
        setWalkInFormErrors({});
        setWalkInForm(initialWalkInForm);
        setCustomerSearch('');
        setVehicles([]);
    };

    const handleCreateWalkInJobOrder = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        setWalkInFormErrors({});
        setWalkInSubmitError(null);
        setIsSubmittingWalkIn(true);

        try {
            let customerId: number;

            if (walkInForm.customerMode === 'existing') {
                customerId = Number.parseInt(walkInForm.existingCustomerId, 10);
                if (!Number.isFinite(customerId) || customerId <= 0) {
                    setWalkInFormErrors((prev) => ({ ...prev, existingCustomerId: 'Select an existing customer.' }));
                    return;
                }
            } else {
                const customerResponse = await frontdeskJobOrderService.createCustomer({
                    first_name: walkInForm.newCustomerFirstName.trim(),
                    last_name: walkInForm.newCustomerLastName.trim(),
                    phone_number: walkInForm.newCustomerPhone.trim(),
                    email: walkInForm.newCustomerEmail.trim() || null,
                });
                customerId = customerResponse.data.id;
            }

            let vehicleId: number;

            if (walkInForm.vehicleMode === 'existing') {
                vehicleId = Number.parseInt(walkInForm.existingVehicleId, 10);
                if (!Number.isFinite(vehicleId) || vehicleId <= 0) {
                    setWalkInFormErrors((prev) => ({ ...prev, existingVehicleId: 'Select an existing vehicle.' }));
                    return;
                }
            } else {
                const parsedYear = Number.parseInt(walkInForm.vehicleYear, 10);
                if (!Number.isFinite(parsedYear)) {
                    setWalkInFormErrors((prev) => ({ ...prev, vehicleYear: 'Provide a valid vehicle year.' }));
                    return;
                }

                const vehicleResponse = await frontdeskJobOrderService.createVehicleForCustomer(customerId, {
                    make: walkInForm.vehicleMake.trim(),
                    model: walkInForm.vehicleModel.trim(),
                    year: parsedYear,
                    plate_number: walkInForm.vehiclePlateNumber.trim(),
                    color: walkInForm.vehicleColor.trim() || undefined,
                });

                vehicleId = vehicleResponse.data.id;
            }

            const parsedEstimatedAmount = Number.parseFloat(walkInForm.estimatedAmount);
            const serviceFee = Number.isFinite(parsedEstimatedAmount) && parsedEstimatedAmount >= 0 ? parsedEstimatedAmount : 0;
            const notesParts = [
                walkInForm.serviceName.trim() ? `Service Request: ${walkInForm.serviceName.trim()}` : null,
                walkInForm.notes.trim() || null,
            ].filter(Boolean);

            const createResponse = await frontdeskJobOrderService.createJobOrder({
                customer_id: customerId,
                vehicle_id: vehicleId,
                service_fee: serviceFee,
                notes: notesParts.length > 0 ? notesParts.join(' | ') : null,
            });

            const createdOrder = createResponse.data;
            setJobOrders((prev) => [createdOrder, ...prev.filter((order) => order.id !== createdOrder.id)]);
            setSelectedId(createdOrder.id);
            closeWalkInModal();
        } catch (error) {
            if (error instanceof ApiError && error.status === 422) {
                setWalkInFormErrors(mapWalkInValidationErrors(error.validationErrors));
                setWalkInSubmitError('Please fix the highlighted fields and try again.');
            } else {
                setWalkInSubmitError(error instanceof Error ? error.message : 'Failed to create walk-in job order.');
            }
        } finally {
            setIsSubmittingWalkIn(false);
        }
    };

    const customerOptions = useMemo(() => {
        const normalized = customerSearch.trim().toLowerCase();
        if (!normalized) {
            return customers;
        }

        return customers.filter((customer) => {
            const fullName = customer.full_name.toLowerCase();
            const phone = (customer.phone_number ?? '').toLowerCase();

            return fullName.includes(normalized) || phone.includes(normalized);
        });
    }, [customerSearch, customers]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="h-full min-h-0 flex-1 overflow-hidden p-5">
                <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-5 overflow-hidden">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-xs font-semibold tracking-[0.18em] text-[#d4af37] uppercase">Frontdesk Workspace</p>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Manage online and walk-in job orders with full backend-connected CRUD actions.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => void loadJobOrders()}
                                className="rounded-lg border border-[#2a2a2e] px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                            >
                                Refresh
                            </button>
                            <button
                                onClick={() => setShowWalkInModal(true)}
                                className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
                            >
                                <UserRoundPlus className="h-4 w-4" /> New Walk-in Job Order
                            </button>
                        </div>
                    </div>

                    {jobOrdersError && (
                        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{jobOrdersError}</div>
                    )}
                    {actionError && (
                        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{actionError}</div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="profile-card rounded-xl p-4">
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Active Queue</p>
                            <p className="mt-2 text-3xl font-bold">{totals.active}</p>
                        </div>
                        <div className="profile-card rounded-xl p-4">
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Online Pending</p>
                            <p className="mt-2 text-3xl font-bold">{totals.onlinePending}</p>
                        </div>
                        <div className="profile-card rounded-xl p-4">
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Walk-ins Today</p>
                            <p className="mt-2 text-3xl font-bold">{totals.walkInToday}</p>
                        </div>
                        <div className="profile-card rounded-xl p-4">
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Completed Today</p>
                            <p className="mt-2 text-3xl font-bold">{totals.completedToday}</p>
                        </div>
                    </div>

                    <div className="grid min-h-0 flex-1 gap-5 overflow-hidden xl:grid-cols-[1.55fr_1fr]">
                        <div className="profile-card rounded-xl p-5">
                            <div className="mb-4 flex flex-col gap-3">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        value={searchValue}
                                        onChange={(event) => setSearchValue(event.target.value)}
                                        placeholder="Search JO number, customer, plate, source, or service"
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] pr-3 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none"
                                    />
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {(
                                        [
                                            { key: 'all', label: 'All' },
                                            { key: 'online', label: 'Online Booking' },
                                            { key: 'walkin', label: 'Walk-in' },
                                            { key: 'active', label: 'Active Queue' },
                                            { key: 'completed', label: 'Completed' },
                                        ] as Array<{ key: SegmentFilter; label: string }>
                                    ).map((item) => (
                                        <button
                                            key={item.key}
                                            onClick={() => setSegment(item.key)}
                                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                                                segment === item.key
                                                    ? 'bg-[#d4af37] text-black shadow-[0_0_12px_rgba(212,175,55,0.35)]'
                                                    : 'border border-[#2a2a2e] text-muted-foreground hover:border-[#d4af37]/40 hover:text-foreground'
                                            }`}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-xl border border-[#2a2a2e]">
                                <div className="hidden grid-cols-[1.1fr_1fr_1.3fr_1fr_0.8fr_0.8fr] border-b border-[#2a2a2e] bg-[#0d0d10] px-4 py-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase lg:grid">
                                    <span>JO / Source</span>
                                    <span>Customer</span>
                                    <span>Vehicle / Service</span>
                                    <span>Schedule</span>
                                    <span>Status</span>
                                    <span>Amount</span>
                                </div>

                                <div className="max-h-140 overflow-y-auto">
                                    {isLoadingJobOrders ? (
                                        <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" /> Loading job orders...
                                        </div>
                                    ) : filteredOrders.length === 0 ? (
                                        <div className="px-5 py-16 text-center text-sm text-muted-foreground">
                                            No job orders matched your filters.
                                        </div>
                                    ) : (
                                        filteredOrders.map((order) => {
                                            const selected = selectedOrder?.id === order.id;
                                            const amount = getEstimatedAmount(order);
                                            const status = statusMeta[order.status];

                                            return (
                                                <button
                                                    key={order.id}
                                                    onClick={() => setSelectedId(order.id)}
                                                    className={`grid w-full border-b border-[#1b1d22] px-4 py-3 text-left transition-colors last:border-b-0 lg:grid-cols-[1.1fr_1fr_1.3fr_1fr_0.8fr_0.8fr] ${
                                                        selected
                                                            ? 'bg-[#d4af37]/7 shadow-[inset_0_0_0_1px_rgba(212,175,55,0.55)]'
                                                            : 'hover:bg-[#1a1b20]/65'
                                                    }`}
                                                >
                                                    <div className="mb-2 lg:mb-0">
                                                        <p className="text-sm font-semibold">{order.jo_number}</p>
                                                        <p className="mt-1 inline-flex rounded-full border border-[#2a2a2e] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                                            {getSourceLabel(order)}
                                                        </p>
                                                    </div>

                                                    <div className="mb-2 lg:mb-0">
                                                        <p className="text-sm">{order.customer?.full_name ?? 'Unknown Customer'}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {order.customer?.phone_number ?? 'No phone on record'}
                                                        </p>
                                                    </div>

                                                    <div className="mb-2 lg:mb-0">
                                                        <p className="text-sm">{getVehicleLabel(order)}</p>
                                                        <p className="text-xs text-muted-foreground">{getServiceName(order)}</p>
                                                    </div>

                                                    <div className="mb-2 text-sm text-muted-foreground lg:mb-0">{getScheduleLabel(order)}</div>

                                                    <div className="mb-2 lg:mb-0">
                                                        <span
                                                            className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${status.className}`}
                                                        >
                                                            {status.label}
                                                        </span>
                                                    </div>

                                                    <div className="text-sm font-semibold text-[#d4af37]">{formatPeso(amount)}</div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        <aside className="profile-card min-h-0 overflow-y-auto rounded-xl p-5">
                            {selectedOrder ? (
                                <div className="flex h-full flex-col gap-4">
                                    <div>
                                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                            {selectedOrder.jo_number}
                                        </p>
                                        <h2 className="mt-2 text-xl font-bold">{selectedOrder.customer?.full_name ?? 'Unknown Customer'}</h2>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {selectedOrder.customer?.phone_number ?? 'No phone on record'}
                                        </p>
                                        <div className="mt-2 inline-flex rounded-full border border-[#2a2a2e] bg-[#0d0d10] px-2 py-0.5 text-[11px] text-muted-foreground">
                                            {getSourceLabel(selectedOrder)}
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-3">
                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center justify-between text-muted-foreground">
                                                <span className="inline-flex items-center gap-1">
                                                    <Car className="h-3.5 w-3.5" /> Vehicle
                                                </span>
                                                <span className="text-right text-foreground">{getVehicleLabel(selectedOrder)}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-muted-foreground">
                                                <span>Plate</span>
                                                <span className="text-right text-foreground">{selectedOrder.vehicle?.plate_number ?? 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-muted-foreground">
                                                <span className="inline-flex items-center gap-1">
                                                    <Wrench className="h-3.5 w-3.5" /> Service
                                                </span>
                                                <span className="text-right text-foreground">{getServiceName(selectedOrder)}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-muted-foreground">
                                                <span>Bay</span>
                                                <span className="text-right text-foreground">{selectedOrder.bay?.name ?? 'Unassigned'}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-muted-foreground">
                                                <span className="inline-flex items-center gap-1">
                                                    <Clock3 className="h-3.5 w-3.5" /> Schedule
                                                </span>
                                                <span className="text-right text-foreground">{getScheduleLabel(selectedOrder)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-3">
                                        <div className="mb-2 flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Estimated Amount</span>
                                            <span className="font-semibold text-[#d4af37]">{formatPeso(getEstimatedAmount(selectedOrder))}</span>
                                        </div>
                                        <div className="mb-2 flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Balance</span>
                                            <span className="font-semibold">{formatPeso(getBalance(selectedOrder))}</span>
                                        </div>
                                        <div className="mb-2 flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Status</span>
                                            <span className="text-foreground">{statusMeta[selectedOrder.status].label}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Updated</span>
                                            <span className="text-foreground">{formatRelativeTime(selectedOrder.updated_at)}</span>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-3">
                                        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Update Job Order</p>
                                        <div className="space-y-2">
                                            <input
                                                value={updateDraft.serviceFee}
                                                onChange={(event) => setUpdateDraft((prev) => ({ ...prev, serviceFee: event.target.value }))}
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="Service fee"
                                                className="h-9 w-full rounded-lg border border-[#2a2a2e] bg-[#13141a] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                            />
                                            <textarea
                                                value={updateDraft.notes}
                                                onChange={(event) => setUpdateDraft((prev) => ({ ...prev, notes: event.target.value }))}
                                                rows={3}
                                                placeholder="Internal notes"
                                                className="w-full rounded-lg border border-[#2a2a2e] bg-[#13141a] px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none"
                                            />
                                            {updateError && <p className="text-xs text-red-300">{updateError}</p>}
                                            <button
                                                onClick={() => void handleSaveOrderUpdate()}
                                                disabled={isSavingUpdate}
                                                className="w-full rounded-lg border border-[#2a2a2e] px-3 py-2 text-sm font-semibold transition-colors hover:border-[#d4af37]/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {isSavingUpdate ? 'Saving...' : 'Save Updates'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-3">
                                        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Notes</p>
                                        <p className="text-sm text-muted-foreground">{selectedOrder.notes ?? 'No notes provided.'}</p>
                                    </div>

                                    <button
                                        disabled={selectedPrimaryAction === 'none' || isProcessingAction}
                                        onClick={() => void handlePrimaryAction()}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                                    >
                                        {selectedPrimaryAction === 'none' ? (
                                            <CheckCircle2 className="h-4 w-4" />
                                        ) : (
                                            <ShieldCheck className="h-4 w-4" />
                                        )}
                                        {isProcessingAction ? 'Processing...' : getPrimaryActionLabel(selectedPrimaryAction)}
                                    </button>

                                    {canCancel(selectedOrder.status) && (
                                        <button
                                            onClick={() => void handleCancelJobOrder()}
                                            disabled={isProcessingAction}
                                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-300 transition-colors hover:border-rose-400/45 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <XCircle className="h-4 w-4" /> Cancel Job Order
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[#2a2a2e] p-6 text-sm text-muted-foreground">
                                    Select a job order to inspect details.
                                </div>
                            )}
                        </aside>
                    </div>
                </div>
            </div>

            {showWalkInModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={closeWalkInModal}>
                    <div className="profile-card w-full max-w-3xl rounded-xl p-5" onClick={(event) => event.stopPropagation()}>
                        <h3 className="text-lg font-semibold">Create Walk-in Job Order</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Select an existing customer/vehicle or create them inline before creating the walk-in order.
                        </p>

                        <form onSubmit={handleCreateWalkInJobOrder} className="mt-4 space-y-4">
                            <div className="rounded-lg border border-[#2a2a2e] p-3">
                                <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Customer</p>
                                <div className="mb-3 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setWalkInForm((prev) => ({
                                                ...prev,
                                                customerMode: 'existing',
                                            }))
                                        }
                                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                                            walkInForm.customerMode === 'existing'
                                                ? 'bg-[#d4af37] text-black'
                                                : 'border border-[#2a2a2e] text-muted-foreground'
                                        }`}
                                    >
                                        Existing Customer
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setWalkInForm((prev) => ({
                                                ...prev,
                                                customerMode: 'new',
                                                existingCustomerId: '',
                                                vehicleMode: 'new',
                                                existingVehicleId: '',
                                            }))
                                        }
                                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                                            walkInForm.customerMode === 'new'
                                                ? 'bg-[#d4af37] text-black'
                                                : 'border border-[#2a2a2e] text-muted-foreground'
                                        }`}
                                    >
                                        New Customer
                                    </button>
                                </div>

                                {walkInForm.customerMode === 'existing' ? (
                                    <div className="space-y-2">
                                        <input
                                            value={customerSearch}
                                            onChange={(event) => setCustomerSearch(event.target.value)}
                                            placeholder="Search customer by name or phone"
                                            className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                        />
                                        <select
                                            value={walkInForm.existingCustomerId}
                                            onChange={(event) =>
                                                setWalkInForm((prev) => ({
                                                    ...prev,
                                                    existingCustomerId: event.target.value,
                                                    existingVehicleId: '',
                                                }))
                                            }
                                            className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                        >
                                            <option value="">Select customer</option>
                                            {customerOptions.map((customer) => (
                                                <option key={customer.id} value={customer.id}>
                                                    {customer.full_name} {customer.phone_number ? `- ${customer.phone_number}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        {walkInFormErrors.existingCustomerId && (
                                            <p className="text-xs text-red-300">{walkInFormErrors.existingCustomerId}</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div>
                                            <input
                                                value={walkInForm.newCustomerFirstName}
                                                onChange={(event) => setWalkInForm((prev) => ({ ...prev, newCustomerFirstName: event.target.value }))}
                                                placeholder="First name"
                                                required
                                                className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                            />
                                            {walkInFormErrors.newCustomerFirstName && (
                                                <p className="mt-1 text-xs text-red-300">{walkInFormErrors.newCustomerFirstName}</p>
                                            )}
                                        </div>
                                        <div>
                                            <input
                                                value={walkInForm.newCustomerLastName}
                                                onChange={(event) => setWalkInForm((prev) => ({ ...prev, newCustomerLastName: event.target.value }))}
                                                placeholder="Last name"
                                                required
                                                className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                            />
                                            {walkInFormErrors.newCustomerLastName && (
                                                <p className="mt-1 text-xs text-red-300">{walkInFormErrors.newCustomerLastName}</p>
                                            )}
                                        </div>
                                        <div>
                                            <input
                                                value={walkInForm.newCustomerPhone}
                                                onChange={(event) => setWalkInForm((prev) => ({ ...prev, newCustomerPhone: event.target.value }))}
                                                placeholder="Phone number"
                                                required
                                                className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                            />
                                            {walkInFormErrors.newCustomerPhone && (
                                                <p className="mt-1 text-xs text-red-300">{walkInFormErrors.newCustomerPhone}</p>
                                            )}
                                        </div>
                                        <div>
                                            <input
                                                value={walkInForm.newCustomerEmail}
                                                onChange={(event) => setWalkInForm((prev) => ({ ...prev, newCustomerEmail: event.target.value }))}
                                                placeholder="Email (optional)"
                                                type="email"
                                                className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                            />
                                            {walkInFormErrors.newCustomerEmail && (
                                                <p className="mt-1 text-xs text-red-300">{walkInFormErrors.newCustomerEmail}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="rounded-lg border border-[#2a2a2e] p-3">
                                <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Vehicle</p>
                                <div className="mb-3 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setWalkInForm((prev) => ({
                                                ...prev,
                                                vehicleMode: 'existing',
                                            }))
                                        }
                                        disabled={walkInForm.customerMode === 'new'}
                                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                                            walkInForm.vehicleMode === 'existing'
                                                ? 'bg-[#d4af37] text-black'
                                                : 'border border-[#2a2a2e] text-muted-foreground'
                                        } disabled:cursor-not-allowed disabled:opacity-45`}
                                    >
                                        Existing Vehicle
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setWalkInForm((prev) => ({
                                                ...prev,
                                                vehicleMode: 'new',
                                                existingVehicleId: '',
                                            }))
                                        }
                                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                                            walkInForm.vehicleMode === 'new'
                                                ? 'bg-[#d4af37] text-black'
                                                : 'border border-[#2a2a2e] text-muted-foreground'
                                        }`}
                                    >
                                        New Vehicle
                                    </button>
                                </div>

                                {walkInForm.vehicleMode === 'existing' && walkInForm.customerMode === 'existing' ? (
                                    <div className="space-y-2">
                                        <select
                                            value={walkInForm.existingVehicleId}
                                            onChange={(event) => setWalkInForm((prev) => ({ ...prev, existingVehicleId: event.target.value }))}
                                            className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                        >
                                            <option value="">Select vehicle</option>
                                            {vehicles.map((vehicle) => (
                                                <option key={vehicle.id} value={vehicle.id}>
                                                    {vehicle.make} {vehicle.model} {vehicle.year} - {vehicle.plate_number}
                                                </option>
                                            ))}
                                        </select>
                                        {walkInFormErrors.existingVehicleId && (
                                            <p className="text-xs text-red-300">{walkInFormErrors.existingVehicleId}</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div>
                                            <input
                                                value={walkInForm.vehicleMake}
                                                onChange={(event) => setWalkInForm((prev) => ({ ...prev, vehicleMake: event.target.value }))}
                                                placeholder="Vehicle make"
                                                required={walkInForm.vehicleMode === 'new'}
                                                className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                            />
                                            {walkInFormErrors.vehicleMake && (
                                                <p className="mt-1 text-xs text-red-300">{walkInFormErrors.vehicleMake}</p>
                                            )}
                                        </div>
                                        <div>
                                            <input
                                                value={walkInForm.vehicleModel}
                                                onChange={(event) => setWalkInForm((prev) => ({ ...prev, vehicleModel: event.target.value }))}
                                                placeholder="Vehicle model"
                                                required={walkInForm.vehicleMode === 'new'}
                                                className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                            />
                                            {walkInFormErrors.vehicleModel && (
                                                <p className="mt-1 text-xs text-red-300">{walkInFormErrors.vehicleModel}</p>
                                            )}
                                        </div>
                                        <div>
                                            <input
                                                value={walkInForm.vehicleYear}
                                                onChange={(event) => setWalkInForm((prev) => ({ ...prev, vehicleYear: event.target.value }))}
                                                placeholder="Vehicle year"
                                                type="number"
                                                min="1900"
                                                max={new Date().getFullYear() + 1}
                                                required={walkInForm.vehicleMode === 'new'}
                                                className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                            />
                                            {walkInFormErrors.vehicleYear && (
                                                <p className="mt-1 text-xs text-red-300">{walkInFormErrors.vehicleYear}</p>
                                            )}
                                        </div>
                                        <div>
                                            <input
                                                value={walkInForm.vehiclePlateNumber}
                                                onChange={(event) =>
                                                    setWalkInForm((prev) => ({ ...prev, vehiclePlateNumber: event.target.value.toUpperCase() }))
                                                }
                                                placeholder="Plate number"
                                                required={walkInForm.vehicleMode === 'new'}
                                                className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                            />
                                            {walkInFormErrors.vehiclePlateNumber && (
                                                <p className="mt-1 text-xs text-red-300">{walkInFormErrors.vehiclePlateNumber}</p>
                                            )}
                                        </div>
                                        <div className="md:col-span-2">
                                            <input
                                                value={walkInForm.vehicleColor}
                                                onChange={(event) => setWalkInForm((prev) => ({ ...prev, vehicleColor: event.target.value }))}
                                                placeholder="Vehicle color (optional)"
                                                className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                            />
                                            {walkInFormErrors.vehicleColor && (
                                                <p className="mt-1 text-xs text-red-300">{walkInFormErrors.vehicleColor}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                    <select
                                        value={walkInForm.serviceTemplateId}
                                        onChange={(event) => {
                                            const selectedTemplate = serviceOptions.find(
                                                (service) => service.id === Number.parseInt(event.target.value, 10),
                                            );

                                            setWalkInForm((prev) => ({
                                                ...prev,
                                                serviceTemplateId: event.target.value,
                                                serviceName: selectedTemplate?.name ?? prev.serviceName,
                                                estimatedAmount: selectedTemplate ? selectedTemplate.price_fixed.toString() : prev.estimatedAmount,
                                            }));
                                        }}
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                    >
                                        <option value="">Select service template (optional)</option>
                                        {serviceOptions.map((service) => (
                                            <option key={service.id} value={service.id}>
                                                {service.name} - {formatPeso(service.price_fixed)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <input
                                        value={walkInForm.estimatedAmount}
                                        onChange={(event) => setWalkInForm((prev) => ({ ...prev, estimatedAmount: event.target.value }))}
                                        placeholder="Estimated amount"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                    />
                                    {walkInFormErrors.estimatedAmount && (
                                        <p className="mt-1 text-xs text-red-300">{walkInFormErrors.estimatedAmount}</p>
                                    )}
                                </div>
                                <div className="md:col-span-2">
                                    <input
                                        value={walkInForm.serviceName}
                                        onChange={(event) => setWalkInForm((prev) => ({ ...prev, serviceName: event.target.value }))}
                                        placeholder="Requested service (shown in notes)"
                                        required
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                    />
                                </div>
                            </div>

                            <textarea
                                value={walkInForm.notes}
                                onChange={(event) => setWalkInForm((prev) => ({ ...prev, notes: event.target.value }))}
                                placeholder="Additional notes"
                                rows={3}
                                className="w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none"
                            />

                            {isLoadingWalkInLookups && (
                                <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading customer and service references...
                                </div>
                            )}

                            {walkInSubmitError && <p className="text-sm text-red-300">{walkInSubmitError}</p>}

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={closeWalkInModal}
                                    className="rounded-lg border border-[#2a2a2e] px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingWalkIn}
                                    className="rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isSubmittingWalkIn ? 'Creating...' : 'Create Job Order'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showStartModal && selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowStartModal(false)}>
                    <div className="profile-card w-full max-w-lg rounded-xl p-5" onClick={(event) => event.stopPropagation()}>
                        <h3 className="text-lg font-semibold">Start Service</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Assign a mechanic and bay before moving this job order to In Progress.</p>

                        <form onSubmit={handleStartJobOrder} className="mt-4 space-y-3">
                            <select
                                value={startForm.mechanicId}
                                onChange={(event) => setStartForm((prev) => ({ ...prev, mechanicId: event.target.value }))}
                                className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                            >
                                <option value="">Select mechanic</option>
                                {mechanics.map((mechanic) => (
                                    <option key={mechanic.id} value={mechanic.id}>
                                        {mechanic.name ?? `Mechanic #${mechanic.id}`} - {mechanic.specialization ?? 'General'}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={startForm.bayId}
                                onChange={(event) => setStartForm((prev) => ({ ...prev, bayId: event.target.value }))}
                                className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                            >
                                <option value="">Select bay</option>
                                {bays.map((bay) => (
                                    <option key={bay.id} value={bay.id}>
                                        {bay.name}
                                    </option>
                                ))}
                            </select>

                            {isLoadingStartLookups && (
                                <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading mechanics and bays...
                                </div>
                            )}

                            {startSubmitError && <p className="text-sm text-red-300">{startSubmitError}</p>}

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowStartModal(false)}
                                    className="rounded-lg border border-[#2a2a2e] px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingStart}
                                    className="rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isSubmittingStart ? 'Starting...' : 'Start Service'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showSettleModal && selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowSettleModal(false)}>
                    <div className="profile-card w-full max-w-lg rounded-xl p-5" onClick={(event) => event.stopPropagation()}>
                        <h3 className="text-lg font-semibold">Settle Job Order</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Optionally provide an invoice ID while settling this completed order.</p>

                        <form onSubmit={handleSettleJobOrder} className="mt-4 space-y-3">
                            <input
                                value={settleInvoiceId}
                                onChange={(event) => setSettleInvoiceId(event.target.value)}
                                placeholder="Invoice ID (optional)"
                                className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                            />

                            {settleSubmitError && <p className="text-sm text-red-300">{settleSubmitError}</p>}

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowSettleModal(false)}
                                    className="rounded-lg border border-[#2a2a2e] px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingSettle}
                                    className="rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isSubmittingSettle ? 'Settling...' : 'Confirm Settlement'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
