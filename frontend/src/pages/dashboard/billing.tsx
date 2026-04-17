import AppLayout from '@/components/layout/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Banknote, CheckCircle2, CreditCard, Link2, ReceiptText, Search, Wallet, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Billing & Payment', href: '/billing' }];

type BillingSource = 'online_booking' | 'walk_in';
type BillingKind = 'service' | 'retail';
type BillingStatus = 'pending' | 'partial' | 'paid';
type SourceFilter = 'all' | 'online' | 'walkin';
type StatusFilter = 'all' | BillingStatus;
type PaymentMethod = 'cash' | 'card' | 'gcash' | 'maya' | 'bank_transfer' | 'xendit';
type PaymentChannel = 'onsite' | 'online';

interface BillingLineItem {
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
    type: 'labor' | 'parts' | 'retail' | 'fees';
}

interface BillingPayment {
    id: number;
    amount: number;
    method: PaymentMethod;
    channel: PaymentChannel;
    reference: string | null;
    note: string | null;
    paidAt: string;
    receivedBy: string;
}

interface BillingTicket {
    id: number;
    invoiceNo: string;
    source: BillingSource;
    kind: BillingKind;
    jobOrderNo: string | null;
    posRef: string | null;
    customerName: string;
    customerPhone: string;
    vehicleLabel: string | null;
    plateNumber: string | null;
    createdAt: string;
    dueAt: string;
    serviceAdvisor: string;
    paymentTerms: string;
    notes: string;
    depositPaid: number;
    depositReference: string | null;
    lineItems: BillingLineItem[];
    payments: BillingPayment[];
}

interface TicketView {
    ticket: BillingTicket;
    subtotal: number;
    paidTotal: number;
    manualPaid: number;
    balance: number;
    status: BillingStatus;
}

interface PaymentFormState {
    amount: string;
    method: PaymentMethod;
    reference: string;
    note: string;
}

const sourceLabels: Record<BillingSource, string> = {
    online_booking: 'Online Booking',
    walk_in: 'Walk-in',
};

const sourceStyles: Record<BillingSource, string> = {
    online_booking: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    walk_in: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
};

const statusLabels: Record<BillingStatus, string> = {
    pending: 'Pending',
    partial: 'Partially Paid',
    paid: 'Paid',
};

const statusStyles: Record<BillingStatus, string> = {
    pending: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    partial: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
    paid: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
};

const methodLabels: Record<PaymentMethod, string> = {
    cash: 'Cash',
    card: 'Card Terminal',
    gcash: 'GCash',
    maya: 'Maya',
    bank_transfer: 'Bank Transfer',
    xendit: 'Xendit Hosted Invoice',
};

