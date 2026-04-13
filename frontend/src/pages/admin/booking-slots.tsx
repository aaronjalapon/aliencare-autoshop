import AdminLayout from '@/components/layout/admin-layout';
import { api } from '@/services/api';
import { type BreadcrumbItem } from '@/types';
import { LoaderCircle, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

const SLOT_POLL_INTERVAL_MS = 8000;

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin Dashboard', href: '/admin' },
    { title: 'Booking Slots', href: '/admin/booking-slots' },
];

interface BookingSlot {
    id: number;
    time: string;
    label: string;
    capacity: number;
    is_active: boolean;
    sort_order: number;
}

interface BookingSlotsResponse {
    success: boolean;
    data: {
        slots: BookingSlot[];
    };
    message?: string;
}

interface BookingSlotDraft {
    time: string;
    capacity: number;
    is_active: boolean;
    sort_order: number;
}

const defaultDraft = (): BookingSlotDraft => ({
    time: '10:00',
    capacity: 3,
    is_active: true,
    sort_order: 1,
});

export default function AdminBookingSlots() {
    const [slots, setSlots] = useState<BookingSlotDraft[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const fetchSlots = useCallback(
        async (showLoader = true) => {
            if (showLoader) setLoading(true);

            try {
                const response = await api.get<BookingSlotsResponse>('/v1/admin/booking-slots');
                const nextSlots = response.data.slots.map((slot) => ({
                    time: slot.time,
                    capacity: slot.capacity,
                    is_active: slot.is_active,
                    sort_order: slot.sort_order,
                }));

                if (!hasUnsavedChanges) {
                    setSlots(nextSlots);
                }

                setLastSyncedAt(new Date());
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load booking slots.');
            } finally {
                if (showLoader) setLoading(false);
            }
        },
        [hasUnsavedChanges],
    );

    useEffect(() => {
        void fetchSlots(true);
    }, [fetchSlots]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            if (hasUnsavedChanges || document.visibilityState !== 'visible') return;
            void fetchSlots(false);
        }, SLOT_POLL_INTERVAL_MS);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [fetchSlots, hasUnsavedChanges]);

    const hasDuplicateTimes = useMemo(() => {
        const times = slots.map((slot) => slot.time);
        return new Set(times).size !== times.length;
    }, [slots]);

    const canSave = !saving && !loading && slots.length > 0 && !hasDuplicateTimes;

    const updateSlot = (index: number, patch: Partial<BookingSlotDraft>) => {
        setSlots((prev) => prev.map((slot, idx) => (idx === index ? { ...slot, ...patch } : slot)));
        setHasUnsavedChanges(true);
    };

    const addSlot = () => {
        setSlots((prev) => [
            ...prev,
            {
                ...defaultDraft(),
                sort_order: prev.length + 1,
            },
        ]);
        setHasUnsavedChanges(true);
    };

    const removeSlot = (index: number) => {
        setSlots((prev) => prev.filter((_, idx) => idx !== index));
        setHasUnsavedChanges(true);
    };

    const saveSlots = async () => {
        if (!canSave) return;

        setSaving(true);
        setError(null);

        try {
            const payload = {
                slots: slots.map((slot, index) => ({
                    time: slot.time,
                    capacity: Number(slot.capacity),
                    is_active: slot.is_active,
                    sort_order: Number(slot.sort_order || index + 1),
                })),
            };

            const response = await api.put<BookingSlotsResponse>('/v1/admin/booking-slots', payload);
            setSlots(
                response.data.slots.map((slot) => ({
                    time: slot.time,
                    capacity: slot.capacity,
                    is_active: slot.is_active,
                    sort_order: slot.sort_order,
                })),
            );
            setHasUnsavedChanges(false);
            setLastSyncedAt(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save booking slots.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Booking Slot Settings</h1>
                        <p className="text-muted-foreground">Live slot capacity configuration for customer service bookings.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => void fetchSlots(true)}
                            disabled={loading || saving}
                            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                            Refresh
                        </button>
                        <button
                            onClick={addSlot}
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Plus className="h-4 w-4" />
                            Add Slot
                        </button>
                        <button
                            onClick={saveSlots}
                            disabled={!canSave}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#e6c24e] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                            Save Changes
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>Live updates every {Math.floor(SLOT_POLL_INTERVAL_MS / 1000)}s</span>
                    {lastSyncedAt && <span>Last sync {lastSyncedAt.toLocaleTimeString('en-US')}</span>}
                    {hasUnsavedChanges && <span className="text-amber-500">Unsaved changes pause live sync.</span>}
                </div>

                {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">{error}</div>}

                {hasDuplicateTimes && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-500">
                        Duplicate slot times detected. Each slot time must be unique before saving.
                    </div>
                )}

                <div className="rounded-xl border bg-card shadow-sm">
                    {loading ? (
                        <div className="flex items-center justify-center p-10">
                            <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b text-left text-sm text-muted-foreground">
                                        <th className="px-4 py-3 font-medium">Time</th>
                                        <th className="px-4 py-3 font-medium">Capacity</th>
                                        <th className="px-4 py-3 font-medium">Sort Order</th>
                                        <th className="px-4 py-3 font-medium">Active</th>
                                        <th className="px-4 py-3 text-right font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {slots.map((slot, index) => (
                                        <tr key={`${slot.time}-${index}`} className="border-b last:border-0">
                                            <td className="px-4 py-3">
                                                <input
                                                    type="time"
                                                    value={slot.time}
                                                    onChange={(e) => updateSlot(index, { time: e.target.value })}
                                                    className="h-9 rounded-lg border bg-background px-3 text-sm"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={100}
                                                    value={slot.capacity}
                                                    onChange={(e) => updateSlot(index, { capacity: Number(e.target.value) })}
                                                    className="h-9 w-24 rounded-lg border bg-background px-3 text-sm"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={1000}
                                                    value={slot.sort_order}
                                                    onChange={(e) => updateSlot(index, { sort_order: Number(e.target.value) })}
                                                    className="h-9 w-24 rounded-lg border bg-background px-3 text-sm"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <label className="inline-flex items-center gap-2 text-sm">
                                                    <input
                                                        type="checkbox"
                                                        checked={slot.is_active}
                                                        onChange={(e) => updateSlot(index, { is_active: e.target.checked })}
                                                        className="h-4 w-4"
                                                    />
                                                    <span>{slot.is_active ? 'Enabled' : 'Disabled'}</span>
                                                </label>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => removeSlot(index)}
                                                    disabled={slots.length <= 1 || saving}
                                                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-red-500 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
