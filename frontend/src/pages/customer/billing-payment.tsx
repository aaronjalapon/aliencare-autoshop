import CustomerLayout from '@/components/layout/customer-layout';
import { useCustomerBilling } from '@/hooks/useCustomerBilling';
import { type BreadcrumbItem } from '@/types';
<<<<<<< HEAD
import { CustomerTransaction } from '@/types/customer';
import { Calendar, CreditCard, Loader2, Receipt } from 'lucide-react';
import { useState } from 'react';
=======
import { AlertCircle, ArrowLeft, Banknote, Calendar, CheckCircle2, CreditCard, Download, Printer, Receipt, TrendingUp } from 'lucide-react';
import { useRef, useState } from 'react';
>>>>>>> refs/remotes/origin/main

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/customer' },
    { title: 'Billing & Payment', href: '/customer/billing' },
];

type TabType = 'pending' | 'paid' | 'receipts';

<<<<<<< HEAD
export default function BillingPayment() {
    const [activeTab, setActiveTab] = useState<TabType>('pending');
    const { pendingItems, paidItems, outstandingBalance, loading, error } = useCustomerBilling();
=======
interface BillingItem {
    id: number;
    description: string;
    type: 'service' | 'product';
    amount: number;
    date: string;
    status: 'pending' | 'paid';
    reference?: string;
}

const sampleBillings: BillingItem[] = [
    { id: 1, description: 'Oil Change Service', type: 'service', amount: 1500, date: '2026-01-15', status: 'pending' },
    { id: 2, description: 'Brake Pad Set (Front)', type: 'product', amount: 1800, date: '2026-01-14', status: 'pending' },
    { id: 3, description: 'Full Detail Wash', type: 'service', amount: 2500, date: '2026-01-10', status: 'paid', reference: 'PAY-2026-001' },
    {
        id: 4,
        description: 'Synthetic Engine Oil 5W-30 x2',
        type: 'product',
        amount: 1300,
        date: '2026-01-08',
        status: 'paid',
        reference: 'PAY-2026-002',
    },
    { id: 5, description: 'Engine Tune-Up', type: 'service', amount: 3500, date: '2025-12-20', status: 'paid', reference: 'PAY-2025-045' },
];

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

const SAMPLE_RECEIPTS: ReceiptRecord[] = [
    {
        id: 1,
        receiptNo: 'RC-2026-00124',
        transactionId: 'TXN-938245',
        jobOrderNo: 'JO-10234',
        date: '2026-01-10',
        bookingDate: 'Jan 10, 2026',
        bookingTime: '4:25 PM',
        arrival: 'Mon, Jan 13, 2026',
        arrivalTime: '10:00 AM',
        branch: 'Davao City Branch, J.P. Laurel Ave, Davao City',
        customerName: 'Juan Dela Cruz',
        customerPhone: '0912 345 6789',
        vehicle: 'Toyota Innova',
        vehiclePlate: 'CAV 1234',
        lineItems: [
            { label: 'Full Detail Wash', amount: 2000 },
            { label: 'Interior Vacuum', amount: 300 },
            { label: 'Tire Black', amount: 100 },
            { label: 'Engine Bay Clean', amount: 100 },
        ],
        totalPaid: 2500,
        paymentMethod: 'GCash',
    },
    {
        id: 2,
        receiptNo: 'RC-2026-00098',
        transactionId: 'TXN-917384',
        jobOrderNo: 'JO-10201',
        date: '2026-01-08',
        bookingDate: 'Jan 8, 2026',
        bookingTime: '2:10 PM',
        arrival: 'Fri, Jan 10, 2026',
        arrivalTime: '9:00 AM',
        branch: 'Davao City Branch, J.P. Laurel Ave, Davao City',
        customerName: 'Juan Dela Cruz',
        customerPhone: '0912 345 6789',
        vehicle: 'Toyota Innova',
        vehiclePlate: 'CAV 1234',
        lineItems: [{ label: 'Synthetic Engine Oil 5W-30 x2', amount: 1300 }],
        totalPaid: 1300,
        paymentMethod: 'Maya',
    },
    {
        id: 3,
        receiptNo: 'RC-2025-00892',
        transactionId: 'TXN-882034',
        jobOrderNo: 'JO-09985',
        date: '2025-12-20',
        bookingDate: 'Dec 20, 2025',
        bookingTime: '11:30 AM',
        arrival: 'Sat, Dec 21, 2025',
        arrivalTime: '8:00 AM',
        branch: 'Davao City Branch, J.P. Laurel Ave, Davao City',
        customerName: 'Juan Dela Cruz',
        customerPhone: '0912 345 6789',
        vehicle: 'Toyota Innova',
        vehiclePlate: 'CAV 1234',
        lineItems: [{ label: 'Engine Tune-Up', amount: 3500 }],
        totalPaid: 3500,
        paymentMethod: 'GCash',
    },
];

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
        <div className="flex h-full flex-1 flex-col gap-6 p-6">
            {/* Back */}
            <button
                onClick={onBack}
                className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Billing &amp; Payment
            </button>

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
            <div className="mx-auto flex w-full max-w-2xl gap-3">
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
    );
}

