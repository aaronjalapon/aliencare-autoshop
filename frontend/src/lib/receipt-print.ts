import type { CustomerBillingReceipt } from '@/types/customer';

export interface ReceiptPrintLineItem {
    label: string;
    amount: number;
}

export interface ReceiptPrintData {
    receiptNo: string;
    transactionId: string;
    jobOrderNo: string;
    customerName: string;
    customerPhone: string;
    vehicle: string;
    vehiclePlate: string;
    bookingDate: string;
    bookingTime: string;
    arrival: string;
    arrivalTime: string;
    branch: string;
    lineItems: ReceiptPrintLineItem[];
    totalPaid: number;
    paymentMethod: string;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatDateLabel(value: string | null | undefined): string {
    if (!value) return '—';
    const date = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDetailedDateLabel(value: string | null | undefined): string {
    if (!value) return '—';
    const date = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimeLabel(value: string | null | undefined): string {
    if (!value) return '—';
    if (!value.includes('T') && /^\d{2}:\d{2}$/.test(value)) {
        const [hourText, minuteText] = value.split(':');
        const hour = Number(hourText);
        const minute = Number(minuteText);
        if (Number.isNaN(hour) || Number.isNaN(minute)) return value;
        const period = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 === 0 ? 12 : hour % 12;
        return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
    }
    return new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatPaymentMethod(value: string | null | undefined): string {
    if (!value) return 'N/A';
    return value
        .split(/[_\s-]+/)
        .filter(Boolean)
        .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
        .join(' ');
}

export function mapCustomerBillingReceiptToPrintData(receipt: CustomerBillingReceipt): ReceiptPrintData {
    const receiptDate = receipt.paid_at ?? receipt.created_at;
    const year = receiptDate ? new Date(receiptDate).getFullYear() : new Date().getFullYear();
    const branch = receipt.branch_address
        ? `${receipt.branch_name}, ${receipt.branch_address}`
        : receipt.branch_name;
    const vehicle = [receipt.vehicle_make, receipt.vehicle_model]
        .filter(Boolean)
        .join(' ')
        .trim() || 'Vehicle';

    return {
        receiptNo: `RC-${year}-${String(receipt.transaction_id).padStart(5, '0')}`,
        transactionId: `TXN-${String(receipt.transaction_id).padStart(6, '0')}`,
        jobOrderNo: receipt.job_order_no ?? `JO-${receipt.job_order_id ?? 'N/A'}`,
        customerName: receipt.customer_name,
        customerPhone: receipt.customer_phone ?? '—',
        vehicle,
        vehiclePlate: receipt.vehicle_plate ?? '—',
        bookingDate: formatDateLabel(receipt.booking_date),
        bookingTime: formatTimeLabel(receipt.booking_time),
        arrival: formatDetailedDateLabel(receipt.arrival_date),
        arrivalTime: formatTimeLabel(receipt.arrival_time),
        branch,
        lineItems: receipt.line_items.map((item) => ({
            label: item.label,
            amount: Number(item.amount),
        })),
        totalPaid: Number(receipt.amount_paid),
        paymentMethod: formatPaymentMethod(receipt.payment_method),
    };
}

export function buildReceiptHtml(data: ReceiptPrintData): string {
    const lineItemsHtml = data.lineItems
        .map(
            (li) =>
                `<div class="row"><span class="muted">${escapeHtml(li.label)}</span><span>&#8369;${li.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></div>`,
        )
        .join('');

    return `<!DOCTYPE html><html><head><title>Receipt ${data.receiptNo}</title><style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Arial,sans-serif;color:#111;background:#fff;padding:40px;font-size:13px}
        .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px}
        .brand p{font-weight:900;font-size:18px;line-height:1.15}
        .badge{display:inline-flex;align-items:center;gap:6px;border:1px solid #16a34a;background:#f0fdf4;color:#16a34a;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700}
        .title{text-align:center;color:#b8860b;font-size:15px;font-weight:700;margin:16px 0;padding:8px 0;border-top:1px solid #d4af37;border-bottom:1px solid #d4af37}
        .grid2{display:grid;grid-template-columns:1fr 1fr;gap:4px 32px;margin:12px 0;font-size:13px}
        .muted{color:#666}.gold{color:#b8860b;font-weight:700}
        hr{border:none;border-top:1px solid #ddd;margin:10px 0}
        .row{display:flex;justify-content:space-between;font-size:13px;margin:3px 0}
        .footer{font-size:11px;color:#666;margin-top:12px}
    </style></head><body>
    <div class="header">
        <div class="brand"><p><span style="color:#b8860b">ALIEN</span>CARE</p><p>AUTOSHOP</p></div>
        <span class="badge">&#10003; Paid</span>
    </div>
    <div class="title">Full Payment Receipt</div>
    <div class="grid2">
        <div><span class="muted">Receipt No </span><strong>${escapeHtml(data.receiptNo)}</strong></div>
        <div><span class="muted">Transaction ID </span><strong>${escapeHtml(data.transactionId)}</strong></div>
        <div><span class="muted">Job Order No </span><strong>${escapeHtml(data.jobOrderNo)}</strong></div>
    </div><hr/>
    <div class="grid2">
        <div><span class="muted">Customer </span><strong>${escapeHtml(data.customerName)}</strong></div>
        <div><span class="muted">Phone </span><strong>${escapeHtml(data.customerPhone)}</strong></div>
        <div><span class="muted">Vehicle </span><strong>${escapeHtml(data.vehicle)} - ${escapeHtml(data.vehiclePlate)}</strong></div>
    </div><hr/>
    <div class="row"><span class="gold">Booking Date</span><span class="muted">${escapeHtml(data.bookingDate)} &bull; ${escapeHtml(data.bookingTime)}</span></div>
    <div class="row"><span class="gold">Arrival</span><span class="muted">${escapeHtml(data.arrival)} &bull; ${escapeHtml(data.arrivalTime)}</span></div>
    <div class="row"><span class="gold">Branch</span><span class="muted">${escapeHtml(data.branch)}</span></div><hr/>
    ${lineItemsHtml}<hr/>
    <div class="row"><span class="gold">Total Paid</span><span class="gold">&#8369;${data.totalPaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></div><hr/>
    <div class="grid2">
        <div><span class="muted">Payment Method </span><strong>${escapeHtml(data.paymentMethod)}</strong></div>
        <div><span class="muted">Payment Status </span><strong style="color:#16a34a">Paid</strong></div>
    </div><hr/>
    <p class="footer">Thank you! This receipt indicates that your full payment has been received for the requested services.</p>
    </body></html>`;
}

export function printReceiptData(data: ReceiptPrintData): void {
    const pw = window.open('', '_blank', 'width=780,height=700');
    if (!pw) return;
    pw.document.write(buildReceiptHtml(data));
    pw.document.close();
    pw.focus();
    setTimeout(() => {
        pw.print();
        pw.close();
    }, 400);
}

// ---------------------------------------------------------------------------
// POS / Retail Receipt
// ---------------------------------------------------------------------------

export interface PosReceiptLineItem {
    itemName: string;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
}

export interface PosReceiptData {
    referenceNumber: string;
    transactionId: number;
    customerName: string | null;
    paymentMethod: string;
    itemCount: number;
    subtotal: number;
    total: number;
    lineItems: PosReceiptLineItem[];
    amountTendered?: number;
    change?: number;
    checkoutNotes?: string;
}

export function buildPosReceiptHtml(data: PosReceiptData): string {
    const now = new Date();
    const dateLabel = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
    const timeLabel = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });

    const lineItemsHtml = data.lineItems
        .map(
            (li) =>
                `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin:4px 0;font-size:12px">
                    <div style="flex:1">
                        <span style="font-weight:600">${escapeHtml(li.itemName)}</span>
                        ${li.sku ? `<span style="color:#666;font-size:11px;margin-left:6px">${escapeHtml(li.sku)}</span>` : ''}
                        <span style="color:#666;margin-left:6px">x${li.quantity}</span>
                    </div>
                    <div style="text-align:right;min-width:80px">
                        <span style="color:#666;font-size:11px">${li.unitPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })} ea</span>
                        <span style="font-weight:600;margin-left:6px">&#8369;${li.lineTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>`,
        )
        .join('');

    const tenderHtml =
        data.amountTendered !== undefined && data.amountTendered > 0
            ? `<div class="row"><span class="muted">Amount Tendered</span><span>&#8369;${data.amountTendered.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></div>
               <div class="row"><span class="muted">Change</span><span style="color:#16a34a;font-weight:700">&#8369;${(data.change ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></div>`
            : '';

    return `<!DOCTYPE html><html><head><title>Receipt ${data.referenceNumber}</title><style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Arial,sans-serif;color:#111;background:#fff;padding:40px;font-size:13px}
        .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px}
        .brand p{font-weight:900;font-size:18px;line-height:1.15}
        .badge{display:inline-flex;align-items:center;gap:6px;border:1px solid #16a34a;background:#f0fdf4;color:#16a34a;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700}
        .title{text-align:center;color:#b8860b;font-size:15px;font-weight:700;margin:16px 0;padding:8px 0;border-top:1px solid #d4af37;border-bottom:1px solid #d4af37}
        .grid2{display:grid;grid-template-columns:1fr 1fr;gap:4px 32px;margin:12px 0;font-size:13px}
        .muted{color:#666}.gold{color:#b8860b;font-weight:700}
        hr{border:none;border-top:1px solid #ddd;margin:10px 0}
        .row{display:flex;justify-content:space-between;font-size:13px;margin:3px 0}
        .footer{font-size:11px;color:#666;margin-top:12px}
    </style></head><body>
    <div class="header">
        <div class="brand"><p><span style="color:#b8860b">ALIEN</span>CARE</p><p>AUTOSHOP</p></div>
        <span class="badge">&#10003; Paid</span>
    </div>
    <div class="title">Sales Receipt</div>
    <div class="grid2">
        <div><span class="muted">Receipt No </span><strong>${escapeHtml(data.referenceNumber)}</strong></div>
        <div><span class="muted">Date </span><strong>${dateLabel} &bull; ${timeLabel}</strong></div>
    </div>
    <div class="grid2">
        <div><span class="muted">Transaction ID </span><strong>TXN-${String(data.transactionId).padStart(6, '0')}</strong></div>
        <div><span class="muted">Customer </span><strong>${escapeHtml(data.customerName || 'Walk-in')}</strong></div>
    </div><hr/>
    <p style="font-weight:700;margin:8px 0 4px;font-size:12px">Items</p>
    ${lineItemsHtml}<hr/>
    <div class="row"><span class="muted">Subtotal (${data.itemCount} item${data.itemCount !== 1 ? 's' : ''})</span><span>&#8369;${data.subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></div>
    <div class="row"><span class="gold">Total</span><span class="gold" style="font-size:16px">&#8369;${data.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></div><hr/>
    ${tenderHtml}
    <div class="grid2">
        <div><span class="muted">Payment Method </span><strong>${escapeHtml(data.paymentMethod)}</strong></div>
        <div><span class="muted">Payment Status </span><strong style="color:#16a34a">Paid</strong></div>
    </div><hr/>
    <p class="footer">Thank you! This serves as your official sales receipt from Aliencare Autoshop.</p>
    </body></html>`;
}

export function printPosReceipt(data: PosReceiptData): void {
    const pw = window.open('', '_blank', 'width=780,height=700');
    if (!pw) return;
    pw.document.write(buildPosReceiptHtml(data));
    pw.document.close();
    pw.focus();
    setTimeout(() => {
        pw.print();
        pw.close();
    }, 400);
}
