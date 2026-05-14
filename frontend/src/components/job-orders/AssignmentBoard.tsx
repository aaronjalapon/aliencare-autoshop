import { getServiceName, getVehicleLabel } from '@/lib/jobOrderFormatters';
import { BayOption, MechanicOption, jobOrderService } from '@/services/jobOrderService';
import type { JobOrder } from '@/types/customer';
import { CheckCircle2, Clock, Loader2, Sparkles, UserCheck, Warehouse, Wrench } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface Props {
    selectedOrder: JobOrder | null;
    allOrders: JobOrder[];
    onAssignmentComplete: () => void;
}

interface AssignmentState {
    mechanicId: string;
    bayId: string;
}

export default function AssignmentBoard({ selectedOrder, allOrders, onAssignmentComplete }: Props) {
    const [mechanics, setMechanics] = useState<MechanicOption[]>([]);
    const [bays, setBays] = useState<BayOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [assignment, setAssignment] = useState<AssignmentState>({ mechanicId: '', bayId: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const schedulingParams = useMemo(() => {
        if (!selectedOrder?.arrival_date || !selectedOrder?.arrival_time) return {};
        return {
            arrival_date: selectedOrder.arrival_date,
            arrival_time: selectedOrder.arrival_time,
            service_id: selectedOrder.service?.id,
            exclude_job_order_id: selectedOrder.id,
        };
    }, [selectedOrder?.arrival_date, selectedOrder?.arrival_time, selectedOrder?.service?.id, selectedOrder?.id]);

    const loadResources = useCallback(async () => {
        try {
            setIsLoading(true);
            setLoadError(null);
            const [mResponse, bResponse] = await Promise.all([
                jobOrderService.getMechanics(schedulingParams),
                jobOrderService.getBays(schedulingParams),
            ]);
            setMechanics(mResponse.data);
            setBays(bResponse.data);
        } catch {
            setLoadError('Failed to load mechanics and bays.');
        } finally {
            setIsLoading(false);
        }
    }, [schedulingParams]);

    useEffect(() => {
        loadResources();
    }, [loadResources]);

    useEffect(() => {
        setAssignment({ mechanicId: '', bayId: '' });
        setSubmitError(null);
    }, [selectedOrder?.id]);

    const handleAssign = async () => {
        if (!selectedOrder) return;

        const mechanicId = Number.parseInt(assignment.mechanicId, 10);
        const bayId = Number.parseInt(assignment.bayId, 10);

        if (!Number.isFinite(mechanicId) || !Number.isFinite(bayId)) {
            setSubmitError('Select both a mechanic and a bay.');
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            await jobOrderService.startJobOrder(selectedOrder.id, {
                mechanic_id: mechanicId,
                bay_id: bayId,
            });
            setAssignment({ mechanicId: '', bayId: '' });
            onAssignmentComplete();
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : 'Failed to assign.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isMechanicBusy = (m: MechanicOption) => m.availability_status.toLowerCase() === 'busy';
    const isMechanicOnLeave = (m: MechanicOption) => m.availability_status.toLowerCase() === 'on_leave';

    const availableMechanics = mechanics.filter((m) => {
        if (isMechanicOnLeave(m)) return false;
        if (isMechanicBusy(m)) return !m.has_time_conflict;
        return !m.has_time_conflict;
    });
    const conflictedMechanics = mechanics.filter((m) => {
        if (isMechanicOnLeave(m) || isMechanicBusy(m)) return false;
        return m.has_time_conflict;
    });
    const busyMechanics = mechanics.filter((m) => {
        if (isMechanicOnLeave(m)) return false;
        return isMechanicBusy(m) && m.has_time_conflict;
    });
    const onLeaveMechanics = mechanics.filter((m) => isMechanicOnLeave(m));
    const availableBays = bays.filter((b) => b.status.toLowerCase() === 'available' && !b.has_time_conflict);
    const conflictedBays = bays.filter((b) => b.status.toLowerCase() === 'available' && b.has_time_conflict);
    const occupiedBays = bays.filter((b) => b.status.toLowerCase() !== 'available');

    const hasSchedulingContext = !!(selectedOrder?.arrival_date && selectedOrder?.arrival_time);

    // ── Empty state ────────────────────────────────────────────────────────
    if (!selectedOrder) {
        return (
            <aside className="profile-card flex min-h-0 flex-col items-center justify-center rounded-xl p-6">
                <Wrench className="mb-4 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm font-semibold text-muted-foreground">No Order Selected</p>
                <p className="mt-1 text-center text-xs text-muted-foreground/70">Select a job order from the list to assign a mechanic and bay.</p>
            </aside>
        );
    }

    // ── Assigned orders summary ────────────────────────────────────────────
    const assignedCount = allOrders.filter((o) => o.status === 'in_progress').length;

    return (
        <aside className="profile-card flex min-h-0 flex-col rounded-xl p-5">
            {/* Header — always visible */}
            <div className="shrink-0 space-y-3 border-b border-[#2a2a2e] pb-4">
                <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold tracking-wider text-[#d4af37] uppercase">Assign Resources</p>
                    {assignedCount > 0 && (
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                            {assignedCount} in progress
                        </span>
                    )}
                </div>
                <div>
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{selectedOrder.jo_number}</p>
                    <h2 className="mt-0.5 text-lg font-bold">{selectedOrder.customer?.full_name ?? 'Unknown Customer'}</h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {getVehicleLabel(selectedOrder)} &middot; {getServiceName(selectedOrder)}
                    </p>
                    {hasSchedulingContext && (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 px-2.5 py-1 text-[11px] text-[#d4af37]">
                            <Clock className="h-3 w-3" />
                            {selectedOrder.arrival_date} &middot; {selectedOrder.arrival_time}
                        </div>
                    )}
                </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 space-y-5 overflow-y-auto py-4">
                {loadError && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{loadError}</div>}

                {isLoading ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading resources...
                    </div>
                ) : (
                    <>
                        {/* Mechanics */}
                        <div>
                            <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <UserCheck className="h-4 w-4 text-[#d4af37]" />
                                    <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Mechanics</h3>
                                </div>
                                <span className="rounded-full bg-[#d4af37]/10 px-2 py-0.5 text-[10px] font-semibold text-[#d4af37]">
                                    {availableMechanics.length} available
                                </span>
                            </div>
                            <div className="space-y-2">
                                {availableMechanics.map((m) => {
                                    const isSelected = assignment.mechanicId === String(m.id);
                                    const isRecommended = (m.service_match_score ?? 0) >= 2;
                                    return (
                                        <button
                                            key={m.id}
                                            onClick={() => setAssignment((prev) => ({ ...prev, mechanicId: String(m.id) }))}
                                            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                                                isSelected
                                                    ? 'border-[#d4af37] bg-[#d4af37]/10 ring-1 ring-[#d4af37]/40'
                                                    : 'border-[#2a2a2e] bg-[#0d0d10] hover:border-[#3a3a40] hover:bg-[#13141a]'
                                            }`}
                                        >
                                            <div
                                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                                                    isSelected ? 'bg-[#d4af37] text-black' : 'bg-[#1a1b20] text-muted-foreground'
                                                }`}
                                            >
                                                {(m.name ?? `#${m.id}`).charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-sm font-semibold">{m.name ?? `Mechanic #${m.id}`}</p>
                                                    {isRecommended && (
                                                        <span className="inline-flex items-center gap-0.5 rounded-full bg-[#d4af37]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#d4af37]">
                                                            <Sparkles className="h-2.5 w-2.5" /> Recommended
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {m.specialization ?? 'General'}
                                                    {isRecommended && ' — matches service type'}
                                                </p>
                                            </div>
                                            {isSelected && <CheckCircle2 className="h-5 w-5 shrink-0 text-[#d4af37]" />}
                                        </button>
                                    );
                                })}
                                {conflictedMechanics.map((m) => (
                                    <div key={m.id} className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-xs font-bold text-amber-400">
                                            {(m.name ?? `#${m.id}`).charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-amber-300">{m.name ?? `Mechanic #${m.id}`}</p>
                                            <p className="text-xs text-amber-400/80">
                                                <Clock className="mr-0.5 inline h-3 w-3" />
                                                Conflicting schedule at this time
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {busyMechanics.map((m) => (
                                    <div
                                        key={m.id}
                                        className="flex items-center gap-3 rounded-xl border border-[#2a2a2e]/30 bg-[#0d0d10]/50 p-3 opacity-40"
                                    >
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1a1b20] text-xs font-bold text-muted-foreground">
                                            {(m.name ?? `#${m.id}`).charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold">{m.name ?? `Mechanic #${m.id}`}</p>
                                            <p className="text-xs text-muted-foreground">Conflicting schedule at this time</p>
                                        </div>
                                    </div>
                                ))}
                                {onLeaveMechanics.map((m) => (
                                    <div
                                        key={m.id}
                                        className="flex items-center gap-3 rounded-xl border border-[#2a2a2e]/20 bg-[#0d0d10]/30 p-3 opacity-30"
                                    >
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1a1b20] text-xs font-bold text-muted-foreground">
                                            {(m.name ?? `#${m.id}`).charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold">{m.name ?? `Mechanic #${m.id}`}</p>
                                            <p className="text-xs text-muted-foreground">On leave</p>
                                        </div>
                                    </div>
                                ))}
                                {mechanics.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">No mechanics registered.</p>}
                            </div>
                        </div>

                        {/* Bays */}
                        <div>
                            <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Warehouse className="h-4 w-4 text-[#d4af37]" />
                                    <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Service Bays</h3>
                                </div>
                                <span className="rounded-full bg-[#d4af37]/10 px-2 py-0.5 text-[10px] font-semibold text-[#d4af37]">
                                    {availableBays.length} available
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {availableBays.map((b) => {
                                    const isSelected = assignment.bayId === String(b.id);
                                    return (
                                        <button
                                            key={b.id}
                                            onClick={() => setAssignment((prev) => ({ ...prev, bayId: String(b.id) }))}
                                            className={`flex flex-col items-center justify-center rounded-xl border p-3 transition-all ${
                                                isSelected
                                                    ? 'border-[#d4af37] bg-[#d4af37]/10 ring-1 ring-[#d4af37]/40'
                                                    : 'border-[#2a2a2e] bg-[#0d0d10] hover:border-[#3a3a40] hover:bg-[#13141a]'
                                            }`}
                                        >
                                            <span className={`text-lg font-bold ${isSelected ? 'text-[#d4af37]' : 'text-foreground'}`}>{b.name}</span>
                                            <span className="mt-0.5 text-[10px] text-muted-foreground">Available</span>
                                        </button>
                                    );
                                })}
                                {conflictedBays.map((b) => (
                                    <div
                                        key={b.id}
                                        className="flex flex-col items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/5 p-3"
                                    >
                                        <span className="text-lg font-bold text-amber-400">{b.name}</span>
                                        <span className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] text-amber-400/80">
                                            <Clock className="h-2.5 w-2.5" /> Time conflict
                                        </span>
                                    </div>
                                ))}
                                {occupiedBays.map((b) => (
                                    <div
                                        key={b.id}
                                        className="flex flex-col items-center justify-center rounded-xl border border-[#2a2a2e]/30 bg-[#0d0d10]/50 p-3 opacity-40"
                                    >
                                        <span className="text-lg font-bold text-muted-foreground">{b.name}</span>
                                        <span className="mt-0.5 text-[10px] text-muted-foreground">Occupied</span>
                                    </div>
                                ))}
                                {bays.length === 0 && (
                                    <p className="col-span-2 py-4 text-center text-xs text-muted-foreground">No bays registered.</p>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Sticky footer */}
            <div className="shrink-0 space-y-2 border-t border-[#2a2a2e] pt-4">
                {submitError && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">{submitError}</div>}
                <button
                    onClick={handleAssign}
                    disabled={isSubmitting || !assignment.mechanicId || !assignment.bayId}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Assigning...
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="h-4 w-4" /> Confirm Assignment
                        </>
                    )}
                </button>
            </div>
        </aside>
    );
}
