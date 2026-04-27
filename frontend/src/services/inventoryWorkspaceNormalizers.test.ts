import { describe, expect, it } from 'vitest';
import {
    normalizeAlertGenerationResult,
    normalizeAlertStatistics,
    normalizeAuditTransaction,
    normalizeStockTransaction,
} from './inventoryWorkspaceNormalizers';

describe('inventoryWorkspaceNormalizers', () => {
    it('normalizes backend alert statistics into the UI contract', () => {
        const result = normalizeAlertStatistics({
            total_unacknowledged: 4,
            by_urgency: {
                critical: 2,
                high: 1,
                medium: 1,
                low: 0,
            },
            by_type: {
                low_stock: 3,
                out_of_stock: 1,
            },
            recent_alerts: [
                {
                    id: 10,
                    item_id: 2001,
                    item_name: 'Brake Pads',
                    current_stock: 2,
                    reorder_level: 5,
                    category: 'Brake',
                    urgency: 'critical',
                    alert_type: 'low_stock',
                    acknowledged: false,
                    created_at: '2026-04-27T08:00:00.000000Z',
                    updated_at: '2026-04-27T08:00:00.000000Z',
                },
            ],
        });

        expect(result.unacknowledged_alerts).toBe(4);
        expect(result.critical_alerts).toBe(2);
        expect(result.high_priority_alerts).toBe(1);
        expect(result.alerts_by_type.low_stock).toBe(3);
        expect(result.recent_alerts[0]?.item_name).toBe('Brake Pads');
    });

    it('normalizes alert generation payloads from current and legacy shapes', () => {
        expect(
            normalizeAlertGenerationResult({
                alerts_created: 3,
                alerts_updated: 1,
                total_alerts: 6,
            }),
        ).toEqual({
            alerts_created: 3,
            alerts_updated: 1,
            total_alerts: 6,
        });

        expect(
            normalizeAlertGenerationResult({
                created: 2,
                updated: 4,
                alerts: [{ id: 1 }, { id: 2 }, { id: 3 }],
            }),
        ).toEqual({
            alerts_created: 2,
            alerts_updated: 4,
            total_alerts: 3,
        });
    });

    it('normalizes stock transactions from backend payloads', () => {
        const transaction = normalizeStockTransaction({
            id: 42,
            item_id: 9001,
            transaction_type: 'sale',
            quantity: -3,
            previous_stock: 12,
            new_stock: 9,
            reference_number: 'JO-2026-0042',
            notes: 'Issued to job order',
            created_by: 'Frontdesk User',
            created_at: '2026-04-27T09:00:00.000000Z',
            updated_at: '2026-04-27T09:00:00.000000Z',
            inventory: {
                item_id: 9001,
                item_name: 'Oil Filter',
                category: 'Engine',
                unit_price: '350.00',
            },
        });

        expect(transaction).not.toBeNull();
        expect(transaction?.balance_after).toBe(9);
        expect(transaction?.absolute_quantity).toBe(3);
        expect(transaction?.inventory?.item_name).toBe('Oil Filter');
    });

    it('maps normalized stock transactions into audit transactions using backend fields', () => {
        const transaction = normalizeStockTransaction({
            id: 42,
            item_id: 9001,
            transaction_type: 'procurement',
            quantity: 5,
            previous_stock: 9,
            new_stock: 14,
            reference_number: 'PROC-2026-0005',
            notes: 'Supplier delivery received',
            created_by: 'Frontdesk User',
            created_at: '2026-04-27T09:00:00.000000Z',
            updated_at: '2026-04-27T09:00:00.000000Z',
        });

        if (!transaction) {
            throw new Error('Expected normalized transaction');
        }

        const auditTransaction = normalizeAuditTransaction(transaction);

        expect(auditTransaction.type).toBe('RESTOCK');
        expect(auditTransaction.performed_by).toBe('Frontdesk User');
        expect(auditTransaction.job_order_id).toBe('PROC-2026-0005');
        expect(auditTransaction.reason).toBe('Supplier delivery received');
        expect(auditTransaction.timestamp).toBe('2026-04-27T09:00:00.000000Z');
    });
});
