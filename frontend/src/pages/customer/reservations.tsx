import CustomerLayout from '@/components/layout/customer-layout';
import { reservationService } from '@/services/reservationService';
import { type BreadcrumbItem } from '@/types';
import { Reservation } from '@/types/inventory';
import {
    AlertCircle,
    AlertTriangle,
    Calendar,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    Loader2,
    Package,
    RotateCcw,
    Tag,
    XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/customer' },
    { title: 'My Reservations', href: '/customer/reservations' },
];

// ── Status helpers ────────────────────────────────────────────────────────────
type StatusVariant = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';

const STATUS_LABEL: Record<StatusVariant, string> = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

const STATUS_CLASSES: Record<StatusVariant, string> = {
    pending: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
    approved: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    rejected: 'bg-red-500/15 text-red-400 border border-red-500/30',
    completed: 'bg-green-500/15 text-green-400 border border-green-500/30',
    cancelled: 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30',
};

const STATUS_ICON: Record<StatusVariant, typeof CheckCircle2> = {
    pending: RotateCcw,
    approved: CheckCircle2,
    rejected: XCircle,
    completed: CheckCircle2,
    cancelled: XCircle,
};

function StatusBadge({ status }: { status: StatusVariant }) {
    const Icon = STATUS_ICON[status];
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}>
            <Icon className="h-3 w-3" />
            {STATUS_LABEL[status]}
        </span>
    );
}

// ── Fee payment badge ─────────────────────────────────────────────────────────
function FeeBadge({ status }: { status?: string | null }) {
    if (!status || status === 'EXPIRED') {
        return <span className="text-xs text-zinc-500">—</span>;
    }
    if (status === 'PAID') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/15 px-2.5 py-0.5 text-xs font-medium text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                Paid
            </span>
        );
    }
    if (status === 'PENDING') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/15 px-2.5 py-0.5 text-xs font-medium text-yellow-400">
                <RotateCcw className="h-3 w-3" />
                Awaiting Payment
            </span>
        );
    }
    return <span className="text-xs text-zinc-400">{status}</span>;
}

// ── Currency formatter ────────────────────────────────────────────────────────
function fmt(amount: number) {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

// ── Reservation Card ──────────────────────────────────────────────────────────
function ReservationCard({ reservation, onPayFee, payingId }: { reservation: Reservation; onPayFee: (id: number) => void; payingId: number | null }) {
    const hasFee = reservation.reservation_fee != null && reservation.reservation_fee > 0;
    const feePaid = reservation.fee_payment_status === 'PAID';
    const canPay = hasFee && !feePaid && reservation.status === 'pending';
    const isPaying = payingId === reservation.id;

    // Determine inventory name from nested object (API returns `inventory` or `inventory_item`)
    const inventoryName =
        (reservation as unknown as Record<string, { item_name?: string }>)['inventory']?.item_name ?? `Item #${reservation.item_id}`;

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition hover:border-white/20">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <p className="text-xs text-zinc-500">Job Order</p>
                    <p className="font-mono text-sm font-semibold text-white">{reservation.job_order_number}</p>
                </div>
                <StatusBadge status={reservation.status as StatusVariant} />
            </div>

            {/* Part info */}
            <div className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
                <Package className="h-4 w-4 shrink-0 text-zinc-500" />
                <span className="font-medium">{inventoryName}</span>
                <span className="text-zinc-500">× {reservation.quantity}</span>
            </div>

            {/* Date */}
            {reservation.created_at && (
                <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                    <Calendar className="h-3 w-3" />
                    <span>
                        Reserved {new Date(reservation.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                </div>
            )}

            {/* Notes */}
            {reservation.notes && <p className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-zinc-400">{reservation.notes}</p>}

            {/* Fee row */}
            {hasFee && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-zinc-400" />
                        <div>
                            <p className="text-xs text-zinc-500">Reservation Fee</p>
                            <p className="text-sm font-semibold text-white">{fmt(reservation.reservation_fee!)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <FeeBadge status={reservation.fee_payment_status} />
                        {canPay && (
                            <button
                                onClick={() => onPayFee(reservation.id)}
                                disabled={isPaying}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#d4af37] px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-[#c9a227] disabled:opacity-60"
                            >
                                {isPaying ? (
                                    <>
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Redirecting…
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="h-3 w-3" />
                                        Pay Now
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CustomerReservations() {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [payingId, setPayingId] = useState<number | null>(null);
    const [payError, setPayError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [searchParams] = useSearchParams();

    // Payment feedback from Xendit redirect
    const paymentResult = searchParams.get('payment');

    const load = useCallback(async (p: number) => {
        setLoading(true);
        setError(null);
        try {
            const result = await reservationService.getMyReservations({ page: p, per_page: 10 });
            setReservations(result.data);
            setLastPage(result.last_page ?? 1);
        } catch {
            setError('Failed to load reservations. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load(page);
    }, [load, page]);

    const handlePayFee = async (id: number) => {
        setPayingId(id);
        setPayError(null);
        try {
            const res = await reservationService.payReservationFee(id);
            const url = res.data?.payment_url;
            if (url) {
                window.location.href = url;
            } else {
                setPayError('Payment URL not received. Please try again.');
                setPayingId(null);
            }
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setPayError(msg ?? 'Payment initiation failed. Please try again.');
            setPayingId(null);
        }
    };

    return (
        <CustomerLayout breadcrumbs={breadcrumbs}>
            <div className="mx-auto max-w-3xl px-4 py-8">
                {/* Page title */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-white">My Reservations</h1>
                    <p className="mt-1 text-sm text-zinc-400">Track your part reservations and pay outstanding fees.</p>
                </div>

                {/* Payment result banner */}
                {paymentResult === 'success' && (
                    <div className="mb-4 flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>Payment successful! Your reservation fee has been received. The shop will review your reservation shortly.</span>
                    </div>
                )}
                {paymentResult === 'failed' && (
                    <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>Payment was not completed. You can try again by clicking "Pay Now" on your reservation.</span>
                    </div>
                )}

                {/* Pay error */}
                {payError && (
                    <div className="mb-4 flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{payError}</span>
                    </div>
                )}

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-zinc-500">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center gap-3 py-20 text-center text-zinc-500">
                        <AlertCircle className="h-8 w-8 text-red-400" />
                        <p className="text-sm">{error}</p>
                        <button onClick={() => load(page)} className="mt-1 text-xs text-[#d4af37] underline underline-offset-4">
                            Retry
                        </button>
                    </div>
                ) : reservations.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-20 text-center text-zinc-500">
                        <Package className="h-10 w-10 opacity-40" />
                        <p className="text-sm">You have no reservations yet.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {reservations.map((r) => (
                            <ReservationCard key={r.id} reservation={r} onPayFee={handlePayFee} payingId={payingId} />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {!loading && !error && lastPage > 1 && (
                    <div className="mt-6 flex items-center justify-center gap-3">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 transition hover:bg-white/10 disabled:opacity-40"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-sm text-zinc-400">
                            Page {page} of {lastPage}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                            disabled={page === lastPage}
                            className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 transition hover:bg-white/10 disabled:opacity-40"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>
        </CustomerLayout>
    );
}
