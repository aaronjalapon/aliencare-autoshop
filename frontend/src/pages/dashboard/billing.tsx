import PaymentSidePanel from '@/components/billing/PaymentSidePanel';
import AppLayout from '@/components/layout/app-layout';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { buildReceiptHtml, mapCustomerBillingReceiptToPrintData } from '@/lib/receipt-print';
import { flattenValidationErrors } from '@/lib/validation-errors';
import { ApiError } from '@/services/api';
import { billingService } from '@/services/billingService';
import { customerService } from '@/services/customerService';
import { invoiceService } from '@/services/invoiceService';
import { jobOrderService } from '@/services/jobOrderService';
import { type BreadcrumbItem } from '@/types';
import type { BillingQueueItem, BillingQueueStatus, CustomerTransaction, JobOrder, JobOrderItem } from '@/types/customer';
import { Banknote, ChevronLeft, ChevronRight, CreditCard, Loader2, PencilLine, Printer, ReceiptText, Search, Send, Wallet } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useSearchParams } from 'react-router-dom';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Billing & Payment', href: '/billing' }];

type SourceFilter = 'all' | 'online' | 'walkin';
type StatusFilter = 'all' | BillingQueueStatus;
type PaymentMethod = 'cash' | 'card' | 'gcash' | 'maya' | 'bank_transfer' | 'xendit';

interface PaymentFormState {
    amount: string;
    method: PaymentMethod;
    reference: string;
    note: string;
}

interface PaginationState {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
}

