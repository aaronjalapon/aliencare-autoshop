import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { buildReceiptHtml, mapCustomerBillingReceiptToPrintData } from '@/lib/receipt-print';
import { flattenValidationErrors } from '@/lib/validation-errors';
import { ApiError } from '@/services/api';
import { billingService } from '@/services/billingService';
import { paymentService } from '@/services/paymentService';
import type { BillingQueueItem, CustomerTransaction } from '@/types/customer';
import { Banknote, Check, Copy, ExternalLink, Loader2, Printer, QrCode, Wallet } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

type InPersonMethod = 'cash';
type OnlineMethod = 'xendit';
type PaymentMethod = InPersonMethod | OnlineMethod;

interface PaymentSidePanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ticket: BillingQueueItem;
    transactions: CustomerTransaction[];
    onPaymentRecorded: () => void;
}

interface GeneratedLink {
    url: string;
    transactionId: number;
}

const IN_PERSON_METHODS: { key: InPersonMethod; label: string; icon: typeof Banknote }[] = [{ key: 'cash', label: 'Cash', icon: Banknote }];

const ONLINE_METHODS: { key: OnlineMethod; label: string; icon: typeof QrCode }[] = [{ key: 'xendit', label: 'Xendit', icon: QrCode }];

function formatPeso(amount: number): string {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
        const validation = flattenValidationErrors(error.validationErrors);
        const first = Object.values(validation)[0];
        if (first) return first;
        if (error.message) return error.message;
        return fallback;
    }
    if (error instanceof Error) return error.message;
    return fallback;
}

