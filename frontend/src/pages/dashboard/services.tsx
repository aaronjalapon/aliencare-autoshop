import AppLayout from '@/components/layout/app-layout';
import { flattenValidationErrors } from '@/lib/validation-errors';
import { ApiError } from '@/services/api';
import { inventoryService } from '@/services/inventoryService';
import { ServiceCatalogMutationPayload, serviceCatalogService } from '@/services/serviceCatalogService';
import { type BreadcrumbItem } from '@/types';
import { type ServiceCatalogItem } from '@/types/customer';
import { type InventoryItem } from '@/types/inventory';
import { AlertCircle, Check, Loader2, PencilLine, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Services', href: '/services' }];

type ServiceCategory = 'maintenance' | 'cleaning' | 'repair';
type CategoryFilter = ServiceCategory | 'all';
type FormMode = 'create' | 'edit';

interface ServiceFormState {
    name: string;
    category: ServiceCategory;
    description: string;
    priceLabel: string;
    priceFixed: string;
    duration: string;
    estimatedDuration: string;
    queueLabel: string;
    rating: string;
    ratingCount: string;
    featuresText: string;
    selectedIncludeItems: SelectedItem[];
    recommended: boolean;
    recommendedNote: string;
    isActive: boolean;
}

type ServiceFormErrors = Partial<Record<keyof ServiceFormState, string>>;

type SelectedItem = Pick<InventoryItem, 'item_id' | 'item_name' | 'sku' | 'unit_price' | 'stock'>;

const categoryOptions: Array<{ value: ServiceCategory; label: string }> = [
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'cleaning', label: 'Cleaning' },
    { value: 'repair', label: 'Repair' },
];

const initialFormState: ServiceFormState = {
    name: '',
    category: 'maintenance',
    description: '',
    priceLabel: '',
    priceFixed: '',
    duration: '',
    estimatedDuration: '',
    queueLabel: '',
    rating: '0',
    ratingCount: '0',
    featuresText: '',
    selectedIncludeItems: [],
    recommended: false,
    recommendedNote: '',
    isActive: true,
};

function formatCategory(category: ServiceCategory): string {
    return categoryOptions.find((option) => option.value === category)?.label ?? 'Maintenance';
}

function toLineList(value: string): string[] {
    return Array.from(
        new Set(
            value
                .split(/\n|,/)
                .map((item) => item.trim())
                .filter(Boolean),
        ),
    );
}

function toFormState(service: ServiceCatalogItem): ServiceFormState {
    return {
        name: service.name,
        category: service.category,
        description: service.description ?? '',
        priceLabel: service.price_label,
        priceFixed: service.price_fixed.toString(),
        duration: service.duration,
        estimatedDuration: service.estimated_duration,
        queueLabel: service.queue_label ?? '',
        rating: service.rating.toString(),
        ratingCount: service.rating_count.toString(),
        featuresText: service.features.join('\n'),
        selectedIncludeItems: [],
        recommended: service.recommended,
        recommendedNote: service.recommended_note ?? '',
        isActive: service.is_active,
    };
}

const apiFieldToFormField: Record<string, keyof ServiceFormState> = {
    name: 'name',
    category: 'category',
    description: 'description',
    price_label: 'priceLabel',
    price_fixed: 'priceFixed',
    duration: 'duration',
    estimated_duration: 'estimatedDuration',
    queue_label: 'queueLabel',
    rating: 'rating',
    rating_count: 'ratingCount',
    features: 'featuresText',
    recommended: 'recommended',
    recommended_note: 'recommendedNote',
    is_active: 'isActive',
};

function mapValidationErrors(validationErrors?: Record<string, string[]>): ServiceFormErrors {
    const flatErrors = flattenValidationErrors(validationErrors);

    return Object.entries(flatErrors).reduce<ServiceFormErrors>((acc, [field, message]) => {
        const mappedField = apiFieldToFormField[field];
        if (mappedField) {
            acc[mappedField] = message;
        }

        return acc;
    }, {});
}

