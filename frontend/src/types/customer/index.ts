// Types for customer-facing pages — maps to backend API resources

export interface CustomerTransaction {
    id: number;
    customer_id: number;
    job_order_id: number | null;
    type: 'invoice' | 'payment' | 'refund';
    amount: number;
    reference_number: string | null;
    notes: string | null;
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
