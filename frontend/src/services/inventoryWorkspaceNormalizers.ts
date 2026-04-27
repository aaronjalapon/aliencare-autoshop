import type { AuditTransaction, InventoryItemReference, StockTransaction } from '@/types/inventory';
import type { Alert, AlertStatistics } from './alertService';

export interface AlertGenerationResult {
    alerts_created: number;
    alerts_updated: number;
    total_alerts: number;
}

export interface AlertCleanupResult {
    deleted_count: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function toNumber(value: unknown, fallback = 0): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    return fallback;
}

function toStringValue(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

function toNullableString(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
}

function normalizeInventoryReference(value: unknown): InventoryItemReference | null {
    if (!isRecord(value)) {
        return null;
    }

    const itemId = toNumber(value.item_id);
    const itemName = toStringValue(value.item_name);

    if (!itemId || itemName === '') {
        return null;
    }

    return {
        id: typeof value.id === 'number' ? value.id : undefined,
        item_id: itemId,
        sku: toNullableString(value.sku),
        item_name: itemName,
        category: toNullableString(value.category),
        stock: value.stock !== undefined ? toNumber(value.stock) : undefined,
        current_stock: value.current_stock !== undefined ? toNumber(value.current_stock) : undefined,
        unit_price: value.unit_price !== undefined ? toNumber(value.unit_price) : undefined,
    };
}

function normalizeUrgency(value: unknown): Alert['urgency'] {
    switch (value) {
        case 'critical':
        case 'high':
        case 'medium':
        case 'low':
            return value;
        default:
            return 'low';
    }
}

function normalizeAlertType(value: unknown): Alert['alert_type'] {
    switch (value) {
        case 'low_stock':
        case 'out_of_stock':
        case 'expiry':
        case 'reorder':
            return value;
        default:
            return 'low_stock';
    }
}

function normalizeTransactionType(value: unknown): StockTransaction['transaction_type'] {
    switch (value) {
        case 'procurement':
        case 'sale':
        case 'return':
        case 'damage':
        case 'adjustment':
            return value;
        default:
            return 'adjustment';
    }
}

export function normalizeAlert(value: unknown): Alert | null {
    if (!isRecord(value)) {
        return null;
    }

    const inventory = normalizeInventoryReference(value.inventory);
    const itemId = toNumber(value.item_id, inventory?.item_id ?? 0);

    if (!itemId) {
        return null;
    }

    return {
        id: toNumber(value.id),
        item_id: itemId,
        item_name: toStringValue(value.item_name, inventory?.item_name ?? `Item #${itemId}`),
        current_stock: toNumber(value.current_stock, inventory?.current_stock ?? inventory?.stock ?? 0),
        reorder_level: toNumber(value.reorder_level),
        category: toStringValue(value.category, inventory?.category ?? ''),
        supplier: toNullableString(value.supplier) ?? undefined,
        urgency: normalizeUrgency(value.urgency),
        alert_type: normalizeAlertType(value.alert_type),
        message: toNullableString(value.message) ?? undefined,
        acknowledged: Boolean(value.acknowledged),
        acknowledged_by: toNullableString(value.acknowledged_by) ?? undefined,
        acknowledged_at: toNullableString(value.acknowledged_at) ?? undefined,
        created_at: toStringValue(value.created_at),
        updated_at: toStringValue(value.updated_at),
        inventory: inventory ?? undefined,
    };
}

export function normalizeAlerts(value: unknown): Alert[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.map((entry) => normalizeAlert(entry)).filter((entry): entry is Alert => entry !== null);
}

export function normalizeAlertStatistics(value: unknown): AlertStatistics {
    const record = isRecord(value) ? value : {};
    const rawUrgency = isRecord(record.by_urgency)
        ? record.by_urgency
        : isRecord(record.alerts_by_urgency)
          ? record.alerts_by_urgency
          : {};
    const rawTypes = isRecord(record.by_type)
        ? record.by_type
        : isRecord(record.alerts_by_type)
          ? record.alerts_by_type
          : {};
    const alertsByUrgency = {
        critical: toNumber(rawUrgency.critical),
        high: toNumber(rawUrgency.high),
        medium: toNumber(rawUrgency.medium),
        low: toNumber(rawUrgency.low),
    };
    const alertsByType = Object.fromEntries(Object.entries(rawTypes).map(([key, entry]) => [key, toNumber(entry)]));
    const recentAlerts = normalizeAlerts(record.recent_alerts);
    const unacknowledgedAlerts = toNumber(record.unacknowledged_alerts, toNumber(record.total_unacknowledged));
    const acknowledgedAlerts = toNumber(record.acknowledged_alerts);

    return {
        total_alerts: toNumber(
            record.total_alerts,
            unacknowledgedAlerts + acknowledgedAlerts || recentAlerts.length || Object.values(alertsByUrgency).reduce((sum, count) => sum + count, 0),
        ),
        unacknowledged_alerts: unacknowledgedAlerts,
        acknowledged_alerts: acknowledgedAlerts,
        critical_alerts: toNumber(record.critical_alerts, alertsByUrgency.critical),
        high_priority_alerts: toNumber(record.high_priority_alerts, alertsByUrgency.high),
        alerts_by_urgency: alertsByUrgency,
        alerts_by_type: alertsByType,
        recent_alerts: recentAlerts,
    };
}

export function normalizeAlertGenerationResult(value: unknown): AlertGenerationResult {
    const record = isRecord(value) ? value : {};

    return {
        alerts_created: toNumber(record.alerts_created, toNumber(record.created)),
        alerts_updated: toNumber(record.alerts_updated, toNumber(record.updated)),
        total_alerts: toNumber(record.total_alerts, Array.isArray(record.alerts) ? record.alerts.length : 0),
    };
}

export function normalizeAlertCleanupResult(value: unknown): AlertCleanupResult {
    const record = isRecord(value) ? value : {};

    return {
        deleted_count: toNumber(record.deleted_count),
    };
}

export function normalizeStockTransaction(value: unknown): StockTransaction | null {
    if (!isRecord(value)) {
        return null;
    }

    const itemId = toNumber(value.item_id);

    if (!itemId) {
        return null;
    }

    const inventory = normalizeInventoryReference(value.inventory) ?? normalizeInventoryReference(value.inventory_item);
    const quantity = toNumber(value.quantity);
    const newStock = value.new_stock !== undefined ? toNumber(value.new_stock) : undefined;
    const balanceAfter = value.balance_after !== undefined ? toNumber(value.balance_after) : newStock;

    return {
        id: toNumber(value.id),
        item_id: itemId,
        transaction_type: normalizeTransactionType(value.transaction_type),
        quantity,
        previous_stock: value.previous_stock !== undefined ? toNumber(value.previous_stock) : undefined,
        new_stock: newStock,
        balance_after: balanceAfter,
        reference_number: toNullableString(value.reference_number),
        notes: toNullableString(value.notes),
        created_by: toNullableString(value.created_by),
        absolute_quantity: value.absolute_quantity !== undefined ? toNumber(value.absolute_quantity) : Math.abs(quantity),
        is_stock_increase: value.is_stock_increase !== undefined ? Boolean(value.is_stock_increase) : quantity > 0,
        transaction_value: value.transaction_value !== undefined ? toNumber(value.transaction_value) : undefined,
        created_at: toStringValue(value.created_at),
        updated_at: toStringValue(value.updated_at),
        inventory: inventory ?? undefined,
        inventory_item: inventory ?? undefined,
    };
}

export function normalizeStockTransactions(value: unknown): StockTransaction[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.map((entry) => normalizeStockTransaction(entry)).filter((entry): entry is StockTransaction => entry !== null);
}

export function normalizeAuditTransaction(transaction: StockTransaction): AuditTransaction {
    return {
        ...transaction,
        performed_by: transaction.created_by ?? 'System',
        job_order_id: transaction.reference_number ?? undefined,
        reason: transaction.notes ?? undefined,
        timestamp: transaction.created_at,
        type:
            transaction.transaction_type === 'procurement'
                ? 'RESTOCK'
                : transaction.transaction_type === 'sale'
                  ? 'CONSUME'
                  : transaction.transaction_type === 'return'
                    ? 'RETURN'
                    : transaction.transaction_type === 'damage'
                      ? 'DAMAGE'
                      : 'ADJUST',
        partId: transaction.item_id,
        inventory: transaction.inventory ?? transaction.inventory_item ?? null,
        inventory_item: transaction.inventory ?? transaction.inventory_item ?? null,
    };
}
