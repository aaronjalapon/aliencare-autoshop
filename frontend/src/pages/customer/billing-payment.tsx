import CustomerLayout from '@/components/layout/customer-layout';
import { useCustomerBilling } from '@/hooks/useCustomerBilling';
import { paymentService } from '@/services/paymentService';
import { type BreadcrumbItem } from '@/types';
import { CustomerBillingReceipt, CustomerTransaction } from '@/types/customer';
import { AlertCircle, ArrowLeft, Banknote, Calendar, CheckCircle2, CreditCard, Download, Printer, Receipt, TrendingUp, XCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/customer' },
    { title: 'Billing & Payment', href: '/customer/billing' },
];

type TabType = 'pending' | 'paid' | 'receipts';

// ── Receipt types ──────────────────────────────────────────────────────────────
interface ReceiptLineItem {
    label: string;
    amount: number;
}

interface ReceiptRecord {
    id: number;
    receiptNo: string;
    transactionId: string;
    jobOrderNo: string;
    date: string;
    bookingDate: string;
    bookingTime: string;
    arrival: string;
    arrivalTime: string;
    branch: string;
    customerName: string;
    customerPhone: string;
    vehicle: string;
    vehiclePlate: string;
    lineItems: ReceiptLineItem[];
    totalPaid: number;
    paymentMethod: string;
}

