/**
 * Shared helpers for reports / analytics data normalization.
 * Centralized here so the reports page, useReports hook, useUsageReports
 * hook, and UsageReports component all share the same defensive parsers.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export function toNumber(value: unknown, fallback = 0): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
}

export function toStringValue(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

export function toShortDateLabel(rawDate: string): string {
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return rawDate;
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatTypeLabel(type: string): string {
    return type.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function clampPercent(value: number): number {
    return Math.max(0, Math.min(100, value));
}

export function formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
}

export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        maximumFractionDigits: 0,
    }).format(value);
}

/** Build ISO date strings for a given number of past days. */
export function dateRangeFromDays(days: number): { startDate: string; endDate: string } {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    return {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
    };
}