function toMutationPayload(form: ServiceFormState): ServiceCatalogMutationPayload {
    const parsedPrice = Number.parseFloat(form.priceFixed);
    const parsedRating = Number.parseFloat(form.rating);
    const parsedRatingCount = Number.parseInt(form.ratingCount, 10);

    return {
        name: form.name.trim(),
        category: form.category,
        description: form.description.trim() || null,
        price_label: form.priceLabel.trim(),
        price_fixed: Number.isFinite(parsedPrice) ? parsedPrice : 0,
        duration: form.duration.trim(),
        estimated_duration: form.estimatedDuration.trim(),
        queue_label: form.queueLabel.trim() || null,
        recommended: form.recommended,
        recommended_note: form.recommended ? form.recommendedNote.trim() || null : null,
        is_active: form.isActive,
        features: toLineList(form.featuresText),
        includes: form.selectedIncludeItems.map((i) => i.item_name),
        rating: Number.isFinite(parsedRating) ? parsedRating : 0,
        rating_count: Number.isFinite(parsedRatingCount) ? parsedRatingCount : 0,
    };
}

export default function Services() {
    const [services, setServices] = useState<ServiceCatalogItem[]>([]);
    const [isLoadingServices, setIsLoadingServices] = useState(true);
    const [servicesError, setServicesError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
    const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);

    const [showFormModal, setShowFormModal] = useState(false);
    const [formMode, setFormMode] = useState<FormMode>('create');
    const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
    const [formState, setFormState] = useState<ServiceFormState>(initialFormState);
    const [formErrors, setFormErrors] = useState<ServiceFormErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState<ServiceCatalogItem | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [isDeactivating, setIsDeactivating] = useState(false);

    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [includesSearchTerm, setIncludesSearchTerm] = useState('');

    const loadInventory = useCallback(async () => {
        try {
            const response = await inventoryService.getInventoryItems({ per_page: 200 });
            setInventoryItems(
                (response.data.data ?? []).filter(
                    (item) => item.status === 'active' && item.stock > 0,
                ),
            );
        } catch {
            setInventoryItems([]);
        }
    }, []);

    useEffect(() => {
        void loadInventory();
    }, [loadInventory]);

    const matchIncludesToInventory = useCallback(
        (includes: string[]): SelectedItem[] =>
            includes.map((name) => {
                const match = inventoryItems.find(
                    (inv) => inv.item_name.toLowerCase() === name.toLowerCase(),
                );
                if (match) {
                    return {
                        item_id: match.item_id,
                        item_name: match.item_name,
                        sku: match.sku,
                        unit_price: match.unit_price,
                        stock: match.stock,
                    };
                }
                return { item_id: -1, item_name: name, sku: null, unit_price: 0, stock: 0 };
            }),
        [inventoryItems],
    );

    const filteredInventory = useMemo(() => {
        const normalized = includesSearchTerm.trim().toLowerCase();
        const selectedIds = new Set(formState.selectedIncludeItems.map((i) => i.item_id));
        const candidates = inventoryItems.filter((item) => !selectedIds.has(item.item_id));
        if (!normalized) return candidates.slice(0, 25);
        return candidates
            .filter((item) => {
                const haystack = [item.item_name, item.sku ?? '', item.description ?? '']
                    .join(' ')
                    .toLowerCase();
                return haystack.includes(normalized);
            })
            .slice(0, 25);
    }, [inventoryItems, includesSearchTerm, formState.selectedIncludeItems]);

    const showIncludesDropdown = includesSearchTerm.trim().length > 0 && filteredInventory.length > 0;

    const loadServices = useCallback(async () => {
        try {
            setIsLoadingServices(true);
            setServicesError(null);

            const response = await serviceCatalogService.getManageServices({ per_page: 100 });
            setServices(response.data.data);
        } catch (error) {
            setServicesError(error instanceof Error ? error.message : 'Failed to load services.');
            setServices([]);
        } finally {
            setIsLoadingServices(false);
        }
    }, []);

    useEffect(() => {
        void loadServices();
    }, [loadServices]);

    const filteredServices = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return services.filter((service) => {
            const categoryMatch = categoryFilter === 'all' || service.category === categoryFilter;
            const searchMatch =
                normalizedSearch === '' ||
                service.name.toLowerCase().includes(normalizedSearch) ||
                (service.description ?? '').toLowerCase().includes(normalizedSearch);

            return categoryMatch && searchMatch;
        });
    }, [categoryFilter, searchTerm, services]);

    useEffect(() => {
        if (filteredServices.length === 0) {
            setSelectedServiceId(null);
            return;
        }

        if (selectedServiceId == null || !filteredServices.some((service) => service.id === selectedServiceId)) {
            setSelectedServiceId(filteredServices[0].id);
        }
    }, [filteredServices, selectedServiceId]);

    const selectedService = useMemo(() => services.find((service) => service.id === selectedServiceId) ?? null, [selectedServiceId, services]);

    const activeCount = services.filter((service) => service.is_active).length;
    const recommendedCount = services.filter((service) => service.recommended).length;
    const averagePrice = services.length > 0 ? services.reduce((sum, service) => sum + service.price_fixed, 0) / services.length : 0;
    const getFieldError = (field: keyof ServiceFormState) => formErrors[field] ?? null;

    const closeFormModal = () => {
        setShowFormModal(false);
        setFormErrors({});
        setSubmitError(null);
        setIncludesSearchTerm('');
    };

    const openCreateModal = () => {
        setFormMode('create');
        setEditingServiceId(null);
        setFormState(initialFormState);
        setFormErrors({});
        setSubmitError(null);
        setIncludesSearchTerm('');
        setShowFormModal(true);
    };

    const openEditModal = (service: ServiceCatalogItem) => {
        setFormMode('edit');
        setEditingServiceId(service.id);
        setFormState({
            ...toFormState(service),
            selectedIncludeItems: matchIncludesToInventory(service.includes),
        });
        setFormErrors({});
        setSubmitError(null);
        setIncludesSearchTerm('');
        setShowFormModal(true);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        setFormErrors({});
        setSubmitError(null);
        setIsSubmitting(true);

        try {
            const payload = toMutationPayload(formState);

            if (formMode === 'create') {
                const response = await serviceCatalogService.createService(payload);
                const created = response.data;

                setServices((prev) => [created, ...prev]);
                setSelectedServiceId(created.id);
                setShowFormModal(false);

                return;
            }

            if (editingServiceId == null) {
                setSubmitError('No service selected for update.');

                return;
            }

            const response = await serviceCatalogService.updateService(editingServiceId, payload);
            const updated = response.data;

            setServices((prev) => prev.map((service) => (service.id === updated.id ? updated : service)));
            setSelectedServiceId(updated.id);
            setShowFormModal(false);
        } catch (error) {
            if (error instanceof ApiError && error.status === 422) {
                setFormErrors(mapValidationErrors(error.validationErrors));
            }

            setSubmitError(error instanceof Error ? error.message : 'Failed to save service.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) {
            return;
        }

        setDeleteError(null);
        setIsDeactivating(true);

        try {
            const response = await serviceCatalogService.deactivateService(deleteTarget.id);
            const deactivated = response.data;

            setServices((prev) => prev.map((service) => (service.id === deactivated.id ? deactivated : service)));
            setDeleteTarget(null);
        } catch (error) {
            setDeleteError(error instanceof Error ? error.message : 'Failed to deactivate service.');
        } finally {
            setIsDeactivating(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="h-full min-h-0 flex-1 overflow-hidden p-5">
                <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-5 overflow-hidden">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-xs font-semibold tracking-[0.18em] text-[#d4af37] uppercase">Frontdesk Workspace</p>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Your service menu at a glance — browse offerings, check prices, and help customers pick the right service.
                            </p>
                        </div>
                        <button
                            onClick={openCreateModal}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
                        >
                            <Plus className="h-4 w-4" /> Add Service
                        </button>
                    </div>

                    {servicesError && (
                        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{servicesError}</div>
                    )}

                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="profile-card rounded-xl p-4">
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Total Services</p>
                            <p className="mt-2 text-3xl font-bold">{services.length}</p>
                        </div>
                        <div className="profile-card rounded-xl p-4">
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Active Services</p>
                            <p className="mt-2 text-3xl font-bold">{activeCount}</p>
                        </div>
                        <div className="profile-card rounded-xl p-4">
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Avg Price and Highlights</p>
                            <p className="mt-2 text-3xl font-bold">P{Math.round(averagePrice).toLocaleString('en-US')}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{recommendedCount} recommended service(s)</p>
                        </div>
                    </div>

                    <div className="grid min-h-0 flex-1 gap-5 overflow-hidden lg:grid-cols-[1.45fr_1fr]">
                        <div className="profile-card flex min-h-0 flex-col rounded-xl p-5">
                            <div className="mb-4 flex shrink-0 flex-col gap-3">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        value={searchTerm}
                                        onChange={(event) => setSearchTerm(event.target.value)}
                                        placeholder="Search services by name or description"
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] pr-3 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none"
                                    />
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {(['all', ...categoryOptions.map((option) => option.value)] as CategoryFilter[]).map((category) => {
                                        const isActive = categoryFilter === category;
                                        const label = category === 'all' ? 'All' : formatCategory(category);

                                        return (
                                            <button
                                                key={category}
                                                onClick={() => setCategoryFilter(category)}
                                                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                                                    isActive
                                                        ? 'bg-[#d4af37] text-black shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                                                        : 'border border-[#2a2a2e] text-muted-foreground hover:border-[#d4af37]/40 hover:text-foreground'
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {isLoadingServices ? (
                                <div className="flex min-h-50 items-center justify-center gap-2 rounded-lg border border-dashed border-[#2a2a2e] text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Loading services...
                                </div>
                            ) : filteredServices.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-[#2a2a2e] py-14 text-center text-sm text-muted-foreground">
                                    No services matched your filters.
                                </div>
                            ) : (
                                <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-[#2a2a2e]">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-[#0d0d10] text-xs text-muted-foreground uppercase">
                                            <tr>
                                                <th className="px-3 py-2.5 font-semibold">Service</th>
                                                <th className="px-3 py-2.5 font-semibold">Category</th>
                                                <th className="px-3 py-2.5 font-semibold">Price</th>
                                                <th className="px-3 py-2.5 font-semibold">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredServices.map((service) => {
                                                const isSelected = selectedServiceId === service.id;

                                                return (
                                                    <tr
                                                        key={service.id}
                                                        onClick={() => setSelectedServiceId(service.id)}
                                                        className={`cursor-pointer border-t border-[#2a2a2e] transition-colors ${
                                                            isSelected ? 'bg-[#d4af37]/10' : 'hover:bg-[#1e1e22]/70'
                                                        }`}
                                                    >
                                                        <td className="px-3 py-3 align-top">
                                                            <p className="font-semibold text-foreground">{service.name}</p>
                                                            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                                                {service.description || 'No description set'}
                                                            </p>
                                                            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                                                <span>{service.duration}</span>
                                                                <span
                                                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                                                        service.is_active
                                                                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                                                                            : 'border-red-500/40 bg-red-500/10 text-red-300'
                                                                    }`}
                                                                >
                                                                    {service.is_active ? 'Active' : 'Inactive'}
                                                                </span>
                                                                {service.recommended && (
                                                                    <span className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/40 bg-[#d4af37]/10 px-2 py-0.5 text-[#d4af37]">
                                                                        <Sparkles className="h-3 w-3" /> Recommended
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-3 align-top text-xs text-muted-foreground">
                                                            {formatCategory(service.category)}
                                                        </td>
                                                        <td className="px-3 py-3 align-top text-xs font-semibold text-[#d4af37]">
                                                            P{service.price_fixed.toLocaleString('en-US')}
                                                        </td>
                                                        <td className="px-3 py-3 align-top">
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        openEditModal(service);
                                                                    }}
                                                                    className="inline-flex items-center gap-1 rounded-md border border-[#2a2a2e] px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                                                                >
                                                                    <PencilLine className="h-3.5 w-3.5" /> Edit
                                                                </button>
                                                                <button
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        setDeleteError(null);
                                                                        setDeleteTarget(service);
                                                                    }}
                                                                    className="inline-flex items-center gap-1 rounded-md border border-red-500/30 px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/10"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" /> Deactivate
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="profile-card flex min-h-0 flex-col rounded-xl p-5">
                            {isLoadingServices ? (
                                <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Loading details...
                                </div>
                            ) : selectedService ? (
                                <>
                                    {/* Header — always visible */}
                                    <div className="shrink-0 space-y-4 pb-4 border-b border-[#2a2a2e]">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h2 className="text-lg font-bold leading-snug">{selectedService.name}</h2>
                                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                                    <span className="rounded-full border border-[#2a2a2e] bg-[#0d0d10] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                                        {formatCategory(selectedService.category)}
                                                    </span>
                                                    <span
                                                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                                            selectedService.is_active
                                                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                                                : 'border-red-500/30 bg-red-500/10 text-red-300'
                                                        }`}
                                                    >
                                                        {selectedService.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                    {selectedService.recommended && (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-2 py-0.5 text-[10px] font-semibold text-[#d4af37]">
                                                            <Sparkles className="h-3 w-3" /> Recommended
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="shrink-0 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-3 text-center">
                                                <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Price</p>
                                                <p className="mt-0.5 text-xl font-bold text-[#d4af37]">
                                                    P{selectedService.price_fixed.toLocaleString('en-US')}
                                                </p>
                                            </div>
                                        </div>

                                        {selectedService.description && (
                                            <p className="text-sm leading-relaxed text-muted-foreground">{selectedService.description}</p>
                                        )}
                                    </div>

                                    {/* Scrollable details */}
                                    <div className="flex-1 overflow-y-auto py-4 space-y-4">
                                        {/* Quick stats */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="rounded-lg border border-[#2a2a2e] bg-[#0d0d10] p-2.5 text-center">
                                                <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Duration</p>
                                                <p className="mt-1 text-sm font-bold text-foreground">{selectedService.duration}</p>
                                                <p className="text-[10px] text-muted-foreground">{selectedService.estimated_duration}</p>
                                            </div>
                                            <div className="rounded-lg border border-[#2a2a2e] bg-[#0d0d10] p-2.5 text-center">
                                                <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Queue</p>
                                                <p className="mt-1 text-sm font-bold text-foreground">{selectedService.queue_label || '—'}</p>
                                            </div>
                                            <div className="rounded-lg border border-[#2a2a2e] bg-[#0d0d10] p-2.5 text-center">
                                                <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Rating</p>
                                                <p className="mt-1 text-sm font-bold text-foreground">
                                                    {selectedService.rating_count > 0
                                                        ? `${selectedService.rating.toFixed(1)}`
                                                        : '—'}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {selectedService.rating_count > 0 ? `${selectedService.rating_count} reviews` : 'No reviews'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Features */}
                                        <div>
                                            <p className="mb-2 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Features</p>
                                            {selectedService.features.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {selectedService.features.map((feature) => (
                                                        <span
                                                            key={feature}
                                                            className="inline-flex items-center gap-1 rounded-full border border-[#2a2a2e] bg-[#0d0d10] px-2.5 py-1 text-xs text-muted-foreground"
                                                        >
                                                            {feature}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-muted-foreground/50 italic">No features listed.</p>
                                            )}
                                        </div>

                                        {/* Includes */}
                                        <div>
                                            <p className="mb-2 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Includes</p>
                                            {selectedService.includes.length > 0 ? (
                                                <div className="space-y-1.5">
                                                    {selectedService.includes.map((item) => (
                                                        <div key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                                                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#d4af37]" />
                                                            <span>{item}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-muted-foreground/50 italic">No included items listed.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Sticky actions */}
                                    <div className="flex shrink-0 items-center gap-2 pt-4 border-t border-[#2a2a2e]">
                                        <button
                                            onClick={() => openEditModal(selectedService)}
                                            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-4 py-2.5 text-sm font-semibold transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                                        >
                                            <PencilLine className="h-4 w-4" /> Edit
                                        </button>
                                        <button
                                            onClick={() => {
                                                setDeleteError(null);
                                                setDeleteTarget(selectedService);
                                            }}
                                            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                                        >
                                            <Trash2 className="h-4 w-4" /> Deactivate
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-[#2a2a2e]">
                                        <Search className="h-6 w-6 text-muted-foreground/40" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-muted-foreground">No Service Selected</p>
                                        <p className="mt-1 text-xs text-muted-foreground/60">
                                            Select a service from the list to view details, pricing, and what's included.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showFormModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={closeFormModal}>
                    <div
                        className="profile-card max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl p-5"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold tracking-wide text-[#d4af37] uppercase">
                                    {formMode === 'create' ? 'Create' : 'Edit'} Service
                                </p>
                                <h2 className="mt-1 text-lg font-bold">
                                    {formMode === 'create' ? 'Add a new service offering' : 'Update service details'}
                                </h2>
                            </div>
                            <button
                                onClick={closeFormModal}
                                className="rounded-md border border-[#2a2a2e] p-2 text-muted-foreground transition-colors hover:border-[#d4af37]/40"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {submitError && (
                            <p className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{submitError}</p>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="space-y-1.5 text-sm">
                                    <span className="text-xs font-semibold text-muted-foreground">Service Name</span>
                                    <input
                                        value={formState.name}
                                        onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                                        required
                                        className={`h-10 w-full rounded-lg border bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none ${
                                            getFieldError('name') ? 'border-red-500/60' : 'border-[#2a2a2e]'
                                        }`}
                                    />
                                    {getFieldError('name') && <p className="text-xs text-red-400">{getFieldError('name')}</p>}
                                </label>

                                <label className="space-y-1.5 text-sm">
                                    <span className="text-xs font-semibold text-muted-foreground">Category</span>
                                    <select
                                        value={formState.category}
                                        onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value as ServiceCategory }))}
                                        className={`h-10 w-full rounded-lg border bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none ${
                                            getFieldError('category') ? 'border-red-500/60' : 'border-[#2a2a2e]'
                                        }`}
                                    >
                                        {categoryOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    {getFieldError('category') && <p className="text-xs text-red-400">{getFieldError('category')}</p>}
                                </label>

                                <label className="space-y-1.5 text-sm">
                                    <span className="text-xs font-semibold text-muted-foreground">Price (numeric)</span>
                                    <input
                                        value={formState.priceFixed}
                                        onChange={(event) => setFormState((prev) => ({ ...prev, priceFixed: event.target.value }))}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        required
                                        className={`h-10 w-full rounded-lg border bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none ${
                                            getFieldError('priceFixed') ? 'border-red-500/60' : 'border-[#2a2a2e]'
                                        }`}
                                    />
                                    {getFieldError('priceFixed') && <p className="text-xs text-red-400">{getFieldError('priceFixed')}</p>}
                                </label>

                                <label className="space-y-1.5 text-sm">
                                    <span className="text-xs font-semibold text-muted-foreground">Price Label</span>
                                    <input
                                        value={formState.priceLabel}
                                        onChange={(event) => setFormState((prev) => ({ ...prev, priceLabel: event.target.value }))}
                                        placeholder="Ex: P300-P800"
                                        required
                                        className={`h-10 w-full rounded-lg border bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none ${
                                            getFieldError('priceLabel') ? 'border-red-500/60' : 'border-[#2a2a2e]'
                                        }`}
                                    />
                                    {getFieldError('priceLabel') && <p className="text-xs text-red-400">{getFieldError('priceLabel')}</p>}
                                </label>

                                <label className="space-y-1.5 text-sm">
                                    <span className="text-xs font-semibold text-muted-foreground">Duration</span>
                                    <input
                                        value={formState.duration}
                                        onChange={(event) => setFormState((prev) => ({ ...prev, duration: event.target.value }))}
                                        placeholder="Ex: 45 mins"
                                        required
                                        className={`h-10 w-full rounded-lg border bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none ${
                                            getFieldError('duration') ? 'border-red-500/60' : 'border-[#2a2a2e]'
                                        }`}
                                    />
                                    {getFieldError('duration') && <p className="text-xs text-red-400">{getFieldError('duration')}</p>}
                                </label>

                                <label className="space-y-1.5 text-sm">
                                    <span className="text-xs font-semibold text-muted-foreground">Estimated Duration</span>
                                    <input
                                        value={formState.estimatedDuration}
                                        onChange={(event) => setFormState((prev) => ({ ...prev, estimatedDuration: event.target.value }))}
                                        placeholder="Ex: 45-60 mins"
                                        required
                                        className={`h-10 w-full rounded-lg border bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none ${
                                            getFieldError('estimatedDuration') ? 'border-red-500/60' : 'border-[#2a2a2e]'
                                        }`}
                                    />
                                    {getFieldError('estimatedDuration') && (
                                        <p className="text-xs text-red-400">{getFieldError('estimatedDuration')}</p>
                                    )}
                                </label>

                                <label className="space-y-1.5 text-sm">
                                    <span className="text-xs font-semibold text-muted-foreground">Queue Label</span>
                                    <input
                                        value={formState.queueLabel}
                                        onChange={(event) => setFormState((prev) => ({ ...prev, queueLabel: event.target.value }))}
                                        placeholder="Ex: 2-3 in queue"
                                        className={`h-10 w-full rounded-lg border bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none ${
                                            getFieldError('queueLabel') ? 'border-red-500/60' : 'border-[#2a2a2e]'
                                        }`}
                                    />
                                    {getFieldError('queueLabel') && <p className="text-xs text-red-400">{getFieldError('queueLabel')}</p>}
                                </label>

                                <label className="space-y-1.5 text-sm">
                                    <span className="text-xs font-semibold text-muted-foreground">Rating (0 to 5)</span>
                                    <input
                                        value={formState.rating}
                                        onChange={(event) => setFormState((prev) => ({ ...prev, rating: event.target.value }))}
                                        type="number"
                                        min="0"
                                        max="5"
                                        step="0.1"
                                        className={`h-10 w-full rounded-lg border bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none ${
                                            getFieldError('rating') ? 'border-red-500/60' : 'border-[#2a2a2e]'
                                        }`}
                                    />
                                    {getFieldError('rating') && <p className="text-xs text-red-400">{getFieldError('rating')}</p>}
                                </label>

                                <label className="space-y-1.5 text-sm">
                                    <span className="text-xs font-semibold text-muted-foreground">Rating Count</span>
                                    <input
                                        value={formState.ratingCount}
                                        onChange={(event) => setFormState((prev) => ({ ...prev, ratingCount: event.target.value }))}
                                        type="number"
                                        min="0"
                                        step="1"
                                        className={`h-10 w-full rounded-lg border bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none ${
                                            getFieldError('ratingCount') ? 'border-red-500/60' : 'border-[#2a2a2e]'
                                        }`}
                                    />
                                    {getFieldError('ratingCount') && <p className="text-xs text-red-400">{getFieldError('ratingCount')}</p>}
                                </label>
                            </div>

                            <label className="block space-y-1.5 text-sm">
                                <span className="text-xs font-semibold text-muted-foreground">Description</span>
                                <textarea
                                    value={formState.description}
                                    onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                                    rows={3}
                                    className={`w-full rounded-lg border bg-[#0d0d10] px-3 py-2 text-sm focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none ${
                                        getFieldError('description') ? 'border-red-500/60' : 'border-[#2a2a2e]'
                                    }`}
                                />
                                {getFieldError('description') && <p className="text-xs text-red-400">{getFieldError('description')}</p>}
                            </label>

                            <label className="block space-y-1.5 text-sm">
                                <span className="text-xs font-semibold text-muted-foreground">Features (comma or new line)</span>
                                <textarea
                                    value={formState.featuresText}
                                    onChange={(event) => setFormState((prev) => ({ ...prev, featuresText: event.target.value }))}
                                    rows={3}
                                    className={`w-full rounded-lg border bg-[#0d0d10] px-3 py-2 text-sm focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none ${
                                        getFieldError('featuresText') ? 'border-red-500/60' : 'border-[#2a2a2e]'
                                    }`}
                                />
                                {getFieldError('featuresText') && <p className="text-xs text-red-400">{getFieldError('featuresText')}</p>}
                            </label>

                            <div className="space-y-2 text-sm">
                                <span className="text-xs font-semibold text-muted-foreground">Includes (select from inventory)</span>

                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        value={includesSearchTerm}
                                        onChange={(e) => setIncludesSearchTerm(e.target.value)}
                                        placeholder="Search inventory by name or SKU..."
                                        className="h-9 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] pr-8 pl-8 text-sm focus:border-[#d4af37] focus:outline-none"
                                        autoComplete="off"
                                    />
                                    {includesSearchTerm && (
                                        <button
                                            type="button"
                                            onClick={() => setIncludesSearchTerm('')}
                                            className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>

                                {showIncludesDropdown && (
                                    <div className="max-h-40 overflow-y-auto rounded-lg border border-[#2a2a2e] bg-[#0d0d10]">
                                        {filteredInventory.map((inv) => (
                                            <button
                                                key={inv.item_id}
                                                type="button"
                                                onClick={() => {
                                                    setFormState((prev) => ({
                                                        ...prev,
                                                        selectedIncludeItems: [
                                                            ...prev.selectedIncludeItems,
                                                            {
                                                                item_id: inv.item_id,
                                                                item_name: inv.item_name,
                                                                sku: inv.sku,
                                                                unit_price: inv.unit_price,
                                                                stock: inv.stock,
                                                            },
                                                        ],
                                                    }));
                                                    setIncludesSearchTerm('');
                                                }}
                                                className="flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-[#1a1b20]"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-semibold text-foreground">{inv.item_name}</p>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        {inv.sku ?? `INV-${String(inv.item_id).padStart(6, '0')}`}
                                                    </p>
                                                </div>
                                                <div className="ml-3 shrink-0 text-right">
                                                    <p className="font-semibold text-[#d4af37]">P{inv.unit_price.toLocaleString('en-US')}</p>
                                                    <p className="text-[10px] text-muted-foreground">{inv.stock} in stock</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {formState.selectedIncludeItems.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {formState.selectedIncludeItems.map((item) => (
                                            <span
                                                key={item.item_id}
                                                className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/7 px-2.5 py-1 text-xs text-muted-foreground"
                                            >
                                                <span className="font-medium text-foreground">{item.item_name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setFormState((prev) => ({
                                                            ...prev,
                                                            selectedIncludeItems: prev.selectedIncludeItems.filter(
                                                                (i) => i.item_id !== item.item_id,
                                                            ),
                                                        }))
                                                    }
                                                    className="ml-0.5 text-muted-foreground hover:text-red-400 transition-colors"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid gap-3 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] p-3 md:grid-cols-2">
                                <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                    <input
                                        checked={formState.recommended}
                                        onChange={(event) => setFormState((prev) => ({ ...prev, recommended: event.target.checked }))}
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-[#2a2a2e] bg-[#18181b] text-[#d4af37]"
                                    />
                                    Mark as recommended
                                </label>

                                <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                    <input
                                        checked={formState.isActive}
                                        onChange={(event) => setFormState((prev) => ({ ...prev, isActive: event.target.checked }))}
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-[#2a2a2e] bg-[#18181b] text-[#d4af37]"
                                    />
                                    Service is active
                                </label>

                                <label className="space-y-1.5 text-sm md:col-span-2">
                                    <span className="text-xs font-semibold text-muted-foreground">Recommended Note</span>
                                    <input
                                        value={formState.recommendedNote}
                                        onChange={(event) => setFormState((prev) => ({ ...prev, recommendedNote: event.target.value }))}
                                        disabled={!formState.recommended}
                                        placeholder="Why should this be highlighted?"
                                        className={`h-10 w-full rounded-lg border bg-[#18181b] px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                                            getFieldError('recommendedNote') ? 'border-red-500/60' : 'border-[#2a2a2e]'
                                        }`}
                                    />
                                    {getFieldError('recommendedNote') && <p className="text-xs text-red-400">{getFieldError('recommendedNote')}</p>}
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={closeFormModal}
                                    disabled={isSubmitting}
                                    className="rounded-lg border border-[#2a2a2e] px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90"
                                >
                                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {isSubmitting ? 'Saving...' : formMode === 'create' ? 'Create Service' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setDeleteTarget(null)}>
                    <div className="profile-card w-full max-w-md rounded-xl p-5" onClick={(event) => event.stopPropagation()}>
                        <div className="mb-3 flex items-center gap-2 text-red-400">
                            <AlertCircle className="h-5 w-5" />
                            <h3 className="text-base font-semibold">Deactivate service</h3>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            You are deactivating <span className="font-semibold text-foreground">{deleteTarget.name}</span>. Inactive services stay in
                            records but no longer appear in customer listings.
                        </p>

                        {deleteError && (
                            <p className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">{deleteError}</p>
                        )}

                        <div className="mt-5 flex items-center justify-end gap-2">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                disabled={isDeactivating}
                                className="rounded-lg border border-[#2a2a2e] px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isDeactivating}
                                className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                            >
                                {isDeactivating && <Loader2 className="h-4 w-4 animate-spin" />}
                                {isDeactivating ? 'Deactivating...' : 'Deactivate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