export default function BillingPayment() {
    const [activeTab, setActiveTab] = useState<TabType>('pending');
    const [viewingReceiptId, setViewingReceiptId] = useState<number | null>(null);

    const pendingItems = sampleBillings.filter((b) => b.status === 'pending');
    const paidItems = sampleBillings.filter((b) => b.status === 'paid');
    const outstandingBalance = pendingItems.reduce((sum, b) => sum + b.amount, 0);
>>>>>>> refs/remotes/origin/main

    const displayItems = activeTab === 'pending' ? pendingItems : paidItems;
    const totalPaid = paidItems.reduce((sum, b) => sum + b.amount, 0);
    const pendingServicesTotal = pendingItems.filter((b) => b.type === 'service').reduce((sum, b) => sum + b.amount, 0);
    const pendingProductsTotal = pendingItems.filter((b) => b.type === 'product').reduce((sum, b) => sum + b.amount, 0);
    const lastPayment = paidItems.length > 0 ? [...paidItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;
    const daysSince = (dateStr: string) => Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);

    if (viewingReceiptId !== null) {
        const rc = SAMPLE_RECEIPTS.find((r) => r.id === viewingReceiptId)!;
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

    const getItemType = (item: CustomerTransaction): 'service' | 'product' => {
        return item.job_order_id ? 'service' : 'product';
    };

    const getDescription = (item: CustomerTransaction): string => {
        return item.notes || (item.type === 'invoice' ? 'Invoice' : item.type === 'payment' ? 'Payment' : 'Refund');
    };

    return (
        <CustomerLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
<<<<<<< HEAD
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Billing & Payment</h1>
                    <p className="text-muted-foreground">Manage your payments and billing history.</p>
                </div>

                {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">{error}</div>}

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" />
                    </div>
                ) : (
                    <>
                        {/* Outstanding Balance */}
                        <div className="rounded-xl border bg-card p-6 shadow-sm">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Outstanding Balance</p>
                                    <p className="mt-1 text-3xl font-bold text-[#d4af37]">
                                        ₱{outstandingBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {pendingItems.length} pending payment{pendingItems.length !== 1 ? 's' : ''}
                                    </p>
=======
                {/* Outstanding Balance */}
                <div className="profile-card rounded-xl p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Outstanding Balance</p>
                            <div className="mt-1 flex items-center gap-3">
                                <p className="text-3xl font-bold text-[#d4af37]">
                                    ₱{outstandingBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </p>
                                <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${pendingItems.length > 0 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-green-500/10 text-green-400'}`}
                                >
                                    {pendingItems.length > 0 ? `${pendingItems.length} pending` : 'All paid'}
                                </span>
                            </div>
                        </div>
                        {pendingItems.length > 0 && (
                            <button className="rounded-lg bg-[#d4af37] px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#e6c24e]">
                                Pay All
                            </button>
                        )}
                    </div>
                    {pendingItems.length > 0 && (
                        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[#2a2a2e] pt-4">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-blue-400" />
                                <span className="text-xs text-muted-foreground">Services</span>
                                <span className="text-sm font-semibold text-blue-400">
                                    ₱{pendingServicesTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="h-4 w-px bg-[#2a2a2e]" />
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-[#d4af37]" />
                                <span className="text-xs text-muted-foreground">Products</span>
                                <span className="text-sm font-semibold text-[#d4af37]">
                                    ₱{pendingProductsTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
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
                        <p className="mt-2 text-2xl font-bold text-green-400">₱{totalPaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {paidItems.length} completed transaction{paidItems.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div className="profile-card rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Total Transactions</p>
                            <TrendingUp className="h-4 w-4 text-[#d4af37]" />
                        </div>
                        <p className="mt-2 text-2xl font-bold">{sampleBillings.length}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {pendingItems.length} pending · {paidItems.length} paid
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
                                    {new Date(lastPayment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">{lastPayment.description}</p>
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
                        Receipts ({SAMPLE_RECEIPTS.length})
                    </button>
                </div>

                {/* Billing Items — pending / paid tabs */}
                {activeTab !== 'receipts' && (
                    <>
                        <div className="space-y-3">
                            {displayItems.map((item) => (
                                <div key={item.id} className="profile-card rounded-xl p-4 transition-shadow hover:shadow-md">
                                    <div className="flex items-center gap-4">
                                        <div className={`rounded-lg p-2.5 ${item.type === 'service' ? 'bg-blue-500/10' : 'bg-[#d4af37]/10'}`}>
                                            {item.type === 'service' ? (
                                                <Receipt className={`h-5 w-5 ${item.type === 'service' ? 'text-blue-500' : 'text-[#d4af37]'}`} />
                                            ) : (
                                                <CreditCard className="h-5 w-5 text-[#d4af37]" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium">{item.description}</p>
                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {new Date(item.date).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                    })}
                                                </span>
                                                <span className="rounded-md bg-muted px-2 py-0.5 text-xs capitalize">{item.type}</span>
                                                {item.reference && <span className="font-mono text-xs">Ref: {item.reference}</span>}
                                                {item.status === 'pending' && daysSince(item.date) > 7 && (
                                                    <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
                                                        <AlertCircle className="h-3 w-3" />
                                                        {daysSince(item.date)} days overdue
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold">₱{item.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                                            {item.status === 'pending' ? (
                                                <button className="mt-1 rounded-lg bg-[#d4af37] px-4 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-[#e6c24e]">
                                                    Pay Now
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
                    <div className="space-y-3">
                        {SAMPLE_RECEIPTS.map((rc) => (
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
                                                {new Date(rc.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                            <span className="font-mono text-xs">{rc.receiptNo}</span>
                                            <span className="font-mono text-xs">Job: {rc.jobOrderNo}</span>
                                            <span className="rounded-md bg-muted px-2 py-0.5 text-xs">{rc.paymentMethod}</span>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-2">
                                        <p className="text-lg font-bold">₱{rc.totalPaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
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
>>>>>>> refs/remotes/origin/main
                                </div>
                                {pendingItems.length > 0 && (
                                    <button className="rounded-lg bg-[#d4af37] px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#e6c24e]">
                                        Pay All
                                    </button>
                                )}
                            </div>
<<<<<<< HEAD
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1 rounded-lg border bg-muted p-1">
                            <button
                                onClick={() => setActiveTab('pending')}
                                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                    activeTab === 'pending' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Pending ({pendingItems.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('paid')}
                                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                    activeTab === 'paid' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Paid ({paidItems.length})
                            </button>
                        </div>

                        {/* Billing Items */}
                        <div className="space-y-3">
                            {displayItems.map((item) => {
                                const itemType = getItemType(item);
                                return (
                                    <div key={item.id} className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
                                        <div className="flex items-center gap-4">
                                            <div className={`rounded-lg p-2.5 ${itemType === 'service' ? 'bg-blue-500/10' : 'bg-[#d4af37]/10'}`}>
                                                {itemType === 'service' ? (
                                                    <Receipt className={`h-5 w-5 ${itemType === 'service' ? 'text-blue-500' : 'text-[#d4af37]'}`} />
                                                ) : (
                                                    <CreditCard className="h-5 w-5 text-[#d4af37]" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium">{getDescription(item)}</p>
                                                <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        {new Date(item.created_at).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                        })}
                                                    </span>
                                                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs capitalize">{itemType}</span>
                                                    {item.reference_number && <span className="text-xs">Ref: {item.reference_number}</span>}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold">
                                                    ₱{Math.abs(item.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                </p>
                                                {item.type === 'invoice' ? (
                                                    <button className="mt-1 rounded-lg bg-[#d4af37] px-4 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-[#e6c24e]">
                                                        Pay Now
                                                    </button>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-500">
                                                        Paid
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {displayItems.length === 0 && (
                            <div className="flex items-center justify-center py-12 text-muted-foreground">
                                <p>No {activeTab} payments found.</p>
                            </div>
                        )}
                    </>
=======
                        ))}
                    </div>
>>>>>>> refs/remotes/origin/main
                )}
            </div>
        </CustomerLayout>
    );
}
