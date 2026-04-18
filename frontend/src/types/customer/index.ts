// Types for customer-facing pages — maps to backend API resources

export interface CustomerProfile {
    id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
    phone_number: string | null;
    address: string | null;
    license_number: string | null;
    preferred_contact_method: 'sms' | 'call' | 'email' | null;
    special_notes: string | null;
    onboarding_completed_at: string | null;
    account_status: string;
    vehicles: Vehicle[];
    created_at: string;
    updated_at: string;
}

export interface CustomerTransaction {
    id: number;
    customer_id: number;
    job_order_id: number | null;
    type: 'invoice' | 'payment' | 'refund' | 'reservation_fee';
    amount: number;
    reference_number: string | null;
    notes: string | null;
    external_id: string | null;
    xendit_invoice_id: string | null;
    payment_url: string | null;
    payment_method: string | null;
    xendit_status: 'PENDING' | 'PAID' | 'EXPIRED' | null;
    paid_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface Vehicle {
    id: number;
    customer_id: number;
    plate_number: string;
    make: string;
    model: string;
    year: number;
    color: string | null;
    vin: string | null;
    approval_status: string;
    approved_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface ServiceCatalogItem {
    id: number;
    name: string;
    description: string | null;
    price_label: string;
    price_fixed: number;
    duration: string;
    estimated_duration: string;
    category: 'maintenance' | 'cleaning' | 'repair';
    features: string[];
    includes: string[];
    rating: number;
    rating_count: number;
    queue_label: string | null;
    recommended: boolean;
    recommended_note: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ProductItem {
    id: number;
    item_id: number;
    item_name: string;
    description: string;
    category: string;
    stock: number;
    unit_price: number;
    created_at: string;
    updated_at: string;
}

export interface CartItem {
    product: ProductItem;
    quantity: number;
}

export interface BookingTimeSlot {
    time: string; // HH:MM
    label: string; // e.g. 10:00 AM
    status: 'available' | 'full';
    slots_left: number;
    capacity: number;
    booked: number;
}

export interface BookingAvailability {
    arrival_date: string;
    slots: BookingTimeSlot[];
}

export type JobOrderStatus = 'created' | 'pending_approval' | 'approved' | 'in_progress' | 'completed' | 'settled' | 'cancelled';

export interface JobOrderServiceSummary {
    id: number;
    name: string;
    category: 'maintenance' | 'cleaning' | 'repair' | string | null;
    duration: string | null;
    estimated_duration: string | null;
    includes: string[];
}

export interface JobOrderItem {
    id: number;
    job_order_id: number;
    item_type: 'part' | 'service' | string;
    item_id: number | null;
    description: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
    created_at: string;
    updated_at: string;
}

export interface JobOrderCustomerSummary {
    id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string | null;
    phone_number: string | null;
}

export interface JobOrderReceiptUrl {
    job_order_id: number;
    transaction_id: number;
    payment_url: string;
    xendit_status: 'PENDING' | 'PAID' | 'EXPIRED' | null;
    paid_at: string | null;
}

export interface BillingSummaryLastPayment {
    id: number;
    job_order_id: number | null;
    amount: number;
    type: CustomerTransaction['type'];
    payment_method: string | null;
    notes: string | null;
    paid_at: string | null;
    created_at: string;
}

export interface CustomerBillingSummary {
    outstanding_balance: number;
    pending_count: number;
    total_paid: number;
    paid_count: number;
    total_transactions: number;
    last_payment: BillingSummaryLastPayment | null;
}

export interface CustomerBillingReceiptLineItem {
    label: string;
    amount: number;
}

export interface CustomerBillingReceipt {
    transaction_id: number;
    transaction_type: CustomerTransaction['type'];
    job_order_id: number | null;
    job_order_no: string | null;
    paid_at: string | null;
    created_at: string;
    payment_method: string | null;
    amount_paid: number;
    notes: string | null;
    reference_number: string | null;
    booking_date: string | null;
    booking_time: string | null;
    arrival_date: string | null;
    arrival_time: string | null;
    customer_name: string;
    customer_phone: string | null;
    vehicle_make: string | null;
    vehicle_model: string | null;
    vehicle_plate: string | null;
    branch_name: string;
    branch_address: string;
    line_items: CustomerBillingReceiptLineItem[];
}

export interface JobOrder {
    id: number;
    jo_number: string;
    status: JobOrderStatus;
    status_label: string;
    status_color: string;
    source?: 'Online Booking' | 'Walk-in' | string;
    service_fee: number;
    total_cost: number | null;
    balance?: number;
    settled_flag: boolean;
    invoice_id: string | null;
    approved_at: string | null;
    notes: string | null;
    arrival_date: string | null;
    arrival_time: string | null;
    reservation_expires_at: string | null;
    service: JobOrderServiceSummary | null;
    created_at: string;
    updated_at: string;
    customer?: JobOrderCustomerSummary | null;
    vehicle: Vehicle | null;
    mechanic: { id: number; name: string | null; specialization: string | null; availability_status: string } | null;
    bay: { id: number; name: string; status: string } | null;
    items?: JobOrderItem[];
}

export type BillingQueueSource = 'online_booking' | 'walk_in';
export type BillingQueueKind = 'service' | 'retail';
export type BillingQueueStatus = 'pending' | 'partial' | 'paid';

export interface BillingQueueItem {
    entity_type: 'job_order' | 'pos_transaction';
    entity_id: number;
    customer_id: number;
    customer_name: string;
    customer_phone: string | null;
    source: BillingQueueSource;
    kind: BillingQueueKind;
    invoice_no: string;
    job_order_id: number | null;
    job_order_no: string | null;
    pos_reference: string | null;
    vehicle_make: string | null;
    vehicle_model: string | null;
    vehicle_year: number | null;
    plate_number: string | null;
    service_advisor: string | null;
    payment_terms: string | null;
    notes: string | null;
    created_at: string;
    due_at: string | null;
    subtotal: number;
    paid_total: number;
    balance: number;
    status: BillingQueueStatus;
}
