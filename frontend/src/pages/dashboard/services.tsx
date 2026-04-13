import AppLayout from '@/components/layout/app-layout';
import { cloneServicePlaceholders } from '@/data/servicePlaceholders';
import { type BreadcrumbItem } from '@/types';
import { type ServiceCatalogItem } from '@/types/customer';
import { AlertCircle, Check, PencilLine, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

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
    includesText: string;
    recommended: boolean;
    recommendedNote: string;
    isActive: boolean;
}

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
    includesText: '',
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
        includesText: service.includes.join('\n'),
        recommended: service.recommended,
        recommendedNote: service.recommended_note ?? '',
        isActive: service.is_active,
    };
}

function toServiceItem(form: ServiceFormState, id: number, createdAt: string): ServiceCatalogItem {
    const parsedPrice = Number.parseFloat(form.priceFixed);
    const parsedRating = Number.parseFloat(form.rating);
    const parsedRatingCount = Number.parseInt(form.ratingCount, 10);
    const nowIso = new Date().toISOString();

    return {
        id,
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
        includes: toLineList(form.includesText),
        rating: Number.isFinite(parsedRating) ? parsedRating : 0,
        rating_count: Number.isFinite(parsedRatingCount) ? parsedRatingCount : 0,
        created_at: createdAt,
        updated_at: nowIso,
    };
}

