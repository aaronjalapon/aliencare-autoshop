import {
    formatPeso,
    getEstimatedAmount,
    getScheduleLabel,
    getServiceName,
    getSourceLabel,
    getVehicleLabel,
    STATUS_META,
} from '@/lib/jobOrderFormatters';
import type { JobOrder } from '@/types/customer';
import { ReactNode } from 'react';

export type TableVariant = 'queue' | 'billing' | 'paid';

interface ColumnDef {
    label: string;
    classNames: string;
}

const VARIANT_COLUMNS: Record<TableVariant, ColumnDef[]> = {
    queue: [
        { label: 'Time', classNames: '' },
        { label: 'JO / Source', classNames: '' },
        { label: 'Customer', classNames: '' },
        { label: 'Vehicle / Service', classNames: '' },
        { label: 'Stage', classNames: '' },
        { label: 'Status', classNames: '' },
        { label: 'Amount', classNames: 'text-right' },
    ],
    billing: [
        { label: 'JO / Source', classNames: '' },
        { label: 'Customer', classNames: '' },
        { label: 'Vehicle / Service', classNames: '' },
        { label: 'Amount', classNames: 'text-right' },
        { label: 'Balance / Payment', classNames: 'text-right' },
    ],
    paid: [
        { label: 'JO / Source', classNames: '' },
        { label: 'Customer', classNames: '' },
        { label: 'Vehicle / Service', classNames: '' },
        { label: 'Amount', classNames: 'text-right' },
        { label: 'Settled', classNames: 'text-right' },
        { label: 'Status', classNames: 'text-right' },
    ],
};

function gridColsStyle(variant: TableVariant): string {
    if (variant === 'queue') return 'grid-cols-[1fr_1fr_1.2fr_1.2fr_0.7fr_0.65fr_0.7fr]';
    if (variant === 'billing') return 'grid-cols-[1.2fr_1.2fr_1.4fr_1fr_1.5fr]';
    return 'grid-cols-[1.2fr_1.2fr_1.4fr_1fr_1fr_0.8fr]';
}

interface Props {
    orders: JobOrder[];
    selectedId: number;
    onSelect: (id: number) => void;
    variant: TableVariant;
    renderRowAction?: (order: JobOrder) => ReactNode;
}

export default function JobOrderTable({ orders, selectedId, onSelect, variant, renderRowAction }: Props) {
    const columns = VARIANT_COLUMNS[variant];

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[#2a2a2e]">
            <div
                className={`grid shrink-0 items-center border-b border-[#2a2a2e] bg-[#0d0d10] px-4 py-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase ${gridColsStyle(variant)}`}
            >
                {columns.map((col) => (
                    <span key={col.label} className={col.classNames}>
                        {col.label}
                    </span>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto">
                {orders.map((order) => {
                    const selected = selectedId === order.id;
                    const amount = getEstimatedAmount(order);
                    const status = STATUS_META[order.status];
                    const sourceLabel = getSourceLabel(order);

                    return (
                        <button
                            key={order.id}
                            onClick={() => onSelect(order.id)}
                            className={`grid w-full items-center border-b border-[#1b1d22] px-4 py-3 text-left transition-colors last:border-b-0 ${gridColsStyle(variant)} ${
                                selected ? 'bg-[#d4af37]/7 shadow-[inset_0_0_0_1px_rgba(212,175,55,0.55)]' : 'hover:bg-[#1a1b20]/65'
                            }`}
                        >
                            {variant === 'queue' && (
                                <>
                                    <div className="">
                                        <p className="text-sm font-semibold">{getScheduleLabel(order)}</p>
                                    </div>
                                    <div className="">
                                        <p className="text-sm font-semibold">{order.jo_number}</p>
                                        <p className="mt-1 inline-flex rounded-full border border-[#2a2a2e] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                            {sourceLabel}
                                        </p>
                                    </div>
                                    <div className="">
                                        <p className="text-sm">{order.customer?.full_name ?? 'Unknown Customer'}</p>
                                        <p className="text-xs text-muted-foreground">{order.customer?.phone_number ?? 'No phone'}</p>
                                    </div>
                                    <div className="">
                                        <p className="text-sm">{getVehicleLabel(order)}</p>
                                        <p className="text-xs text-muted-foreground">{getServiceName(order)}</p>
                                    </div>
                                    <div className="">
                                        <span
                                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                                order.status === 'in_progress'
                                                    ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
                                                    : order.status === 'completed'
                                                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                                      : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                                            }`}
                                        >
                                            {order.status === 'in_progress' ? 'In Service' : order.status === 'completed' ? 'For Payment' : 'Waiting'}
                                        </span>
                                    </div>
                                    <div className="">
                                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>
                                            {status.label}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-end gap-2 text-sm font-semibold text-[#d4af37]">
                                        {renderRowAction?.(order)}
                                        <span className="text-right">{formatPeso(amount)}</span>
                                    </div>
                                </>
                            )}

                            {variant === 'billing' && (
                                <>
                                    <div className="">
                                        <p className="text-sm font-semibold">{order.jo_number}</p>
                                        <p className="mt-1 inline-flex rounded-full border border-[#2a2a2e] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                            {sourceLabel}
                                        </p>
                                    </div>
                                    <div className="">
                                        <p className="text-sm">{order.customer?.full_name ?? 'Unknown Customer'}</p>
                                        <p className="text-xs text-muted-foreground">{order.customer?.phone_number ?? 'No phone'}</p>
                                    </div>
                                    <div className="">
                                        <p className="text-sm">{getVehicleLabel(order)}</p>
                                        <p className="text-xs text-muted-foreground">{getServiceName(order)}</p>
                                    </div>
                                    <div className="text-right text-sm font-semibold text-[#d4af37]">{formatPeso(amount)}</div>
                                    <div className="flex items-center justify-end gap-2 text-right text-sm font-semibold">
                                        {order.balance !== undefined && order.balance > 0 ? (
                                            <span className="text-[#d4af37]">{formatPeso(order.balance)}</span>
                                        ) : (
                                            <span className="text-emerald-300">P0.00</span>
                                        )}
                                        <span
                                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                                order.settled_flag || (order.balance !== undefined && order.balance <= 0)
                                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                                    : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                                            }`}
                                        >
                                            {order.settled_flag || (order.balance !== undefined && order.balance <= 0) ? 'Paid' : 'Pending'}
                                        </span>
                                    </div>
                                </>
                            )}

                            {variant === 'paid' && (
                                <>
                                    <div className="">
                                        <p className="text-sm font-semibold">{order.jo_number}</p>
                                        <p className="mt-1 inline-flex rounded-full border border-[#2a2a2e] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                            {sourceLabel}
                                        </p>
                                    </div>
                                    <div className="">
                                        <p className="text-sm">{order.customer?.full_name ?? 'Unknown Customer'}</p>
                                        <p className="text-xs text-muted-foreground">{order.customer?.phone_number ?? 'No phone'}</p>
                                    </div>
                                    <div className="">
                                        <p className="text-sm">{getVehicleLabel(order)}</p>
                                        <p className="text-xs text-muted-foreground">{getServiceName(order)}</p>
                                    </div>
                                    <div className="text-right text-sm font-semibold text-[#d4af37]">{formatPeso(amount)}</div>
                                    <div className="text-right text-sm text-muted-foreground">
                                        {order.updated_at
                                            ? new Date(order.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                            : '—'}
                                    </div>
                                    <div className="flex justify-end">
                                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>
                                            {status.label}
                                        </span>
                                    </div>
                                </>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
