import { formatPeso } from '@/lib/jobOrderFormatters';
import { flattenValidationErrors } from '@/lib/validation-errors';
import { ApiError } from '@/services/api';
import { jobOrderService } from '@/services/jobOrderService';
import { useToast } from '@/components/ui/toast';
import type { CustomerProfile, ServiceCatalogItem, Vehicle } from '@/types/customer';
import { Loader2 } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

type WalkInCustomerMode = 'existing' | 'new';
type WalkInVehicleMode = 'existing' | 'new';

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
        if (mappedField) acc[mappedField] = message;
        return acc;
    }, {});
}

interface Props {
    open: boolean;
    onClose: () => void;
    onOrderCreated: (orderId: number) => void;
    initialCustomerId?: number | null;
}

export default function WalkInModal({ open, onClose, onOrderCreated, initialCustomerId }: Props) {
    const { success, error: toastError } = useToast();
    const [form, setForm] = useState<WalkInFormState>(initialWalkInForm);
    const [formErrors, setFormErrors] = useState<WalkInFormErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [customers, setCustomers] = useState<CustomerProfile[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [serviceOptions, setServiceOptions] = useState<ServiceCatalogItem[]>([]);
    const [isLoadingLookups, setIsLoadingLookups] = useState(false);
    const [arrivalDate, setArrivalDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [arrivalTime, setArrivalTime] = useState('');
    const [timeSlots, setTimeSlots] = useState<
        Array<{ time: string; label: string; status: string; slots_left: number; capacity: number; booked: number }>
    >([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);

    const loadLookups = useCallback(async (search = '') => {
        try {
            setIsLoadingLookups(true);
            const [customersResponse, servicesResponse] = await Promise.all([
                jobOrderService.getCustomers({ search: search || undefined, per_page: 100 }),
                jobOrderService.getServices({ per_page: 100 }),
            ]);
            setCustomers(customersResponse.data.data);
            setServiceOptions(servicesResponse.data.data);
        } catch {
            setCustomers([]);
            setServiceOptions([]);
        } finally {
            setIsLoadingLookups(false);
        }
    }, []);

    useEffect(() => {
        if (!open) return;
        loadLookups(customerSearch.trim());
    }, [open, customerSearch, loadLookups]);

    const loadVehicles = useCallback(async (customerId: number) => {
        try {
            const response = await jobOrderService.getVehiclesForCustomer(customerId);
            setVehicles(response.data);
        } catch {
            setVehicles([]);
        }
    }, []);

    useEffect(() => {
        if (!open || form.customerMode !== 'existing') {
            setVehicles([]);
            return;
        }
        const customerId = Number.parseInt(form.existingCustomerId, 10);
        if (!Number.isFinite(customerId) || customerId <= 0) {
            setVehicles([]);
            return;
        }
        loadVehicles(customerId);
    }, [open, form.customerMode, form.existingCustomerId, loadVehicles]);

    // Pre-fill customer when navigated from customers page
    useEffect(() => {
        if (!open || !initialCustomerId) return;
        setForm((prev) => ({
            ...prev,
            customerMode: 'existing',
            existingCustomerId: String(initialCustomerId),
        }));
        setCustomerSearch('');
        loadVehicles(initialCustomerId);
    }, [open, initialCustomerId, loadVehicles]);

    const loadTimeSlots = useCallback(async (date: string) => {
        setIsLoadingSlots(true);
        try {
            const response = await jobOrderService.getSlotAvailability(date);
            setTimeSlots(response.data.slots ?? []);
        } catch {
            setTimeSlots([]);
        } finally {
            setIsLoadingSlots(false);
        }
    }, []);

    useEffect(() => {
        if (!open) return;
        loadTimeSlots(arrivalDate);
    }, [open, arrivalDate, loadTimeSlots]);

    const customerOptions = useMemo(() => {
        const normalized = customerSearch.trim().toLowerCase();
        if (!normalized) return customers;
        return customers.filter((c) => {
            const fullName = c.full_name.toLowerCase();
            const phone = (c.phone_number ?? '').toLowerCase();
            return fullName.includes(normalized) || phone.includes(normalized);
        });
    }, [customerSearch, customers]);

    const close = () => {
        onClose();
        setSubmitError(null);
        setFormErrors({});
        setForm(initialWalkInForm);
        setCustomerSearch('');
        setVehicles([]);
        setArrivalDate(new Date().toISOString().split('T')[0]);
        setArrivalTime('');
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setFormErrors({});
        setSubmitError(null);
        setIsSubmitting(true);

        try {
            let customerId: number;
            if (form.customerMode === 'existing') {
                customerId = Number.parseInt(form.existingCustomerId, 10);
                if (!Number.isFinite(customerId) || customerId <= 0) {
                    setFormErrors((prev) => ({ ...prev, existingCustomerId: 'Select an existing customer.' }));
                    return;
                }
            } else {
                const resp = await jobOrderService.createCustomer({
                    first_name: form.newCustomerFirstName.trim(),
                    last_name: form.newCustomerLastName.trim(),
                    phone_number: form.newCustomerPhone.trim(),
                    email: form.newCustomerEmail.trim() || null,
                });
                customerId = resp.data.id;
            }

            let vehicleId: number;
            if (form.vehicleMode === 'existing') {
                vehicleId = Number.parseInt(form.existingVehicleId, 10);
                if (!Number.isFinite(vehicleId) || vehicleId <= 0) {
                    setFormErrors((prev) => ({ ...prev, existingVehicleId: 'Select an existing vehicle.' }));
                    return;
                }
            } else {
                const parsedYear = Number.parseInt(form.vehicleYear, 10);
                if (!Number.isFinite(parsedYear)) {
                    setFormErrors((prev) => ({ ...prev, vehicleYear: 'Provide a valid vehicle year.' }));
                    return;
                }
                const resp = await jobOrderService.createVehicleForCustomer(customerId, {
                    make: form.vehicleMake.trim(),
                    model: form.vehicleModel.trim(),
                    year: parsedYear,
                    plate_number: form.vehiclePlateNumber.trim(),
                    color: form.vehicleColor.trim() || undefined,
                });
                vehicleId = resp.data.id;
            }

            const parsedAmount = Number.parseFloat(form.estimatedAmount);
            const serviceFee = Number.isFinite(parsedAmount) && parsedAmount >= 0 ? parsedAmount : 0;
            const notesParts = [form.serviceName.trim() ? `Service Request: ${form.serviceName.trim()}` : null, form.notes.trim() || null].filter(
                Boolean,
            );

            const createResponse = await jobOrderService.createJobOrder({
                customer_id: customerId,
                vehicle_id: vehicleId,
                arrival_date: arrivalDate,
                arrival_time: arrivalTime || '08:00',
                service_fee: serviceFee,
                notes: notesParts.length > 0 ? notesParts.join(' | ') : null,
            });

            const createdOrder = createResponse.data;
            onOrderCreated(createdOrder.id);
            success('Walk-in job order created.');
            close();
        } catch (error) {
            if (error instanceof ApiError && error.status === 422) {
                setFormErrors(mapWalkInValidationErrors(error.validationErrors));
                setSubmitError('Please fix the highlighted fields and try again.');
                toastError('Please fix the highlighted fields and try again.');
            } else {
                const message = error instanceof Error ? error.message : 'Failed to create walk-in job order.';
                setSubmitError(message);
                toastError(message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={close}>
            <div className="profile-card max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl p-5" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold">Create Walk-in Job Order</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Select an existing customer/vehicle or create them inline before creating the walk-in order.
                </p>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    {/* Service date & time */}
                    <div className="rounded-lg border border-[#2a2a2e] p-3">
                        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Service Schedule</p>
                        <div className="grid gap-3 md:grid-cols-2">
                            <div>
                                <label className="text-[10px] font-semibold text-muted-foreground">Date</label>
                                <input
                                    type="date"
                                    value={arrivalDate}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => {
                                        setArrivalDate(e.target.value);
                                        setArrivalTime('');
                                    }}
                                    className="mt-1 h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold text-muted-foreground">Time Slot</label>
                                {isLoadingSlots ? (
                                    <div className="mt-1 flex h-10 items-center gap-2 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm text-muted-foreground">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading slots...
                                    </div>
                                ) : timeSlots.length === 0 ? (
                                    <div className="mt-1 flex h-10 items-center rounded-lg border border-dashed border-[#2a2a2e] bg-[#0d0d10] px-3 text-xs text-muted-foreground">
                                        No slots configured
                                    </div>
                                ) : (
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                        {timeSlots.map((slot) => {
                                            const isFull = slot.status === 'full';
                                            const isSelected = arrivalTime === slot.time;
                                            return (
                                                <button
                                                    key={slot.time}
                                                    type="button"
                                                    disabled={isFull}
                                                    onClick={() => setArrivalTime(slot.time)}
                                                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                                        isSelected
                                                            ? 'border-[#d4af37] bg-[#d4af37]/10 text-[#d4af37]'
                                                            : isFull
                                                              ? 'cursor-not-allowed border-[#2a2a2e] bg-[#0d0d10] text-muted-foreground/40 line-through'
                                                              : 'border-[#2a2a2e] bg-[#0d0d10] text-muted-foreground hover:border-[#d4af37]/40 hover:text-foreground'
                                                    }`}
                                                >
                                                    {slot.label}
                                                    <span className="ml-1 text-[10px] opacity-70">({slot.slots_left} left)</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                {arrivalTime && (
                                    <p className="mt-1 text-[10px] text-[#d4af37]">
                                        {(() => {
                                            const selected = timeSlots.find((s) => s.time === arrivalTime);
                                            return selected ? `${selected.slots_left} slot(s) available out of ${selected.capacity}` : '';
                                        })()}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Customer section */}
                    <div className="rounded-lg border border-[#2a2a2e] p-3">
                        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Customer</p>
                        <div className="mb-3 flex gap-2">
                            <button
                                type="button"
                                onClick={() => setForm((prev) => ({ ...prev, customerMode: 'existing' }))}
                                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${form.customerMode === 'existing' ? 'bg-[#d4af37] text-black' : 'border border-[#2a2a2e] text-muted-foreground'}`}
                            >
                                Existing Customer
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setForm((prev) => ({
                                        ...prev,
                                        customerMode: 'new',
                                        existingCustomerId: '',
                                        vehicleMode: 'new',
                                        existingVehicleId: '',
                                    }))
                                }
                                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${form.customerMode === 'new' ? 'bg-[#d4af37] text-black' : 'border border-[#2a2a2e] text-muted-foreground'}`}
                            >
                                New Customer
                            </button>
                        </div>
                        {form.customerMode === 'existing' ? (
                            <div className="space-y-2">
                                <input
                                    value={customerSearch}
                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                    placeholder="Search customer by name or phone"
                                    className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                />
                                <select
                                    value={form.existingCustomerId}
                                    onChange={(e) => setForm((prev) => ({ ...prev, existingCustomerId: e.target.value, existingVehicleId: '' }))}
                                    className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                >
                                    <option value="">Select customer</option>
                                    {customerOptions.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.full_name} {c.phone_number ? `- ${c.phone_number}` : ''}
                                        </option>
                                    ))}
                                </select>
                                {formErrors.existingCustomerId && <p className="text-xs text-red-300">{formErrors.existingCustomerId}</p>}
                            </div>
                        ) : (
                            <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                    <input
                                        value={form.newCustomerFirstName}
                                        onChange={(e) => setForm((prev) => ({ ...prev, newCustomerFirstName: e.target.value }))}
                                        placeholder="First name"
                                        required
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                    />
                                    {formErrors.newCustomerFirstName && (
                                        <p className="mt-1 text-xs text-red-300">{formErrors.newCustomerFirstName}</p>
                                    )}
                                </div>
                                <div>
                                    <input
                                        value={form.newCustomerLastName}
                                        onChange={(e) => setForm((prev) => ({ ...prev, newCustomerLastName: e.target.value }))}
                                        placeholder="Last name"
                                        required
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                    />
                                    {formErrors.newCustomerLastName && <p className="mt-1 text-xs text-red-300">{formErrors.newCustomerLastName}</p>}
                                </div>
                                <div>
                                    <input
                                        value={form.newCustomerPhone}
                                        onChange={(e) => setForm((prev) => ({ ...prev, newCustomerPhone: e.target.value }))}
                                        placeholder="Phone number"
                                        required
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                    />
                                    {formErrors.newCustomerPhone && <p className="mt-1 text-xs text-red-300">{formErrors.newCustomerPhone}</p>}
                                </div>
                                <div>
                                    <input
                                        value={form.newCustomerEmail}
                                        onChange={(e) => setForm((prev) => ({ ...prev, newCustomerEmail: e.target.value }))}
                                        placeholder="Email (optional)"
                                        type="email"
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                    />
                                    {formErrors.newCustomerEmail && <p className="mt-1 text-xs text-red-300">{formErrors.newCustomerEmail}</p>}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Vehicle section */}
                    <div className="rounded-lg border border-[#2a2a2e] p-3">
                        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Vehicle</p>
                        <div className="mb-3 flex gap-2">
                            <button
                                type="button"
                                onClick={() => setForm((prev) => ({ ...prev, vehicleMode: 'existing' }))}
                                disabled={form.customerMode === 'new'}
                                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${form.vehicleMode === 'existing' ? 'bg-[#d4af37] text-black' : 'border border-[#2a2a2e] text-muted-foreground'} disabled:cursor-not-allowed disabled:opacity-45`}
                            >
                                Existing Vehicle
                            </button>
                            <button
                                type="button"
                                onClick={() => setForm((prev) => ({ ...prev, vehicleMode: 'new', existingVehicleId: '' }))}
                                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${form.vehicleMode === 'new' ? 'bg-[#d4af37] text-black' : 'border border-[#2a2a2e] text-muted-foreground'}`}
                            >
                                New Vehicle
                            </button>
                        </div>
                        {form.vehicleMode === 'existing' && form.customerMode === 'existing' ? (
                            <div className="space-y-2">
                                <select
                                    value={form.existingVehicleId}
                                    onChange={(e) => setForm((prev) => ({ ...prev, existingVehicleId: e.target.value }))}
                                    className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                >
                                    <option value="">Select vehicle</option>
                                    {vehicles.map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {v.make} {v.model} {v.year} - {v.plate_number}
                                        </option>
                                    ))}
                                </select>
                                {formErrors.existingVehicleId && <p className="text-xs text-red-300">{formErrors.existingVehicleId}</p>}
                            </div>
                        ) : (
                            <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                    <input
                                        value={form.vehicleMake}
                                        onChange={(e) => setForm((prev) => ({ ...prev, vehicleMake: e.target.value }))}
                                        placeholder="Vehicle make"
                                        required={form.vehicleMode === 'new'}
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                    />
                                    {formErrors.vehicleMake && <p className="mt-1 text-xs text-red-300">{formErrors.vehicleMake}</p>}
                                </div>
                                <div>
                                    <input
                                        value={form.vehicleModel}
                                        onChange={(e) => setForm((prev) => ({ ...prev, vehicleModel: e.target.value }))}
                                        placeholder="Vehicle model"
                                        required={form.vehicleMode === 'new'}
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                    />
                                    {formErrors.vehicleModel && <p className="mt-1 text-xs text-red-300">{formErrors.vehicleModel}</p>}
                                </div>
                                <div>
                                    <input
                                        value={form.vehicleYear}
                                        onChange={(e) => setForm((prev) => ({ ...prev, vehicleYear: e.target.value }))}
                                        placeholder="Vehicle year"
                                        type="number"
                                        min="1900"
                                        max={new Date().getFullYear() + 1}
                                        required={form.vehicleMode === 'new'}
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                    />
                                    {formErrors.vehicleYear && <p className="mt-1 text-xs text-red-300">{formErrors.vehicleYear}</p>}
                                </div>
                                <div>
                                    <input
                                        value={form.vehiclePlateNumber}
                                        onChange={(e) => setForm((prev) => ({ ...prev, vehiclePlateNumber: e.target.value.toUpperCase() }))}
                                        placeholder="Plate number"
                                        required={form.vehicleMode === 'new'}
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                    />
                                    {formErrors.vehiclePlateNumber && <p className="mt-1 text-xs text-red-300">{formErrors.vehiclePlateNumber}</p>}
                                </div>
                                <div className="md:col-span-2">
                                    <input
                                        value={form.vehicleColor}
                                        onChange={(e) => setForm((prev) => ({ ...prev, vehicleColor: e.target.value }))}
                                        placeholder="Vehicle color (optional)"
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                    />
                                    {formErrors.vehicleColor && <p className="mt-1 text-xs text-red-300">{formErrors.vehicleColor}</p>}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Service / Amount */}
                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <select
                                value={form.serviceTemplateId}
                                onChange={(e) => {
                                    const selected = serviceOptions.find((s) => s.id === Number.parseInt(e.target.value, 10));
                                    setForm((prev) => ({
                                        ...prev,
                                        serviceTemplateId: e.target.value,
                                        serviceName: selected?.name ?? prev.serviceName,
                                        estimatedAmount: selected ? selected.price_fixed.toString() : prev.estimatedAmount,
                                    }));
                                }}
                                className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                            >
                                <option value="">Select service template (optional)</option>
                                {serviceOptions.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} - {formatPeso(s.price_fixed)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <input
                                value={form.estimatedAmount}
                                onChange={(e) => setForm((prev) => ({ ...prev, estimatedAmount: e.target.value }))}
                                placeholder="Estimated amount"
                                type="number"
                                min="0"
                                step="0.01"
                                className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                            />
                            {formErrors.estimatedAmount && <p className="mt-1 text-xs text-red-300">{formErrors.estimatedAmount}</p>}
                        </div>
                        <div className="md:col-span-2">
                            <input
                                value={form.serviceName}
                                onChange={(e) => setForm((prev) => ({ ...prev, serviceName: e.target.value }))}
                                placeholder="Requested service (shown in notes)"
                                required
                                className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                            />
                        </div>
                    </div>

                    <textarea
                        value={form.notes}
                        onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                        placeholder="Additional notes"
                        rows={3}
                        className="w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none"
                    />

                    {isLoadingLookups && (
                        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading customer and service references...
                        </div>
                    )}
                    {submitError && <p className="text-sm text-red-300">{submitError}</p>}

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={close}
                            className="rounded-lg border border-[#2a2a2e] px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Job Order'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
