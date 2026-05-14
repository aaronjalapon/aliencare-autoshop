import { customerService } from '@/services/customerService';
import { Loader2, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

interface Booking {
    id: number;
    jobOrder: string;
    serviceName: string;
    arrivalDateRaw: string | null;
    arrivalTimeRaw: string | null;
}

interface RescheduleModalProps {
    booking: Booking;
    onClose: () => void;
    onRescheduled: () => void;
}

export function RescheduleModal({ booking, onClose, onRescheduled }: RescheduleModalProps) {
    const today = new Date().toISOString().slice(0, 10);
    const [date, setDate] = useState(booking.arrivalDateRaw ?? today);
    const [time, setTime] = useState(booking.arrivalTimeRaw ?? '');
    const [slots, setSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!date) {
            setSlots([]);
            return;
        }

        let cancelled = false;
        setLoadingSlots(true);

        customerService
            .getBookingAvailability(date)
            .then((res) => {
                if (cancelled) return;
                const available = (res.data?.slots ?? []).filter((s) => s.status === 'available').map((s) => s.time);
                setSlots(available);
            })
            .catch(() => {
                if (!cancelled) setSlots([]);
            })
            .finally(() => {
                if (!cancelled) setLoadingSlots(false);
            });
        return () => {
            cancelled = true;
        };
    }, [date]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!date || !time) {
            setError('Please select both date and time.');
            return;
        }

        setError(null);
        setSubmitting(true);

        try {
            await customerService.rescheduleMyJobOrder(booking.id, {
                arrival_date: date,
                arrival_time: time,
            });
            onRescheduled();
        } catch (err) {
            const message =
                typeof err === 'object' && err !== null && typeof (err as { message?: unknown }).message === 'string'
                    ? (err as { message: string }).message
                    : 'Failed to reschedule. Please try again.';
            setError(message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
            <div className="profile-card w-full max-w-md rounded-xl p-5" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Reschedule Booking</h3>
                    <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <p className="mt-1 text-sm text-muted-foreground">
                    {booking.jobOrder} — {booking.serviceName}
                </p>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase">New Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => {
                                setDate(e.target.value);
                                setTime('');
                            }}
                            min={today}
                            required
                            className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm text-foreground focus:border-[#d4af37] focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase">New Time</label>
                        {loadingSlots ? (
                            <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" /> Loading available slots...
                            </div>
                        ) : slots.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                                {slots.map((slot) => (
                                    <button
                                        key={slot}
                                        type="button"
                                        onClick={() => setTime(slot)}
                                        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                                            time === slot
                                                ? 'border-[#d4af37] bg-[#d4af37] text-black'
                                                : 'border-[#2a2a2e] text-muted-foreground hover:border-[#d4af37]/40 hover:text-foreground'
                                        }`}
                                    >
                                        {slot}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                required
                                className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm text-foreground focus:border-[#d4af37] focus:outline-none"
                            />
                        )}
                    </div>

                    {error && <p className="text-sm text-red-400">{error}</p>}

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-[#2a2a2e] px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {submitting ? 'Rescheduling...' : 'Confirm Reschedule'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
