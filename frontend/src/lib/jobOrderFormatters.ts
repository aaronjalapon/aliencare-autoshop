import type { JobOrder, JobOrderStatus } from '@/types/customer';

// ── Status metadata ─────────────────────────────────────────────────────────
export const STATUS_META: Record<JobOrderStatus, { label: string; className: string }> = {
    created: { label: 'Created', className: 'border-zinc-500/40 bg-zinc-500/10 text-zinc-300' },
    pending_approval: { label: 'Pending Approval', className: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
    approved: { label: 'Approved', className: 'border-blue-500/30 bg-blue-500/10 text-blue-300' },
    in_progress: { label: 'In Progress', className: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300' },
    completed: { label: 'Completed', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
    settled: { label: 'Settled', className: 'border-emerald-600/35 bg-emerald-600/10 text-emerald-200' },
    cancelled: { label: 'Cancelled', className: 'border-rose-500/35 bg-rose-500/10 text-rose-300' },
};

// ── Currency ────────────────────────────────────────────────────────────────
export function formatPeso(amount: number): string {
    return `P${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Time formatting ─────────────────────────────────────────────────────────
export function formatTimeLabel(time24: string): string {
    const [hourRaw, minuteRaw] = time24.split(':');
    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
        return time24;
    }

    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;

    return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

export function formatRelativeTime(isoTimestamp: string): string {
    const date = new Date(isoTimestamp);
    if (Number.isNaN(date.getTime())) {
        return 'Unknown';
    }

    const diffMs = Date.now() - date.getTime();
    const minuteMs = 60 * 1000;
    const hourMs = 60 * minuteMs;
    const dayMs = 24 * hourMs;

    if (diffMs < minuteMs) return 'Just now';

    if (diffMs < hourMs) {
        const minutes = Math.max(1, Math.floor(diffMs / minuteMs));
        return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
    }

    if (diffMs < dayMs) {
        const hours = Math.max(1, Math.floor(diffMs / hourMs));
        return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }

    const days = Math.max(1, Math.floor(diffMs / dayMs));
    return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateYmd(ymd: string): string {
    return new Date(`${ymd}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function addMinutesToTime(time24: string, minutes: number): string {
    const [hRaw, mRaw] = time24.split(':');
    const h = Number(hRaw);
    const m = Number(mRaw);

    if (Number.isNaN(h) || Number.isNaN(m)) return '—';

    const base = new Date();
    base.setHours(h, m, 0, 0);
    base.setMinutes(base.getMinutes() + minutes);

    return base.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function extractDurationMinutes(duration: string | null | undefined): number | null {
    if (!duration) return null;

    const matches = duration.match(/\d+/g);
    if (!matches || matches.length === 0) return null;

    const maxMinutes = Number(matches[matches.length - 1]);
    return Number.isFinite(maxMinutes) ? maxMinutes : null;
}

// ── Job Order helpers ───────────────────────────────────────────────────────
export function getSourceLabel(order: JobOrder): 'Online Booking' | 'Walk-in' {
    if (order.source === 'Online Booking' || order.source === 'online_booking') return 'Online Booking';
    return 'Walk-in';
}

export function getEstimatedAmount(order: JobOrder): number {
    return order.total_cost ?? order.service_fee;
}

export function getBalance(order: JobOrder): number {
    if (typeof order.balance === 'number') return order.balance;
    return order.settled_flag ? 0 : getEstimatedAmount(order);
}

export function getServiceName(order: JobOrder): string {
    if (order.service?.name) return order.service.name;

    const notes = order.notes ?? '';
    const prefix = 'Service Request:';
    if (notes.startsWith(prefix)) {
        const firstSegment = notes.split('|')[0]?.replace(prefix, '').trim();
        if (firstSegment) return firstSegment;
    }

    return 'General Service';
}

export function getVehicleLabel(order: JobOrder): string {
    if (!order.vehicle) return 'Unregistered Vehicle';
    return `${order.vehicle.make} ${order.vehicle.model} ${order.vehicle.year}`;
}

export function hasSchedule(order: JobOrder): boolean {
    return !!(order.arrival_date && order.arrival_time);
}

export function getScheduleSortValue(order: JobOrder): string {
    if (order.arrival_date && order.arrival_time) {
        return `${order.arrival_date}T${order.arrival_time}`;
    }
    return order.created_at;
}

export function compareNewestScheduleFirst(a: JobOrder, b: JobOrder): number {
    const scheduleDiff = getScheduleSortValue(b).localeCompare(getScheduleSortValue(a));
    if (scheduleDiff !== 0) return scheduleDiff;
    return b.jo_number.localeCompare(a.jo_number);
}

export function getScheduleLabel(order: JobOrder): string {
    if (order.arrival_date && order.arrival_time) {
        const parsedDate = new Date(`${order.arrival_date}T00:00:00`);
        const dateLabel = Number.isNaN(parsedDate.getTime())
            ? order.arrival_date
            : parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return `${dateLabel} · ${formatTimeLabel(order.arrival_time)}`;
    }

    return '—';
}

// ── Lifecycle helpers ───────────────────────────────────────────────────────
export type PrimaryAction = 'submit' | 'approve' | 'start' | 'complete' | 'settle' | 'none';

export function getPrimaryAction(status: JobOrderStatus): PrimaryAction {
    if (status === 'created') return 'none';
    if (status === 'pending_approval') return 'approve';
    if (status === 'approved') return 'start';
    if (status === 'in_progress') return 'complete';
    if (status === 'completed') return 'settle';
    return 'none';
}

export function getPrimaryActionLabel(action: PrimaryAction): string {
    if (action === 'submit') return 'Submit for Approval';
    if (action === 'approve') return 'Approve Booking';
    if (action === 'start') return 'Start Service';
    if (action === 'complete') return 'Mark Complete';
    if (action === 'settle') return 'Settle Payment';
    return 'No Further Action';
}

export function canCancel(status: JobOrderStatus): boolean {
    return status !== 'settled' && status !== 'cancelled' && status !== 'completed';
}

export function formatServiceCategory(category: string | null | undefined): string {
    if (!category) return 'Service';
    return category
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// ── Queue helpers ────────────────────────────────────────────────────────────
export type QueueStage = 'waiting' | 'in_service' | 'ready_for_payment';

const STAGE_ORDER: Record<QueueStage, number> = {
    in_service: 0,
    waiting: 1,
    ready_for_payment: 2,
};

export function getQueueStage(order: JobOrder): QueueStage {
    if (order.status === 'completed') return 'ready_for_payment';
    if (order.status === 'in_progress') return 'in_service';
    return 'waiting';
}

export function getQueueStageLabel(stage: QueueStage): string {
    if (stage === 'in_service') return 'In Service';
    if (stage === 'ready_for_payment') return 'For Payment';
    return 'Waiting';
}

export function getQueueSortKey(order: JobOrder): string {
    const stage = getQueueStage(order);
    const stageRank = STAGE_ORDER[stage];

    const scheduleKey = order.arrival_date && order.arrival_time ? `${order.arrival_date}T${order.arrival_time}` : order.created_at;

    return `${stageRank}-${scheduleKey}-${order.jo_number}`;
}

export function isReadyForPayment(order: JobOrder): boolean {
    return order.status === 'completed';
}

export function isApprovalNeeded(order: JobOrder): boolean {
    return order.status === 'pending_approval' && getSourceLabel(order) === 'Online Booking';
}

export function isPendingBilling(order: JobOrder): boolean {
    if (order.status === 'settled' || order.status === 'cancelled') return false;
    return getBalance(order) > 0;
}

export function isPaidInFull(order: JobOrder): boolean {
    if (order.status === 'cancelled') return false;
    return order.status === 'settled' || (order.settled_flag && getBalance(order) <= 0);
}

// ── Online Booking / Approval urgency ────────────────────────────────────────
export function getApprovalUrgencySortKey(order: JobOrder): string {
    // Sooner schedule = more urgent = sorts first
    if (order.arrival_date && order.arrival_time) {
        return `${order.arrival_date}T${order.arrival_time}`;
    }
    if (order.arrival_date) {
        return `${order.arrival_date}T23:59:59`;
    }
    // No schedule — use creation time as fallback
    return order.created_at;
}