interface DisplayLineItem {
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

const sourceLabels: Record<BillingQueueItem['source'], string> = {
    online_booking: 'Online Booking',
    walk_in: 'Walk-in',
};

const sourceStyles: Record<BillingQueueItem['source'], string> = {
    online_booking: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    walk_in: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
};

const statusLabels: Record<BillingQueueStatus, string> = {
    pending: 'Pending',
    partial: 'Partially Paid',
    paid: 'Paid',
};

const statusStyles: Record<BillingQueueStatus, string> = {
    pending: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    partial: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
    paid: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
};

const initialPaymentForm: PaymentFormState = {
    amount: '',
    method: 'cash',
    reference: '',
    note: '',
};

const initialPagination: PaginationState = {
    currentPage: 1,
    lastPage: 1,
    perPage: 20,
    total: 0,
};

function formatPeso(amount: number): string {
    return `P${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateTime(value: string | null): string {
    if (!value) {
        return 'N/A';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function queueKey(ticket: BillingQueueItem): string {
    return `${ticket.entity_type}:${ticket.entity_id}`;
}

function normalizePaymentMethod(method: string | null): PaymentMethod {
    const normalized = (method ?? '').trim().toLowerCase();

    if (normalized === 'cash') return 'cash';
    if (normalized === 'card' || normalized === 'credit_card') return 'card';
    if (normalized === 'gcash') return 'gcash';
    if (normalized === 'maya') return 'maya';
    if (normalized === 'bank_transfer' || normalized === 'bank') return 'bank_transfer';
    if (normalized === 'xendit' || normalized === 'online') return 'xendit';

    return 'cash';
}

function paymentMethodLabel(method: string | null): string {
    const normalized = (method ?? '').trim().toLowerCase();

    if (normalized === 'cash') return 'Cash';
    if (normalized === 'card' || normalized === 'credit_card') return 'Card Terminal';
    if (normalized === 'gcash') return 'GCash';
    if (normalized === 'maya') return 'Maya';
    if (normalized === 'bank_transfer' || normalized === 'bank') return 'Bank Transfer';
    if (normalized === 'xendit' || normalized === 'online') return 'Xendit Hosted Invoice';

    if (!method) return 'N/A';

    return method
        .split(/[_\s-]+/)
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
        .join(' ');
}

function transactionCountsAsPaid(transaction: CustomerTransaction): boolean {
    const status = (transaction.xendit_status ?? '').toUpperCase();

    if (transaction.type === 'invoice' || transaction.type === 'reservation_fee') {
        return status === 'PAID';
    }

    if (transaction.type === 'payment') {
        return status === '' || status === 'PAID' || transaction.paid_at !== null;
    }

    return status === 'PAID' || transaction.paid_at !== null;
}

function transactionLockedForAmount(transaction: CustomerTransaction): boolean {
    const status = (transaction.xendit_status ?? '').toUpperCase();
    const isPaid = status === 'PAID' || transaction.paid_at !== null;
    const isPaymentLinked = transaction.external_id !== null || transaction.xendit_invoice_id !== null;

    return isPaid || isPaymentLinked;
}

function vehicleLabel(ticket: BillingQueueItem): string {
    const segments: string[] = [];

    if (ticket.vehicle_make) segments.push(ticket.vehicle_make);
    if (ticket.vehicle_model) segments.push(ticket.vehicle_model);
    if (ticket.vehicle_year) segments.push(String(ticket.vehicle_year));

    if (!segments.length) {
        return ticket.kind === 'retail' ? 'Retail Counter Sale' : 'Vehicle not provided';
    }

    return segments.join(' ');
}

function transactionTitle(transaction: CustomerTransaction): string {
    if (transaction.type === 'reservation_fee') {
        return 'Booking Deposit';
    }

    if (transaction.type === 'invoice') {
        if (transaction.status === 'draft') {
            return 'Draft Invoice';
        }
        return 'Invoice Entry';
    }

    if (transaction.type === 'refund') {
        return 'Refund';
    }

    return paymentMethodLabel(transaction.payment_method);
}

function toLineItems(jobOrder: JobOrder | null, ticket: BillingQueueItem | null): DisplayLineItem[] {
    if (!ticket) return [];

    const items: JobOrderItem[] = jobOrder?.items ?? [];
    if (ticket.kind === 'service' && items.length > 0) {
        return items.map((item) => ({
            id: item.id,
            description: item.description ?? 'Service line item',
            quantity: Number(item.quantity),
            unitPrice: Number(item.unit_price),
            totalPrice: Number(item.total_price),
        }));
    }

    return [
        {
            id: ticket.entity_id,
            description: ticket.kind === 'retail' ? 'Retail POS invoice total' : 'Service invoice subtotal',
            quantity: 1,
            unitPrice: ticket.subtotal,
            totalPrice: ticket.subtotal,
        },
    ];
}

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
        const validation = flattenValidationErrors(error.validationErrors);
        const firstValidationError = Object.values(validation)[0];
        if (firstValidationError) {
            return firstValidationError;
        }

        if (error.message) {
            return error.message;
        }

        return fallback;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return fallback;
}

export default function Billing() {
    const [queueTickets, setQueueTickets] = useState<BillingQueueItem[]>([]);
    const [pagination, setPagination] = useState<PaginationState>(initialPagination);
    const [isLoadingQueue, setIsLoadingQueue] = useState(true);
    const [queueError, setQueueError] = useState<string | null>(null);

    const [searchValue, setSearchValue] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [page, setPage] = useState(1);
    const [selectedTicketKey, setSelectedTicketKey] = useState<string | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();

    const [selectedJobOrder, setSelectedJobOrder] = useState<JobOrder | null>(null);
    const [selectedTransactions, setSelectedTransactions] = useState<CustomerTransaction[]>([]);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const { success, error: toastError } = useToast();

    const [showPaymentPanel, setShowPaymentPanel] = useState(false);
    const [printingTransactionId, setPrintingTransactionId] = useState<number | null>(null);
    const [issuingTransactionId, setIssuingTransactionId] = useState<number | null>(null);

    const [showEditModal, setShowEditModal] = useState(false);
    const [editTargetTransaction, setEditTargetTransaction] = useState<CustomerTransaction | null>(null);
    const [editError, setEditError] = useState<string | null>(null);
    const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
    const [editForm, setEditForm] = useState<PaymentFormState>(initialPaymentForm);

    const detailRequestRef = useRef(0);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedSearch(searchValue.trim());
        }, 300);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [searchValue]);

    const loadQueue = useCallback(async () => {
        try {
            setIsLoadingQueue(true);
            setQueueError(null);

            const response = await billingService.getQueue({
                source: sourceFilter,
                status: statusFilter,
                search: debouncedSearch || undefined,
                per_page: pagination.perPage,
                page,
            });

            const paginated = response?.data;
            const nextRows = paginated?.data ?? [];

            setQueueTickets(nextRows);
            setPagination({
                currentPage: paginated?.current_page ?? page,
                lastPage: paginated?.last_page ?? 1,
                perPage: paginated?.per_page ?? pagination.perPage,
                total: paginated?.total ?? nextRows.length,
            });
        } catch (error) {
            setQueueError(getErrorMessage(error, 'Failed to load billing queue.'));
            setQueueTickets([]);
            setPagination((prev) => ({
                ...prev,
                currentPage: 1,
                lastPage: 1,
                total: 0,
            }));
        } finally {
            setIsLoadingQueue(false);
        }
    }, [debouncedSearch, page, pagination.perPage, sourceFilter, statusFilter]);

    useEffect(() => {
        void loadQueue();
    }, [loadQueue]);

    useEffect(() => {
        if (queueTickets.length === 0) {
            setSelectedTicketKey(null);
            return;
        }

        const jobOrderId = searchParams.get('job_order_id');
        if (jobOrderId) {
            const target = queueTickets.find((ticket) => ticket.job_order_id?.toString() === jobOrderId);
            if (target) {
                setSelectedTicketKey(queueKey(target));
            }
            setSearchParams(
                (prev) => {
                    prev.delete('job_order_id');
                    return prev;
                },
                { replace: true },
            );
        } else if (selectedTicketKey === null || !queueTickets.some((ticket) => queueKey(ticket) === selectedTicketKey)) {
            setSelectedTicketKey(queueKey(queueTickets[0]));
        }
    }, [queueTickets, selectedTicketKey, searchParams, setSearchParams]);

    const selectedTicket = useMemo(() => {
        if (selectedTicketKey === null) return null;
        return queueTickets.find((ticket) => queueKey(ticket) === selectedTicketKey) ?? null;
    }, [queueTickets, selectedTicketKey]);

    const fetchTicketDetail = useCallback(async (ticket: BillingQueueItem | null) => {
        const requestId = detailRequestRef.current + 1;
        detailRequestRef.current = requestId;

        if (!ticket) {
            setSelectedJobOrder(null);
            setSelectedTransactions([]);
            setDetailError(null);
            return;
        }

        setIsLoadingDetail(true);
        setDetailError(null);

        try {
            const transactionPromise = customerService.getTransactions(ticket.customer_id, {
                per_page: 100,
                job_order_id: ticket.job_order_id ?? undefined,
                reference_number: ticket.pos_reference ?? undefined,
            });

            const jobOrderPromise = ticket.job_order_id !== null ? jobOrderService.getJobOrder(ticket.job_order_id) : Promise.resolve(null);

            const [transactionResult, jobOrderResult] = await Promise.allSettled([transactionPromise, jobOrderPromise]);

            if (detailRequestRef.current !== requestId) {
                return;
            }

            if (transactionResult.status === 'fulfilled') {
                setSelectedTransactions(transactionResult.value?.data?.data ?? []);
            } else {
                setSelectedTransactions([]);
                setDetailError(
                    transactionResult.reason instanceof Error
                        ? transactionResult.reason.message
                        : 'Failed to load transaction ledger for this ticket.',
                );
            }

            if (jobOrderResult.status === 'fulfilled') {
                setSelectedJobOrder(jobOrderResult.value?.data ?? null);
            } else {
                setSelectedJobOrder(null);
                if (ticket.job_order_id !== null) {
                    setDetailError((prev) => prev ?? 'Failed to load job order details for this service ticket.');
                }
            }
        } finally {
            if (detailRequestRef.current === requestId) {
                setIsLoadingDetail(false);
            }
        }
    }, []);

    useEffect(() => {
        void fetchTicketDetail(selectedTicket);
    }, [fetchTicketDetail, selectedTicket]);

    const lineItems = useMemo(() => toLineItems(selectedJobOrder, selectedTicket), [selectedJobOrder, selectedTicket]);

    const ledgerEntries = useMemo(() => {
        return [...selectedTransactions].sort((a, b) => {
            const dateA = new Date(a.paid_at ?? a.created_at).getTime();
            const dateB = new Date(b.paid_at ?? b.created_at).getTime();
            return dateB - dateA;
        });
    }, [selectedTransactions]);

    const depositCredit = useMemo(() => {
        return selectedTransactions
            .filter((transaction) => transaction.type === 'reservation_fee' && transactionCountsAsPaid(transaction))
            .reduce((sum, transaction) => sum + Math.abs(Number(transaction.amount)), 0);
    }, [selectedTransactions]);

    const recordedPayments = useMemo(() => {
        const paidPayments = selectedTransactions
            .filter((transaction) => transaction.type === 'payment' && transactionCountsAsPaid(transaction))
            .reduce((sum, transaction) => sum + Math.abs(Number(transaction.amount)), 0);

        if (paidPayments > 0) {
            return paidPayments;
        }

        if (!selectedTicket) {
            return 0;
        }

        return Math.max(0, selectedTicket.paid_total - depositCredit);
    }, [depositCredit, selectedTicket, selectedTransactions]);

    const openRecordPaymentPanel = () => {
        if (!selectedTicket || selectedTicket.status === 'paid') return;
        setShowPaymentPanel(true);
    };

    const handlePaymentRecorded = useCallback(async () => {
        await loadQueue();
        await fetchTicketDetail(selectedTicket);
    }, [loadQueue, fetchTicketDetail, selectedTicket]);

    const handlePrintReceipt = async (transaction: CustomerTransaction) => {
        // Open window synchronously to avoid popup blockers
        const pw = window.open('', '_blank', 'width=780,height=700');
        if (!pw) return;
        pw.document.write('<html><body style="font-family:Arial,sans-serif;text-align:center;padding:40px"><p>Loading receipt...</p></body></html>');
        try {
            setPrintingTransactionId(transaction.id);
            const response = await billingService.getReceiptDetail(transaction.id);
            const printData = mapCustomerBillingReceiptToPrintData(response.data);
            pw.document.close();
            pw.document.open();
            pw.document.write(buildReceiptHtml(printData));
            pw.document.close();
            pw.focus();
            setTimeout(() => {
                pw.print();
                pw.close();
            }, 400);
        } catch {
            pw.document.write('<p style="color:red">Failed to load receipt for printing.</p>');
            pw.document.close();
        } finally {
            setPrintingTransactionId(null);
        }
    };

    const handleIssueDraft = async (transactionId: number) => {
        try {
            setIssuingTransactionId(transactionId);
            await invoiceService.issueInvoice(transactionId);
            if (selectedTicket) {
                await fetchTicketDetail(selectedTicket);
            }
            success('Invoice issued.');
        } catch {
            toastError('Unable to issue invoice.');
        } finally {
            setIssuingTransactionId(null);
        }
    };

    const openEditPaymentModal = (transaction: CustomerTransaction) => {
        setEditTargetTransaction(transaction);
        setEditForm({
            amount: Math.abs(Number(transaction.amount)).toFixed(2),
            method: normalizePaymentMethod(transaction.payment_method),
            reference: transaction.reference_number ?? '',
            note: transaction.notes ?? '',
        });
        setEditError(null);
        setShowEditModal(true);
    };

    const handleUpdatePayment = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!selectedTicket || !editTargetTransaction) {
            return;
        }

        const canEditAmount = !transactionLockedForAmount(editTargetTransaction);
        const parsedAmount = Number.parseFloat(editForm.amount);

        if (canEditAmount && (!Number.isFinite(parsedAmount) || parsedAmount <= 0)) {
            setEditError('Please enter a valid amount greater than zero.');
            return;
        }

        try {
            setIsUpdatingPayment(true);
            setEditError(null);

            const payload: {
                amount?: number;
                payment_method?: string | null;
                reference_number?: string | null;
                notes?: string | null;
            } = {
                payment_method: editForm.method,
                reference_number: editForm.reference.trim() || null,
                notes: editForm.note.trim() || null,
            };

            if (canEditAmount) {
                payload.amount = parsedAmount;
            }

            await customerService.updateCustomerTransaction(selectedTicket.customer_id, editTargetTransaction.id, payload);

            setShowEditModal(false);
            setEditTargetTransaction(null);

            await loadQueue();
            await fetchTicketDetail(selectedTicket);
        } catch (error) {
            setEditError(getErrorMessage(error, 'Failed to update transaction entry.'));
        } finally {
            setIsUpdatingPayment(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="h-full min-h-0 flex-1 overflow-hidden p-5">
                <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-5 overflow-hidden">
                    {queueError && (
                        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{queueError}</div>
                    )}
                    {detailError && (
                        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{detailError}</div>
                    )}

                    <div className="grid min-h-0 flex-1 gap-5 overflow-hidden lg:grid-cols-[1.6fr_1fr]">
                        <div className="profile-card flex min-h-0 flex-col rounded-xl p-5">
                            <div className="mb-4 flex shrink-0 flex-col gap-3">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        value={searchValue}
                                        onChange={(event) => {
                                            setSearchValue(event.target.value);
                                            setPage(1);
                                        }}
                                        placeholder="Search invoice, customer, JO, POS, plate"
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] pr-3 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none"
                                    />
                                </div>

                                <div className="flex items-center gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                    <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#2a2a2e] bg-[#0d0d10] p-1">
                                        {(
                                            [
                                                { key: 'all', label: 'All Sources' },
                                                { key: 'online', label: 'Online Booking' },
                                                { key: 'walkin', label: 'Walk-in' },
                                            ] as Array<{ key: SourceFilter; label: string }>
                                        ).map((item) => (
                                            <button
                                                key={item.key}
                                                onClick={() => {
                                                    setSourceFilter(item.key);
                                                    setPage(1);
                                                }}
                                                className={`rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                                                    sourceFilter === item.key
                                                        ? 'bg-[#d4af37] text-black shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                                                        : 'text-muted-foreground hover:bg-[#1a1b20] hover:text-foreground'
                                                }`}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>

                                    <span className="h-6 w-px shrink-0 bg-[#2a2a2e]" aria-hidden="true" />

                                    <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#2a2a2e] bg-[#0d0d10] p-1">
                                        {(
                                            [
                                                { key: 'all', label: 'All Status' },
                                                { key: 'pending', label: 'Pending' },
                                                { key: 'partial', label: 'Partial' },
                                                { key: 'paid', label: 'Paid' },
                                            ] as Array<{ key: StatusFilter; label: string }>
                                        ).map((item) => (
                                            <button
                                                key={item.key}
                                                onClick={() => {
                                                    setStatusFilter(item.key);
                                                    setPage(1);
                                                }}
                                                className={`rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                                                    statusFilter === item.key
                                                        ? 'bg-[#d4af37] text-black shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                                                        : 'text-muted-foreground hover:bg-[#1a1b20] hover:text-foreground'
                                                }`}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[#2a2a2e]">
                                <div className="hidden shrink-0 grid-cols-[1fr_1fr_1fr_0.8fr_0.8fr_0.8fr] items-center border-b border-[#2a2a2e] bg-[#0d0d10] px-4 py-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase lg:grid">
                                    <span>Invoice</span>
                                    <span>Customer</span>
                                    <span>Reference</span>
                                    <span>Subtotal</span>
                                    <span>Balance</span>
                                    <span>Status</span>
                                </div>

                                <div className="flex-1 overflow-y-auto">
                                    {isLoadingQueue ? (
                                        <div className="px-5 py-16 text-center text-sm text-muted-foreground">
                                            <div className="inline-flex items-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin" /> Loading billing queue...
                                            </div>
                                        </div>
                                    ) : queueTickets.length === 0 ? (
                                        <div className="px-5 py-16 text-center text-sm text-muted-foreground">No invoices matched your filters.</div>
                                    ) : (
                                        queueTickets.map((ticket) => {
                                            const isSelected = selectedTicketKey === queueKey(ticket);
                                            const reference = ticket.job_order_no ?? ticket.pos_reference ?? 'N/A';

                                            return (
                                                <button
                                                    key={queueKey(ticket)}
                                                    onClick={() => setSelectedTicketKey(queueKey(ticket))}
                                                    className={`grid w-full items-center border-b border-[#1b1d22] px-4 py-3 text-left transition-colors last:border-b-0 lg:grid-cols-[1fr_1fr_1fr_0.8fr_0.8fr_0.8fr] ${
                                                        isSelected
                                                            ? 'bg-[#d4af37]/7 shadow-[inset_0_0_0_1px_rgba(212,175,55,0.55)]'
                                                            : 'hover:bg-[#1a1b20]/65'
                                                    }`}
                                                >
                                                    <div className="mb-2 lg:mb-0">
                                                        <p className="text-sm font-semibold">{ticket.invoice_no}</p>
                                                        <div className="mt-1 flex items-center gap-1.5">
                                                            <span
                                                                className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sourceStyles[ticket.source]}`}
                                                            >
                                                                {sourceLabels[ticket.source]}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground uppercase">{ticket.kind}</span>
                                                        </div>
                                                    </div>