function formatDateLabel(value: string | null | undefined): string {
    if (!value) return '—';
    const date = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDetailedDateLabel(value: string | null | undefined): string {
    if (!value) return '—';
    const date = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimeLabel(value: string | null | undefined): string {
    if (!value) return '—';

    if (!value.includes('T') && /^\d{2}:\d{2}$/.test(value)) {
        const [hourText, minuteText] = value.split(':');
        const hour = Number(hourText);
        const minute = Number(minuteText);

        if (Number.isNaN(hour) || Number.isNaN(minute)) return value;

        const period = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 === 0 ? 12 : hour % 12;
        return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
    }

    return new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatPaymentMethod(value: string | null | undefined): string {
    if (!value) return 'N/A';

    return value
        .split(/[_\s-]+/)
        .map((part) => (part.length > 0 ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
        .join(' ');
}

function formatReceiptNumber(transactionId: number, paidAtOrCreatedAt: string | null | undefined): string {
    const year = paidAtOrCreatedAt ? new Date(paidAtOrCreatedAt).getFullYear() : new Date().getFullYear();
    return `RC-${year}-${String(transactionId).padStart(5, '0')}`;
}

function mapReceiptToView(receipt: CustomerBillingReceipt): ReceiptRecord {
    const receiptDate = receipt.paid_at ?? receipt.created_at;
    const branch = receipt.branch_address ? `${receipt.branch_name}, ${receipt.branch_address}` : receipt.branch_name;
    const vehicle = [receipt.vehicle_make, receipt.vehicle_model].filter(Boolean).join(' ').trim() || 'Vehicle';

    return {
        id: receipt.transaction_id,
        receiptNo: formatReceiptNumber(receipt.transaction_id, receiptDate),
        transactionId: `TXN-${String(receipt.transaction_id).padStart(6, '0')}`,
        jobOrderNo: receipt.job_order_no ?? `JO-${receipt.job_order_id ?? 'N/A'}`,
        date: receiptDate ?? receipt.created_at,
        bookingDate: formatDateLabel(receipt.booking_date),
        bookingTime: formatTimeLabel(receipt.booking_time),
        arrival: formatDetailedDateLabel(receipt.arrival_date),
        arrivalTime: formatTimeLabel(receipt.arrival_time),
        branch,
        customerName: receipt.customer_name,
        customerPhone: receipt.customer_phone ?? '—',
        vehicle,
        vehiclePlate: receipt.vehicle_plate ?? '—',
        lineItems: receipt.line_items.map((item) => ({
            label: item.label,
            amount: Number(item.amount),
        })),
        totalPaid: Number(receipt.amount_paid),
        paymentMethod: formatPaymentMethod(receipt.payment_method),
    };
}

// ── ReceiptDetail view ─────────────────────────────────────────────────────────
function ReceiptDetail({ receipt, onBack }: { receipt: ReceiptRecord; onBack: () => void }) {
    const receiptRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const el = receiptRef.current;
        if (!el) return;
        const pw = window.open('', '_blank', 'width=780,height=700');
        if (!pw) return;
        const lineItemsHtml = receipt.lineItems
            .map(
                (li) =>
                    `<div class="row"><span class="muted">${li.label}</span><span>&#8369;${li.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></div>`,
            )
            .join('');
        pw.document.write(`<!DOCTYPE html><html><head><title>Receipt ${receipt.receiptNo}</title><style>
            *{box-sizing:border-box;margin:0;padding:0}
            body{font-family:Arial,sans-serif;color:#111;background:#fff;padding:40px;font-size:13px}
            .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px}
            .brand p{font-weight:900;font-size:18px;line-height:1.15}
            .badge{display:inline-flex;align-items:center;gap:6px;border:1px solid #16a34a;background:#f0fdf4;color:#16a34a;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700}
            .title{text-align:center;color:#b8860b;font-size:15px;font-weight:700;margin:16px 0;padding:8px 0;border-top:1px solid #d4af37;border-bottom:1px solid #d4af37}
            .grid2{display:grid;grid-template-columns:1fr 1fr;gap:4px 32px;margin:12px 0;font-size:13px}
            .muted{color:#666}.gold{color:#b8860b;font-weight:700}
            hr{border:none;border-top:1px solid #ddd;margin:10px 0}
            .row{display:flex;justify-content:space-between;font-size:13px;margin:3px 0}
            .footer{font-size:11px;color:#666;margin-top:12px}
        </style></head><body>
        <div class="header">
            <div class="brand"><p><span style="color:#b8860b">ALIEN</span>CARE</p><p>AUTOSHOP</p></div>
            <span class="badge">&#10003; Paid</span>
        </div>
        <div class="title">Full Payment Receipt</div>
        <div class="grid2">
            <div><span class="muted">Receipt No </span><strong>${receipt.receiptNo}</strong></div>
            <div><span class="muted">Transaction ID </span><strong>${receipt.transactionId}</strong></div>
            <div><span class="muted">Job Order No </span><strong>${receipt.jobOrderNo}</strong></div>
        </div><hr/>
        <div class="grid2">
            <div><span class="muted">Customer </span><strong>${receipt.customerName}</strong></div>
            <div><span class="muted">Phone </span><strong>${receipt.customerPhone}</strong></div>
            <div><span class="muted">Vehicle </span><strong>${receipt.vehicle} - ${receipt.vehiclePlate}</strong></div>
        </div><hr/>
        <div class="row"><span class="gold">Booking Date</span><span class="muted">${receipt.bookingDate} &bull; ${receipt.bookingTime}</span></div>
        <div class="row"><span class="gold">Arrival</span><span class="muted">${receipt.arrival} &bull; ${receipt.arrivalTime}</span></div>
        <div class="row"><span class="gold">Branch</span><span class="muted">${receipt.branch}</span></div><hr/>
        ${lineItemsHtml}<hr/>
        <div class="row"><span class="gold">Total Paid</span><span class="gold">&#8369;${receipt.totalPaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></div><hr/>
        <div class="grid2">
            <div><span class="muted">Payment Method </span><strong>${receipt.paymentMethod}</strong></div>
            <div><span class="muted">Payment Status </span><strong style="color:#16a34a">Paid</strong></div>
        </div><hr/>
        <p class="footer">Thank you! This receipt indicates that your full payment has been received for the requested services.</p>
        </body></html>`);
        pw.document.close();
        pw.focus();
        setTimeout(() => {
            pw.print();
            pw.close();
        }, 400);
    };

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col gap-6 overflow-hidden p-6">
            {/* Back */}
            <button
                onClick={onBack}
                className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Billing &amp; Payment
            </button>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {/* Receipt card */}
                <div ref={receiptRef} className="profile-card mx-auto w-full max-w-2xl rounded-2xl p-8">
                    {/* Brand + Paid badge */}
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xl leading-none font-black tracking-tight">
                                <span className="text-[#d4af37]">ALIEN</span>CARE
                            </p>
                            <p className="text-xl leading-none font-black tracking-tight">AUTOSHOP</p>
                            <p className="mt-1 text-[9px] font-semibold tracking-widest text-muted-foreground uppercase">Customer</p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1 text-xs font-bold text-green-400">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Paid
                        </span>
                    </div>

                    {/* Title with gold dividers */}
                    <div className="my-6 flex items-center gap-3">
                        <div className="flex-1 border-t border-[#d4af37]/40" />
                        <span className="text-sm font-bold tracking-wide text-[#d4af37]">Full Payment Receipt</span>
                        <div className="flex-1 border-t border-[#d4af37]/40" />
                    </div>

                    {/* Receipt meta */}
                    <div className="mb-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        <div>
                            <span className="text-muted-foreground">Receipt No </span>
                            <span className="font-mono font-semibold text-[#d4af37]">{receipt.receiptNo}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Transaction ID </span>
                            <span className="font-mono font-semibold">{receipt.transactionId}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Job Order No </span>
                            <span className="font-mono font-semibold">{receipt.jobOrderNo}</span>
                        </div>
                    </div>

                    <div className="h-px bg-[#2a2a2e]" />

                    {/* Customer info */}
                    <div className="my-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        <div>
                            <span className="text-muted-foreground">Customer </span>
                            <span className="font-semibold">{receipt.customerName}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Phone </span>
                            <span className="font-semibold">{receipt.customerPhone}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Vehicle </span>
                            <span className="font-semibold">
                                {receipt.vehicle} – {receipt.vehiclePlate}
                            </span>
                        </div>
                    </div>

                    <div className="h-px bg-[#2a2a2e]" />

                    {/* Dates & Branch */}
                    <div className="my-4 flex flex-col gap-2 text-sm">
                        {(
                            [
                                { label: 'Booking Date', value: receipt.bookingDate, extra: receipt.bookingTime },
                                { label: 'Arrival', value: receipt.arrival, extra: receipt.arrivalTime },
                                { label: 'Branch', value: receipt.branch, extra: null },
                            ] as { label: string; value: string; extra: string | null }[]
                        ).map(({ label, value, extra }) => (
                            <div key={label} className="flex items-center justify-between gap-4">
                                <span className="shrink-0 font-semibold text-[#d4af37]">{label}</span>
                                <div className="flex items-center gap-2 text-right text-muted-foreground">
                                    <span>{value}</span>
                                    {extra && (
                                        <>
                                            <span className="text-[#d4af37]">•</span>
                                            <span>{extra}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="h-px bg-[#2a2a2e]" />

                    {/* Line items */}
                    <div className="my-4 flex flex-col gap-2">
                        {receipt.lineItems.map((li) => (
                            <div key={li.label} className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{li.label}</span>
                                <span className="font-medium">₱{li.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                            </div>
                        ))}
                    </div>

                    <div className="h-px bg-[#2a2a2e]" />

                    {/* Total */}
                    <div className="my-4 flex items-center justify-between text-sm">
                        <span className="font-bold text-[#d4af37]">Total Paid</span>
                        <span className="text-base font-bold text-[#d4af37]">
                            ₱{receipt.totalPaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </span>
                    </div>

                    <div className="h-px bg-[#2a2a2e]" />

                    {/* Payment info */}
                    <div className="my-4 grid grid-cols-2 gap-x-8 text-sm">
                        <div>
                            <span className="text-muted-foreground">Payment Method </span>
                            <span className="font-semibold">{receipt.paymentMethod}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Payment Status </span>
                            <span className="font-semibold text-green-400">Paid</span>
                        </div>
                    </div>

                    <div className="h-px bg-[#2a2a2e]" />

                    {/* Footer note */}
                    <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                        Thank you! This receipt indicates that your full payment has been received for the requested services.
                    </p>
                </div>

                {/* Action buttons */}
                <div className="mx-auto mt-6 flex w-full max-w-2xl gap-3">
                    <button
                        onClick={handlePrint}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#2a2a2e] py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-[#1e1e22]"
                    >
                        <Download className="h-4 w-4" /> Download PDF
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#d4af37] py-2.5 text-sm font-bold text-black shadow-[0_4px_16px_rgba(212,175,55,0.35)] transition-opacity hover:opacity-90"
                    >
                        <Printer className="h-4 w-4" /> Print Receipt
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function BillingPayment() {
    const [activeTab, setActiveTab] = useState<TabType>('pending');
    const [viewingReceiptId, setViewingReceiptId] = useState<number | null>(null);
    const [payingId, setPayingId] = useState<number | null>(null);
    const [payError, setPayError] = useState<string | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [paymentBanner, setPaymentBanner] = useState<'success' | 'failed' | null>(null);

    const {
        pendingItems,
        paidItems,
        outstandingBalance,
        receipts,
        summary,
        loading,
        error: billingError,
        receiptsError,
        refresh,
    } = useCustomerBilling();

    // Handle Xendit redirect query params (?payment=success|failed)
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pollCountRef = useRef(0);

    const stopPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
        pollCountRef.current = 0;
    }, []);

    useEffect(() => {
        const paymentResult = searchParams.get('payment');
        if (!paymentResult) return;

        setPaymentBanner(paymentResult === 'success' ? 'success' : 'failed');

        // Clear the query param from the URL without a full navigation
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.delete('payment');
                return next;
            },
            { replace: true },
        );

        // Auto-dismiss banner after 8 seconds
        const dismissTimer = setTimeout(() => setPaymentBanner(null), 8000);

        // Poll for updated billing data on success (handles webhook delay)
        if (paymentResult === 'success') {
            // Sync payment statuses with Xendit before refreshing billing data.
            // This ensures transactions are marked PAID even if the webhook
            // hasn't arrived yet (e.g. dev environment, network delay).
            paymentService.syncPayments().finally(() => refresh());
            pollRef.current = setInterval(() => {
                pollCountRef.current += 1;
                if (pollCountRef.current >= 5) {
                    stopPolling();
                    return;
                }
                paymentService.syncPayments().finally(() => refresh());
            }, 3000);
        }

        return () => {
            clearTimeout(dismissTimer);
            stopPolling();
        };
        // Run only once on mount when payment param is present
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Stop polling early once pending items drop (payment reflected)
    useEffect(() => {
        if (pollRef.current && !loading && pendingItems.length === 0) {
            stopPolling();
        }
    }, [pendingItems.length, loading, stopPolling]);

    const displayItems: CustomerTransaction[] = activeTab === 'pending' ? pendingItems : paidItems;
    const mappedReceipts: ReceiptRecord[] = receipts.map(mapReceiptToView);

    const totalPaid = summary.total_paid;
    const pendingServicesTotal = outstandingBalance;
    const lastPayment = summary.last_payment;
    const daysSince = (dateStr: string) => Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);

    const handlePayNow = async (transaction: CustomerTransaction) => {
        // Re-use existing pending invoice URL if available
        if (transaction.payment_url && transaction.xendit_status === 'PENDING') {
            window.location.href = transaction.payment_url;
            return;
        }
        setPayingId(transaction.id);
        setPayError(null);
        try {
            const response = await paymentService.createInvoice(transaction.id);
            window.location.href = response.data.payment_url;
        } catch (err) {
            setPayError(err instanceof Error ? err.message : 'Failed to initiate payment. Please try again.');
            setPayingId(null);
        }
    };

    const handlePayAll = async () => {
        if (pendingItems.length === 0) return;
        setPayingId(-1);
        setPayError(null);
        try {
            const response = await paymentService.payAll();
            window.location.href = response.data.payment_url;
        } catch (err) {
            setPayError(err instanceof Error ? err.message : 'Failed to initiate bulk payment. Please try again.');
            setPayingId(null);
        }
    };

    if (viewingReceiptId !== null) {
        const rc = mappedReceipts.find((r) => r.id === viewingReceiptId);

        if (!rc) {
            return (
                <CustomerLayout breadcrumbs={breadcrumbs}>
                    <div className="flex h-full min-h-0 flex-1 flex-col gap-6 overflow-hidden p-6">
                        <button
                            onClick={() => {
                                setViewingReceiptId(null);
                                setActiveTab('receipts');
                            }}
                            className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Billing &amp; Payment
                        </button>
                        <div className="profile-card rounded-xl p-6 text-sm text-muted-foreground">Receipt not found.</div>
                    </div>
                </CustomerLayout>
            );
        }

        return (
            <CustomerLayout breadcrumbs={breadcrumbs}>
                <ReceiptDetail
                    receipt={rc}
                    onBack={() => {
                        setViewingReceiptId(null);
                        setActiveTab('receipts');
                    }}
                />
            </CustomerLayout>
        );
    }

    return (
        <CustomerLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full min-h-0 flex-1 flex-col gap-6 overflow-hidden p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Billing & Payment</h1>
                    <p className="text-muted-foreground">Manage your payments and billing history.</p>
                </div>

                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
                    {/* Payment result banner */}
                    {paymentBanner === 'success' && (
                        <div className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-400">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            Payment successful! Your billing status is being updated.
                            <button onClick={() => setPaymentBanner(null)} className="ml-auto">
                                <XCircle className="h-4 w-4 text-green-400/60 hover:text-green-400" />
                            </button>
                        </div>
                    )}
                    {paymentBanner === 'failed' && (
                        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            Payment was not completed. Please try again.
                            <button onClick={() => setPaymentBanner(null)} className="ml-auto">
                                <XCircle className="h-4 w-4 text-red-400/60 hover:text-red-400" />
                            </button>
                        </div>
                    )}

                    {/* Loading / Error state */}
                    {billingError && (
                        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {billingError}
                        </div>
                    )}

                    {/* Outstanding Balance */}
                    <div className="profile-card rounded-xl p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Outstanding Balance</p>
                                <div className="mt-1 flex items-center gap-3">
                                    <p className="text-3xl font-bold text-[#d4af37]">
                                        {loading ? '—' : `₱${outstandingBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
                                    </p>
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${pendingItems.length > 0 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-green-500/10 text-green-400'}`}
                                    >
                                        {loading ? '…' : summary.pending_count > 0 ? `${summary.pending_count} pending` : 'All paid'}
                                    </span>
                                </div>
                            </div>
                            {pendingItems.length > 0 && (
                                <button
                                    onClick={handlePayAll}
                                    disabled={payingId !== null}
                                    className="rounded-lg bg-[#d4af37] px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#e6c24e] disabled:opacity-60"
                                >
                                    {payingId === -1 ? 'Redirecting…' : 'Pay All'}
                                </button>
                            )}
                        </div>
                        {payError && <p className="mt-3 text-xs text-red-400">{payError}</p>}
                        {pendingItems.length > 0 && (
                            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[#2a2a2e] pt-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-[#d4af37]" />
                                    <span className="text-xs text-muted-foreground">Outstanding</span>
                                    <span className="text-sm font-semibold text-[#d4af37]">
                                        ₱{pendingServicesTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="profile-card rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">Total Paid</p>
                                <CheckCircle2 className="h-4 w-4 text-green-400" />
                            </div>
                            <p className="mt-2 text-2xl font-bold text-green-400">
                                ₱{totalPaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {summary.paid_count} completed transaction{summary.paid_count !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <div className="profile-card rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">Total Transactions</p>
                                <TrendingUp className="h-4 w-4 text-[#d4af37]" />
                            </div>
                            <p className="mt-2 text-2xl font-bold">{summary.total_transactions}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {summary.pending_count} pending · {summary.paid_count} paid
                            </p>
                        </div>
                        <div className="profile-card rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">Last Payment</p>
                                <Banknote className="h-4 w-4 text-muted-foreground" />
                            </div>
                            {lastPayment ? (
                                <>
                                    <p className="mt-2 text-lg font-bold">
                                        {new Date(lastPayment.paid_at ?? lastPayment.created_at).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                    </p>
                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                        {lastPayment.notes ?? `Transaction #${lastPayment.id}`}
                                    </p>
                                </>
                            ) : (
                                <p className="mt-2 text-sm text-muted-foreground">No payments yet</p>
                            )}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="inline-flex gap-1 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] p-1">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`rounded-md px-5 py-2 text-sm font-medium transition-colors ${
                                activeTab === 'pending' ? 'bg-[#1e1e22] text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Pending ({pendingItems.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('paid')}
                            className={`rounded-md px-5 py-2 text-sm font-medium transition-colors ${
                                activeTab === 'paid' ? 'bg-[#1e1e22] text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Paid ({paidItems.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('receipts')}
                            className={`rounded-md px-5 py-2 text-sm font-medium transition-colors ${
                                activeTab === 'receipts' ? 'bg-[#1e1e22] text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Receipts ({mappedReceipts.length})
                        </button>
                    </div>

                    {/* Billing Items — pending / paid tabs */}
                    {activeTab !== 'receipts' && (
                        <>
                            <div className="space-y-3">
                                {displayItems.map((item) => (
                                    <div key={item.id} className="profile-card rounded-xl p-4 transition-shadow hover:shadow-md">
                                        <div className="flex items-center gap-4">
                                            <div className={`rounded-lg p-2.5 ${item.type === 'invoice' ? 'bg-blue-500/10' : 'bg-[#d4af37]/10'}`}>
                                                {item.type === 'invoice' ? (
                                                    <Receipt className="h-5 w-5 text-blue-500" />
                                                ) : (
                                                    <CreditCard className="h-5 w-5 text-[#d4af37]" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium">{item.notes ?? `Invoice #${item.id}`}</p>
                                                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        {new Date(item.created_at).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                        })}
                                                    </span>
                                                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs capitalize">{item.type}</span>
                                                    {item.reference_number && <span className="font-mono text-xs">Ref: {item.reference_number}</span>}
                                                    {activeTab === 'pending' && daysSince(item.created_at) > 7 && (
                                                        <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
                                                            <AlertCircle className="h-3 w-3" />
                                                            {daysSince(item.created_at)} days overdue
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold">
                                                    ₱{Math.abs(Number(item.amount)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                </p>
                                                {activeTab === 'pending' ? (
                                                    <button
                                                        onClick={() => handlePayNow(item)}
                                                        disabled={payingId === item.id}
                                                        className="mt-1 rounded-lg bg-[#d4af37] px-4 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-[#e6c24e] disabled:opacity-60"
                                                    >
                                                        {payingId === item.id ? '…' : 'Pay Now'}
                                                    </button>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-500">
                                                        Paid
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {displayItems.length === 0 && (
                                <div className="flex items-center justify-center py-12 text-muted-foreground">
                                    <p>No {activeTab} payments found.</p>
                                </div>
                            )}
                        </>
                    )}

                    {/* Receipts tab */}
                    {activeTab === 'receipts' && (
                        <>
                            {receiptsError && (
                                <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    {receiptsError}
                                </div>
                            )}

                            {loading ? (
                                <div className="flex items-center justify-center py-12 text-muted-foreground">
                                    <p>Loading receipts...</p>
                                </div>
                            ) : mappedReceipts.length === 0 ? (
                                <div className="flex items-center justify-center py-12 text-muted-foreground">
                                    <p>No receipts found.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {mappedReceipts.map((rc) => (
                                        <div key={rc.id} className="profile-card rounded-xl p-4 transition-shadow hover:shadow-md">
                                            <div className="flex items-center gap-4">
                                                <div className="rounded-lg bg-[#d4af37]/10 p-2.5">
                                                    <Receipt className="h-5 w-5 text-[#d4af37]" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-medium">{rc.lineItems.map((li) => li.label).join(', ')}</p>
                                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            {new Date(rc.date).toLocaleDateString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric',
                                                            })}
                                                        </span>
                                                        <span className="font-mono text-xs">{rc.receiptNo}</span>
                                                        <span className="font-mono text-xs">Job: {rc.jobOrderNo}</span>
                                                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs">{rc.paymentMethod}</span>
                                                    </div>
                                                </div>
                                                <div className="flex shrink-0 flex-col items-end gap-2">
                                                    <p className="text-lg font-bold">
                                                        ₱{rc.totalPaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-500">
                                                            Paid
                                                        </span>
                                                        <button
                                                            onClick={() => setViewingReceiptId(rc.id)}
                                                            className="rounded-lg border border-[#2a2a2e] px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-[#d4af37]/50 hover:text-[#d4af37]"
                                                        >
                                                            View Receipt
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </CustomerLayout>
    );
}
