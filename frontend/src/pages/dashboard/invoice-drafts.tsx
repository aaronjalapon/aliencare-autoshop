import AppLayout from '@/components/layout/app-layout';
import { formatPeso } from '@/lib/jobOrderFormatters';
import { invoiceService } from '@/services/invoiceService';
import type { BreadcrumbItem } from '@/types';
import type { CustomerTransaction } from '@/types/customer';
import { FileText, Loader2, Send, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/toast';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Invoice Drafts', href: '/invoice-drafts' }];

export default function InvoiceDrafts() {
    const [drafts, setDrafts] = useState<CustomerTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [issuingId, setIssuingId] = useState<number | null>(null);
    const [voidingId, setVoidingId] = useState<number | null>(null);

    const loadDrafts = useCallback(async () => {
        try {
            setIsLoading(true);
            setLoadError(null);
            const response = await invoiceService.getInvoices({ status: 'draft', per_page: 100 });
            setDrafts(response.data.data);
        } catch (error) {
            setLoadError(error instanceof Error ? error.message : 'Failed to load invoice drafts.');
            setDrafts([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDrafts();
    }, [loadDrafts]);

    const { success, error: toastError } = useToast();

    const handleIssue = async (id: number) => {
        try {
            setIssuingId(id);
            await invoiceService.issueInvoice(id);
            setDrafts((prev) => prev.filter((d) => d.id !== id));
            success('Invoice issued.');
        } catch {
            const message = 'Failed to issue invoice draft.';
            toastError(message);
        } finally {
            setIssuingId(null);
        }
    };

    const handleVoid = async (id: number) => {
        if (!window.confirm('Void this invoice draft? This cannot be undone.')) return;
        try {
            setVoidingId(id);
            await invoiceService.voidInvoice(id);
            setDrafts((prev) => prev.filter((d) => d.id !== id));
            success('Invoice draft voided.');
        } catch {
            const message = 'Failed to void invoice draft.';
            toastError(message);
        } finally {
            setVoidingId(null);
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="h-full min-h-0 flex-1 overflow-hidden p-5">
                <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-5 overflow-hidden">
                    {loadError && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{loadError}</div>}

                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold">Invoice Drafts</h2>
                            <p className="mt-1 text-sm text-muted-foreground">Review and issue invoice drafts prepared from job orders.</p>
                        </div>
                        <button
                            onClick={loadDrafts}
                            className="rounded-lg border border-[#2a2a2e] px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                        >
                            Refresh
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" /> Loading drafts...
                        </div>
                    ) : drafts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                            <FileText className="h-10 w-10 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">No invoice drafts found.</p>
                            <p className="text-xs text-muted-foreground/60">
                                Drafts are created from the Job Orders page using the "Prepare Invoice" action.
                            </p>
                        </div>
                    ) : (
                        <div className="min-h-0 flex-1 overflow-auto">
                            <div className="profile-card overflow-hidden rounded-xl">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[#2a2a2e] text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                                            <th className="px-4 py-3 text-left">Reference</th>
                                            <th className="px-4 py-3 text-left">Customer</th>
                                            <th className="px-4 py-3 text-right">Amount</th>
                                            <th className="px-4 py-3 text-left">Created</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#2a2a2e]/50">
                                        {drafts.map((draft) => (
                                            <tr key={draft.id} className="transition-colors hover:bg-[#0d0d10]">
                                                <td className="px-4 py-3">
                                                    <p className="font-medium">{draft.reference_number ?? `DRAFT-${draft.id}`}</p>
                                                    <p className="text-xs text-muted-foreground">Job Order #{draft.job_order_id ?? '—'}</p>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">Customer #{draft.customer_id}</td>
                                                <td className="px-4 py-3 text-right font-semibold text-[#d4af37]">
                                                    {formatPeso(Math.abs(Number(draft.amount)))}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(draft.created_at)}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => handleIssue(draft.id)}
                                                            disabled={issuingId === draft.id || voidingId === draft.id}
                                                            className="inline-flex items-center gap-1 rounded-md border border-[#d4af37]/40 bg-[#d4af37]/10 px-2 py-1 text-[11px] text-[#d4af37] transition-colors hover:bg-[#d4af37]/20 disabled:opacity-50"
                                                        >
                                                            {issuingId === draft.id ? (
                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                            ) : (
                                                                <Send className="h-3 w-3" />
                                                            )}
                                                            Issue
                                                        </button>
                                                        <button
                                                            onClick={() => handleVoid(draft.id)}
                                                            disabled={issuingId === draft.id || voidingId === draft.id}
                                                            className="inline-flex items-center gap-1 rounded-md border border-[#2a2a2e] px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-rose-500/40 hover:text-rose-400 disabled:opacity-50"
                                                        >
                                                            {voidingId === draft.id ? (
                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                            ) : (
                                                                <XCircle className="h-3 w-3" />
                                                            )}
                                                            Void
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
