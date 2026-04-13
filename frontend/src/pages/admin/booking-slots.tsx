import AdminLayout from '@/components/layout/admin-layout';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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

const normalizeSlots = (slots: BookingSlot[]): BookingSlotDraft[] =>
    slots.map((slot) => ({
        time: slot.time,
        capacity: slot.capacity,
        is_active: slot.is_active,
        sort_order: slot.sort_order,
    }));

export default function AdminBookingSlots() {
    const [slots, setSlots] = useState<BookingSlotDraft[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addSlotDraft, setAddSlotDraft] = useState<BookingSlotDraft>(defaultDraft());
    const [addSlotError, setAddSlotError] = useState<string | null>(null);

    const fetchSlots = useCallback(
        async (showLoader = true) => {
            if (showLoader) setLoading(true);

            try {
                const response = await api.get<BookingSlotsResponse>('/v1/admin/booking-slots');
                setSlots(normalizeSlots(response.data.slots));

                setLastSyncedAt(new Date());
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load booking slots.');
            } finally {
                if (showLoader) setLoading(false);
            }
        },
        [],
    );

    useEffect(() => {
        void fetchSlots(true);
    }, [fetchSlots]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            if (saving || document.visibilityState !== 'visible') return;
            void fetchSlots(false);
        }, SLOT_POLL_INTERVAL_MS);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [fetchSlots, saving]);

    const hasDuplicateTimes = useMemo(() => {
        const times = slots.map((slot) => slot.time);
        return new Set(times).size !== times.length;
    }, [slots]);

    const persistSlots = useCallback(async (nextSlots: BookingSlotDraft[]) => {
        if (nextSlots.length === 0) {
            setError('At least one booking slot must remain.');
            return false;
        }

        const times = nextSlots.map((slot) => slot.time);
        if (new Set(times).size !== times.length) {
            setError('Duplicate slot times detected. Each slot time must be unique before saving.');
            return false;
        }

        setSaving(true);
        setError(null);

        try {
            const payload = {
                slots: nextSlots.map((slot, index) => ({
                    time: slot.time,
                    capacity: Number(slot.capacity),
                    is_active: slot.is_active,
                    sort_order: Number(slot.sort_order || index + 1),
                })),
            };

            const response = await api.put<BookingSlotsResponse>('/v1/admin/booking-slots', payload);
            setSlots(normalizeSlots(response.data.slots));
            setLastSyncedAt(new Date());
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save booking slots.');
            return false;
        } finally {
            setSaving(false);
        }
    }, []);

    const updateSlot = (index: number, patch: Partial<BookingSlotDraft>) => {
        setSlots((prev) => prev.map((slot, idx) => (idx === index ? { ...slot, ...patch } : slot)));
    };

    const commitCurrentSlots = () => {
        if (saving || loading) return;
        void persistSlots(slots);
    };

    const removeSlot = (index: number) => {
        const nextSlots = slots.filter((_, idx) => idx !== index);
        setSlots(nextSlots);
        void persistSlots(nextSlots);
    };

    const openAddSlotModal = () => {
        setAddSlotDraft({
            ...defaultDraft(),
            sort_order: slots.length + 1,
        });
        setAddSlotError(null);
        setIsAddModalOpen(true);
    };

    const closeAddSlotModal = () => {
        if (saving) return;
        setIsAddModalOpen(false);
        setAddSlotError(null);
    };

    const saveNewSlot = async () => {
        const draft = {
            time: addSlotDraft.time,
            capacity: Math.max(1, Number(addSlotDraft.capacity) || 1),
            is_active: addSlotDraft.is_active,
            sort_order: Math.max(1, Number(addSlotDraft.sort_order) || slots.length + 1),
        };

        if (!draft.time) {
            setAddSlotError('Time is required.');
            return;
        }

        if (slots.some((slot) => slot.time === draft.time)) {
            setAddSlotError('A slot with this time already exists.');
            return;
        }

        setAddSlotError(null);
        const nextSlots = [...slots, draft];
        setSlots(nextSlots);
        const success = await persistSlots(nextSlots);
        if (success) {
            setIsAddModalOpen(false);
            setAddSlotDraft(defaultDraft());
        }
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full min-h-0 flex-1 flex-col gap-6 overflow-hidden p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">Live slot capacity configuration for customer service bookings.</p>
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
                            onClick={openAddSlotModal}
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-3 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#e6c24e] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Plus className="h-4 w-4" />
                            Add Slot
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>Live updates every {Math.floor(SLOT_POLL_INTERVAL_MS / 1000)}s</span>
                    {lastSyncedAt && <span>Last sync {lastSyncedAt.toLocaleTimeString('en-US')}</span>}
                </div>

                {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">{error}</div>}

                {hasDuplicateTimes && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-500">
                        Duplicate slot times detected. Each slot time must be unique before saving.
                    </div>
                )}

                <div className="min-h-0 flex-1">
                    <div className="profile-card max-h-full overflow-hidden rounded-xl">
                        {loading ? (
                            <div className="flex items-center justify-center p-10">
                                <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="max-h-full overflow-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b text-left text-sm text-muted-foreground">
                                            <th className="px-4 py-3 font-medium">Time</th>
                                            <th className="px-4 py-3 font-medium">Capacity</th>
                                            <th className="px-4 py-3 font-medium">Sort Order</th>
                                            <th className="px-4 py-3 font-medium">Active</th>
                                            <th className="px-4 py-3 font-medium">Actions</th>
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
                                                        onBlur={commitCurrentSlots}
                                                        className="h-9 rounded-lg border bg-background px-3 text-sm"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={100}
                                                        value={slot.capacity}
                                                        onChange={(e) => updateSlot(index, { capacity: Number(e.target.value) || 1 })}
                                                        onBlur={commitCurrentSlots}
                                                        className="h-9 w-24 rounded-lg border bg-background px-3 text-sm"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={1000}
                                                        value={slot.sort_order}
                                                        onChange={(e) => updateSlot(index, { sort_order: Number(e.target.value) || 1 })}
                                                        onBlur={commitCurrentSlots}
                                                        className="h-9 w-24 rounded-lg border bg-background px-3 text-sm"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <label className="inline-flex items-center gap-2 text-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={slot.is_active}
                                                            onChange={(e) => {
                                                                const nextSlots = slots.map((currentSlot, idx) =>
                                                                    idx === index ? { ...currentSlot, is_active: e.target.checked } : currentSlot,
                                                                );
                                                                setSlots(nextSlots);
                                                                void persistSlots(nextSlots);
                                                            }}
                                                            className="h-4 w-4"
                                                        />
                                                        <span>{slot.is_active ? 'Enabled' : 'Disabled'}</span>
                                                    </label>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => removeSlot(index)}
                                                        disabled={slots.length <= 1 || saving}
                                                        className="inline-flex items-center gap-1 rounded-lg py-1.5 pr-3 pl-0 text-sm text-red-500 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
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

                <Dialog open={isAddModalOpen} onOpenChange={(open) => !open && closeAddSlotModal()}>
                    <DialogContent className="border-[#2a2a2e] bg-linear-to-br from-[#1e1e22] to-[#0d0d10] sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-base font-semibold">Add New Slot</DialogTitle>
                        </DialogHeader>

                        <div className="flex flex-col gap-4 py-2">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Time</label>
                                <Input
                                    type="time"
                                    value={addSlotDraft.time}
                                    onChange={(e) => setAddSlotDraft((prev) => ({ ...prev, time: e.target.value }))}
                                    className="border-[#2a2a2e] bg-[#0d0d10] focus-visible:border-[#d4af37] focus-visible:ring-[#d4af37]/40"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Capacity</label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={addSlotDraft.capacity}
                                    onChange={(e) => setAddSlotDraft((prev) => ({ ...prev, capacity: Number(e.target.value) || 1 }))}
                                    className="border-[#2a2a2e] bg-[#0d0d10] focus-visible:border-[#d4af37] focus-visible:ring-[#d4af37]/40"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Sort Order</label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={1000}
                                    value={addSlotDraft.sort_order}
                                    onChange={(e) => setAddSlotDraft((prev) => ({ ...prev, sort_order: Number(e.target.value) || 1 }))}
                                    className="border-[#2a2a2e] bg-[#0d0d10] focus-visible:border-[#d4af37] focus-visible:ring-[#d4af37]/40"
                                />
                            </div>

                            <label className="inline-flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={addSlotDraft.is_active}
                                    onChange={(e) => setAddSlotDraft((prev) => ({ ...prev, is_active: e.target.checked }))}
                                    className="h-4 w-4"
                                />
                                <span>{addSlotDraft.is_active ? 'Enabled' : 'Disabled'}</span>
                            </label>

                            {addSlotError && <p className="text-xs text-red-500">{addSlotError}</p>}
                        </div>

                        <DialogFooter className="gap-2">
                            <button
                                type="button"
                                onClick={closeAddSlotModal}
                                disabled={saving}
                                className="rounded-lg border border-[#2a2a2e] px-4 py-2 text-sm font-medium transition-colors hover:bg-[#1e1e22] disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => void saveNewSlot()}
                                disabled={saving}
                                className="rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#e6c24e] disabled:opacity-60"
                            >
                                {saving ? 'Saving…' : 'Save Changes'}
                            </button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