const billingSeed: BillingTicket[] = [
    {
        id: 1,
        invoiceNo: 'INV-2026-0413-001',
        source: 'online_booking',
        kind: 'service',
        jobOrderNo: 'JO-2026-0115',
        posRef: null,
        customerName: 'John Nabunturan',
        customerPhone: '+63 912 345 6780',
        vehicleLabel: 'Toyota Innova 2020',
        plateNumber: 'CAV1234',
        createdAt: '2026-04-13T08:15:00',
        dueAt: '2026-04-13T16:00:00',
        serviceAdvisor: 'Lara M.',
        paymentTerms: 'Booking deposit online, remaining on release',
        notes: 'Customer requested SMS proof of payment before release.',
        depositPaid: 1000,
        depositReference: 'XND-984332',
        lineItems: [
            { id: 11, description: 'Change Oil Service Labor', quantity: 1, unitPrice: 1200, type: 'labor' },
            { id: 12, description: 'Synthetic Oil 5W-30', quantity: 2, unitPrice: 650, type: 'parts' },
            { id: 13, description: 'Oil Filter Toyota Small', quantity: 1, unitPrice: 420, type: 'parts' },
        ],
        payments: [],
    },
    {
        id: 2,
        invoiceNo: 'INV-2026-0413-002',
        source: 'walk_in',
        kind: 'service',
        jobOrderNo: 'JO-2026-0116',
        posRef: null,
        customerName: 'Eddy Villanueva',
        customerPhone: '+63 998 321 1104',
        vehicleLabel: 'Honda City 2019',
        plateNumber: 'NOA0789',
        createdAt: '2026-04-13T09:42:00',
        dueAt: '2026-04-13T18:30:00',
        serviceAdvisor: 'Kaye R.',
        paymentTerms: 'Same-day settlement before release',
        notes: 'Walk-in brake servicing with urgent turnaround.',
        depositPaid: 0,
        depositReference: null,
        lineItems: [
            { id: 21, description: 'Brake Inspection Labor', quantity: 1, unitPrice: 1800, type: 'labor' },
            { id: 22, description: 'Brake Fluid', quantity: 1, unitPrice: 350, type: 'parts' },
            { id: 23, description: 'Brake Pad Set', quantity: 1, unitPrice: 2550, type: 'parts' },
        ],
        payments: [
            {
                id: 201,
                amount: 2000,
                method: 'cash',
                channel: 'onsite',
                reference: null,
                note: 'Initial cash partial payment.',
                paidAt: '2026-04-13T10:05:00',
                receivedBy: 'Frontdesk 01',
            },
        ],
    },
    {
        id: 3,
        invoiceNo: 'INV-2026-0412-019',
        source: 'online_booking',
        kind: 'service',
        jobOrderNo: 'JO-2026-0108',
        posRef: null,
        customerName: 'Anna Emiquez',
        customerPhone: '+63 917 100 2210',
        vehicleLabel: 'Hyundai Accent 2018',
        plateNumber: 'LLE1236',
        createdAt: '2026-04-12T14:10:00',
        dueAt: '2026-04-12T19:00:00',
        serviceAdvisor: 'Lara M.',
        paymentTerms: 'Deposit online, settle remaining at branch',
        notes: 'Customer paid final balance via card upon pickup.',
        depositPaid: 500,
        depositReference: 'XND-982115',
        lineItems: [
            { id: 31, description: 'Premium Car Wash', quantity: 1, unitPrice: 650, type: 'labor' },
            { id: 32, description: 'Interior Vacuuming', quantity: 1, unitPrice: 350, type: 'labor' },
            { id: 33, description: 'Engine Bay Cleaning', quantity: 1, unitPrice: 450, type: 'labor' },
        ],
        payments: [
            {
                id: 301,
                amount: 950,
                method: 'card',
                channel: 'onsite',
                reference: 'TERM-485002',
                note: 'Final settlement at release.',
                paidAt: '2026-04-12T18:41:00',
                receivedBy: 'Frontdesk 02',
            },
        ],
    },
    {
        id: 4,
        invoiceNo: 'INV-2026-0413-003',
        source: 'walk_in',
        kind: 'retail',
        jobOrderNo: null,
        posRef: 'POS-88021',
        customerName: 'Dale Santos',
        customerPhone: '+63 921 558 2201',
        vehicleLabel: null,
        plateNumber: null,
        createdAt: '2026-04-13T11:20:00',
        dueAt: '2026-04-13T11:35:00',
        serviceAdvisor: 'Neil C.',
        paymentTerms: 'Immediate POS settlement',
        notes: 'Retail checkout tied to frontdesk counter sale.',
        depositPaid: 0,
        depositReference: null,
        lineItems: [
            { id: 41, description: 'Battery NS60 Maintenance-Free', quantity: 1, unitPrice: 4700, type: 'retail' },
            { id: 42, description: 'Battery Terminal Grease', quantity: 1, unitPrice: 280, type: 'retail' },
        ],
        payments: [],
    },
    {
        id: 5,
        invoiceNo: 'INV-2026-0413-004',
        source: 'walk_in',
        kind: 'service',
        jobOrderNo: 'JO-2026-0117',
        posRef: null,
        customerName: 'Vicente Ramirez',
        customerPhone: '+63 945 410 7719',
        vehicleLabel: 'Toyota Vios 2021',
        plateNumber: 'PAA1234',
        createdAt: '2026-04-13T07:40:00',
        dueAt: '2026-04-13T13:00:00',
        serviceAdvisor: 'Kaye R.',
        paymentTerms: 'Settle full amount before completion release',
        notes: 'Aircon repair done. Awaiting final customer pickup.',
        depositPaid: 0,
        depositReference: null,
        lineItems: [
            { id: 51, description: 'Aircon Diagnostics and Labor', quantity: 1, unitPrice: 2200, type: 'labor' },
            { id: 52, description: 'Refrigerant Refill', quantity: 1, unitPrice: 1400, type: 'parts' },
            { id: 53, description: 'Cabin Filter Replacement', quantity: 1, unitPrice: 850, type: 'parts' },
        ],
        payments: [
            {
                id: 501,
                amount: 2500,
                method: 'gcash',
                channel: 'online',
                reference: 'GC-113998',
                note: 'Advance payment while waiting for parts.',
                paidAt: '2026-04-13T10:42:00',
                receivedBy: 'Frontdesk 01',
            },
            {
                id: 502,
                amount: 1950,
                method: 'cash',
                channel: 'onsite',
                reference: null,
                note: 'Final payment at release.',
                paidAt: '2026-04-13T12:55:00',
                receivedBy: 'Frontdesk 01',
            },
        ],
    },
    {
        id: 6,
        invoiceNo: 'INV-2026-0413-005',
        source: 'online_booking',
        kind: 'service',
        jobOrderNo: 'JO-2026-0118',
        posRef: null,
        customerName: 'Michael Torres',
        customerPhone: '+63 917 333 9210',
        vehicleLabel: 'Toyota Vios 2016',
        plateNumber: 'RED0012',
        createdAt: '2026-04-13T11:48:00',
        dueAt: '2026-04-13T17:30:00',
        serviceAdvisor: 'Lara M.',
        paymentTerms: 'Hosted invoice for final balance allowed',
        notes: 'Customer requested digital payment link for remaining balance.',
        depositPaid: 800,
        depositReference: 'XND-985901',
        lineItems: [
            { id: 61, description: 'Transmission Fluid Service', quantity: 1, unitPrice: 1850, type: 'labor' },
            { id: 62, description: 'Transmission Fluid ATF', quantity: 3, unitPrice: 620, type: 'parts' },
            { id: 63, description: 'Shop Supplies and Disposal Fee', quantity: 1, unitPrice: 250, type: 'fees' },
        ],
        payments: [],
    },
];

