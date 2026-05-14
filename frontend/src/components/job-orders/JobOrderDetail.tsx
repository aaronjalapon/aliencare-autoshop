import JobOrderItemsEditor from '@/components/job-orders/JobOrderItemsEditor';
import {
    canCancel,
    formatPeso,
    formatRelativeTime,
    getBalance,
    getEstimatedAmount,
    getPrimaryAction,
    getPrimaryActionLabel,
    getServiceName,
    getSourceLabel,
    getVehicleLabel,
    STATUS_META,
} from '@/lib/jobOrderFormatters';
import type { JobOrder } from '@/types/customer';
import { Car, CheckCircle2, FileText, ShieldCheck, Wrench, XCircle } from 'lucide-react';

interface Props {
    order: JobOrder | null;
    isProcessingAction: boolean;
    onPrimaryAction: (action: ReturnType<typeof getPrimaryAction>) => void;
    onCancel: () => void;
    onItemsChanged: () => void;
    onPrepareInvoice: () => void;
}

export default function JobOrderDetail({ order, isProcessingAction, onPrimaryAction, onCancel, onItemsChanged, onPrepareInvoice }: Props) {
    if (!order) {
        return (
            <aside className="profile-card flex min-h-0 flex-col rounded-xl p-5">
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[#2a2a2e] p-6 text-sm text-muted-foreground">
                    Select a job order to inspect details.
                </div>
            </aside>
        );
    }

    const primaryAction = getPrimaryAction(order.status);
    const actionLabel = getPrimaryActionLabel(primaryAction);

    const showPrepareInvoice =
        (order.status === 'approved' || order.status === 'in_progress' || order.status === 'completed') && getBalance(order) > 0;

    return (
        <aside className="profile-card flex min-h-0 flex-col rounded-xl p-5">
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-1">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{order.jo_number}</p>
                            <span className="inline-flex rounded-full border border-[#2a2a2e] bg-[#0d0d10] px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                                {getSourceLabel(order)}
                            </span>
                        </div>
                        <h2 className="mt-1 text-2xl font-bold">{order.customer?.full_name ?? 'Unknown Customer'}</h2>
                        <p className="text-sm font-medium text-muted-foreground">{order.customer?.phone_number ?? 'No phone on record'}</p>
                    </div>

                    <div className="text-right">
                        <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_META[order.status].className}`}
                        >
                            {STATUS_META[order.status].label}
                        </span>
                        <p className="mt-1.5 text-[11px] text-muted-foreground">Updated {formatRelativeTime(order.updated_at)}</p>
                    </div>
                </div>

                {/* Vehicle / Service Info */}
                <div className="grid grid-cols-2 gap-4 rounded-xl border border-[#2a2a2e]/50 bg-[#0d0d10] p-4 text-sm">
                    <div>
                        <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                            <Car className="h-3 w-3" /> Vehicle
                        </p>
                        <p className="font-medium text-foreground">{getVehicleLabel(order)}</p>
                        <p className="text-xs text-muted-foreground">{order.vehicle?.plate_number ?? 'N/A'}</p>
                    </div>
                    <div>
                        <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                            <Wrench className="h-3 w-3" /> Service
                        </p>
                        <p className="font-medium text-foreground">{getServiceName(order)}</p>
                        <p className="text-xs text-muted-foreground">
                            {(order.bay?.name ?? order.mechanic?.name)
                                ? `${order.mechanic?.name ?? 'Assigned'} / ${order.bay?.name ?? 'Assigned'}`
                                : 'Unassigned'}
                        </p>
                    </div>
                </div>

                {/* Line Items & Financial Summary */}
                <div className="flex flex-col gap-4">
                    <JobOrderItemsEditor jobOrderId={order.id} items={order.items ?? []} onItemsChanged={onItemsChanged} />

                    <div className="rounded-xl border border-[#2a2a2e]/50 bg-[#0d0d10] p-4">
                        <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Estimated Amount</span>
                            <span className="font-medium text-muted-foreground">{formatPeso(getEstimatedAmount(order))}</span>
                        </div>
                        <div className="my-3 border-t border-[#2a2a2e]/60" />
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold tracking-wide text-foreground uppercase">Total Balance</span>
                            <span className="text-lg font-bold text-[#d4af37]">{formatPeso(getBalance(order))}</span>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                {order.notes && (
                    <div className="rounded-xl border border-[#2a2a2e]/50 bg-[#0d0d10] p-4">
                        <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Notes</p>
                        <p className="text-sm leading-relaxed text-foreground/80">{order.notes}</p>
                    </div>
                )}
            </div>

            {/* Action buttons */}
            <div className="mt-2 flex shrink-0 flex-col gap-2.5 border-t border-[#2a2a2e]/50 pt-5">
                {showPrepareInvoice && (
                    <button
                        onClick={onPrepareInvoice}
                        disabled={isProcessingAction}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/10 px-4 py-2.5 text-sm font-semibold text-[#d4af37] transition-all hover:bg-[#d4af37]/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <FileText className="h-4 w-4" />
                        Prepare Invoice
                    </button>
                )}

                <button
                    disabled={primaryAction === 'none' || isProcessingAction}
                    onClick={() => onPrimaryAction(primaryAction)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-black transition-all hover:bg-[#b5952f] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {primaryAction === 'none' ? <CheckCircle2 className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                    {isProcessingAction ? 'Processing...' : actionLabel}
                </button>

                {canCancel(order.status) && (
                    <button
                        onClick={onCancel}
                        disabled={isProcessingAction}
                        className="inline-flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-muted-foreground/80 transition-colors hover:bg-rose-500/10 hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <XCircle className="h-4 w-4" /> Cancel Job Order
                    </button>
                )}
            </div>
        </aside>
    );
}
