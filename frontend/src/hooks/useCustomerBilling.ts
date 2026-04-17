/**
 * Hook for customer billing data
 * Fetches transactions, billing summary, and receipts from the backend
 */

import { customerService } from '@/services/customerService';
import { CustomerBillingReceipt, CustomerBillingSummary, CustomerTransaction } from '@/types/customer';
import { useCallback, useEffect, useState } from 'react';

function fallbackSummaryFromTransactions(transactions: CustomerTransaction[]): CustomerBillingSummary {
    const pendingItems = transactions.filter(
        (t) => (t.type === 'invoice' || t.type === 'reservation_fee') && t.xendit_status !== 'PAID',
    );
    const paidItems = transactions.filter(
        (t) => t.type === 'payment' || ((t.type === 'invoice' || t.type === 'reservation_fee') && t.xendit_status === 'PAID'),
    );

    const totalPaid = paidItems.reduce((sum, item) => sum + Math.abs(Number(item.amount)), 0);
    const outstandingBalance = pendingItems.reduce((sum, item) => sum + Math.abs(Number(item.amount)), 0);

    const lastPayment =
        paidItems.length > 0
            ? [...paidItems].sort((a, b) => {
                  const aTime = new Date(a.paid_at ?? a.created_at).getTime();
                  const bTime = new Date(b.paid_at ?? b.created_at).getTime();
                  return bTime - aTime;
              })[0]
            : null;

    return {
        outstanding_balance: outstandingBalance,
        pending_count: pendingItems.length,
        total_paid: totalPaid,
        paid_count: paidItems.length,
        total_transactions: transactions.length,
        last_payment: lastPayment
            ? {
                  id: lastPayment.id,
                  job_order_id: lastPayment.job_order_id,
                  amount: Math.abs(Number(lastPayment.amount)),
                  type: lastPayment.type,
                  payment_method: lastPayment.payment_method,
                  notes: lastPayment.notes,
                  paid_at: lastPayment.paid_at,
                  created_at: lastPayment.created_at,
              }
            : null,
    };
}

export function useCustomerBilling() {
    const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
    const [receipts, setReceipts] = useState<CustomerBillingReceipt[]>([]);
    const [summary, setSummary] = useState<CustomerBillingSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [receiptsError, setReceiptsError] = useState<string | null>(null);

    const fetchBilling = useCallback(async () => {
        setLoading(true);
        setError(null);
        setReceiptsError(null);

        try {
            const [transactionsResult, summaryResult, receiptsResult] = await Promise.allSettled([
                customerService.getMyTransactions({ per_page: 100 }),
                customerService.getMyBillingSummary(),
                customerService.getMyBillingReceipts({ per_page: 100 }),
            ]);

            let nextTransactions: CustomerTransaction[] = [];
            let nextCoreError: string | null = null;

            if (transactionsResult.status === 'fulfilled') {
                nextTransactions = transactionsResult.value?.data?.data ?? [];
                setTransactions(nextTransactions);
            } else {
                setTransactions([]);
                nextCoreError =
                    transactionsResult.reason instanceof Error ? transactionsResult.reason.message : 'Failed to fetch billing transactions';
            }

            if (summaryResult.status === 'fulfilled') {
                setSummary(summaryResult.value?.data ?? null);
            } else {
                setSummary(fallbackSummaryFromTransactions(nextTransactions));
                nextCoreError ??=
                    summaryResult.reason instanceof Error ? summaryResult.reason.message : 'Failed to fetch billing summary';
            }

            if (receiptsResult.status === 'fulfilled') {
                setReceipts(receiptsResult.value?.data?.data ?? []);
            } else {
                setReceipts([]);
                setReceiptsError(receiptsResult.reason instanceof Error ? receiptsResult.reason.message : 'Failed to fetch receipts');
            }

            setError(nextCoreError);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch billing data');
            setReceipts([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBilling();
    }, [fetchBilling]);

    const pendingItems = transactions.filter(
        (t) => (t.type === 'invoice' || t.type === 'reservation_fee') && t.xendit_status !== 'PAID',
    );

    const paidItems = transactions.filter(
        (t) => t.type === 'payment' || ((t.type === 'invoice' || t.type === 'reservation_fee') && t.xendit_status === 'PAID'),
    );

    const fallbackSummary = fallbackSummaryFromTransactions(transactions);
    const outstandingBalance = summary?.outstanding_balance ?? fallbackSummary.outstanding_balance;

    return {
        transactions,
        receipts,
        summary: summary ?? fallbackSummary,
        pendingItems,
        paidItems,
        outstandingBalance,
        loading,
        error,
        receiptsError,
        refresh: fetchBilling,
    };
}