export default function PaymentSidePanel({ open, onOpenChange, ticket, transactions, onPaymentRecorded }: PaymentSidePanelProps) {
    const [method, setMethod] = useState<PaymentMethod>('cash');
    const [amount, setAmount] = useState('');
    const [amountTendered, setAmountTendered] = useState('');
    const [reference, setReference] = useState('');
    const [note, setNote] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);
    const [generatedLink, setGeneratedLink] = useState<GeneratedLink | null>(null);
    const [copied, setCopied] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState<{ transactionId: number } | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);

    const isInPerson = method === 'cash';
    const isOnline = !isInPerson;

    const change = useMemo(() => {
        if (method !== 'cash') return 0;
        const tendered = Number.parseFloat(amountTendered);
        const amt = Number.parseFloat(amount);
        if (!Number.isFinite(tendered) || !Number.isFinite(amt)) return 0;
        return Math.max(0, tendered - amt);
    }, [method, amountTendered, amount]);

    const hasSufficientTender = method !== 'cash' || change >= 0;

    // Refresh parent queue when panel closes (handles all close paths:
    // resetAndClose, handleCloseAfterPayment, Escape key, overlay click).
    const wasOpenRef = useRef(open);
    useEffect(() => {
        if (wasOpenRef.current && !open) {
            onPaymentRecorded();
        }
        wasOpenRef.current = open;
    }, [open, onPaymentRecorded]);

    // Reset form when panel opens with new ticket
    const prevTicketKeyRef = useRef<string | null>(null);
    const ticketKey = `${ticket.entity_type}:${ticket.entity_id}`;

    useEffect(() => {
        if (open && ticketKey !== prevTicketKeyRef.current) {
            prevTicketKeyRef.current = ticketKey;
            setMethod('cash');
            setAmount(ticket.balance.toFixed(2));
            setAmountTendered('');
            setReference(ticket.pos_reference ?? '');
            setNote('');
            setError(null);
            setGeneratedLink(null);
            setCopied(false);
            setPaymentSuccess(null);
        }
    }, [open, ticket, ticketKey]);

    const resetAndClose = useCallback(() => {
        setError(null);
        setGeneratedLink(null);
        setCopied(false);
        setPaymentSuccess(null);
        setIsSaving(false);
        setIsGeneratingLink(false);
        onOpenChange(false);
    }, [onOpenChange]);

    const handleGenerateLink = async () => {
        const parsedAmount = Number.parseFloat(amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            setError('Please enter a valid amount.');
            return;
        }

        if (parsedAmount > ticket.balance) {
            setError('Amount cannot exceed the outstanding balance.');
            return;
        }

        try {
            setIsGeneratingLink(true);
            setError(null);
            setGeneratedLink(null);

            // Find existing pending invoice to reuse
            const pendingInvoice = transactions.find(
                (t) => (t.type === 'invoice' || t.type === 'reservation_fee') && (t.xendit_status ?? '').toUpperCase() !== 'PAID',
            );

            const basePayload = {
                payment_method: method,
                reference_number: (ticket.job_order_no ?? ticket.pos_reference ?? null) as string | null,
                notes: `Online payment invoice for ${ticket.invoice_no}`,
                amount: parsedAmount,
            };

            const payload = pendingInvoice?.id
                ? { ...basePayload, transaction_id: pendingInvoice.id }
                : { ...basePayload, customer_id: ticket.customer_id, job_order_id: ticket.job_order_id ?? undefined };

            const response = await paymentService.createFrontdeskInvoice(payload);
            setGeneratedLink({
                url: response.data.payment_url,
                transactionId: response.data.transaction_id,
            });
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to generate payment link.'));
        } finally {
            setIsGeneratingLink(false);
        }
    };

    const handleCopyLink = async () => {
        if (!generatedLink) return;
        try {
            await navigator.clipboard.writeText(generatedLink.url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for non-HTTPS contexts
            const textarea = document.createElement('textarea');
            textarea.value = generatedLink.url;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleSyncStatus = async () => {
        if (!generatedLink) return;
        try {
            setIsSaving(true);
            setError(null);
            const response = await paymentService.syncFrontdeskStatus(generatedLink.transactionId);
            if (response.data.xendit_status === 'PAID') {
                setPaymentSuccess({ transactionId: generatedLink.transactionId });
                setGeneratedLink(null);
            } else {
                setError(`Payment status: ${response.data.xendit_status}. The payment may still be pending.`);
            }
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to sync payment status.'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleRecordPayment = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const parsedAmount = Number.parseFloat(amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            setError('Please enter a valid amount.');
            return;
        }

        if (parsedAmount > ticket.balance) {
            setError('Payment amount cannot exceed the outstanding balance.');
            return;
        }

        if (method === 'cash') {
            const tendered = Number.parseFloat(amountTendered);
            if (!Number.isFinite(tendered) || tendered < parsedAmount) {
                setError('Amount tendered must be at least the payment amount.');
                return;
            }
        }

        try {
            setIsSaving(true);
            setError(null);

            const response = await paymentService.recordPayment({
                customer_id: ticket.customer_id,
                amount: parsedAmount,
                job_order_id: ticket.job_order_id ?? undefined,
                payment_method: method,
                reference_number: reference.trim() || ticket.pos_reference || null,
                notes: note.trim() || null,
            });

            setPaymentSuccess({ transactionId: response.data.id });
            // Queue refresh deferred to resetAndClose so the user
            // has time to print the receipt before the ticket list updates.
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to record payment.'));
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrintReceipt = async () => {
        if (!paymentSuccess) return;
        const pw = window.open('', '_blank', 'width=780,height=700');
        if (!pw) return;
        pw.document.write('<html><body style="font-family:Arial,sans-serif;text-align:center;padding:40px"><p>Loading receipt...</p></body></html>');
        try {
            setIsPrinting(true);
            const response = await billingService.getReceiptDetail(paymentSuccess.transactionId);
            const printData = mapCustomerBillingReceiptToPrintData(response.data);
            pw.document.close();
            pw.document.open();
            pw.document.write(buildReceiptHtml(printData));
            pw.document.close();
            pw.focus();
            setTimeout(() => {
                pw.print();
                pw.close();
            }, 400);
        } catch {
            pw.document.write('<p style="color:red">Failed to load receipt.</p>');
            pw.document.close();
        } finally {
            setIsPrinting(false);
        }
    };

    const handleCloseAfterPayment = () => {
        setPaymentSuccess(null);
        resetAndClose();
    };

    const qrCodeUrl = generatedLink ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(generatedLink.url)}` : null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="flex flex-col sm:max-w-lg">
                <SheetHeader>
                    <SheetTitle className="text-[#d4af37]">Record Payment</SheetTitle>
                    <SheetDescription>
                        {ticket.invoice_no} &mdash; {ticket.customer_name}
                    </SheetDescription>
                    <div className="mt-1 flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Outstanding:</span>
                        <span className="font-bold text-[#d4af37]">{formatPeso(ticket.balance)}</span>
                        {ticket.job_order_no && <span className="text-xs text-muted-foreground">({ticket.job_order_no})</span>}
                    </div>
                </SheetHeader>

                {paymentSuccess ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
                        <div className="rounded-full bg-emerald-500/10 p-4">
                            <Check className="h-12 w-12 text-emerald-400" />
                        </div>
                        <p className="text-lg font-bold text-emerald-400">Payment Recorded</p>
                        <p className="text-center text-sm text-muted-foreground">
                            {formatPeso(Number.parseFloat(amount))} via{' '}
                            {method
                                .split(/[_\s-]+/)
                                .filter(Boolean)
                                .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
                                .join(' ')}
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 space-y-5 overflow-y-auto px-4">
                        {/* Payment Method Selector */}
                        <div>
                            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">In-Person Payment</p>
                            <div className="grid grid-cols-1 gap-2">
                                {IN_PERSON_METHODS.map(({ key, label, icon: Icon }) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => {
                                            setMethod(key);
                                            setGeneratedLink(null);
                                            setError(null);
                                        }}
                                        className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                                            method === key
                                                ? 'border-[#d4af37] bg-[#d4af37]/10 text-[#d4af37]'
                                                : 'border-[#2a2a2e] text-muted-foreground hover:border-[#d4af37]/40 hover:text-foreground'
                                        }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <p className="mt-4 mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Online Payment</p>
                            <div className="grid grid-cols-1 gap-2">
                                {ONLINE_METHODS.map(({ key, label, icon: Icon }) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => {
                                            setMethod(key);
                                            setGeneratedLink(null);
                                            setError(null);
                                        }}
                                        className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                                            method === key
                                                ? 'border-[#d4af37] bg-[#d4af37]/10 text-[#d4af37]'
                                                : 'border-[#2a2a2e] text-muted-foreground hover:border-[#d4af37]/40 hover:text-foreground'
                                        }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Amount */}
                        <div>
                            <div className="mb-1 flex items-center justify-between">
                                <label className="text-xs font-semibold text-muted-foreground">Amount</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAmount(ticket.balance.toFixed(2));
                                        setError(null);
                                    }}
                                    className="text-[11px] text-[#d4af37] transition-opacity hover:opacity-80"
                                >
                                    Settle full balance
                                </button>
                            </div>
                            <div className="relative">
                                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">₱</span>
                                <input
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] pr-3 pl-8 text-sm focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none"
                                    required
                                />
                            </div>
                        </div>

                        {/* Cash-specific: Amount Tendered + Change */}
                        {method === 'cash' && (
                            <div className="space-y-3 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] p-3">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">Amount Tendered</label>
                                    <div className="relative">
                                        <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">₱</span>
                                        <input
                                            value={amountTendered}
                                            onChange={(e) => setAmountTendered(e.target.value)}
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="0.00"
                                            className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] pr-3 pl-8 text-sm focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between rounded-md bg-[#090a0d] px-3 py-2">
                                    <span className="text-sm text-muted-foreground">Change Due</span>
                                    <span className={`text-lg font-bold ${change > 0 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                                        {formatPeso(change)}
                                    </span>
                                </div>

                                {Number.parseFloat(amountTendered) > 0 &&
                                    change === 0 &&
                                    Number.parseFloat(amountTendered) < Number.parseFloat(amount) && (
                                        <p className="text-xs text-amber-400">Tendered amount is less than the payment amount.</p>
                                    )}
                            </div>
                        )}

                        {/* Online-specific: Generate Link + Display */}
                        {isOnline && (
                            <div className="space-y-3 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] p-3">
                                {!generatedLink ? (
                                    <button
                                        type="button"
                                        onClick={handleGenerateLink}
                                        disabled={isGeneratingLink}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isGeneratingLink ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" /> Generating...
                                            </>
                                        ) : (
                                            <>
                                                <QrCode className="h-4 w-4" /> Generate Payment Link
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <div className="space-y-3">
                                        <p className="text-xs font-semibold text-emerald-400">Payment link generated successfully</p>

                                        {/* QR Code */}
                                        {qrCodeUrl && (
                                            <div className="flex justify-center rounded-lg bg-white p-3">
                                                <img src={qrCodeUrl} alt="Payment QR Code" className="h-[200px] w-[200px]" />
                                            </div>
                                        )}

                                        {/* Payment URL */}
                                        <div className="flex items-center gap-2 rounded-md bg-[#090a0d] px-3 py-2">
                                            <p className="flex-1 truncate text-xs text-muted-foreground">{generatedLink.url}</p>
                                            <button
                                                type="button"
                                                onClick={handleCopyLink}
                                                className="shrink-0 rounded-md border border-[#2a2a2e] p-1.5 text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                                                title="Copy link"
                                            >
                                                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                                            </button>
                                            <a
                                                href={generatedLink.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="shrink-0 rounded-md border border-[#2a2a2e] p-1.5 text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                                                title="Open in new tab"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                        </div>

                                        <p className="text-[11px] text-muted-foreground">
                                            Share this link or have the customer scan the QR code to complete payment via Xendit.
                                        </p>

                                        <button
                                            type="button"
                                            onClick={handleSyncStatus}
                                            disabled={isSaving}
                                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#d4af37]/40 px-4 py-2 text-xs font-medium text-[#d4af37] transition-colors hover:bg-[#d4af37]/10 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {isSaving ? (
                                                <>
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing...
                                                </>
                                            ) : (
                                                <>
                                                    <QrCode className="h-3.5 w-3.5" /> Sync Payment Status
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Reference */}
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Reference (optional)</label>
                            <input
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                placeholder="e-wallet reference / transaction ID"
                                className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none"
                            />
                        </div>

                        {/* Note */}
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Note (optional)</label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                rows={2}
                                placeholder="Settlement remarks"
                                className="w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 py-2 text-sm focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none"
                            />
                        </div>

                        {/* Error */}
                        {error && <p className="text-xs text-red-400">{error}</p>}
                    </div>
                )}

                <SheetFooter>
                    {paymentSuccess ? (
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handlePrintReceipt}
                                disabled={isPrinting}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isPrinting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                                Print Receipt
                            </button>
                            <button
                                type="button"
                                onClick={handleCloseAfterPayment}
                                className="flex-1 rounded-lg border border-[#2a2a2e] px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                            >
                                Close
                            </button>
                        </div>
                    ) : isInPerson ? (
                        <form onSubmit={handleRecordPayment} className="flex gap-2">
                            <button
                                type="button"
                                onClick={resetAndClose}
                                className="flex-1 rounded-lg border border-[#2a2a2e] px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving || !hasSufficientTender}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                                    </>
                                ) : (
                                    <>
                                        <Wallet className="h-4 w-4" /> Record Payment
                                    </>
                                )}
                            </button>
                        </form>
                    ) : generatedLink ? (
                        <form onSubmit={handleRecordPayment} className="flex gap-2">
                            <button
                                type="button"
                                onClick={resetAndClose}
                                className="flex-1 rounded-lg border border-[#2a2a2e] px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                            >
                                Close
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#d4af37]/40 px-4 py-2.5 text-sm font-medium text-[#d4af37] transition-colors hover:bg-[#d4af37]/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                                    </>
                                ) : (
                                    <>
                                        <Check className="h-4 w-4" /> Mark as Paid
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <button
                            type="button"
                            onClick={resetAndClose}
                            className="w-full rounded-lg border border-[#2a2a2e] px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                        >
                            Cancel
                        </button>
                    )}
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