function formatPeso(amount: number): string {
    return `P${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateTime(value: string): string {
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

function toTicketView(ticket: BillingTicket): TicketView {
    const subtotal = ticket.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const manualPaid = ticket.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const paidTotal = ticket.depositPaid + manualPaid;
    const balance = Math.max(0, subtotal - paidTotal);

    let status: BillingStatus = 'pending';
    if (balance <= 0) {
        status = 'paid';
    } else if (paidTotal > 0) {
        status = 'partial';
    }

    return {
        ticket,
        subtotal,
        manualPaid,
        paidTotal,
        balance,
        status,
    };
}

function inferPaymentChannel(method: PaymentMethod): PaymentChannel {
    if (method === 'gcash' || method === 'maya' || method === 'bank_transfer' || method === 'xendit') {
        return 'online';
    }

    return 'onsite';
}

export default function Billing() {
    const [tickets, setTickets] = useState<BillingTicket[]>(billingSeed);
    const [searchValue, setSearchValue] = useState('');
    const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [selectedTicketId, setSelectedTicketId] = useState<number | null>(billingSeed[0]?.id ?? null);
    const [notice, setNotice] = useState<string | null>(null);

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentTargetId, setPaymentTargetId] = useState<number | null>(null);
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
        amount: '',
        method: 'cash',
        reference: '',
        note: '',
    });

    const ticketViews = useMemo(() => tickets.map((ticket) => toTicketView(ticket)), [tickets]);

    const filteredTickets = useMemo(() => {
        const normalizedSearch = searchValue.trim().toLowerCase();

        return ticketViews.filter((view) => {
            const sourceMatches =
                sourceFilter === 'all' ||
                (sourceFilter === 'online' && view.ticket.source === 'online_booking') ||
                (sourceFilter === 'walkin' && view.ticket.source === 'walk_in');

            if (!sourceMatches) return false;

            if (statusFilter !== 'all' && view.status !== statusFilter) return false;

            if (!normalizedSearch) return true;

            const searchable = [
                view.ticket.invoiceNo,
                view.ticket.customerName,
                view.ticket.customerPhone,
                view.ticket.jobOrderNo ?? '',
                view.ticket.posRef ?? '',
                view.ticket.vehicleLabel ?? '',
                view.ticket.plateNumber ?? '',
            ]
                .join(' ')
                .toLowerCase();

            return searchable.includes(normalizedSearch);
        });
    }, [ticketViews, searchValue, sourceFilter, statusFilter]);

    useEffect(() => {
        if (filteredTickets.length === 0) {
            setSelectedTicketId(null);
            return;
        }

        if (selectedTicketId == null || !filteredTickets.some((view) => view.ticket.id === selectedTicketId)) {
            setSelectedTicketId(filteredTickets[0].ticket.id);
        }
    }, [filteredTickets, selectedTicketId]);

    const selectedTicketView = useMemo(() => {
        if (selectedTicketId == null) return null;
        return ticketViews.find((view) => view.ticket.id === selectedTicketId) ?? null;
    }, [ticketViews, selectedTicketId]);

    const paymentTargetView = useMemo(() => {
        if (paymentTargetId == null) return null;
        return ticketViews.find((view) => view.ticket.id === paymentTargetId) ?? null;
    }, [ticketViews, paymentTargetId]);

    const stats = useMemo(() => {
        const pendingCollection = ticketViews.filter((view) => view.status !== 'paid').reduce((sum, view) => sum + view.balance, 0);
        const openOnlineBalance = ticketViews
            .filter((view) => view.status !== 'paid' && view.ticket.source === 'online_booking')
            .reduce((sum, view) => sum + view.balance, 0);
        const walkInOpenTickets = ticketViews.filter((view) => view.status !== 'paid' && view.ticket.source === 'walk_in').length;
        const averageTicketValue = ticketViews.length > 0 ? ticketViews.reduce((sum, view) => sum + view.subtotal, 0) / ticketViews.length : 0;

        const today = new Date().toISOString().slice(0, 10);
        const settledToday = ticketViews.reduce((sum, view) => {
            const todaysPayments = view.ticket.payments
                .filter((payment) => payment.paidAt.startsWith(today))
                .reduce((subSum, payment) => subSum + payment.amount, 0);
            return sum + todaysPayments;
        }, 0);

        return {
            pendingCollection,
            settledToday,
            openOnlineBalance,
            walkInOpenTickets,
            averageTicketValue,
        };
    }, [ticketViews]);

    const appendPayment = (ticketId: number, amount: number, method: PaymentMethod, reference: string | null, note: string | null) => {
        const payment: BillingPayment = {
            id: Date.now(),
            amount,
            method,
            channel: inferPaymentChannel(method),
            reference,
            note,
            paidAt: new Date().toISOString(),
            receivedBy: 'Frontdesk 01',
        };

        setTickets((prev) =>
            prev.map((ticket) =>
                ticket.id === ticketId
                    ? {
                          ...ticket,
                          payments: [payment, ...ticket.payments],
                      }
                    : ticket,
            ),
        );
    };

    const openRecordPaymentModal = () => {
        if (!selectedTicketView || selectedTicketView.status === 'paid') return;

        setPaymentTargetId(selectedTicketView.ticket.id);
        setPaymentForm({
            amount: selectedTicketView.balance.toFixed(2),
            method: selectedTicketView.ticket.source === 'online_booking' ? 'xendit' : 'cash',
            reference: '',
            note: '',
        });
        setPaymentError(null);
        setShowPaymentModal(true);
    };

    const handleRecordPayment = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!paymentTargetView) return;

        const parsedAmount = Number.parseFloat(paymentForm.amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            setPaymentError('Please enter a valid payment amount greater than zero.');
            return;
        }

        if (parsedAmount > paymentTargetView.balance) {
            setPaymentError('Payment amount cannot exceed the outstanding balance.');
            return;
        }

        appendPayment(
            paymentTargetView.ticket.id,
            parsedAmount,
            paymentForm.method,
            paymentForm.reference.trim() || null,
            paymentForm.note.trim() || null,
        );

        setNotice(`Payment recorded: ${formatPeso(parsedAmount)} for ${paymentTargetView.ticket.invoiceNo}.`);
        setShowPaymentModal(false);
        setPaymentTargetId(null);
        setPaymentError(null);
    };

    const settleSelectedBalance = () => {
        if (!selectedTicketView || selectedTicketView.balance <= 0) return;

        const settlementMethod: PaymentMethod = selectedTicketView.ticket.source === 'online_booking' ? 'xendit' : 'cash';
        appendPayment(
            selectedTicketView.ticket.id,
            selectedTicketView.balance,
            settlementMethod,
            null,
            'Full settlement captured by frontdesk quick action.',
        );

        setNotice(`Invoice ${selectedTicketView.ticket.invoiceNo} settled in full.`);
    };

    const sendPaymentLink = () => {
        if (!selectedTicketView) return;

        if (selectedTicketView.ticket.source !== 'online_booking') {
            setNotice('Hosted payment links are only used for online booking settlements.');
            return;
        }

        if (selectedTicketView.status === 'paid') {
            setNotice('This invoice is already fully paid.');
            return;
        }

        setNotice(`Hosted invoice link re-sent for ${selectedTicketView.ticket.invoiceNo}.`);
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
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={sendPaymentLink}
                                disabled={
                                    !selectedTicketView ||
                                    selectedTicketView.status === 'paid' ||
                                    selectedTicketView.ticket.source !== 'online_booking'
                                }
                                className="inline-flex items-center gap-2 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Link2 className="h-4 w-4" /> Send Payment Link
                            </button>
                            <button
                                onClick={openRecordPaymentModal}
                                disabled={!selectedTicketView || selectedTicketView.status === 'paid'}
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
                            <p className="mt-1 text-xs text-muted-foreground">Open balances awaiting settlement</p>
                        </div>
                        <div className="profile-card rounded-xl p-4">
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Settled Today</p>
                            <p className="mt-2 text-3xl font-bold">{formatPeso(stats.settledToday)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Frontdesk collections captured today</p>
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
                            <p className="mt-1 text-xs text-muted-foreground">Across service and retail invoices</p>
                        </div>
                    </div>

                    <div className="grid min-h-0 flex-1 gap-5 overflow-hidden xl:grid-cols-[1.6fr_1fr]">
                        <div className="profile-card flex min-h-0 flex-col rounded-xl p-5">
                            <div className="mb-4 flex flex-col gap-3">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        value={searchValue}
                                        onChange={(event) => setSearchValue(event.target.value)}
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
                                                onClick={() => setSourceFilter(item.key)}
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
                                                onClick={() => setStatusFilter(item.key)}
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
                                    {filteredTickets.length === 0 ? (
                                        <div className="px-5 py-16 text-center text-sm text-muted-foreground">No invoices matched your filters.</div>
                                    ) : (
                                        filteredTickets.map((view) => {
                                            const isSelected = selectedTicketId === view.ticket.id;
                                            const reference = view.ticket.jobOrderNo ?? view.ticket.posRef ?? 'N/A';
                                            return (
                                                <button
                                                    key={view.ticket.id}
                                                    onClick={() => setSelectedTicketId(view.ticket.id)}
                                                    className={`grid w-full border-b border-[#1b1d22] px-4 py-3 text-left transition-colors last:border-b-0 lg:grid-cols-[1fr_1fr_1fr_0.8fr_0.8fr_0.8fr] ${
                                                        isSelected
                                                            ? 'bg-[#d4af37]/7 shadow-[inset_0_0_0_1px_rgba(212,175,55,0.55)]'
                                                            : 'hover:bg-[#1a1b20]/65'
                                                    }`}
                                                >
                                                    <div className="mb-2 lg:mb-0">
                                                        <p className="text-sm font-semibold">{view.ticket.invoiceNo}</p>
                                                        <div className="mt-1 flex items-center gap-1.5">
                                                            <span
                                                                className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sourceStyles[view.ticket.source]}`}
                                                            >
                                                                {sourceLabels[view.ticket.source]}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground uppercase">{view.ticket.kind}</span>
                                                        </div>
                                                    </div>

                                                    <div className="mb-2 lg:mb-0">
                                                        <p className="text-sm">{view.ticket.customerName}</p>
                                                        <p className="text-xs text-muted-foreground">{view.ticket.customerPhone}</p>
                                                    </div>

                                                    <div className="mb-2 lg:mb-0">
                                                        <p className="text-sm">{reference}</p>
                                                        <p className="text-xs text-muted-foreground">Due {formatDateTime(view.ticket.dueAt)}</p>
                                                    </div>

                                                    <div className="mb-2 text-sm font-semibold text-[#d4af37] lg:mb-0">
                                                        {formatPeso(view.subtotal)}
                                                    </div>

                                                    <div className="mb-2 text-sm font-semibold lg:mb-0">{formatPeso(view.balance)}</div>

                                                    <div>
                                                        <span
                                                            className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusStyles[view.status]}`}
                                                        >
                                                            {statusLabels[view.status]}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        <aside className="profile-card min-h-0 overflow-y-auto rounded-xl p-5">
                            {selectedTicketView ? (
                                <div className="flex h-full flex-col gap-4">
                                    <div>
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                    {selectedTicketView.ticket.invoiceNo}
                                                </p>
                                                <h2 className="mt-1 text-xl font-bold">{selectedTicketView.ticket.customerName}</h2>
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    {selectedTicketView.ticket.jobOrderNo ?? selectedTicketView.ticket.posRef ?? 'Reference pending'}
                                                </p>
                                            </div>
                                            <span
                                                className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusStyles[selectedTicketView.status]}`}
                                            >
                                                {statusLabels[selectedTicketView.status]}
                                            </span>
                                        </div>

                                        <div className="mt-3 rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-3 text-xs text-muted-foreground">
                                            {selectedTicketView.ticket.source === 'online_booking' ? (
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
                                            <span className="font-semibold text-foreground">{formatPeso(selectedTicketView.subtotal)}</span>
                                        </div>
                                        <div className="mb-2 flex items-center justify-between text-muted-foreground">
                                            <span className="inline-flex items-center gap-1">
                                                <CreditCard className="h-3.5 w-3.5" /> Deposit Credit
                                            </span>
                                            <span className="font-semibold text-foreground">{formatPeso(selectedTicketView.ticket.depositPaid)}</span>
                                        </div>
                                        <div className="mb-2 flex items-center justify-between text-muted-foreground">
                                            <span className="inline-flex items-center gap-1">
                                                <Banknote className="h-3.5 w-3.5" /> Recorded Payments
                                            </span>
                                            <span className="font-semibold text-foreground">{formatPeso(selectedTicketView.manualPaid)}</span>
                                        </div>
                                        <div className="flex items-center justify-between border-t border-[#2a2a2e] pt-2 text-sm">
                                            <span className="font-semibold text-[#d4af37]">Outstanding Balance</span>
                                            <span className="font-bold text-[#d4af37]">{formatPeso(selectedTicketView.balance)}</span>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-3">
                                        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Line Items</p>
                                        <div className="space-y-2 text-sm">
                                            {selectedTicketView.ticket.lineItems.map((item) => (
                                                <div key={item.id} className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p>{item.description}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {item.quantity} x {formatPeso(item.unitPrice)}
                                                        </p>
                                                    </div>
                                                    <p className="font-semibold">{formatPeso(item.quantity * item.unitPrice)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-3">
                                        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Payment Ledger</p>
                                        <div className="space-y-2 text-sm">
                                            {selectedTicketView.ticket.depositPaid > 0 && (
                                                <div className="rounded-md border border-[#2a2a2e] bg-[#090a0d] px-3 py-2">
                                                    <div className="flex items-center justify-between">
                                                        <p className="font-medium">Booking Deposit ({methodLabels.xendit})</p>
                                                        <p className="font-semibold text-emerald-300">
                                                            {formatPeso(selectedTicketView.ticket.depositPaid)}
                                                        </p>
                                                    </div>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        Reference: {selectedTicketView.ticket.depositReference ?? 'N/A'}
                                                    </p>
                                                </div>
                                            )}

                                            {selectedTicketView.ticket.payments.length === 0 ? (
                                                <p className="text-xs text-muted-foreground">No manual payment entries yet.</p>
                                            ) : (
                                                [...selectedTicketView.ticket.payments]
                                                    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
                                                    .map((payment) => (
                                                        <div key={payment.id} className="rounded-md border border-[#2a2a2e] bg-[#090a0d] px-3 py-2">
                                                            <div className="flex items-center justify-between">
                                                                <p className="font-medium">{methodLabels[payment.method]}</p>
                                                                <p className="font-semibold text-emerald-300">{formatPeso(payment.amount)}</p>
                                                            </div>
                                                            <p className="mt-1 text-xs text-muted-foreground">
                                                                {formatDateTime(payment.paidAt)} by {payment.receivedBy}
                                                            </p>
                                                            {payment.reference && (
                                                                <p className="text-xs text-muted-foreground">Reference: {payment.reference}</p>
                                                            )}
                                                        </div>
                                                    ))
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-3 text-xs text-muted-foreground">
                                        <p>
                                            Advisor: <span className="text-foreground">{selectedTicketView.ticket.serviceAdvisor}</span>
                                        </p>
                                        <p className="mt-1">
                                            Terms: <span className="text-foreground">{selectedTicketView.ticket.paymentTerms}</span>
                                        </p>
                                        <p className="mt-1">
                                            Notes: <span className="text-foreground">{selectedTicketView.ticket.notes}</span>
                                        </p>
                                    </div>

                                    <div className="mt-auto grid gap-2">
                                        <button
                                            onClick={openRecordPaymentModal}
                                            disabled={selectedTicketView.status === 'paid'}
                                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                                        >
                                            <Wallet className="h-4 w-4" /> Record Payment
                                        </button>
                                        <button
                                            onClick={settleSelectedBalance}
                                            disabled={selectedTicketView.status === 'paid'}
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

            {showPaymentModal && paymentTargetView && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowPaymentModal(false)}>
                    <div className="profile-card w-full max-w-lg rounded-xl p-5" onClick={(event) => event.stopPropagation()}>
                        <div className="mb-4 flex items-start justify-between">
                            <div>
                                <p className="text-xs font-semibold tracking-wide text-[#d4af37] uppercase">Record Payment</p>
                                <h3 className="mt-1 text-lg font-semibold">{paymentTargetView.ticket.invoiceNo}</h3>
                                <p className="text-sm text-muted-foreground">Outstanding: {formatPeso(paymentTargetView.balance)}</p>
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
                                    onChange={(event) => setPaymentForm((prev) => ({ ...prev, method: event.target.value as PaymentMethod }))}
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
                                    className="rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90"
                                >
                                    Save Payment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
