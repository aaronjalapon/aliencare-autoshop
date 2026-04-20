import AppLayout from '@/components/layout/app-layout';
import { flattenValidationErrors } from '@/lib/validation-errors';
import { ApiError } from '@/services/api';
import { billingService } from '@/services/billingService';
import { customerService } from '@/services/customerService';
import { frontdeskJobOrderService } from '@/services/jobOrderService';
import { paymentService } from '@/services/paymentService';
import { type BreadcrumbItem } from '@/types';
import type { BillingQueueItem, BillingQueueStatus, CustomerTransaction, JobOrder, JobOrderItem } from '@/types/customer';
import {
    Banknote,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    Link2,
    Loader2,
    PencilLine,
    ReceiptText,
    Search,
    Wallet,
    X,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

    const [selectedJobOrder, setSelectedJobOrder] = useState<JobOrder | null>(null);
    const [selectedTransactions, setSelectedTransactions] = useState<CustomerTransaction[]>([]);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);

    const [notice, setNotice] = useState<string | null>(null);
    const [isSendingPaymentLink, setIsSendingPaymentLink] = useState(false);

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentTargetKey, setPaymentTargetKey] = useState<string | null>(null);
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [isSavingPayment, setIsSavingPayment] = useState(false);
    const [paymentForm, setPaymentForm] = useState<PaymentFormState>(initialPaymentForm);

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

        if (selectedTicketKey === null || !queueTickets.some((ticket) => queueKey(ticket) === selectedTicketKey)) {
            setSelectedTicketKey(queueKey(queueTickets[0]));
        }
    }, [queueTickets, selectedTicketKey]);

    const selectedTicket = useMemo(() => {
        if (selectedTicketKey === null) return null;
        return queueTickets.find((ticket) => queueKey(ticket) === selectedTicketKey) ?? null;
    }, [queueTickets, selectedTicketKey]);

    const paymentTargetTicket = useMemo(() => {
        if (paymentTargetKey === null) return null;
        return queueTickets.find((ticket) => queueKey(ticket) === paymentTargetKey) ?? null;
    }, [paymentTargetKey, queueTickets]);

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

            const jobOrderPromise = ticket.job_order_id !== null ? frontdeskJobOrderService.getJobOrder(ticket.job_order_id) : Promise.resolve(null);

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

    const stats = useMemo(() => {
        const pendingCollection = queueTickets.filter((ticket) => ticket.status !== 'paid').reduce((sum, ticket) => sum + ticket.balance, 0);
        const openOnlineBalance = queueTickets
            .filter((ticket) => ticket.status !== 'paid' && ticket.source === 'online_booking')
            .reduce((sum, ticket) => sum + ticket.balance, 0);
        const walkInOpenTickets = queueTickets.filter((ticket) => ticket.status !== 'paid' && ticket.source === 'walk_in').length;
        const averageTicketValue = queueTickets.length > 0 ? queueTickets.reduce((sum, ticket) => sum + ticket.subtotal, 0) / queueTickets.length : 0;

        const today = new Date().toISOString().slice(0, 10);
        const settledToday = queueTickets
            .filter((ticket) => ticket.status === 'paid' && ticket.created_at.startsWith(today))
            .reduce((sum, ticket) => sum + ticket.paid_total, 0);

        return {
            pendingCollection,
            settledToday,
            openOnlineBalance,
            walkInOpenTickets,
            averageTicketValue,
        };
    }, [queueTickets]);

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

    const openRecordPaymentModal = () => {
        if (!selectedTicket || selectedTicket.status === 'paid') return;

        setPaymentTargetKey(queueKey(selectedTicket));
        setPaymentForm({
            amount: selectedTicket.balance.toFixed(2),
            method: selectedTicket.source === 'online_booking' ? 'xendit' : 'cash',
            reference: selectedTicket.pos_reference ?? '',
            note: '',
        });
        setPaymentError(null);
        setShowPaymentModal(true);
    };

    const handleRecordPayment = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!paymentTargetTicket) {
            return;
        }

        const parsedAmount = Number.parseFloat(paymentForm.amount);

        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            setPaymentError('Please enter a valid payment amount greater than zero.');
            return;
        }

        if (parsedAmount > paymentTargetTicket.balance) {
            setPaymentError('Payment amount cannot exceed the outstanding balance.');
            return;
        }

        try {
            setIsSavingPayment(true);
            setPaymentError(null);

            await customerService.createCustomerTransaction(paymentTargetTicket.customer_id, {
                type: 'payment',
                amount: parsedAmount,
                job_order_id: paymentTargetTicket.job_order_id ?? undefined,
                payment_method: paymentForm.method,
                reference_number: paymentForm.reference.trim() || paymentTargetTicket.pos_reference || null,
                notes: paymentForm.note.trim() || null,
            });

            setNotice(`Payment recorded: ${formatPeso(parsedAmount)} for ${paymentTargetTicket.invoice_no}.`);
            setShowPaymentModal(false);
            setPaymentTargetKey(null);
            setPaymentForm(initialPaymentForm);

            await loadQueue();
            await fetchTicketDetail(paymentTargetTicket);
        } catch (error) {
            setPaymentError(getErrorMessage(error, 'Failed to record payment.'));
        } finally {
            setIsSavingPayment(false);
        }
    };

    const settleSelectedBalance = async () => {
        if (!selectedTicket || selectedTicket.balance <= 0) return;

        const settlementMethod: PaymentMethod = selectedTicket.source === 'online_booking' ? 'xendit' : 'cash';

        try {
            await customerService.createCustomerTransaction(selectedTicket.customer_id, {
                type: 'payment',
                amount: selectedTicket.balance,
                job_order_id: selectedTicket.job_order_id ?? undefined,
                payment_method: settlementMethod,
                reference_number: selectedTicket.pos_reference,
                notes: 'Full settlement captured by frontdesk quick action.',
            });

            setNotice(`Invoice ${selectedTicket.invoice_no} settled in full.`);
            await loadQueue();
            await fetchTicketDetail(selectedTicket);
        } catch (error) {
            setNotice(getErrorMessage(error, 'Failed to settle remaining balance.'));
        }
    };

    const sendPaymentLink = async () => {
        if (!selectedTicket) return;

        if (selectedTicket.source !== 'online_booking') {
            setNotice('Hosted payment links are only used for online booking settlements.');
            return;
        }

        if (selectedTicket.status === 'paid') {
            setNotice('This invoice is already fully paid.');
            return;
        }

        if (selectedTicket.balance <= 0) {
            setNotice('No remaining balance found for hosted invoice generation.');
            return;
        }

        try {
            setIsSendingPaymentLink(true);

            const pendingInvoice = selectedTransactions.find(
                (transaction) =>
                    (transaction.type === 'invoice' || transaction.type === 'reservation_fee') &&
                    (transaction.xendit_status ?? '').toUpperCase() !== 'PAID',
            );

            let transactionId = pendingInvoice?.id;

            if (!transactionId) {
                const createResponse = await customerService.createCustomerTransaction(selectedTicket.customer_id, {
                    type: 'invoice',
                    amount: selectedTicket.balance,
                    job_order_id: selectedTicket.job_order_id ?? undefined,
                    payment_method: 'xendit',
                    reference_number: selectedTicket.job_order_no ?? selectedTicket.pos_reference,
                    notes: 'Hosted invoice generated by frontdesk billing workspace.',
                });

                transactionId = createResponse.data.id;
            }

            const invoiceResponse = await paymentService.createInvoice(transactionId);
            const paymentUrl = invoiceResponse.data.payment_url;

            setNotice(`Hosted invoice link generated for ${selectedTicket.invoice_no}: ${paymentUrl}`);

            await loadQueue();
            await fetchTicketDetail(selectedTicket);
        } catch (error) {
            setNotice(getErrorMessage(error, 'Failed to generate hosted payment link.'));
        } finally {
            setIsSendingPaymentLink(false);
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

            setNotice(`Transaction ${editTargetTransaction.id} updated successfully.`);
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
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-xs font-semibold tracking-[0.18em] text-[#d4af37] uppercase">Frontdesk Workspace</p>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Process online booking invoices and walk-in settlements in one queue, including deposits, partial payments, and
                                release-ready balances.
                            </p>
                            {notice && <p className="mt-2 text-xs text-[#d4af37]">{notice}</p>}
                            {queueError && <p className="mt-2 text-xs text-red-400">{queueError}</p>}
                            {detailError && <p className="mt-1 text-xs text-red-400">{detailError}</p>}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={sendPaymentLink}
                                disabled={
                                    !selectedTicket ||
                                    selectedTicket.status === 'paid' ||
                                    selectedTicket.source !== 'online_booking' ||
                                    isSendingPaymentLink
                                }
                                className="inline-flex items-center gap-2 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSendingPaymentLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Send Payment
                                Link
                            </button>
                            <button
                                onClick={openRecordPaymentModal}
                                disabled={!selectedTicket || selectedTicket.status === 'paid'}
                                className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                            >
                                <Wallet className="h-4 w-4" /> Record Payment
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        <div className="profile-card rounded-xl p-4">
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Pending Collection</p>
                            <p className="mt-2 text-3xl font-bold">{formatPeso(stats.pendingCollection)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Visible queue open balances</p>
                        </div>
                        <div className="profile-card rounded-xl p-4">
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Settled Today</p>
                            <p className="mt-2 text-3xl font-bold">{formatPeso(stats.settledToday)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Paid tickets created today (current page)</p>
                        </div>
                        <div className="profile-card rounded-xl p-4">
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Online Open Balance</p>
                            <p className="mt-2 text-3xl font-bold">{formatPeso(stats.openOnlineBalance)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Online bookings pending final release payment</p>
                        </div>
                        <div className="profile-card rounded-xl p-4">
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Walk-in Open Tickets</p>
                            <p className="mt-2 text-3xl font-bold">{stats.walkInOpenTickets}</p>
                            <p className="mt-1 text-xs text-muted-foreground">On-site tickets not fully settled</p>
                        </div>
                        <div className="profile-card rounded-xl p-4">
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Average Ticket Value</p>
                            <p className="mt-2 text-3xl font-bold">{formatPeso(stats.averageTicketValue)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Across visible service and retail invoices</p>
                        </div>
                    </div>

                    <div className="grid min-h-0 flex-1 gap-5 overflow-hidden xl:grid-cols-[1.6fr_1fr]">
                        <div className="profile-card flex min-h-0 flex-col rounded-xl p-5">
                            <div className="mb-4 flex flex-col gap-3">
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

                            <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-[#2a2a2e]">
                                <div className="hidden grid-cols-[1fr_1fr_1fr_0.8fr_0.8fr_0.8fr] border-b border-[#2a2a2e] bg-[#0d0d10] px-4 py-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase lg:grid">
                                    <span>Invoice</span>
                                    <span>Customer</span>
                                    <span>Reference</span>
                                    <span>Subtotal</span>
                                    <span>Balance</span>
                                    <span>Status</span>
                                </div>

                                <div className="max-h-full overflow-y-auto">
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
                                                    className={`grid w-full border-b border-[#1b1d22] px-4 py-3 text-left transition-colors last:border-b-0 lg:grid-cols-[1fr_1fr_1fr_0.8fr_0.8fr_0.8fr] ${
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

                        <aside className="profile-card min-h-0 overflow-y-auto rounded-xl p-5">
                            {selectedTicket ? (
                                <div className="flex h-full flex-col gap-4">
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
                                                    const canEditAmount = !transactionLockedForAmount(transaction);

                                                    return (
                                                        <div
                                                            key={transaction.id}
                                                            className="rounded-md border border-[#2a2a2e] bg-[#090a0d] px-3 py-2"
                                                        >
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div>
                                                                    <p className="font-medium">{transactionTitle(transaction)}</p>
                                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                                        {formatDateTime(transaction.paid_at ?? transaction.created_at)} ·{' '}
                                                                        {paymentMethodLabel(transaction.payment_method)}
                                                                    </p>
                                                                </div>
                                                                <p className={`font-semibold ${isRefund ? 'text-rose-300' : 'text-emerald-300'}`}>
                                                                    {formatPeso(Math.abs(Number(transaction.amount)))}
                                                                </p>
                                                            </div>

                                                            <div className="mt-1 flex items-center justify-between gap-2">
                                                                <p className="text-xs text-muted-foreground">
                                                                    Ref: {transaction.reference_number ?? 'N/A'}
                                                                </p>
                                                                {!isDeposit && (
                                                                    <button
                                                                        onClick={() => openEditPaymentModal(transaction)}
                                                                        className="inline-flex items-center gap-1 rounded-md border border-[#2a2a2e] px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                                                                    >
                                                                        <PencilLine className="h-3 w-3" />
                                                                        {canEditAmount ? 'Edit' : 'Annotate'}
                                                                    </button>
                                                                )}
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

                                    <div className="mt-auto grid gap-2">
                                        <button
                                            onClick={openRecordPaymentModal}
                                            disabled={selectedTicket.status === 'paid'}
                                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                                        >
                                            <Wallet className="h-4 w-4" /> Record Payment
                                        </button>
                                        <button
                                            onClick={settleSelectedBalance}
                                            disabled={selectedTicket.status === 'paid'}
                                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#2a2a2e] px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
                                        >
                                            <CheckCircle2 className="h-4 w-4" /> Settle Remaining Balance
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[#2a2a2e] p-6 text-sm text-muted-foreground">
                                    Select an invoice to review billing details.
                                </div>
                            )}
                        </aside>
                    </div>
                </div>
            </div>

            {showPaymentModal && paymentTargetTicket && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowPaymentModal(false)}>
                    <div className="profile-card w-full max-w-lg rounded-xl p-5" onClick={(event) => event.stopPropagation()}>
                        <div className="mb-4 flex items-start justify-between">
                            <div>
                                <p className="text-xs font-semibold tracking-wide text-[#d4af37] uppercase">Record Payment</p>
                                <h3 className="mt-1 text-lg font-semibold">{paymentTargetTicket.invoice_no}</h3>
                                <p className="text-sm text-muted-foreground">Outstanding: {formatPeso(paymentTargetTicket.balance)}</p>
                            </div>
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="rounded-md border border-[#2a2a2e] p-2 text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleRecordPayment} className="space-y-3">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Amount</label>
                                <input
                                    value={paymentForm.amount}
                                    onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Payment Method</label>
                                <select
                                    value={paymentForm.method}
                                    onChange={(event) =>
                                        setPaymentForm((prev) => ({
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
                                    value={paymentForm.reference}
                                    onChange={(event) => setPaymentForm((prev) => ({ ...prev, reference: event.target.value }))}
                                    placeholder="Terminal ID / e-wallet reference"
                                    className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Note (optional)</label>
                                <textarea
                                    value={paymentForm.note}
                                    onChange={(event) => setPaymentForm((prev) => ({ ...prev, note: event.target.value }))}
                                    rows={3}
                                    className="w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none"
                                    placeholder="Settlement remarks"
                                />
                            </div>

                            {paymentError && <p className="text-xs text-red-400">{paymentError}</p>}

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowPaymentModal(false)}
                                    className="rounded-lg border border-[#2a2a2e] px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingPayment}
                                    className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSavingPayment && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Save Payment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showEditModal && editTargetTransaction && selectedTicket && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowEditModal(false)}>
                    <div className="profile-card w-full max-w-lg rounded-xl p-5" onClick={(event) => event.stopPropagation()}>
                        <div className="mb-4 flex items-start justify-between">
                            <div>
                                <p className="text-xs font-semibold tracking-wide text-[#d4af37] uppercase">Update Transaction</p>
                                <h3 className="mt-1 text-lg font-semibold">Entry #{editTargetTransaction.id}</h3>
                                <p className="text-sm text-muted-foreground">{selectedTicket.invoice_no}</p>
                            </div>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="rounded-md border border-[#2a2a2e] p-2 text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

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

                            <div className="flex justify-end gap-2">
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
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