                                                    <div className="mb-2 lg:mb-0">
                                                        <p className="text-sm">{ticket.customer_name}</p>
                                                        <p className="text-xs text-muted-foreground">{ticket.customer_phone ?? 'No phone number'}</p>
                                                    </div>

                                                    <div className="mb-2 lg:mb-0">
                                                        <p className="text-sm">{reference}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Due {formatDateTime(ticket.due_at ?? ticket.created_at)}
                                                        </p>
                                                    </div>

                                                    <div className="mb-2 text-sm font-semibold text-[#d4af37] lg:mb-0">
                                                        {formatPeso(ticket.subtotal)}
                                                    </div>

                                                    <div className="mb-2 text-sm font-semibold lg:mb-0">{formatPeso(ticket.balance)}</div>

                                                    <div>
                                                        <span
                                                            className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusStyles[ticket.status]}`}
                                                        >
                                                            {statusLabels[ticket.status]}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {!isLoadingQueue && !queueError && pagination.lastPage > 1 && (
                                <div className="mt-3 flex items-center justify-end gap-3">
                                    <button
                                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                                        disabled={pagination.currentPage <= 1}
                                        className="rounded-lg border border-[#2a2a2e] bg-[#0d0d10] p-2 text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                                        aria-label="Previous page"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <span className="text-xs text-muted-foreground">
                                        Page {pagination.currentPage} of {pagination.lastPage}
                                    </span>
                                    <button
                                        onClick={() => setPage((current) => Math.min(pagination.lastPage, current + 1))}
                                        disabled={pagination.currentPage >= pagination.lastPage}
                                        className="rounded-lg border border-[#2a2a2e] bg-[#0d0d10] p-2 text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                                        aria-label="Next page"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <aside className="profile-card flex min-h-0 flex-col rounded-xl p-5">
                            {selectedTicket ? (
                                <>
                                    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
                                        <div>
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                        {selectedTicket.invoice_no}
                                                    </p>
                                                    <h2 className="mt-1 text-xl font-bold">{selectedTicket.customer_name}</h2>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        {selectedTicket.job_order_no ?? selectedTicket.pos_reference ?? 'Reference pending'}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusStyles[selectedTicket.status]}`}
                                                >
                                                    {statusLabels[selectedTicket.status]}
                                                </span>
                                            </div>

                                            <div className="mt-3 rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-3 text-xs text-muted-foreground">
                                                {selectedTicket.source === 'online_booking' ? (
                                                    <p>
                                                        Online booking workflow: verify booking deposit, send hosted invoice if requested, then settle
                                                        remaining balance before releasing vehicle.
                                                    </p>
                                                ) : (
                                                    <p>
                                                        Walk-in workflow: collect same-day payment on-site, then finalize release after complete
                                                        settlement and receipt confirmation.
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-3 text-sm">
                                            <div className="mb-2 flex items-center justify-between text-muted-foreground">
                                                <span className="inline-flex items-center gap-1">
                                                    <ReceiptText className="h-3.5 w-3.5" /> Subtotal
                                                </span>
                                                <span className="font-semibold text-foreground">{formatPeso(selectedTicket.subtotal)}</span>
                                            </div>
                                            <div className="mb-2 flex items-center justify-between text-muted-foreground">
                                                <span className="inline-flex items-center gap-1">
                                                    <CreditCard className="h-3.5 w-3.5" /> Deposit Credit
                                                </span>
                                                <span className="font-semibold text-foreground">{formatPeso(depositCredit)}</span>
                                            </div>
                                            <div className="mb-2 flex items-center justify-between text-muted-foreground">
                                                <span className="inline-flex items-center gap-1">
                                                    <Banknote className="h-3.5 w-3.5" /> Recorded Payments
                                                </span>
                                                <span className="font-semibold text-foreground">{formatPeso(recordedPayments)}</span>
                                            </div>
                                            <div className="flex items-center justify-between border-t border-[#2a2a2e] pt-2 text-sm">
                                                <span className="font-semibold text-[#d4af37]">Outstanding Balance</span>
                                                <span className="font-bold text-[#d4af37]">{formatPeso(selectedTicket.balance)}</span>
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-3">
                                            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Line Items</p>
                                            <div className="space-y-2 text-sm">
                                                {lineItems.map((item) => (
                                                    <div key={item.id} className="flex items-center justify-between gap-3">
                                                        <div>
                                                            <p>{item.description}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {item.quantity} x {formatPeso(item.unitPrice)}
                                                            </p>
                                                        </div>
                                                        <p className="font-semibold">{formatPeso(item.totalPrice)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-3">
                                            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Payment Ledger</p>

                                            {isLoadingDetail ? (
                                                <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Loader2 className="h-4 w-4 animate-spin" /> Loading ledger entries...
                                                </div>
                                            ) : ledgerEntries.length === 0 ? (
                                                <p className="text-xs text-muted-foreground">No payment entries yet.</p>
                                            ) : (
                                                <div className="space-y-2 text-sm">
                                                    {ledgerEntries.map((transaction) => {
                                                        const isRefund = transaction.type === 'refund';
                                                        const isDeposit = transaction.type === 'reservation_fee';
                                                        const isDraft = transaction.type === 'invoice' && transaction.status === 'draft';
                                                        const canEditAmount = !transactionLockedForAmount(transaction);

                                                        return (
                                                            <div
                                                                key={transaction.id}
                                                                className={`rounded-md border px-3 py-2 ${isDraft ? 'border-amber-500/30 bg-amber-500/5' : 'border-[#2a2a2e] bg-[#090a0d]'}`}
                                                            >
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="font-medium">{transactionTitle(transaction)}</p>
                                                                        {isDraft && (
                                                                            <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                                                                                Draft
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className={`font-semibold ${isRefund ? 'text-rose-300' : 'text-emerald-300'}`}>
                                                                        {formatPeso(Math.abs(Number(transaction.amount)))}
                                                                    </p>
                                                                </div>

                                                                <div className="mt-1 flex items-center justify-between gap-2">
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Ref: {transaction.reference_number ?? 'N/A'}
                                                                    </p>
                                                                    <div className="flex items-center gap-1.5">
                                                                        {isDraft ? (
                                                                            <button
                                                                                onClick={() => handleIssueDraft(transaction.id)}
                                                                                disabled={issuingTransactionId === transaction.id}
                                                                                className="inline-flex items-center gap-1 rounded-md border border-[#d4af37]/40 bg-[#d4af37]/10 px-2 py-1 text-[11px] text-[#d4af37] transition-colors hover:bg-[#d4af37]/20 disabled:cursor-not-allowed disabled:opacity-50"
                                                                            >
                                                                                {issuingTransactionId === transaction.id ? (
                                                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                                                ) : (
                                                                                    <Send className="h-3 w-3" />
                                                                                )}
                                                                                Issue
                                                                            </button>
                                                                        ) : (
                                                                            <>
                                                                                <button
                                                                                    onClick={() => handlePrintReceipt(transaction)}
                                                                                    disabled={
                                                                                        printingTransactionId === transaction.id ||
                                                                                        !transactionCountsAsPaid(transaction)
                                                                                    }
                                                                                    className="inline-flex items-center gap-1 rounded-md border border-[#2a2a2e] px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                                                                                    title="Print receipt"
                                                                                >
                                                                                    {printingTransactionId === transaction.id ? (
                                                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                                                    ) : (
                                                                                        <Printer className="h-3 w-3" />
                                                                                    )}
                                                                                    Receipt
                                                                                </button>
                                                                                {!isDeposit && (
                                                                                    <button
                                                                                        onClick={() => openEditPaymentModal(transaction)}
                                                                                        className="inline-flex items-center gap-1 rounded-md border border-[#2a2a2e] px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                                                                                    >
                                                                                        <PencilLine className="h-3 w-3" />
                                                                                        {canEditAmount ? 'Edit' : 'Annotate'}
                                                                                    </button>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {transaction.notes && (
                                                                    <p className="mt-1 text-xs text-muted-foreground">{transaction.notes}</p>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        <div className="rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-3 text-xs text-muted-foreground">
                                            <p>
                                                Advisor: <span className="text-foreground">{selectedTicket.service_advisor ?? 'Unassigned'}</span>
                                            </p>
                                            <p className="mt-1">
                                                Vehicle: <span className="text-foreground">{vehicleLabel(selectedTicket)}</span>
                                            </p>
                                            <p className="mt-1">
                                                Terms:{' '}
                                                <span className="text-foreground">
                                                    {selectedTicket.payment_terms ?? 'Settle outstanding amount before release'}
                                                </span>
                                            </p>
                                            <p className="mt-1">
                                                Notes: <span className="text-foreground">{selectedTicket.notes ?? 'No notes provided.'}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="shrink-0 pt-4">
                                        <button
                                            onClick={openRecordPaymentPanel}
                                            disabled={selectedTicket.status === 'paid'}
                                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                                        >
                                            <Wallet className="h-4 w-4" /> Record Payment
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[#2a2a2e] p-6 text-sm text-muted-foreground">
                                    Select an invoice to review billing details.
                                </div>
                            )}
                        </aside>
                    </div>
                </div>
            </div>

            {selectedTicket && (
                <PaymentSidePanel
                    open={showPaymentPanel}
                    onOpenChange={setShowPaymentPanel}
                    ticket={selectedTicket}
                    transactions={selectedTransactions}
                    onPaymentRecorded={handlePaymentRecorded}
                />
            )}

            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                {editTargetTransaction && selectedTicket && (
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Update Transaction Entry #{editTargetTransaction.id}</DialogTitle>
                            <DialogDescription>{selectedTicket.invoice_no}</DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleUpdatePayment} className="space-y-3">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Amount</label>
                                <input
                                    value={editForm.amount}
                                    onChange={(event) => setEditForm((prev) => ({ ...prev, amount: event.target.value }))}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    disabled={transactionLockedForAmount(editTargetTransaction)}
                                    className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                />
                                {transactionLockedForAmount(editTargetTransaction) && (
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        Amount is locked for paid or payment-linked transactions. You may still update method, reference, and notes.
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Payment Method</label>
                                <select
                                    value={editForm.method}
                                    onChange={(event) =>
                                        setEditForm((prev) => ({
                                            ...prev,
                                            method: event.target.value as PaymentMethod,
                                        }))
                                    }
                                    className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="card">Card Terminal</option>
                                    <option value="gcash">GCash</option>
                                    <option value="maya">Maya</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="xendit">Xendit Hosted Invoice</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Reference (optional)</label>
                                <input
                                    value={editForm.reference}
                                    onChange={(event) => setEditForm((prev) => ({ ...prev, reference: event.target.value }))}
                                    placeholder="Terminal ID / e-wallet reference"
                                    className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Note (optional)</label>
                                <textarea
                                    value={editForm.note}
                                    onChange={(event) => setEditForm((prev) => ({ ...prev, note: event.target.value }))}
                                    rows={3}
                                    className="w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none"
                                    placeholder="Settlement remarks"
                                />
                            </div>

                            {editError && <p className="text-xs text-red-400">{editError}</p>}

                            <DialogFooter>
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="rounded-lg border border-[#2a2a2e] px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdatingPayment}
                                    className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isUpdatingPayment && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Update Entry
                                </button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                )}
            </Dialog>
        </AppLayout>
    );
}
