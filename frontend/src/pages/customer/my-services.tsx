import CustomerLayout from '@/components/layout/customer-layout';
import { useProductCatalog } from '@/hooks/useProductCatalog';
import { type BreadcrumbItem } from '@/types';
<<<<<<< HEAD
import { InventoryItem } from '@/types/inventory';
import { Loader2, Minus, Plus, Search, ShoppingCart, Trash2, X } from 'lucide-react';
=======
import {
    ArrowLeft,
    ArrowUpDown,
    Calendar,
    Car,
    CheckCircle2,
    ChevronDown,
    Circle,
    CreditCard,
    Download,
    Filter,
    MapPin,
    MessageSquare,
    Phone,
    RotateCcw,
    Search,
    ShieldAlert,
    Tag,
    User,
    Wrench,
    XCircle,
} from 'lucide-react';
>>>>>>> refs/remotes/origin/main
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/customer' },
    { title: 'My Services', href: '/customer/my-services' },
];

<<<<<<< HEAD
interface CartItem {
    product: InventoryItem;
    quantity: number;
}

export default function MyServices() {
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [cartOpen, setCartOpen] = useState(false);
    const { products, categories, loading, error } = useProductCatalog();

    const filtered = products.filter((p) => {
        const matchesSearch = p.item_name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    const addToCart = (product: InventoryItem) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            if (existing) {
                return prev.map((item) => (item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
            }
            return [...prev, { product, quantity: 1 }];
        });
        setCartOpen(true);
=======
// ── types ─────────────────────────────────────────────────────────────────────
type BookingStatus = 'Waiting in Queue' | 'Booking Confirmed' | 'Awaiting Confirmation' | 'In Service' | 'Completed' | 'Canceled';
type TabKey = 'Upcoming' | 'Active' | 'Completed' | 'Canceled';
type PaymentMethod = 'Pay at shop' | 'Reservation fee paid' | 'Paid';

interface Booking {
    id: number;
    jobOrder: string;
    serviceName: string;
    serviceCategory: string;
    dateTime: string;
    vehicle: string;
    vehiclePlate: string;
    vehicleModel: string;
    vehicleYear: string;
    status: BookingStatus;
    payment: PaymentMethod;
    tab: TabKey;
    arrival: string;
    scheduledTime: string;
    estimatedStart: string;
    estimatedEnd: string;
    estimatedDuration: string;
    reservationFeePaid: boolean;
    bookedOn: string;
    includes: string[];
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    amountPaid: number;
    remainingBalance: number | null;
    bookingDate: string;
    stepTimestamps: { created?: string; confirmed?: string; waitingInQueue?: string; inService?: string; completed?: string };
}

// ── sample data ───────────────────────────────────────────────────────────────
const BOOKINGS: Booking[] = [
    {
        id: 1,
        jobOrder: 'JO-10237',
        serviceName: 'Change Oil',
        serviceCategory: 'Maintenance',
        dateTime: 'Mon, Apr 5, 1:00 PM',
        vehicle: 'Toyota Innova',
        vehiclePlate: 'CAV 1234',
        vehicleModel: 'Toyota Innova 2.0 E',
        vehicleYear: '2019',
        status: 'Waiting in Queue',
        payment: 'Pay at shop',
        tab: 'Upcoming',
        arrival: 'Mon, Apr 5, 10:00 AM',
        scheduledTime: '1:00 PM',
        estimatedStart: '1:15 PM',
        estimatedEnd: '2:00 PM',
        estimatedDuration: '45–60 mins',
        reservationFeePaid: false,
        bookedOn: 'Apr 2, 2026 - 3:10 PM',
        bookingDate: 'Apr 2, 2026',
        includes: ['Synthetic oil refill', 'Oil filter replacement', '21-point inspection'],
        customerName: 'Juan Dela Cruz',
        customerPhone: '0912 345 6789',
        customerAddress: 'Davao City',
        amountPaid: 0,
        remainingBalance: 1200,
        stepTimestamps: { created: 'Apr 2, 3:10 PM', confirmed: 'Apr 2, 3:12 PM', waitingInQueue: 'Apr 5, 12:55 PM' },
    },
    {
        id: 2,
        jobOrder: 'JO-10235',
        serviceName: 'Air-Con Repair',
        serviceCategory: 'Repair',
        dateTime: 'Mon, Apr 5, 1:00 PM',
        vehicle: 'Toyota Innova',
        vehiclePlate: 'CAV 1234',
        vehicleModel: 'Toyota Innova 2.0 E',
        vehicleYear: '2019',
        status: 'Booking Confirmed',
        payment: 'Reservation fee paid',
        tab: 'Upcoming',
        arrival: 'Mon, Apr 5, 10:00 AM',
        scheduledTime: '1:00 PM',
        estimatedStart: '1:15 PM',
        estimatedEnd: '2:45 PM',
        estimatedDuration: '60–90 mins',
        reservationFeePaid: true,
        bookedOn: 'Apr 1, 2026 - 11:30 AM',
        bookingDate: 'Apr 1, 2026',
        includes: ['AC diagnostics', 'Refrigerant top-up', 'Filter cleaning'],
        customerName: 'Juan Dela Cruz',
        customerPhone: '0912 345 6789',
        customerAddress: 'Davao City',
        amountPaid: 200,
        remainingBalance: 2300,
        stepTimestamps: { created: 'Apr 1, 11:30 AM', confirmed: 'Apr 1, 11:35 AM' },
    },
    {
        id: 3,
        jobOrder: 'JO-10234',
        serviceName: 'Wheel Alignment',
        serviceCategory: 'Maintenance',
        dateTime: 'Mon, Apr 5, 1:00 PM',
        vehicle: 'Toyota Innova',
        vehiclePlate: 'CAV 1234',
        vehicleModel: 'Toyota Innova 2.0 E',
        vehicleYear: '2019',
        status: 'Awaiting Confirmation',
        payment: 'Pay at shop',
        tab: 'Upcoming',
        arrival: 'Mon, Apr 5, 10:00 AM',
        scheduledTime: '1:00 PM',
        estimatedStart: '1:15 PM',
        estimatedEnd: '2:00 PM',
        estimatedDuration: '40–50 mins',
        reservationFeePaid: false,
        bookedOn: 'Mar 31, 2026 - 9:00 AM',
        bookingDate: 'Mar 31, 2026',
        includes: ['Camber / toe adjustment', 'Steering check', 'Post-alignment test drive'],
        customerName: 'Juan Dela Cruz',
        customerPhone: '0912 345 6789',
        customerAddress: 'Davao City',
        amountPaid: 0,
        remainingBalance: 700,
        stepTimestamps: { created: 'Mar 31, 9:00 AM' },
    },
    {
        id: 4,
        jobOrder: 'JO-10230',
        serviceName: 'Premium Car Wash',
        serviceCategory: 'Cleaning',
        dateTime: 'Mon, Mar 24, 10:00 AM',
        vehicle: 'Toyota Innova',
        vehiclePlate: 'CAV 1234',
        vehicleModel: 'Toyota Innova 2.0 E',
        vehicleYear: '2019',
        status: 'In Service',
        payment: 'Reservation fee paid',
        tab: 'Active',
        arrival: 'Mon, Mar 24, 10:00 AM',
        scheduledTime: '10:00 AM',
        estimatedStart: '10:15 AM',
        estimatedEnd: '10:45 AM',
        estimatedDuration: '30–40 mins',
        reservationFeePaid: true,
        bookedOn: 'Mar 20, 2026 - 4:25 PM',
        bookingDate: 'Mar 20, 2026',
        includes: ['Exterior wash', 'Interior vacuum', 'Tire black'],
        customerName: 'Juan Dela Cruz',
        customerPhone: '0912 345 6789',
        customerAddress: 'Davao City',
        amountPaid: 200,
        remainingBalance: 350,
        stepTimestamps: {
            created: 'Mar 20, 4:25 PM',
            confirmed: 'Mar 20, 4:25 PM',
            waitingInQueue: 'Mar 24, 9:58 AM',
            inService: 'Mar 24, 10:17 AM',
        },
    },
    {
        id: 5,
        jobOrder: 'JO-10215',
        serviceName: 'Full Detail',
        serviceCategory: 'Cleaning',
        dateTime: 'Wed, Mar 10, 9:00 AM',
        vehicle: 'Toyota Innova',
        vehiclePlate: 'CAV 1234',
        vehicleModel: 'Toyota Innova 2.0 E',
        vehicleYear: '2019',
        status: 'Completed',
        payment: 'Paid',
        tab: 'Completed',
        arrival: 'Wed, Mar 10, 9:00 AM',
        scheduledTime: '9:00 AM',
        estimatedStart: '9:15 AM',
        estimatedEnd: '12:15 PM',
        estimatedDuration: '2.5–3 hrs',
        reservationFeePaid: true,
        bookedOn: 'Mar 7, 2026 - 2:00 PM',
        bookingDate: 'Mar 7, 2026',
        includes: ['Exterior wash', 'Interior deep clean', 'Engine bay clean'],
        customerName: 'Juan Dela Cruz',
        customerPhone: '0912 345 6789',
        customerAddress: 'Davao City',
        amountPaid: 2000,
        remainingBalance: null,
        stepTimestamps: {
            created: 'Mar 7, 2:00 PM',
            confirmed: 'Mar 7, 2:05 PM',
            waitingInQueue: 'Mar 10, 8:55 AM',
            inService: 'Mar 10, 9:20 AM',
            completed: 'Mar 10, 12:10 PM',
        },
    },
    {
        id: 6,
        jobOrder: 'JO-10201',
        serviceName: 'Brake Repair',
        serviceCategory: 'Repair',
        dateTime: 'Fri, Feb 20, 2:00 PM',
        vehicle: 'Toyota Innova',
        vehiclePlate: 'CAV 1234',
        vehicleModel: 'Toyota Innova 2.0 E',
        vehicleYear: '2019',
        status: 'Canceled',
        payment: 'Pay at shop',
        tab: 'Canceled',
        arrival: 'Fri, Feb 20, 2:00 PM',
        scheduledTime: '2:00 PM',
        estimatedStart: '2:15 PM',
        estimatedEnd: '3:15 PM',
        estimatedDuration: '50–70 mins',
        reservationFeePaid: false,
        bookedOn: 'Feb 18, 2026 - 10:00 AM',
        bookingDate: 'Feb 18, 2026',
        includes: ['Brake pad replacement', 'Rotor resurfacing / replacement', 'Brake fluid flush'],
        customerName: 'Juan Dela Cruz',
        customerPhone: '0912 345 6789',
        customerAddress: 'Davao City',
        amountPaid: 0,
        remainingBalance: null,
        stepTimestamps: { created: 'Feb 18, 10:00 AM' },
    },
];

const TABS: TabKey[] = ['Upcoming', 'Active', 'Completed', 'Canceled'];

// ── status badge (outline) ─────────────────────────────────────────────────────
function StatusBadge({ status }: { status: BookingStatus }) {
    const styles: Record<BookingStatus, string> = {
        'Waiting in Queue': 'border border-[#d4af37] text-[#d4af37]',
        'Booking Confirmed': 'border border-green-500 text-green-400',
        'Awaiting Confirmation': 'border border-blue-400 text-blue-400',
        'In Service': 'border border-purple-400 text-purple-400',
        Completed: 'border border-green-600 text-green-500',
        Canceled: 'border border-red-500 text-red-500',
>>>>>>> refs/remotes/origin/main
    };
    return <span className={`rounded-full px-3 py-0.5 text-xs font-medium whitespace-nowrap ${styles[status]}`}>{status}</span>;
}

// ── status badge (filled, for detail page) ────────────────────────────────────
function FilledStatusBadge({ status }: { status: BookingStatus }) {
    const styles: Record<BookingStatus, { bg: string; dot: string; text: string }> = {
        'Waiting in Queue': { bg: 'bg-[#d4af37]/15', dot: 'bg-[#d4af37]', text: 'text-[#d4af37]' },
        'Booking Confirmed': { bg: 'bg-green-500/15', dot: 'bg-green-400', text: 'text-green-400' },
        'Awaiting Confirmation': { bg: 'bg-blue-500/15', dot: 'bg-blue-400', text: 'text-blue-400' },
        'In Service': { bg: 'bg-purple-500/15', dot: 'bg-purple-400', text: 'text-purple-400' },
        Completed: { bg: 'bg-green-700/15', dot: 'bg-green-500', text: 'text-green-500' },
        Canceled: { bg: 'bg-red-500/15', dot: 'bg-red-500', text: 'text-red-400' },
    };
    const s = styles[status];
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${s.bg} ${s.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
            {status}
        </span>
    );
}

// ── progress stepper ──────────────────────────────────────────────────────────
const PROGRESS_STEPS = [
    { key: 'created', label: 'Created' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'waitingInQueue', label: 'Waiting in Queue' },
    { key: 'inService', label: 'In Service' },
    { key: 'completed', label: 'Completed' },
] as const;

type StepKey = (typeof PROGRESS_STEPS)[number]['key'];

function getStepState(status: BookingStatus, stepKey: StepKey): 'done' | 'current' | 'pending' {
    if (status === 'Canceled') return stepKey === 'created' ? 'done' : 'pending';
    const STATUS_LEVEL: Record<BookingStatus, number> = {
        'Awaiting Confirmation': 1,
        'Booking Confirmed': 2,
        'Waiting in Queue': 3,
        'In Service': 4,
        Completed: 5,
        Canceled: 0,
    };
    const STEP_LEVEL: Record<StepKey, number> = {
        created: 1,
        confirmed: 2,
        waitingInQueue: 3,
        inService: 4,
        completed: 5,
    };
    const cur = STATUS_LEVEL[status] ?? 0;
    const lvl = STEP_LEVEL[stepKey] ?? 0;
    if (lvl < cur) return 'done';
    if (lvl === cur) return 'current';
    return 'pending';
}

<<<<<<< HEAD
    const cartTotal = cart.reduce((sum, item) => sum + item.product.unit_price * item.quantity, 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
=======
// ── booking steps (right panel only) ─────────────────────────────────────────
const BOOKING_STEPS = ['Booking Confirmed', 'Waiting in Queue', 'In Service'] as const;

function stepReached(status: BookingStatus, step: string): boolean {
    const order: BookingStatus[] = ['Awaiting Confirmation', 'Booking Confirmed', 'Waiting in Queue', 'In Service', 'Completed'];
    const statusIdx = order.indexOf(status);
    const stepIdx = order.indexOf(step as BookingStatus);
    return stepIdx !== -1 && statusIdx >= stepIdx;
}

// ── booking detail full page ──────────────────────────────────────────────────
function BookingDetailView({ booking, onBack }: { booking: Booking; onBack: () => void }) {
    const isCanceled = booking.status === 'Canceled';
>>>>>>> refs/remotes/origin/main

    return (
        <div className="flex flex-col gap-6 p-5 pb-10">
            {/* Back */}
            <button
                onClick={onBack}
                className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to My Services
            </button>

            {/* Title row */}
            <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold">{booking.serviceName}</h1>
                <FilledStatusBadge status={booking.status} />
            </div>

            {/* Job order + booked on */}
            <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-md border border-[#2a2a2e] bg-[#1e1e22] px-2.5 py-1 font-mono text-xs text-foreground">
                    {booking.jobOrder}
                </span>
                <span className="text-sm text-muted-foreground">Booked on {booking.bookedOn}</span>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_300px]">
                {/* ── MAIN CONTENT ──────────────────────────────────────── */}
                <div className="flex flex-col gap-5">
                    {/* 4 info stat cards */}
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {/* Arrival */}
                        <div className="profile-card rounded-xl p-4">
                            <div className="mb-2 flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-[#d4af37]" />
                                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Arrival</p>
                            </div>
                            <p className="text-sm leading-snug font-semibold">
                                {booking.arrival.split(',')[0] + ',' + (booking.arrival.split(',')[1] ?? '')}
                            </p>
                            <p className="text-lg font-bold text-[#d4af37]">{booking.scheduledTime}</p>
                        </div>
                        {/* Estimated Start */}
                        <div className="profile-card rounded-xl p-4">
                            <div className="mb-2 flex items-center gap-1.5">
                                <Wrench className="h-3.5 w-3.5 text-[#d4af37]" />
                                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Est. Start</p>
                            </div>
                            <p className="text-sm font-semibold">
                                {booking.estimatedStart} – {booking.estimatedEnd}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{booking.estimatedDuration}</p>
                        </div>
                        {/* Vehicle */}
                        <div className="profile-card rounded-xl p-4">
                            <div className="mb-2 flex items-center gap-1.5">
                                <Car className="h-3.5 w-3.5 text-[#d4af37]" />
                                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Vehicle</p>
                            </div>
                            <p className="text-sm font-semibold">{booking.vehicle}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{booking.vehiclePlate}</p>
                        </div>
                        {/* Payment */}
                        <div className="profile-card rounded-xl p-4">
                            <div className="mb-2 flex items-center gap-1.5">
                                <CreditCard className="h-3.5 w-3.5 text-[#d4af37]" />
                                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Payment</p>
                            </div>
                            <p className="text-sm font-semibold">{booking.reservationFeePaid ? 'Reservation Fee' : 'Pay at Shop'}</p>
                            <p className={`mt-0.5 text-xs font-medium ${booking.reservationFeePaid ? 'text-green-400' : 'text-[#d4af37]'}`}>
                                {booking.reservationFeePaid ? 'Paid' : 'Unpaid'}
                            </p>
                        </div>
                    </div>

                    {/* Booking Progress */}
                    <div className="profile-card rounded-xl p-5">
                        <div className="mb-1.5 flex items-center gap-2">
                            <RotateCcw className="h-4 w-4 text-[#d4af37]" />
                            <p className="text-sm font-bold">Booking Progress</p>
                        </div>

                        {isCanceled ? (
                            <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
                                <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                                <p className="text-sm text-red-400">This booking was canceled.</p>
                            </div>
                        ) : (
                            <div className="mt-4 overflow-x-auto py-4">
                                <div className="flex min-w-130 items-start gap-0">
                                    {PROGRESS_STEPS.map((step, idx) => {
                                        const state = getStepState(booking.status, step.key);
                                        const ts = booking.stepTimestamps?.[step.key];
                                        const isLast = idx === PROGRESS_STEPS.length - 1;
                                        return (
                                            <div key={step.key} className="flex flex-1 flex-col items-center">
                                                <div className="flex w-full items-center">
                                                    {/* Left connector */}
                                                    <div
                                                        className={`h-0.5 flex-1 ${idx === 0 ? 'invisible' : state === 'done' || getStepState(booking.status, PROGRESS_STEPS[idx - 1].key) === 'done' ? 'bg-green-500' : 'bg-[#2a2a2e]'}`}
                                                    />
                                                    {/* Node */}
                                                    <div className="shrink-0">
                                                        {state === 'done' ? (
                                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500">
                                                                <CheckCircle2 className="h-5 w-5 text-white" />
                                                            </div>
                                                        ) : state === 'current' ? (
                                                            <div className="relative flex h-8 w-8 items-center justify-center">
                                                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#d4af37] opacity-30" />
                                                                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#d4af37] bg-[#d4af37]/20">
                                                                    <div className="h-3 w-3 rounded-full bg-[#d4af37]" />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#2a2a2e] bg-[#0d0d10]">
                                                                <Circle className="h-3 w-3 text-[#2a2a2e]" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Right connector */}
                                                    <div
                                                        className={`h-0.5 flex-1 ${isLast ? 'invisible' : state === 'done' ? 'bg-green-500' : 'bg-[#2a2a2e]'}`}
                                                    />
                                                </div>
                                                {/* Label */}
                                                <div className="mt-2 flex flex-col items-center gap-0.5 px-1 text-center">
                                                    <p
                                                        className={`text-xs font-semibold ${state === 'done' ? 'text-green-400' : state === 'current' ? 'text-[#d4af37]' : 'text-muted-foreground'}`}
                                                    >
                                                        {step.label}
                                                    </p>
                                                    {ts ? (
                                                        <p className="text-[10px] text-muted-foreground">{ts}</p>
                                                    ) : state === 'current' ? (
                                                        <p className="text-[10px] text-[#d4af37]">You&apos;re Next</p>
                                                    ) : null}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 2×2 detail grid */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {/* What's Included */}
                        <div className="profile-card rounded-xl p-5">
                            <div className="mb-3 flex items-center gap-2">
                                <Tag className="h-4 w-4 text-[#d4af37]" />
                                <p className="text-sm font-bold">What's Included</p>
                            </div>
                            <div className="flex flex-col gap-2">
                                {booking.includes.map((item) => (
                                    <div key={item} className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#d4af37]" />
                                        <span className="text-sm">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Customer */}
                        <div className="profile-card rounded-xl p-5">
                            <div className="mb-3 flex items-center gap-2">
                                <User className="h-4 w-4 text-[#d4af37]" />
                                <p className="text-sm font-bold">Customer</p>
                            </div>
                            <div className="flex flex-col gap-2.5">
                                <div className="flex items-center gap-2 text-sm">
                                    <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span>{booking.customerName}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span>{booking.customerPhone}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span>{booking.customerAddress}</span>
                                </div>
                            </div>
                        </div>

                        {/* Booking Details */}
                        <div className="profile-card rounded-xl p-5">
                            <div className="mb-3 flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-[#d4af37]" />
                                <p className="text-sm font-bold">Booking Details</p>
                            </div>
                            <div className="flex flex-col gap-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Booking Date</span>
                                    <span className="font-medium">{booking.bookingDate}</span>
                                </div>
                                <div className="h-px bg-[#2a2a2e]" />
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Job Order</span>
                                    <span className="font-mono font-medium">{booking.jobOrder}</span>
                                </div>
                                <div className="h-px bg-[#2a2a2e]" />
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Category</span>
                                    <span className="font-medium">{booking.serviceCategory}</span>
                                </div>
                                <div className="h-px bg-[#2a2a2e]" />
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Scheduled</span>
                                    <span className="font-medium">{booking.dateTime}</span>
                                </div>
                            </div>
                        </div>

                        {/* Vehicle */}
                        <div className="profile-card rounded-xl p-5">
                            <div className="mb-3 flex items-center gap-2">
                                <Car className="h-4 w-4 text-[#d4af37]" />
                                <p className="text-sm font-bold">Vehicle</p>
                            </div>
                            <div className="flex flex-col gap-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Model</span>
                                    <span className="font-medium">{booking.vehicle}</span>
                                </div>
                                <div className="h-px bg-[#2a2a2e]" />
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Plate</span>
                                    <span className="font-mono font-medium">{booking.vehiclePlate}</span>
                                </div>
                                <div className="h-px bg-[#2a2a2e]" />
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Variant</span>
                                    <span className="font-medium">{booking.vehicleModel}</span>
                                </div>
                                <div className="h-px bg-[#2a2a2e]" />
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Year</span>
                                    <span className="font-medium">{booking.vehicleYear}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── BOOKING SUMMARY (right sticky panel) ─────────────── */}
                <div className="profile-card sticky top-5 flex flex-col gap-4 rounded-xl p-5">
                    <p className="text-base font-bold">Booking Summary</p>

                    {/* Status rows */}
                    <div className="flex flex-col gap-1.5 rounded-lg border border-[#2a2a2e] p-3">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Booking Status</span>
                            <span className="font-semibold text-foreground">{isCanceled ? 'Canceled' : 'Active'}</span>
                        </div>
                        <div className="h-px bg-[#2a2a2e]" />
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Payment Status</span>
                            <span className={`font-semibold ${booking.reservationFeePaid ? 'text-green-400' : 'text-[#d4af37]'}`}>
                                {booking.reservationFeePaid ? 'Reservation Fee Paid' : 'Pay at Shop'}
                            </span>
                        </div>
                    </div>

                    <div className="h-px bg-[#2a2a2e]" />

                    {/* Details */}
                    <div className="flex flex-col gap-2.5 text-xs">
                        <div className="flex items-start justify-between gap-2">
                            <span className="text-muted-foreground">Arrival</span>
                            <span className="text-right font-medium">{booking.arrival}</span>
                        </div>
                        <div className="flex items-start justify-between gap-2">
                            <span className="text-muted-foreground">Estimated Start</span>
                            <span className="text-right font-medium">
                                {booking.estimatedStart} – {booking.estimatedEnd}
                            </span>
                        </div>
                        <div className="flex items-start justify-between gap-2">
                            <span className="text-muted-foreground">Vehicle</span>
                            <span className="text-right font-medium">
                                {booking.vehicle} · {booking.vehiclePlate}
                            </span>
                        </div>
                        <div className="h-px bg-[#2a2a2e]" />
                        <div className="flex items-start justify-between gap-2">
                            <span className="text-muted-foreground">Amount Paid</span>
                            <span className="text-right font-medium text-green-400">
                                ₱{booking.amountPaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div className="flex items-start justify-between gap-2">
                            <span className="text-muted-foreground">Remaining Balance</span>
                            {booking.remainingBalance != null ? (
                                <span className="text-right font-medium text-[#d4af37]">
                                    Pay at Shop · ₱{booking.remainingBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </span>
                            ) : (
                                <span className="text-right font-medium text-green-400">Fully Paid</span>
                            )}
                        </div>
                    </div>

                    <div className="h-px bg-[#2a2a2e]" />

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2">
                        {booking.status === 'Completed' && (
                            <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#d4af37] py-2.5 text-sm font-bold text-black shadow-[0_4px_16px_rgba(212,175,55,0.35)] transition-opacity hover:opacity-90">
                                <Download className="h-4 w-4" />
                                View Receipt
                            </button>
                        )}
                        {!isCanceled && booking.status !== 'Completed' && (
                            <>
                                <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#2a2a2e] py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-[#1e1e22]">
                                    <RotateCcw className="h-4 w-4" />
                                    Reschedule Booking
                                </button>
                                <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10">
                                    <XCircle className="h-4 w-4" />
                                    Cancel Booking
                                </button>
                            </>
                        )}
                        <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#2a2a2e] py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-[#1e1e22]">
                            <MessageSquare className="h-4 w-4" />
                            Contact Shop
                        </button>
                    </div>

<<<<<<< HEAD
                    {/* Search & Filters */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="flex h-10 w-full rounded-lg border border-input bg-background px-9 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                        activeCategory === cat
                                            ? 'bg-[#d4af37] text-black'
                                            : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Products Grid */}
                    {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">{error}</div>}

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" />
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {filtered.map((product) => {
                                const inStock = product.stock > 0;
                                return (
                                    <div key={product.id} className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
                                        <div className="mb-2 flex items-start justify-between">
                                            <span className="rounded-md bg-[#d4af37]/10 px-2 py-1 text-xs font-medium text-[#d4af37]">
                                                {product.category}
                                            </span>
                                            {!inStock && (
                                                <span className="rounded-md bg-red-500/10 px-2 py-1 text-xs font-medium text-red-500">
                                                    Out of Stock
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-base font-semibold">{product.item_name}</h3>
                                        <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>
                                        <div className="mt-4 flex items-center justify-between">
                                            <span className="text-xl font-bold">₱{product.unit_price.toLocaleString()}</span>
                                            <button
                                                onClick={() => addToCart(product)}
                                                disabled={!inStock}
                                                className="rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#e6c24e] disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Add to Cart
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {filtered.length === 0 && (
                        <div className="flex items-center justify-center py-12 text-muted-foreground">
                            <p>No products found matching your criteria.</p>
=======
                    {/* Advisory note */}
                    {!isCanceled && booking.status !== 'Completed' && (
                        <div className="rounded-lg border border-[#d4af37]/20 bg-[#d4af37]/5 p-3 text-xs text-muted-foreground">
                            <p className="flex items-start gap-1.5">
                                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#d4af37]" />
                                Please arrive 10 minutes before your schedule time.
                            </p>
                            <p className="mt-1 pl-5">If you are late, your booking may be moved to the next available slot.</p>
>>>>>>> refs/remotes/origin/main
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── page ──────────────────────────────────────────────────────────────────────
export default function MyServices() {
    const [activeTab, setActiveTab] = useState<TabKey>('Upcoming');
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<number>(2);
    const [viewingDetailId, setViewingDetailId] = useState<number | null>(null);

    const visibleBookings = BOOKINGS.filter(
        (b) =>
            b.tab === activeTab &&
            (search === '' || b.serviceName.toLowerCase().includes(search.toLowerCase()) || b.jobOrder.toLowerCase().includes(search.toLowerCase())),
    );

    const selected = BOOKINGS.find((b) => b.id === selectedId) ?? visibleBookings[0] ?? BOOKINGS[0];
    const detailBooking = BOOKINGS.find((b) => b.id === viewingDetailId);

    // ── Full detail page view ─────────────────────────────────────────────────
    if (detailBooking) {
        return (
            <CustomerLayout breadcrumbs={breadcrumbs}>
                <BookingDetailView booking={detailBooking} onBack={() => setViewingDetailId(null)} />
            </CustomerLayout>
        );
    }

    return (
        <CustomerLayout breadcrumbs={breadcrumbs}>
            <div className="grid min-h-full grid-cols-1 items-start gap-5 p-5 xl:grid-cols-[1fr_340px]">
                {/* ── LEFT: Bookings list ───────────────────────────────────── */}
                <div className="flex flex-col gap-4">
                    {/* Filter / Sort row */}
                    <div className="flex items-center justify-end gap-2">
                        <button className="flex items-center gap-1.5 rounded-lg border border-[#2a2a2e] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                            <Filter className="h-3.5 w-3.5" />
                            Filter:
                        </button>
                        <button className="flex items-center gap-1.5 rounded-lg border border-[#2a2a2e] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                            <ArrowUpDown className="h-3.5 w-3.5" />
                            Sort by:
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search Tasks"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="flex h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] pr-4 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/40 focus:outline-none"
                        />
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 border-b border-[#2a2a2e]">
                        {TABS.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => {
                                    setActiveTab(tab);
                                    setSelectedId(-1);
                                }}
                                className={`relative px-4 py-2 text-sm font-semibold transition-colors ${
                                    activeTab === tab ? 'rounded-t-lg bg-[#d4af37] text-black' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

<<<<<<< HEAD
                        <div className="flex-1 overflow-y-auto p-4">
                            {cart.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Your cart is empty</div>
                            ) : (
                                <div className="space-y-3">
                                    {cart.map((item) => (
                                        <div key={item.product.id} className="rounded-lg border p-3">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">{item.product.item_name}</p>
                                                    <p className="text-sm text-muted-foreground">₱{item.product.unit_price.toLocaleString()}</p>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(item.product.id)}
                                                    className="text-muted-foreground hover:text-red-500"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <div className="mt-2 flex items-center gap-2">
                                                <button
                                                    onClick={() => updateQuantity(item.product.id, -1)}
                                                    className="rounded border p-1 hover:bg-accent"
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </button>
                                                <span className="min-w-[2rem] text-center text-sm font-medium">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.product.id, 1)}
                                                    className="rounded border p-1 hover:bg-accent"
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </button>
                                                <span className="ml-auto text-sm font-semibold">
                                                    ₱{(item.product.unit_price * item.quantity).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
=======
                    {/* Filter chips */}
                    <div className="flex flex-wrap items-center gap-2">
                        {['This Week', 'All Payments', 'All Services'].map((chip) => (
                            <button
                                key={chip}
                                className="flex items-center gap-1 rounded-md border border-[#2a2a2e] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                            >
                                <ChevronDown className="h-3 w-3" />
                                {chip}
                            </button>
                        ))}
                        <button className="ml-auto rounded-md border border-[#2a2a2e] p-1.5 text-muted-foreground transition-colors hover:text-foreground">
                            <ArrowUpDown className="h-3.5 w-3.5" />
                        </button>
                    </div>
>>>>>>> refs/remotes/origin/main

                    {/* Booking cards */}
                    <div className="flex flex-col gap-3">
                        {visibleBookings.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                <Wrench className="mb-3 h-8 w-8 opacity-30" />
                                <p className="text-sm">No {activeTab.toLowerCase()} bookings found.</p>
                            </div>
                        ) : (
                            visibleBookings.map((booking) => (
                                <div
                                    key={booking.id}
                                    onClick={() => setSelectedId(booking.id)}
                                    className={`profile-card cursor-pointer rounded-xl p-4 transition-all ${
                                        selected?.id === booking.id ? 'shadow-[0_0_0_1px_#d4af37]' : 'hover:shadow-[0_0_0_1px_rgba(212,175,55,0.3)]'
                                    }`}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Icon */}
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#2a2a2e]">
                                            <Wrench className="h-5 w-5 text-muted-foreground" />
                                        </div>

                                        {/* Info */}
                                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="truncate text-sm font-bold">{booking.serviceName}</p>
                                                <StatusBadge status={booking.status} />
                                            </div>
                                            <p className="text-xs text-muted-foreground">{booking.jobOrder}</p>
                                            <p className="text-xs text-muted-foreground">{booking.dateTime}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {booking.vehicle} - {booking.vehiclePlate}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">Payment : {booking.payment}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ── RIGHT: Detail panel ───────────────────────────────────── */}
                {selected && (
                    <div className="profile-card sticky top-5 flex flex-col gap-4 rounded-xl p-5">
                        {/* Service Header */}
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex flex-col gap-1">
                                <p className="text-base font-bold">{selected.serviceName}</p>
                                <p className="text-xs text-muted-foreground">{selected.jobOrder}</p>
                            </div>
                            <StatusBadge status={selected.status} />
                        </div>

                        {/* Current booking status */}
                        <div>
                            <FilledStatusBadge status={selected.status} />
                        </div>

                        <div className="h-px bg-[#2a2a2e]" />

                        {/* Arrival & schedule — boxed like Booking Summary */}
                        <div>
                            <p className="mb-2 text-xs font-semibold text-foreground">Arrival</p>
                            <div className="rounded-lg border border-[#2a2a2e] p-3">
                                <div className="flex flex-col gap-1.5 text-xs">
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="text-muted-foreground">Arrival:</span>
                                        <span className="text-right font-medium">{selected.arrival}</span>
                                    </div>
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="text-muted-foreground">Scheduled Time:</span>
                                        <span className="text-right font-medium">{selected.scheduledTime}</span>
                                    </div>
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="text-muted-foreground">Est. Start:</span>
                                        <span className="text-right font-medium">
                                            {selected.estimatedStart} – {selected.estimatedEnd}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Vehicle — matches services.tsx vehicle selector style */}
                        <div>
                            <p className="mb-2 text-xs font-semibold text-foreground">Vehicle</p>
                            <div className="flex w-full items-center gap-2 rounded-lg border border-[#2a2a2e] px-3 py-2 text-xs text-foreground">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#d4af37]/10">
                                    <Car className="h-3.5 w-3.5 text-[#d4af37]" />
                                </div>
                                <span>
                                    {selected.vehicle} &nbsp; {selected.vehiclePlate}
                                </span>
                            </div>
                        </div>

                        <div className="h-px bg-[#2a2a2e]" />

                        {/* Payment & Booking steps — boxed */}
                        <div>
                            <p className="mb-2 text-xs font-semibold text-foreground">Booking Status</p>
                            <div className="rounded-lg border border-[#2a2a2e] p-3">
                                <div className="flex flex-col gap-2">
                                    {/* Reservation fee row */}
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${selected.reservationFeePaid ? 'bg-green-500' : 'bg-[#2a2a2e]'}`}
                                        />
                                        <p
                                            className={`text-xs font-semibold ${selected.reservationFeePaid ? 'text-green-400' : 'text-muted-foreground'}`}
                                        >
                                            Reservation Fee {selected.reservationFeePaid ? 'Paid' : 'Unpaid'}
                                        </p>
                                    </div>

                                    <div className="my-0.5 h-px bg-[#2a2a2e]" />

                                    {/* Step progress */}
                                    {BOOKING_STEPS.map((step) => {
                                        const reached = stepReached(selected.status, step);
                                        return (
                                            <div key={step} className="flex items-center gap-2">
                                                {reached ? (
                                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                                                ) : (
                                                    <Circle className="h-4 w-4 shrink-0 text-[#2a2a2e]" />
                                                )}
                                                <span className={`text-xs ${reached ? 'text-foreground' : 'text-muted-foreground'}`}>{step}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground italic">Please arrive 10 minutes before your scheduled time.</p>

                        <div className="h-px bg-[#2a2a2e]" />

                        {/* Action buttons */}
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => setViewingDetailId(selected.id)}
                                className="w-full rounded-lg bg-[#d4af37] py-2.5 text-sm font-bold text-black shadow-[0_4px_16px_rgba(212,175,55,0.35)] transition-opacity hover:opacity-90"
                            >
                                View Full Details
                            </button>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <button className="rounded-lg border border-[#2a2a2e] py-2 text-sm font-medium text-foreground transition-colors hover:bg-[#1e1e22]">
                                    Reschedule
                                </button>
                                <button className="rounded-lg border border-red-500/40 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10">
                                    Cancel Booking
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </CustomerLayout>
    );
}
