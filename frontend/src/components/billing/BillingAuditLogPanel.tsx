import { useBillingAuditLog } from '@/hooks/useBillingAuditLog';
import { formatCurrency } from '@/lib/reports-utils';
import { AuditLog } from '@/types/inventory';
import {
    AlertTriangle,
    FileText,
    Filter,
    RefreshCcw,
    Search,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ACTION_OPTIONS = [
    { value: 'invoice_created', label: 'Invoice Created' },
    { value: 'invoice_issued', label: 'Invoice Issued' },
    { value: 'invoice_voided', label: 'Invoice Voided' },
    { value: 'invoice_updated', label: 'Invoice Updated' },
    { value: 'payment_recorded', label: 'Payment Recorded' },
    { value: 'xendit_invoice_created', label: 'Xendit Invoice Created' },
    { value: 'xendit_status_changed', label: 'Xendit Status Changed' },
    { value: 'bulk_invoice_created', label: 'Bulk Invoice Created' },
    { value: 'remaining_balance_created', label: 'Remaining Balance Created' },
    { value: 'refund_processed', label: 'Refund Processed' },
    { value: 'pos_checkout', label: 'POS Checkout' },
];

const ACTION_BADGE_STYLES: Record<string, string> = {
    invoice_created: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    invoice_issued: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    invoice_voided: 'border-red-500/30 bg-red-500/10 text-red-300',
    invoice_updated: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
    payment_recorded: 'border-green-500/30 bg-green-500/10 text-green-300',
    xendit_invoice_created: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
    xendit_status_changed: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    bulk_invoice_created: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
    remaining_balance_created: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
    refund_processed: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
    pos_checkout: 'border-teal-500/30 bg-teal-500/10 text-teal-300',
};

function formatAction(action: string): string {
    return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getActionBadge(action: string) {
    const style = ACTION_BADGE_STYLES[action] ?? 'border-muted/30 bg-muted/10 text-muted-foreground';
    return <Badge className={style}>{formatAction(action)}</Badge>;
}

function getNewDataField(entry: AuditLog, field: string): string {
    const data = entry.new_data as Record<string, unknown> | undefined;
    if (!data) return '—';
    const value = data[field];
    if (value === null || value === undefined) return '—';
    if (field === 'amount') {
        return formatCurrency(Number(value));
    }
    return String(value);
}

function getTransactionType(entry: AuditLog): string {
    const type = getNewDataField(entry, 'transaction_type');
    if (type === '—') return 'N/A';
    return type.charAt(0).toUpperCase() + type.slice(1);
}

function getXenditStatusBadge(status: string) {
    if (status === 'PAID') {
        return <Badge className="border-green-500/30 bg-green-500/10 text-green-300">Paid</Badge>;
    }
    if (status === 'PENDING') {
        return <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-300">Pending</Badge>;
    }
    if (status === 'EXPIRED') {
        return <Badge className="border-red-500/30 bg-red-500/10 text-red-300">Expired</Badge>;
    }
    return <span className="text-muted-foreground">{status || '—'}</span>;
}

export function BillingAuditLogPanel() {
    const {
        entries,
        loading,
        error,
        refreshing,
        filters,
        pagination,
        refresh,
        setFilters,
        setPage,
    } = useBillingAuditLog({ per_page: 25, page: 1 });

    return (
        <div className="flex flex-col gap-5">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <Filter className="h-4 w-4 text-muted-foreground" />

                <Select
                    value={filters.action ?? ''}
                    onValueChange={(value) => setFilters({ action: value || undefined })}
                >
                    <SelectTrigger className="h-9 w-[200px] rounded-lg border border-[#2a2a2e] bg-[#0a0b0f] text-xs">
                        <SelectValue placeholder="All Actions" />
                    </SelectTrigger>
                    <SelectContent>
                        {ACTION_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Input
                    value={filters.search ?? ''}
                    onChange={(e) => setFilters({ search: e.target.value || undefined })}
                    placeholder="Search reference or notes..."
                    className="h-9 w-[240px] rounded-lg border border-[#2a2a2e] bg-[#0a0b0f] text-xs text-foreground placeholder:text-muted-foreground"
                />

                <Input
                    type="date"
                    value={filters.start_date ?? ''}
                    onChange={(e) => setFilters({ start_date: e.target.value || undefined })}
                    className="h-9 w-[160px] rounded-lg border border-[#2a2a2e] bg-[#0a0b0f] text-xs text-foreground"
                />

                <Input
                    type="date"
                    value={filters.end_date ?? ''}
                    onChange={(e) => setFilters({ end_date: e.target.value || undefined })}
                    className="h-9 w-[160px] rounded-lg border border-[#2a2a2e] bg-[#0a0b0f] text-xs text-foreground"
                />

                <Button
                    onClick={refresh}
                    disabled={refreshing || loading}
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 rounded-lg border-[#2a2a2e] bg-[#0a0b0f] text-xs text-muted-foreground hover:border-[#d4af37]/40 hover:text-foreground"
                >
                    <RefreshCcw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
            ) : error ? (
                <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{error}</span>
                    <button onClick={refresh} className="text-xs font-semibold text-red-200 underline hover:text-white">
                        Retry
                    </button>
                </div>
            ) : entries.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#2a2a2e] bg-[#0d0d10]/90 py-16 text-center">
                    <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 text-sm text-muted-foreground">No billing audit entries found.</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Billing activity will appear here once transactions are processed.
                    </p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto rounded-xl border border-[#2a2a2e]">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-[#2a2a2e] bg-[#0a0b0f] hover:bg-[#0a0b0f]">
                                    <TableHead className="h-10 px-4 text-xs font-semibold text-muted-foreground">Action</TableHead>
                                    <TableHead className="h-10 px-4 text-xs font-semibold text-muted-foreground">Type</TableHead>
                                    <TableHead className="h-10 px-4 text-xs font-semibold text-muted-foreground">Reference</TableHead>
                                    <TableHead className="h-10 px-4 text-xs font-semibold text-muted-foreground">Amount</TableHead>
                                    <TableHead className="h-10 px-4 text-xs font-semibold text-muted-foreground">Customer</TableHead>
                                    <TableHead className="h-10 px-4 text-xs font-semibold text-muted-foreground">Timestamp</TableHead>
                                    <TableHead className="h-10 px-4 text-xs font-semibold text-muted-foreground">User</TableHead>
                                    <TableHead className="h-10 px-4 text-xs font-semibold text-muted-foreground text-right">Notes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {entries.map((entry) => (
                                    <TableRow
                                        key={`billing-${entry.id ?? `${entry.entity_type}-${entry.entity_id}-${entry.archived_date}`}`}
                                        className="border-t border-[#2a2a2e] hover:bg-[#0a0b0f]/50"
                                    >
                                        <TableCell className="px-4 py-2.5">{getActionBadge(entry.action)}</TableCell>
                                        <TableCell className="px-4 py-2.5 text-xs text-muted-foreground">
                                            {getTransactionType(entry)}
                                        </TableCell>
                                        <TableCell className="px-4 py-2.5 text-xs font-medium text-foreground">
                                            {entry.reference_number ?? getNewDataField(entry, 'reference_number')}
                                        </TableCell>
                                        <TableCell className="px-4 py-2.5 text-xs text-muted-foreground">
                                            {getNewDataField(entry, 'amount')}
                                        </TableCell>
                                        <TableCell className="px-4 py-2.5 text-xs text-muted-foreground">
                                            {getNewDataField(entry, 'customer_name')}
                                        </TableCell>
                                        <TableCell className="px-4 py-2.5 text-xs text-muted-foreground">
                                            {entry.archived_date?.slice(0, 19).replace('T', ' ')}
                                        </TableCell>
                                        <TableCell className="px-4 py-2.5 text-xs text-muted-foreground">
                                            {entry.user_id ?? 'System'}
                                        </TableCell>
                                        <TableCell className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                                            {entry.notes ?? '—'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                            Page {pagination.currentPage} of {pagination.lastPage}
                            {pagination.total > 0 && ` (${pagination.total} entries)`}
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => setPage(Math.max(1, pagination.currentPage - 1))}
                                disabled={pagination.currentPage <= 1}
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-md border-[#2a2a2e] bg-[#0a0b0f] text-[11px] text-muted-foreground"
                            >
                                Prev
                            </Button>
                            <Button
                                onClick={() => setPage(Math.min(pagination.lastPage, pagination.currentPage + 1))}
                                disabled={pagination.currentPage >= pagination.lastPage}
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-md border-[#2a2a2e] bg-[#0a0b0f] text-[11px] text-muted-foreground"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