export default function Services() {
    const [services, setServices] = useState<ServiceCatalogItem[]>(() => cloneServicePlaceholders());

    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
    const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);

    const [showFormModal, setShowFormModal] = useState(false);
    const [formMode, setFormMode] = useState<FormMode>('create');
    const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
    const [formState, setFormState] = useState<ServiceFormState>(initialFormState);

    const [deleteTarget, setDeleteTarget] = useState<ServiceCatalogItem | null>(null);

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

    const openCreateModal = () => {
        setFormMode('create');
        setEditingServiceId(null);
        setFormState(initialFormState);
        setShowFormModal(true);
    };

    const openEditModal = (service: ServiceCatalogItem) => {
        setFormMode('edit');
        setEditingServiceId(service.id);
        setFormState(toFormState(service));
        setShowFormModal(true);
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (formMode === 'create') {
            const nextId = services.length === 0 ? 1 : Math.max(...services.map((service) => service.id)) + 1;
            const created = toServiceItem(formState, nextId, new Date().toISOString());

            setServices((prev) => [created, ...prev]);
            setSelectedServiceId(created.id);
            setShowFormModal(false);
            return;
        }

        if (editingServiceId == null) {
            return;
        }

        setServices((prev) =>
            prev.map((service) => (service.id === editingServiceId ? toServiceItem(formState, service.id, service.created_at) : service)),
        );
        setSelectedServiceId(editingServiceId);
        setShowFormModal(false);
    };

    const confirmDelete = () => {
        if (!deleteTarget) {
            return;
        }

        setServices((prev) => prev.filter((service) => service.id !== deleteTarget.id));
        setDeleteTarget(null);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="h-full min-h-0 flex-1 overflow-hidden p-5">
                <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-5 overflow-hidden">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-xs font-semibold tracking-[0.18em] text-[#d4af37] uppercase">Frontdesk Workspace</p>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Create, review, update, and remove services offered by the shop in one streamlined panel.
                            </p>
                        </div>
                        <button
                            onClick={openCreateModal}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
                        >
                            <Plus className="h-4 w-4" /> Add Service
                        </button>
                    </div>

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

                    <div className="grid min-h-0 flex-1 gap-5 overflow-hidden xl:grid-cols-[1.45fr_1fr]">
                        <div className="profile-card flex min-h-0 flex-col rounded-xl p-5">
                            <div className="mb-4 flex flex-col gap-3">
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

                            {filteredServices.length === 0 ? (
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
                                                                        setDeleteTarget(service);
                                                                    }}
                                                                    className="inline-flex items-center gap-1 rounded-md border border-red-500/30 px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/10"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" /> Delete
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

                        <div className="profile-card min-h-0 overflow-y-auto rounded-xl p-5">
                            <h2 className="text-base font-semibold">Service Details</h2>
                            {selectedService ? (
                                <div className="mt-4 space-y-4 text-sm">
                                    <div>
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="text-lg font-bold">{selectedService.name}</p>
                                                <p className="text-xs text-muted-foreground">{formatCategory(selectedService.category)}</p>
                                            </div>
                                            <span className="rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-2 py-1 text-xs font-semibold text-[#d4af37]">
                                                P{selectedService.price_fixed.toLocaleString('en-US')}
                                            </span>
                                        </div>
                                        <p className="mt-3 text-sm text-muted-foreground">
                                            {selectedService.description || 'No description available.'}
                                        </p>
                                    </div>

                                    <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                                        <div className="rounded-lg border border-[#2a2a2e] bg-[#0d0d10] p-2.5">
                                            <p className="font-semibold text-foreground">Duration</p>
                                            <p>{selectedService.duration}</p>
                                            <p>{selectedService.estimated_duration}</p>
                                        </div>
                                        <div className="rounded-lg border border-[#2a2a2e] bg-[#0d0d10] p-2.5">
                                            <p className="font-semibold text-foreground">Queue Label</p>
                                            <p>{selectedService.queue_label || 'Not set'}</p>
                                            <p className="mt-1">
                                                Rating: {selectedService.rating.toFixed(1)} ({selectedService.rating_count})
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Features</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedService.features.length > 0 ? (
                                                selectedService.features.map((feature) => (
                                                    <span
                                                        key={feature}
                                                        className="rounded-full border border-[#2a2a2e] px-2 py-1 text-xs text-muted-foreground"
                                                    >
                                                        {feature}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-muted-foreground">No features listed.</span>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Includes</p>
                                        <div className="space-y-1.5">
                                            {selectedService.includes.length > 0 ? (
                                                selectedService.includes.map((item) => (
                                                    <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Check className="h-3.5 w-3.5 text-[#d4af37]" /> {item}
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="text-xs text-muted-foreground">No included line items.</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-2">
                                        <button
                                            onClick={() => openEditModal(selectedService)}
                                            className="inline-flex items-center gap-1 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-[#d4af37]/40"
                                        >
                                            <PencilLine className="h-3.5 w-3.5" /> Edit Service
                                        </button>
                                        <button
                                            onClick={() => {
                                                setDeleteTarget(selectedService);
                                            }}
                                            className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" /> Delete
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-6 rounded-lg border border-dashed border-[#2a2a2e] p-6 text-center text-sm text-muted-foreground">
                                    Select a service from the list to inspect details.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showFormModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowFormModal(false)}>
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
                                onClick={() => setShowFormModal(false)}
                                className="rounded-md border border-[#2a2a2e] p-2 text-muted-foreground transition-colors hover:border-[#d4af37]/40"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="space-y-1.5 text-sm">
                                    <span className="text-xs font-semibold text-muted-foreground">Service Name</span>
                                    <input
                                        value={formState.name}
                                        onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                                        required
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none"
                                    />
                                </label>

                                <label className="space-y-1.5 text-sm">
                                    <span className="text-xs font-semibold text-muted-foreground">Category</span>
                                    <select
                                        value={formState.category}
                                        onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value as ServiceCategory }))}
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none"
                                    >
                                        {categoryOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
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
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none"
                                    />
                                </label>

                                <label className="space-y-1.5 text-sm">
                                    <span className="text-xs font-semibold text-muted-foreground">Price Label</span>
                                    <input
                                        value={formState.priceLabel}
                                        onChange={(event) => setFormState((prev) => ({ ...prev, priceLabel: event.target.value }))}
                                        placeholder="Ex: P300-P800"
                                        required
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none"
                                    />
                                </label>

                                <label className="space-y-1.5 text-sm">
                                    <span className="text-xs font-semibold text-muted-foreground">Duration</span>
                                    <input
                                        value={formState.duration}
                                        onChange={(event) => setFormState((prev) => ({ ...prev, duration: event.target.value }))}
                                        placeholder="Ex: 45 mins"
                                        required
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none"
                                    />
                                </label>

                                <label className="space-y-1.5 text-sm">
                                    <span className="text-xs font-semibold text-muted-foreground">Estimated Duration</span>
                                    <input
                                        value={formState.estimatedDuration}
                                        onChange={(event) => setFormState((prev) => ({ ...prev, estimatedDuration: event.target.value }))}
                                        placeholder="Ex: 45-60 mins"
                                        required
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none"
                                    />
                                </label>

                                <label className="space-y-1.5 text-sm">
                                    <span className="text-xs font-semibold text-muted-foreground">Queue Label</span>
                                    <input
                                        value={formState.queueLabel}
                                        onChange={(event) => setFormState((prev) => ({ ...prev, queueLabel: event.target.value }))}
                                        placeholder="Ex: 2-3 in queue"
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none"
                                    />
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
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none"
                                    />
                                </label>

                                <label className="space-y-1.5 text-sm">
                                    <span className="text-xs font-semibold text-muted-foreground">Rating Count</span>
                                    <input
                                        value={formState.ratingCount}
                                        onChange={(event) => setFormState((prev) => ({ ...prev, ratingCount: event.target.value }))}
                                        type="number"
                                        min="0"
                                        step="1"
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none"
                                    />
                                </label>
                            </div>

                            <label className="block space-y-1.5 text-sm">
                                <span className="text-xs font-semibold text-muted-foreground">Description</span>
                                <textarea
                                    value={formState.description}
                                    onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                                    rows={3}
                                    className="w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 py-2 text-sm focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none"
                                />
                            </label>

                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="block space-y-1.5 text-sm">
                                    <span className="text-xs font-semibold text-muted-foreground">Features (comma or new line)</span>
                                    <textarea
                                        value={formState.featuresText}
                                        onChange={(event) => setFormState((prev) => ({ ...prev, featuresText: event.target.value }))}
                                        rows={4}
                                        className="w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 py-2 text-sm focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none"
                                    />
                                </label>

                                <label className="block space-y-1.5 text-sm">
                                    <span className="text-xs font-semibold text-muted-foreground">Includes (comma or new line)</span>
                                    <textarea
                                        value={formState.includesText}
                                        onChange={(event) => setFormState((prev) => ({ ...prev, includesText: event.target.value }))}
                                        rows={4}
                                        className="w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 py-2 text-sm focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none"
                                    />
                                </label>
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
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#18181b] px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setShowFormModal(false)}
                                    className="rounded-lg border border-[#2a2a2e] px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90"
                                >
                                    {formMode === 'create' ? 'Create Service' : 'Save Changes'}
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
                            <h3 className="text-base font-semibold">Delete service</h3>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            You are deleting <span className="font-semibold text-foreground">{deleteTarget.name}</span>. This action cannot be undone.
                        </p>

                        <div className="mt-5 flex items-center justify-end gap-2">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="rounded-lg border border-[#2a2a2e] px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
