import {
    formatPeso,
    formatRelativeTime,
    getEstimatedAmount,
    getScheduleLabel,
    getServiceName,
    getSourceLabel,
    getVehicleLabel,
    STATUS_META,
} from '@/lib/jobOrderFormatters';
import type { JobOrder } from '@/types/customer';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

interface Props {
    orders: JobOrder[];
    selectedId: number;
    onSelect: (id: number) => void;
    onApprove: (order: JobOrder) => void;
    onReject: (order: JobOrder) => void;
    isProcessing: boolean;
}

export default function ApprovalQueue({ orders, selectedId, onSelect, onApprove, onReject, isProcessing }: Props) {
    if (orders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#2a2a2e] px-5 py-16 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="mb-3 h-8 w-8 text-emerald-400/60" />
                <p className="font-semibold text-foreground">All Clear</p>
                <p className="mt-1">No online bookings are waiting for approval.</p>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[#2a2a2e]">
            <div className="grid shrink-0 items-center grid-cols-[1fr_1fr_1.3fr_0.9fr_1fr_1.2fr] border-b border-[#2a2a2e] bg-[#0d0d10] px-4 py-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                <span>JO / Source</span>
                <span>Customer</span>
                <span>Vehicle / Service</span>
                <span>Schedule</span>
                <span>Status</span>
                <span>Actions</span>
            </div>

            <div className="flex-1 overflow-y-auto">
                {orders.map((order) => {
                    const selected = selectedId === order.id;
                    const amount = getEstimatedAmount(order);
                    const status = STATUS_META[order.status];

                    return (
                        <div
                            key={order.id}
                            onClick={() => onSelect(order.id)}
                            className={`grid w-full items-center border-b border-[#1b1d22] px-4 py-3 text-left transition-colors last:border-b-0 grid-cols-[1fr_1fr_1.3fr_0.9fr_1fr_1.2fr] ${
                                selected
                                    ? 'bg-[#d4af37]/7 shadow-[inset_0_0_0_1px_rgba(212,175,55,0.55)]'
                                    : 'hover:bg-[#1a1b20]/65'
                            }`}
                        >
                            <div className="mb-2 lg:mb-0">
                                <p className="text-sm font-semibold">{order.jo_number}</p>
                                <p className="mt-1 inline-flex rounded-full border border-[#2a2a2e] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                    {getSourceLabel(order)}
                                </p>
                            </div>

                            <div className="mb-2 lg:mb-0">
                                <p className="text-sm">{order.customer?.full_name ?? 'Unknown Customer'}</p>
                                <p className="text-xs text-muted-foreground">{order.customer?.phone_number ?? 'No phone'}</p>
                            </div>

                            <div className="mb-2 lg:mb-0">
                                <p className="text-sm">{getVehicleLabel(order)}</p>
                                <p className="text-xs text-muted-foreground">{getServiceName(order)}</p>
                            </div>

                            <div className="mb-2 text-sm text-muted-foreground lg:mb-0">
                                <p>{getScheduleLabel(order)}</p>
                                <p className="text-xs">Created {formatRelativeTime(order.created_at)}</p>
                            </div>

                            <div className="mb-3 lg:mb-0">
                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>
                                    {status.label}
                                </span>
                                <p className="mt-1 text-xs font-semibold text-[#d4af37]">{formatPeso(amount)}</p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onApprove(order);
                                    }}
                                    disabled={isProcessing}
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                    Approve
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onReject(order);
                                    }}
                                    disabled={isProcessing}
                                    className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <XCircle className="h-3.5 w-3.5" />
                                    Reject
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
