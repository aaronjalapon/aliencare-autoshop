import { BayOption, MechanicOption, jobOrderService } from '@/services/jobOrderService';
import { Clock, Loader2, Sparkles } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

interface SchedulingContext {
    arrival_date?: string | null;
    arrival_time?: string | null;
    service_id?: number;
    job_order_id?: number;
}

interface Props {
    open: boolean;
    onClose: () => void;
    onStarted: () => void;
    onSubmit: (mechanicId: number, bayId: number) => Promise<void>;
    scheduling?: SchedulingContext;
}

export default function StartServiceModal({ open, onClose, onStarted, onSubmit, scheduling }: Props) {
    const [mechanicId, setMechanicId] = useState('');
    const [bayId, setBayId] = useState('');
    const [mechanics, setMechanics] = useState<MechanicOption[]>([]);
    const [bays, setBays] = useState<BayOption[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const schedulingParams = useMemo(() => {
        if (!scheduling?.arrival_date || !scheduling?.arrival_time) return {};
        return {
            arrival_date: scheduling.arrival_date,
            arrival_time: scheduling.arrival_time,
            service_id: scheduling.service_id,
            exclude_job_order_id: scheduling.job_order_id,
        };
    }, [scheduling]);

    const loadResources = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const [mResponse, bResponse] = await Promise.all([
                jobOrderService.getMechanics(schedulingParams),
                jobOrderService.getBays(schedulingParams),
            ]);
            // Filter: exclude on-leave mechanics. Busy mechanics are allowed
            // when the time slot doesn't conflict with their existing assignments.
            setMechanics(
                mResponse.data.filter((m) => {
                    const status = m.availability_status.toLowerCase();
                    if (status === 'on_leave') return false;
                    if (status === 'busy') return !m.has_time_conflict;
                    return true;
                }),
            );
            setBays(bResponse.data.filter((b) => b.status.toLowerCase() === 'available' && !b.has_time_conflict));
        } catch {
            setLoadError('Failed to load mechanics and bays.');
        } finally {
            setIsLoading(false);
        }
    }, [schedulingParams]);

    useEffect(() => {
        if (!open) return;
        setMechanicId('');
        setBayId('');
        setSubmitError(null);
        loadResources();
    }, [open, loadResources]);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const mId = Number.parseInt(mechanicId, 10);
        const bId = Number.parseInt(bayId, 10);
        if (!Number.isFinite(mId) || !Number.isFinite(bId)) {
            setSubmitError('Select a mechanic and bay to start service.');
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);
        try {
            await onSubmit(mId, bId);
            onStarted();
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : 'Failed to start job order.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getMatchBadge = (score?: number): string | null => {
        if (score === undefined || score === null) return null;
        if (score >= 3) return 'Best Match';
        if (score >= 2) return 'Recommended';
        return null;
    };

    const hasSchedulingContext = !!(scheduling?.arrival_date && scheduling?.arrival_time);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
            <div className="profile-card w-full max-w-lg rounded-xl p-5" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold">Start Service</h3>
                <p className="mt-1 text-sm text-muted-foreground">Assign a mechanic and bay before moving this job order to In Progress.</p>

                {hasSchedulingContext && (
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 px-2.5 py-1 text-[11px] text-[#d4af37]">
                        <Clock className="h-3 w-3" />
                        Scheduled: {scheduling?.arrival_date} &middot; {scheduling?.arrival_time}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                    <div>
                        <label className="mb-1 block text-xs font-semibold tracking-wider text-muted-foreground uppercase">Mechanic</label>
                        <select
                            value={mechanicId}
                            onChange={(e) => setMechanicId(e.target.value)}
                            className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                        >
                            <option value="">Select mechanic</option>
                            {mechanics.map((m) => {
                                const badge = getMatchBadge(m.service_match_score);
                                const conflictLabel = m.has_time_conflict ? ' [Time Conflict]' : '';
                                return (
                                    <option key={m.id} value={m.id}>
                                        {m.name ?? `Mechanic #${m.id}`} - {m.specialization ?? 'General'}
                                        {badge ? ` ★ ${badge}` : ''}
                                        {conflictLabel}
                                    </option>
                                );
                            })}
                        </select>
                        {mechanics.length > 0 && mechanics.some((m) => (m.service_match_score ?? 0) >= 2) && (
                            <p className="mt-1 flex items-center gap-1 text-[10px] text-[#d4af37]">
                                <Sparkles className="h-2.5 w-2.5" /> Mechanics marked with ★ are recommended for this service type
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-semibold tracking-wider text-muted-foreground uppercase">Bay</label>
                        <select
                            value={bayId}
                            onChange={(e) => setBayId(e.target.value)}
                            className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                        >
                            <option value="">Select bay</option>
                            {bays.map((b) => {
                                const conflictLabel = b.has_time_conflict ? ' [Time Conflict]' : '';
                                return (
                                    <option key={b.id} value={b.id}>
                                        {b.name}
                                        {conflictLabel}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {isLoading && (
                        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading mechanics and bays...
                        </div>
                    )}
                    {loadError && <p className="text-sm text-red-300">{loadError}</p>}
                    {submitError && <p className="text-sm text-red-300">{submitError}</p>}

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-[#2a2a2e] px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSubmitting ? 'Starting...' : 'Start Service'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
