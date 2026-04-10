import CustomerLayout from '@/components/layout/customer-layout';
import { useCustomerLogs } from '@/hooks/useCustomerLogs';
import { type BreadcrumbItem } from '@/types';
import { CustomerTransaction } from '@/types/customer';
import { AlertCircle, ArrowDownRight, ArrowUpRight, Banknote, Calendar, CheckCircle2, Search, TrendingUp, Wrench } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/customer' },
    { title: 'Logs', href: '/customer/logs' },
];

type LogType = 'all' | 'invoice' | 'payment' | 'refund';

const TYPE_FILTERS: { key: LogType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'invoice', label: 'Invoices' },
    { key: 'payment', label: 'Payments' },
    { key: 'refund', label: 'Refunds' },
];

const TYPE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    invoice: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    payment: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
    refund: { bg: 'bg-[#d4af37]/10', text: 'text-[#d4af37]', border: 'border-[#d4af37]/20' },
};

const STATUS_STYLES: Record<string, string> = {
    Completed: 'bg-green-500/10 text-green-400',
    Paid: 'bg-green-500/10 text-green-400',
    Pending: 'bg-yellow-500/10 text-yellow-400',
    Refunded: 'bg-blue-500/10 text-blue-400',
};

const getStatus = (t: CustomerTransaction): string => {
    if (t.type === 'payment') return 'Completed';
    if (t.type === 'refund') return 'Refunded';
    if (t.xendit_status === 'PAID') return 'Paid';
    return 'Pending';
};

export default function CustomerLogs() {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<LogType>('all');

    const { logs, loading, error } = useCustomerLogs();

    const filtered = logs
        .filter((log) => {
            const matchesSearch =
                (log.notes ?? '').toLowerCase().includes(search.toLowerCase()) ||
                (log.reference_number ?? '').toLowerCase().includes(search.toLowerCase());
            const matchesFilter = filter === 'all' || log.type === filter;
            return matchesSearch && matchesFilter;
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const totalPaidOut = logs.filter((l) => l.type === 'payment').reduce((s, l) => s + Math.abs(Number(l.amount)), 0);
    const totalInvoices = logs.filter((l) => l.type === 'invoice').length;
    const completedPayments = logs.filter((l) => l.type === 'payment').length;
    const pendingInvoices = logs.filter((l) => l.type === 'invoice' && l.xendit_status !== 'PAID').length;

    return (
        <CustomerLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Page heading */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Transaction Logs</h1>
                    <p className="text-sm text-muted-foreground">Your complete activity history</p>
                </div>

                {/* ── Stat cards ───────────────────────────────────────────── */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="profile-card rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Total Transactions</p>
                            <TrendingUp className="h-4 w-4 text-[#d4af37]" />
                        </div>
                        <p className="mt-2 text-2xl font-bold">{loading ? '—' : logs.length}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {totalInvoices} invoice{totalInvoices !== 1 ? 's' : ''} · {completedPayments} payment{completedPayments !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div className="profile-card rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Total Paid Out</p>
                            <Banknote className="h-4 w-4 text-green-400" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-green-400">
                            {loading ? '—' : `₱${totalPaidOut.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {completedPayments} payment transaction{completedPayments !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div className="profile-card rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Pending Invoices</p>
                            <Wrench className="h-4 w-4 text-blue-400" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-blue-400">{loading ? '—' : pendingInvoices}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{loading ? '…' : `${totalInvoices - pendingInvoices} paid`}</p>
                    </div>
                </div>

                {/* ── Search & Type filter ─────────────────────────────────── */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search description or reference…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="flex h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] pr-4 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/40 focus:outline-none"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {TYPE_FILTERS.map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setFilter(key)}
                                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                                    filter === key
                                        ? 'bg-[#d4af37] text-black shadow-[0_0_12px_rgba(212,175,55,0.35)]'
                                        : 'border border-[#2a2a2e] text-muted-foreground hover:border-[#d4af37]/50 hover:text-foreground'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Log Entries ──────────────────────────────────────────── */}
                <div className="flex flex-col gap-3">
                    {error && (
                        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}
                    {loading ? (
                        <div className="flex items-center justify-center py-14 text-muted-foreground">
                            <p className="text-sm">Loading transactions…</p>
                        </div>
                    ) : (
                        <>
                            {filtered.map((log) => {
                                const ts = TYPE_STYLES[log.type] ?? TYPE_STYLES['invoice'];
                                const isDebit = log.type === 'payment';
                                const status = getStatus(log);
                                return (
                                    <div
                                        key={log.id}
                                        className="profile-card rounded-xl p-4 transition-all hover:shadow-[0_0_0_1px_rgba(212,175,55,0.25)]"
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Type icon */}
                                            <div
                                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${ts.bg} ${ts.border}`}
                                            >
                                                {isDebit ? (
                                                    <ArrowUpRight className={`h-4 w-4 ${ts.text}`} />
                                                ) : (
                                                    <ArrowDownRight className={`h-4 w-4 ${ts.text}`} />
                                                )}
                                            </div>

                                            {/* Description + meta */}
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold">{log.notes ?? `Transaction #${log.id}`}</p>
                                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ts.bg} ${ts.text}`}
                                                    >
                                                        {log.type.charAt(0).toUpperCase() + log.type.slice(1)}
                                                    </span>
                                                    {log.reference_number && (
                                                        <span className="font-mono text-xs text-muted-foreground">{log.reference_number}</span>
                                                    )}
                                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(log.created_at).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                        })}
                                                        &nbsp;
                                                        {new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Status + amount */}
                                            <div className="flex shrink-0 flex-col items-end gap-1.5">
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground'}`}
                                                >
                                                    {status}
                                                </span>
                                                <p className={`text-sm font-bold ${isDebit ? 'text-green-400' : 'text-foreground'}`}>
                                                    {isDebit ? '−' : '+'}₱
                                                    {Math.abs(Number(log.amount)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {filtered.length === 0 && !loading && (
                                <div className="flex items-center justify-center py-14 text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2">
                                        <CheckCircle2 className="h-8 w-8 opacity-20" />
                                        <p className="text-sm">No transactions found.</p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </CustomerLayout>
    );
}
