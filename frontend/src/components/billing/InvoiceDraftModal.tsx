import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatPeso, getServiceName, getVehicleLabel } from '@/lib/jobOrderFormatters';
import { jobOrderService } from '@/services/jobOrderService';
import type { JobOrder, JobOrderItem } from '@/types/customer';
import { FileText, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: JobOrder | null;
    onDraftSaved: () => void;
}

export default function InvoiceDraftModal({ open, onOpenChange, order, onDraftSaved }: Props) {
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSaveDraft = async () => {
        if (!order) return;

        setIsSaving(true);
        setError(null);

        try {
            await jobOrderService.prepareInvoice(order.id, notes || undefined);
            setNotes('');
            onOpenChange(false);
            onDraftSaved();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save invoice draft.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        if (!isSaving) {
            setNotes('');
            setError(null);
            onOpenChange(false);
        }
    };

    if (!order) return null;

    const items = order.items ?? [];
    const serviceFee = order.service_fee ?? 0;
    const itemsTotal = items.reduce((sum, item) => sum + (item.total_price ?? 0), 0);
    const grandTotal = itemsTotal + serviceFee;

    return (
        <Sheet open={open} onOpenChange={handleClose}>
            <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
                <SheetHeader className="border-b border-[#2a2a2e] px-5 py-4">
                    <SheetTitle className="flex items-center gap-2 text-base font-bold">
                        <FileText className="h-4 w-4 text-[#d4af37]" />
                        Prepare Invoice Draft
                    </SheetTitle>
                    <SheetDescription className="text-xs">Review the invoice details from {order.jo_number} before saving as draft.</SheetDescription>
                </SheetHeader>

                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                    {/* Job Order / Customer Info */}
                    <div className="space-y-2 rounded-lg border border-[#2a2a2e]/50 bg-[#0d0d10] p-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Job Order</span>
                            <span className="font-medium">{order.jo_number}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Customer</span>
                            <span className="font-medium">{order.customer?.full_name ?? '—'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Vehicle</span>
                            <span className="font-medium">{getVehicleLabel(order)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Service</span>
                            <span className="font-medium">{getServiceName(order)}</span>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div>
                        <h4 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Line Items</h4>
                        <div className="overflow-hidden rounded-lg border border-[#2a2a2e]/50 bg-[#0d0d10]">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[#2a2a2e]/50 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                                        <th className="px-3 py-2 text-left">Description</th>
                                        <th className="w-16 px-3 py-2 text-center">Qty</th>
                                        <th className="w-24 px-3 py-2 text-right">Unit Price</th>
                                        <th className="w-24 px-3 py-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#2a2a2e]/30">
                                    {serviceFee > 0 && (
                                        <tr>
                                            <td className="px-3 py-2 text-muted-foreground">Service Fee ({getServiceName(order)})</td>
                                            <td className="px-3 py-2 text-center text-muted-foreground">1</td>
                                            <td className="px-3 py-2 text-right">{formatPeso(serviceFee)}</td>
                                            <td className="px-3 py-2 text-right font-medium">{formatPeso(serviceFee)}</td>
                                        </tr>
                                    )}
                                    {items.map((item: JobOrderItem) => (
                                        <tr key={item.id}>
                                            <td className="px-3 py-2 text-muted-foreground">{item.description ?? 'Item'}</td>
                                            <td className="px-3 py-2 text-center text-muted-foreground">{item.quantity}</td>
                                            <td className="px-3 py-2 text-right">{formatPeso(item.unit_price)}</td>
                                            <td className="px-3 py-2 text-right font-medium">{formatPeso(item.total_price)}</td>
                                        </tr>
                                    ))}
                                    {items.length === 0 && serviceFee === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-3 py-4 text-center text-xs text-muted-foreground">
                                                No line items to display.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Total */}
                    <div className="flex items-center justify-between rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/5 p-3">
                        <span className="text-sm font-semibold">Total Amount</span>
                        <span className="text-lg font-bold text-[#d4af37]">{formatPeso(grandTotal)}</span>
                    </div>

                    {/* Notes */}
                    <div>
                        <label htmlFor="draft-notes" className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                            Notes (optional)
                        </label>
                        <textarea
                            id="draft-notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any notes for this invoice draft..."
                            rows={3}
                            className="w-full resize-none rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#d4af37]/50 focus:outline-none"
                        />
                    </div>

                    {/* Error */}
                    {error && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">{error}</div>}
                </div>

                <SheetFooter className="border-t border-[#2a2a2e] px-5 py-4">
                    <div className="flex w-full gap-2.5">
                        <button
                            onClick={handleClose}
                            disabled={isSaving}
                            className="flex-1 rounded-lg border border-[#2a2a2e] px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-[#2a2a2e]/50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveDraft}
                            disabled={isSaving}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-black transition-all hover:bg-[#b5952f] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save as Draft'
                            )}
                        </button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
