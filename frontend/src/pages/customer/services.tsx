import CustomerLayout from '@/components/layout/customer-layout';
<<<<<<< HEAD
import { useServiceCatalog } from '@/hooks/useServiceCatalog';
import { ServiceCatalogItem } from '@/types/customer';
import { ArrowRight, Check, ChevronDown, Clock, Loader2, Star, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
=======
import { AlertTriangle, ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Star, Users, X } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
>>>>>>> refs/remotes/origin/main

// ── types ─────────────────────────────────────────────────────────────────────
type Category = 'Maintenance' | 'Cleaning' | 'Repair';

<<<<<<< HEAD
const categoryMap: Record<string, Category> = {
    maintenance: 'Maintenance',
    cleaning: 'Cleaning',
    repair: 'Repair',
};
=======
interface Service {
    id: number;
    name: string;
    priceLabel: string;
    priceFixed: number;
    duration: string;
    estimatedDuration: string;
    rating: number;
    ratingCount: number;
    category: Category;
    features: string[];
    queueLabel: string;
    includes: string[];
    recommended?: boolean;
    recommendedNote?: string;
}

// ── static data ───────────────────────────────────────────────────────────────
const ALL_SERVICES: Service[] = [
    // ── Maintenance ──────────────────────────────────────────────────────────
    {
        id: 1,
        name: 'Change Oil',
        priceLabel: 'P800–P1500',
        priceFixed: 1200,
        duration: '45 mins',
        estimatedDuration: '45–60 mins',
        rating: 4.5,
        ratingCount: 183,
        category: 'Maintenance',
        features: ['Synthetic / Mineral'],
        queueLabel: '2-3 In Que',
        includes: ['Synthetic oil refill', 'Oil filter replacement', '21-point inspection'],
        recommended: true,
        recommendedNote: 'You last changed your oil 5 months ago',
    },
    {
        id: 2,
        name: 'PMS',
        priceLabel: 'P1500–P3000',
        priceFixed: 2200,
        duration: '2 hrs',
        estimatedDuration: '1.5–2 hrs',
        rating: 4.8,
        ratingCount: 97,
        category: 'Maintenance',
        features: ['Full vehicle check'],
        queueLabel: '1-2 In Que',
        includes: ['Oil & filter change', 'Fluid top-ups', 'Belts & hoses inspection', 'Battery test'],
    },
    {
        id: 3,
        name: 'Wheel Alignment',
        priceLabel: 'P500–P900',
        priceFixed: 700,
        duration: '45 mins',
        estimatedDuration: '40–50 mins',
        rating: 4.6,
        ratingCount: 141,
        category: 'Maintenance',
        features: ['4-wheel alignment'],
        queueLabel: '1-2 In Que',
        includes: ['Camber / toe adjustment', 'Steering check', 'Post-alignment test drive'],
    },
    {
        id: 4,
        name: 'Tire Rotation & Balancing',
        priceLabel: 'P400–P700',
        priceFixed: 550,
        duration: '30 mins',
        estimatedDuration: '25–35 mins',
        rating: 4.5,
        ratingCount: 112,
        category: 'Maintenance',
        features: ['Rotation + Balance + PSI'],
        queueLabel: '2-3 In Que',
        includes: ['Tire rotation', 'Dynamic balancing', 'Pressure check & adjustment'],
    },
    // ── Cleaning ─────────────────────────────────────────────────────────────
    {
        id: 5,
        name: 'Exterior Wash',
        priceLabel: 'P150–P400',
        priceFixed: 280,
        duration: '20 mins',
        estimatedDuration: '15–25 mins',
        rating: 4.4,
        ratingCount: 230,
        category: 'Cleaning',
        features: ['Hand wash + rinse'],
        queueLabel: '3-4 In Que',
        includes: ['Exterior foam wash', 'Rinse & dry', 'Wheel brush clean'],
    },
    {
        id: 6,
        name: 'Interior Cleaning',
        priceLabel: 'P400–P800',
        priceFixed: 600,
        duration: '45 mins',
        estimatedDuration: '40–50 mins',
        rating: 4.6,
        ratingCount: 158,
        category: 'Cleaning',
        features: ['Deep interior clean'],
        queueLabel: '2-3 In Que',
        includes: ['Full vacuum', 'Dashboard & console wipe', 'Seat wipe-down', 'Glass interior clean'],
    },
    {
        id: 7,
        name: 'Premium Car Wash',
        priceLabel: 'P300–P800',
        priceFixed: 550,
        duration: '30 mins',
        estimatedDuration: '25–35 mins',
        rating: 4.5,
        ratingCount: 183,
        category: 'Cleaning',
        features: ['Exterior + Interior'],
        queueLabel: '2-3 In Que',
        includes: ['Exterior foam wash', 'Interior vacuum', 'Dashboard wipe'],
    },
    {
        id: 8,
        name: 'Engine Bay Cleaning',
        priceLabel: 'P500–P900',
        priceFixed: 700,
        duration: '45 mins',
        estimatedDuration: '40–55 mins',
        rating: 4.5,
        ratingCount: 76,
        category: 'Cleaning',
        features: ['Steam + degreaser'],
        queueLabel: '1-2 In Que',
        includes: ['Engine degreaser application', 'Steam rinse', 'Drying & protection spray'],
    },
    {
        id: 9,
        name: 'Full Detail',
        priceLabel: 'P1500–P2500',
        priceFixed: 2000,
        duration: '3 hrs',
        estimatedDuration: '2.5–3 hrs',
        rating: 4.9,
        ratingCount: 210,
        category: 'Cleaning',
        features: ['Interior + Exterior'],
        queueLabel: '1 In Que',
        includes: ['Exterior wash', 'Interior deep clean', 'Engine bay clean'],
    },
    // ── Repair ───────────────────────────────────────────────────────────────
    {
        id: 10,
        name: 'Engine Diagnostics',
        priceLabel: 'P500–P1000',
        priceFixed: 750,
        duration: '30 mins',
        estimatedDuration: '25–40 mins',
        rating: 4.7,
        ratingCount: 88,
        category: 'Repair',
        features: ['OBD-II scan'],
        queueLabel: '1-2 In Que',
        includes: ['Full fault-code scan', 'Live data analysis', 'Diagnostic report'],
    },
    {
        id: 11,
        name: 'Engine Repair',
        priceLabel: 'P3000–P15000',
        priceFixed: 8000,
        duration: 'Varies',
        estimatedDuration: '4–8 hrs',
        rating: 4.8,
        ratingCount: 54,
        category: 'Repair',
        features: ['Full engine service'],
        queueLabel: '1 In Que',
        includes: ['Diagnostics', 'Parts replacement', 'Post-repair test drive'],
    },
    {
        id: 12,
        name: 'Brake Repair',
        priceLabel: 'P800–P2500',
        priceFixed: 1500,
        duration: '1 hr',
        estimatedDuration: '50–70 mins',
        rating: 4.7,
        ratingCount: 120,
        category: 'Repair',
        features: ['Pads + rotors + fluid'],
        queueLabel: '1-2 In Que',
        includes: ['Brake pad replacement', 'Rotor resurfacing / replacement', 'Brake fluid flush'],
    },
    {
        id: 13,
        name: 'Air-Con Repair',
        priceLabel: 'P1500–P4000',
        priceFixed: 2500,
        duration: '1.5 hrs',
        estimatedDuration: '60–90 mins',
        rating: 4.5,
        ratingCount: 183,
        category: 'Repair',
        features: ['Full AC service'],
        queueLabel: '2-3 In Que',
        includes: ['AC diagnostics', 'Refrigerant top-up', 'Filter cleaning'],
    },
    {
        id: 14,
        name: 'Battery Replacement',
        priceLabel: 'P3000–P6000',
        priceFixed: 4500,
        duration: '30 mins',
        estimatedDuration: '20–30 mins',
        rating: 4.8,
        ratingCount: 95,
        category: 'Repair',
        features: ['Test + Replace'],
        queueLabel: '1-2 In Que',
        includes: ['Battery test', 'New battery install', 'Terminal cleaning'],
    },
];
>>>>>>> refs/remotes/origin/main

// ── static data (time slots remain hardcoded) ─────────────────────────────────
const TIME_SLOTS = [
    { time: '10:00 AM', status: 'available' as const, slotsLeft: 1 },
    { time: '11:00 AM', status: 'full' as const, slotsLeft: 0 },
    { time: '12:00 PM', status: 'available' as const, slotsLeft: 2 },
    { time: '12:30 PM', status: 'available' as const, slotsLeft: 4 },
];

const CATEGORIES: Category[] = ['Maintenance', 'Cleaning', 'Repair'];

// ── helpers ───────────────────────────────────────────────────────────────────
function getCategory(s: ServiceCatalogItem): Category {
    return categoryMap[s.category] ?? 'Maintenance';
}

function Stars({ rating, count }: { rating: number; count?: number }) {
    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className={`h-3 w-3 ${i <= Math.round(rating) ? 'fill-[#d4af37] text-[#d4af37]' : 'fill-none text-[#d4af37]/30'}`} />
            ))}
            <span className="ml-0.5 text-xs text-muted-foreground">
                {rating.toFixed(1)}
                {count != null ? `(${count})` : ''}
            </span>
        </div>
    );
}

function parseTime(timeStr: string): { h: number; m: number } {
    const [timePart, meridiem] = timeStr.split(' ');
    const parts = timePart.split(':').map(Number);
    let h = parts[0];
    const m = parts[1];
    if (meridiem === 'PM' && h !== 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    return { h, m };
}

function fmtTime(d: Date) {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ── CalendarDropdown ──────────────────────────────────────────────────────────
function CalendarDropdown({
    onClose,
    selectedDate,
    onSelectDate,
    containerRef,
}: {
    onClose: () => void;
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
    containerRef: React.RefObject<HTMLDivElement | null>;
}) {
    const [viewMonth, setViewMonth] = useState<Date>(() => {
        const d = new Date(selectedDate);
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d;
    });

    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const days = useMemo(() => {
        const year = viewMonth.getFullYear();
        const month = viewMonth.getMonth();
        const firstDayOfWeek = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const cells: (Date | null)[] = [];
        for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            date.setHours(0, 0, 0, 0);
            cells.push(date);
        }
        return cells;
    }, [viewMonth]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        const onOutsideClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onOutsideClick);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('mousedown', onOutsideClick);
        };
    }, [onClose, containerRef]);

    const prevMonth = () =>
        setViewMonth((prev) => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() - 1);
            return d;
        });
    const nextMonth = () =>
        setViewMonth((prev) => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() + 1);
            return d;
        });

    return (
        <div className="absolute top-full left-0 z-50 mt-2 w-full rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xl">
            {/* Month navigation */}
            <div className="mb-3 flex items-center justify-between">
                <button
                    onClick={prevMonth}
                    aria-label="Previous month"
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-semibold">{viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                <button
                    onClick={nextMonth}
                    aria-label="Next month"
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            {/* Day-of-week headers */}
            <div className="mb-1 grid grid-cols-7">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                    <div key={d} className="py-1 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                        {d}
                    </div>
                ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-y-0.5">
                {days.map((day, i) => {
                    if (!day) return <div key={`empty-${i}`} />;
                    const isPast = day < today;
                    const isSelected = day.toDateString() === selectedDate.toDateString();
                    const isToday = day.toDateString() === today.toDateString();
                    return (
                        <button
                            key={day.toISOString()}
                            disabled={isPast}
                            onClick={() => onSelectDate(day)}
                            className={[
                                'mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors',
                                isSelected
                                    ? 'bg-[#d4af37] font-bold text-black shadow-[0_0_8px_rgba(212,175,55,0.5)]'
                                    : isToday
                                      ? 'border border-[#d4af37] text-[#d4af37]'
                                      : isPast
                                        ? 'cursor-not-allowed text-muted-foreground/30'
                                        : 'text-foreground hover:bg-muted hover:text-foreground',
                            ].join(' ')}
                        >
                            {day.getDate()}
                        </button>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
                <button
                    onClick={() => {
                        const d = new Date();
                        d.setHours(0, 0, 0, 0);
                        onSelectDate(d);
                    }}
                    className="rounded-md px-2 py-1 text-xs font-medium text-[#d4af37] transition-colors hover:bg-[#d4af37]/10"
                >
                    Today
                </button>
                <button
                    onClick={onClose}
                    className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    Close
                </button>
            </div>
        </div>
    );
}

// ── page ──────────────────────────────────────────────────────────────────────
// ── Modals ───────────────────────────────────────────────────────────────────
type ModalStep = 'confirm' | 'secure' | 'payment' | 'verify-phone' | 'verify-otp' | 'success' | 'reserved' | null;
type SecureOption = 'reservation' | 'no-payment';
type PayMethod = 'gcash' | 'maya' | 'card' | 'bank';

export default function CustomerServices() {
    const [activeCategory, setActiveCategory] = useState<Category>('Maintenance');
<<<<<<< HEAD
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [selectedDateIdx, setSelectedDateIdx] = useState(0);
    const [selectedTimeIdx, setSelectedTimeIdx] = useState(0);
    const { services, recommended, loading, error } = useServiceCatalog({ per_page: 50 });
=======
    const [selectedId, setSelectedId] = useState(2);
    const [modalStep, setModalStep] = useState<ModalStep>(null);
    const [secureOption, setSecureOption] = useState<SecureOption>('reservation');
    const [payMethod, setPayMethod] = useState<PayMethod>('gcash');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [otpCountdown, setOtpCountdown] = useState(0);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date>(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const [selectedTimeIdx, setSelectedTimeIdx] = useState(0);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const dateContainerRef = useRef<HTMLDivElement>(null);

    // OTP countdown
    useEffect(() => {
        if (otpCountdown <= 0) return;
        const t = setTimeout(() => setOtpCountdown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [otpCountdown]);

    function startOtp() {
        setOtp(['', '', '', '', '', '']);
        setOtpCountdown(59);
        setModalStep('verify-otp');
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }

    function handleOtpInput(idx: number, val: string) {
        const digit = val.replace(/\D/g, '').slice(-1);
        const next = [...otp];
        next[idx] = digit;
        setOtp(next);
        if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
    }

    function handleOtpKey(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
    }

    const fmtCountdown = `00:${String(otpCountdown).padStart(2, '0')}`;
>>>>>>> refs/remotes/origin/main

    // Auto-select the recommended service or first service when data loads
    const effectiveSelectedId = selectedId ?? recommended?.id ?? services[0]?.id ?? 0;

    const popularServices = services.filter((s) => getCategory(s) === activeCategory);
    const selectedService = services.find((s) => s.id === effectiveSelectedId) ?? services[0];

    // Build next-6-day chips from today
    const dateChips = useMemo(() => {
        const base = new Date();
        base.setHours(0, 0, 0, 0);
        return Array.from({ length: 6 }, (_, i) => {
            const d = new Date(base);
            d.setDate(base.getDate() + i);
            return {
                day: d.toLocaleDateString('en-US', { weekday: 'short' }),
                date: d.getDate(),
                month: d.toLocaleDateString('en-US', { month: 'short' }),
                actualDate: d,
            };
        });
    }, []);

    // Booking summary times
    const slot = TIME_SLOTS[selectedTimeIdx];
    const arrivalStr = `${selectedDate.toLocaleDateString('en-US', { weekday: 'short' })} ${selectedDate.toLocaleDateString('en-US', { month: 'short' })} ${selectedDate.getDate()}, ${slot.time}`;

    const { h, m } = parseTime(slot.time);
    const estStart = new Date();
    estStart.setHours(h, m + 15, 0, 0);
    const durNums = (selectedService?.estimated_duration ?? '30').match(/\d+/g) ?? ['30'];
    const durMaxMin = parseInt(durNums[durNums.length - 1], 10);
    const estEnd = new Date(estStart);
    estEnd.setMinutes(estEnd.getMinutes() + durMaxMin);

    if (loading) {
        return (
            <CustomerLayout>
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" />
                </div>
            </CustomerLayout>
        );
    }

    if (error) {
        return (
            <CustomerLayout>
                <div className="p-5">
                    <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">{error}</div>
                </div>
            </CustomerLayout>
        );
    }

    if (!selectedService) {
        return (
            <CustomerLayout>
                <div className="flex items-center justify-center py-24 text-muted-foreground">
                    <p>No services available.</p>
                </div>
            </CustomerLayout>
        );
    }

    return (
        <CustomerLayout>
            <div className="grid min-h-full grid-cols-1 items-start gap-5 p-5 xl:grid-cols-[1fr_360px]">
                {/* ── LEFT PANEL ─────────────────────────────────────────────── */}
                <div className="flex flex-col gap-5">
                    {/* Recommended Banner */}
                    {recommended && (
                        <div className="profile-card relative flex items-center justify-between overflow-hidden rounded-xl p-5">
                            <div className="z-10 flex flex-col gap-2">
                                <p className="text-sm font-bold text-foreground">Recommended for You</p>
                                <p className="text-xs text-muted-foreground">{recommended.recommended_note}</p>
                                <p className="text-sm font-semibold">
                                    <span className="text-[#d4af37]">Recommended: </span>
                                    <span>{recommended.name}</span>
                                </p>
                                <button
                                    onClick={() => setSelectedId(recommended.id)}
                                    className="mt-1 flex w-fit items-center gap-1.5 rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-80"
                                >
                                    Book Now <ArrowRight className="h-4 w-4" />
                                </button>
                            </div>
<<<<<<< HEAD
                            {/* Decorative car silhouette */}
                            <div className="pointer-events-none absolute top-0 right-0 h-full w-52">
                                <div className="h-full w-full bg-linear-to-l from-[#d4af37]/8 to-transparent" />
                                <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-20">
                                    <svg viewBox="0 0 120 60" className="h-28 w-48 fill-[#d4af37]">
                                        <path d="M10 40 L20 20 Q30 10 50 10 L70 10 Q90 10 100 20 L110 40 L115 42 Q118 44 118 47 L118 50 Q118 52 116 52 L104 52 Q102 52 101 50 Q100 46 96 46 Q92 46 91 50 Q90 52 88 52 L32 52 Q30 52 29 50 Q28 46 24 46 Q20 46 19 50 Q18 52 16 52 L4 52 Q2 52 2 50 L2 47 Q2 44 5 42 Z" />
                                        <ellipse cx="24" cy="52" rx="8" ry="4" />
                                        <ellipse cx="96" cy="52" rx="8" ry="4" />
                                        {/* headlights */}
                                        <rect x="106" y="28" width="8" height="5" rx="2" fill="white" opacity="0.6" />
                                        <rect x="6" y="28" width="8" height="5" rx="2" fill="white" opacity="0.3" />
                                    </svg>
                                </div>
=======
                            {/* Recommended image */}
                            <div className="pointer-events-none absolute top-0 right-0 h-full w-56 overflow-hidden rounded-r-xl">
                                <div className="absolute inset-0 z-10 bg-linear-to-r from-[#1e1e22] via-[#1e1e22]/60 to-transparent" />
                                <img
                                    src="/images/recommended001.png"
                                    alt="Recommended service"
                                    className="h-full w-full object-cover object-center opacity-85"
                                />
>>>>>>> refs/remotes/origin/main
                            </div>
                        </div>
                    )}

                    {/* Services Offered + Category Tabs */}
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-2">
                            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Services Offered</p>
                            <div className="flex gap-2">
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setActiveCategory(cat)}
                                        className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                                            activeCategory === cat
                                                ? 'bg-[#d4af37] text-black shadow-[0_0_12px_rgba(212,175,55,0.35)]'
                                                : 'border border-[#2a2a2e] text-muted-foreground hover:border-[#d4af37]/50 hover:text-foreground'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            Starts at 1 <Check className="h-3.5 w-3.5 text-[#d4af37]" />
                        </span>
                    </div>

                    {/* Popular Today */}
                    <div className="flex flex-col gap-3">
                        <p className="text-sm font-semibold text-foreground">Popular Today</p>

                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                            {popularServices.slice(0, 3).map((service) => (
                                <div
                                    key={service.id}
                                    onClick={() => setSelectedId(service.id)}
                                    className={`profile-card cursor-pointer rounded-xl p-4 transition-all ${
                                        effectiveSelectedId === service.id
                                            ? 'shadow-[0_0_0_1px_#d4af37,0_0_16px_rgba(212,175,55,0.15)]'
                                            : 'hover:shadow-[0_0_0_1px_rgba(212,175,55,0.3)]'
                                    }`}
                                >
                                    <div className="flex flex-col gap-2">
                                        <p className="text-sm leading-snug font-bold">{service.name}</p>
<<<<<<< HEAD
                                        <p className="text-xs font-semibold text-muted-foreground">{service.price_label}</p>
=======
                                        <p className="text-xs font-semibold text-muted-foreground">{service.priceLabel}</p>
>>>>>>> refs/remotes/origin/main
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3 shrink-0" />
                                            <span>{service.duration}</span>
                                        </div>
                                        <Stars rating={service.rating} count={service.rating_count} />
                                        {service.features.map((f) => (
                                            <div key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <Check className="h-3 w-3 shrink-0 text-[#d4af37]" />
                                                <span>{f}</span>
                                            </div>
                                        ))}
                                        <div className="mt-1 flex items-center justify-between">
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Users className="h-3 w-3 shrink-0" />
                                                <span>{service.queue_label}</span>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedId(service.id);
<<<<<<< HEAD
=======
                                                    setModalStep('confirm');
>>>>>>> refs/remotes/origin/main
                                                }}
                                                className="rounded-lg bg-[#d4af37] px-3 py-1.5 text-xs font-bold text-black shadow-[0_2px_8px_rgba(212,175,55,0.3)] transition-opacity hover:opacity-80"
                                            >
                                                Book Now
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* More Services card */}
                            <div className="profile-card flex cursor-pointer items-center justify-center rounded-xl p-4 transition-all hover:shadow-[0_0_0_1px_rgba(212,175,55,0.3)]">
                                <div className="flex flex-col items-center gap-2 text-center">
                                    <p className="text-sm font-semibold text-foreground">More Services</p>
                                    <ArrowRight className="h-4 w-4 text-[#d4af37]" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT PANEL (Booking) ─────────────────────────────────── */}
                <div className="profile-card sticky top-5 flex flex-col gap-4 rounded-xl p-5">
                    {/* Service Header */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1">
                            <p className="text-base font-bold">{selectedService.name}</p>
                            <Stars rating={selectedService.rating} count={selectedService.rating_count} />
                            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3 shrink-0" />
                                <span>Estimated duration: {selectedService.estimated_duration}</span>
                            </div>
                        </div>
                        <p className="shrink-0 text-base font-bold">P {selectedService.price_fixed.toLocaleString()}</p>
                    </div>

                    {/* Includes */}
                    <div>
                        <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Includes</p>
                        <div className="flex flex-col gap-1.5">
                            {selectedService.includes.map((item) => (
                                <div key={item} className="flex items-center gap-2 text-xs">
                                    <Check className="h-3.5 w-3.5 shrink-0 text-[#d4af37]" />
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Select arrival date */}
                    <div ref={dateContainerRef} className="relative">
                        <p className="mb-2 text-xs font-semibold text-foreground">Select arrival date</p>
                        <div className="flex flex-wrap gap-1.5">
                            {dateChips.map((chip) => {
                                const isActive = chip.actualDate.toDateString() === selectedDate.toDateString();
                                return (
                                    <button
                                        key={chip.actualDate.toISOString()}
                                        onClick={() => setSelectedDate(chip.actualDate)}
                                        className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                            isActive
                                                ? 'bg-[#d4af37] text-black shadow-[0_0_8px_rgba(212,175,55,0.4)]'
                                                : 'border border-[#2a2a2e] text-muted-foreground hover:border-[#d4af37]/50 hover:text-foreground'
                                        }`}
                                    >
                                        {chip.day} {chip.date}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setCalendarOpen((prev) => !prev)}
                                className={`flex items-center gap-0.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                    calendarOpen
                                        ? 'border-[#d4af37] bg-[#d4af37]/10 text-[#d4af37]'
                                        : 'border-[#2a2a2e] text-muted-foreground hover:border-[#d4af37]/50 hover:text-foreground'
                                }`}
                            >
                                More <ChevronDown className={`h-3 w-3 transition-transform ${calendarOpen ? 'rotate-180' : ''}`} />
                            </button>
                        </div>

                        {calendarOpen && (
                            <CalendarDropdown
                                containerRef={dateContainerRef}
                                onClose={() => setCalendarOpen(false)}
                                selectedDate={selectedDate}
                                onSelectDate={(date) => {
                                    setSelectedDate(date);
                                    setCalendarOpen(false);
                                }}
                            />
                        )}
                    </div>

                    {/* Select arrival time */}
                    <div>
                        <p className="mb-2 text-xs font-semibold text-foreground">Select arrival time</p>
                        <div className="flex flex-col gap-1.5">
                            {TIME_SLOTS.map((s, idx) => {
                                const isSelected = selectedTimeIdx === idx && s.status !== 'full';
                                const isFull = s.status === 'full';
                                return (
                                    <button
                                        key={s.time}
                                        disabled={isFull}
                                        onClick={() => !isFull && setSelectedTimeIdx(idx)}
                                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${
                                            isSelected
                                                ? 'bg-[#d4af37] font-semibold text-black shadow-[0_0_10px_rgba(212,175,55,0.25)]'
                                                : isFull
                                                  ? 'cursor-not-allowed border border-[#2a2a2e] text-muted-foreground/40'
                                                  : 'border border-[#2a2a2e] text-foreground hover:border-[#d4af37]/50'
                                        }`}
                                    >
                                        <span>{s.time}</span>
                                        <span className={isSelected ? 'text-black/70' : 'text-muted-foreground'}>
                                            {isFull
                                                ? 'Full'
                                                : isSelected
                                                  ? `${s.slotsLeft} slot${s.slotsLeft !== 1 ? 's' : ''} left`
                                                  : `${s.slotsLeft} Slot${s.slotsLeft !== 1 ? 's' : ''} Left`}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Vehicle */}
                    <div>
                        <p className="mb-2 text-xs font-semibold text-foreground">Vehicle</p>
                        <button className="flex w-full items-center justify-between rounded-lg border border-[#2a2a2e] px-3 py-2 text-xs text-foreground transition-colors hover:border-[#d4af37]/50">
                            <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded bg-[#d4af37]/10">
                                    <svg className="h-3.5 w-3.5 text-[#d4af37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                                        />
                                    </svg>
                                </div>
                                <span>Toyota Innova CAV 1234</span>
                            </div>
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Booking Summary */}
                    <div className="rounded-lg border border-[#2a2a2e] p-3">
                        <p className="mb-2 text-xs font-semibold text-foreground">Booking Summary</p>
                        <div className="flex flex-col gap-1.5 text-xs">
                            <div className="flex items-start justify-between gap-2">
                                <span className="text-muted-foreground">Arrival:</span>
                                <span className="text-right font-medium">{arrivalStr}</span>
                            </div>
                            <div className="flex items-start justify-between gap-2">
                                <span className="text-muted-foreground">Est. start:</span>
                                <span className="text-right font-medium">
                                    {fmtTime(estStart)} – {fmtTime(estEnd)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* CTA */}
                    <button
                        onClick={() => setModalStep('confirm')}
                        className="w-full rounded-lg bg-[#d4af37] py-2.5 text-sm font-bold text-black shadow-[0_4px_16px_rgba(212,175,55,0.35)] transition-opacity hover:opacity-90"
                    >
                        Schedule Now
                    </button>
                </div>
            </div>

            {/* ── Modal: Confirm Booking ──────────────────────────────────── */}
            {modalStep === 'confirm' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalStep(null)} />
                    {/* Dialog */}
                    <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#2a2a2e] bg-[#18181b] shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-[#2a2a2e] px-6 py-4">
                            <h2 className="text-base font-bold">Confirm Booking</h2>
                            <button
                                onClick={() => setModalStep(null)}
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-[#2a2a2e] hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex flex-col gap-4 px-6 py-5">
                            {/* Details */}
                            <div className="flex flex-col gap-3 text-sm">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#d4af37]/10">
                                        <svg className="h-4 w-4 text-[#d4af37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
                                            />
                                        </svg>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Service: </span>
                                        <span className="font-semibold">{selectedService.name}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#d4af37]/10">
                                        <svg className="h-4 w-4 text-[#d4af37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                                            />
                                        </svg>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Vehicle: </span>
                                        <span className="font-semibold">Toyota Innova &nbsp;·&nbsp; CAV 1234</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#d4af37]/10">
                                        <Clock className="h-4 w-4 text-[#d4af37]" />
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Arrival Time: </span>
                                        <span className="font-semibold">{arrivalStr}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#d4af37]/10">
                                        <svg className="h-4 w-4 text-[#d4af37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                                            />
                                        </svg>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Estimated Start: </span>
                                        <span className="font-semibold">
                                            {fmtTime(estStart)}&nbsp;–&nbsp;{fmtTime(estEnd)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-[#2a2a2e]" />

                            {/* Includes */}
                            <div>
                                <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Includes</p>
                                <div className="flex flex-col gap-1.5">
                                    {selectedService.includes.map((item) => (
                                        <div key={item} className="flex items-center gap-2 text-sm">
                                            <Check className="h-3.5 w-3.5 shrink-0 text-[#d4af37]" />
                                            <span>{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Queue notice */}
                            <div className="flex items-center gap-2.5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2.5 text-xs text-yellow-400">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                <span>Service time may vary depending on queue</span>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 border-t border-[#2a2a2e] px-6 py-4">
                            <button
                                onClick={() => setModalStep(null)}
                                className="rounded-lg border border-[#2a2a2e] px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[#2a2a2e]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => setModalStep('secure')}
                                className="rounded-lg bg-[#d4af37] px-5 py-2 text-sm font-bold text-black shadow-[0_4px_12px_rgba(212,175,55,0.3)] transition-opacity hover:opacity-90"
                            >
                                Confirm Booking
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Secure Your Booking ──────────────────────────────── */}
            {modalStep === 'secure' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalStep(null)} />
                    {/* Dialog */}
                    <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#2a2a2e] bg-[#18181b] shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-[#2a2a2e] px-6 py-4">
                            <h2 className="text-base font-bold">Secure Your Booking</h2>
                            <button
                                onClick={() => setModalStep(null)}
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-[#2a2a2e] hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex flex-col gap-4 px-6 py-5">
                            <p className="text-sm text-muted-foreground">Choose how to secure your booking</p>

                            {/* Option 1 */}
                            <button
                                onClick={() => setSecureOption('reservation')}
                                className={`flex items-start gap-4 rounded-xl border p-4 text-left transition-colors ${
                                    secureOption === 'reservation' ? 'border-[#d4af37] bg-[#d4af37]/5' : 'border-[#2a2a2e] hover:border-[#d4af37]/40'
                                }`}
                            >
                                {/* Radio */}
                                <div
                                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                        secureOption === 'reservation' ? 'border-[#d4af37]' : 'border-[#3a3a3e]'
                                    }`}
                                >
                                    {secureOption === 'reservation' && <div className="h-2.5 w-2.5 rounded-full bg-[#d4af37]" />}
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <p className="text-sm font-semibold">Pay Reservation Fee</p>
                                    <p className="text-xs text-muted-foreground">Secure your time slot now</p>
                                </div>
                            </button>

                            {/* Option 2 */}
                            <button
                                onClick={() => setSecureOption('no-payment')}
                                className={`flex items-start gap-4 rounded-xl border p-4 text-left transition-colors ${
                                    secureOption === 'no-payment' ? 'border-[#d4af37] bg-[#d4af37]/5' : 'border-[#2a2a2e] hover:border-[#d4af37]/40'
                                }`}
                            >
                                {/* Radio */}
                                <div
                                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                        secureOption === 'no-payment' ? 'border-[#d4af37]' : 'border-[#3a3a3e]'
                                    }`}
                                >
                                    {secureOption === 'no-payment' && <div className="h-2.5 w-2.5 rounded-full bg-[#d4af37]" />}
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <p className="text-sm font-semibold">Reserve Without Online Payment</p>
                                    <p className="text-xs text-muted-foreground">Phone verification is required.</p>
                                    <p className="text-xs text-muted-foreground">Your booking will still need shop approval.</p>
                                </div>
                            </button>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 border-t border-[#2a2a2e] px-6 py-4">
                            <button
                                onClick={() => setModalStep('confirm')}
                                className="rounded-lg border border-[#2a2a2e] px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[#2a2a2e]"
                            >
                                Back
                            </button>
                            <button
                                onClick={() => {
                                    if (secureOption === 'reservation') setModalStep('payment');
                                    else setModalStep('verify-phone');
                                }}
                                className="rounded-lg bg-[#d4af37] px-5 py-2 text-sm font-bold text-black shadow-[0_4px_12px_rgba(212,175,55,0.3)] transition-opacity hover:opacity-90"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Complete Reservation Fee (payment) ─────────────────── */}
            {modalStep === 'payment' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalStep(null)} />
                    <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#2a2a2e] bg-[#18181b] shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-[#2a2a2e] px-6 py-4">
                            <h2 className="text-base font-bold">Complete Reservation Fee</h2>
                            <button
                                onClick={() => setModalStep(null)}
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-[#2a2a2e] hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex flex-col gap-4 px-6 py-5">
                            {/* Service / Vehicle */}
                            <div className="flex flex-col gap-1.5 text-sm">
                                <p>
                                    <span className="text-muted-foreground">Service: </span>
                                    <span className="font-semibold">{selectedService.name}</span>
                                </p>
                                <p>
                                    <span className="text-muted-foreground">Vehicle: </span>
                                    <span className="font-semibold">Toyota Innova &nbsp;·&nbsp; CAV 1234</span>
                                </p>
                            </div>

                            <div className="h-px bg-[#2a2a2e]" />

                            {/* Fee notice */}
                            <div>
                                <p className="text-sm font-bold text-[#d4af37]">Reservation Fee: P 200</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">This amount will be deducted from your total bill</p>
                            </div>

                            <div className="h-px bg-[#2a2a2e]" />

                            {/* Payment methods */}
                            <div className="flex flex-col gap-2">
                                {(
                                    [
                                        {
                                            key: 'gcash' as PayMethod,
                                            label: 'GCash',
                                            icon: <img src="/images/gcash.png" alt="GCash" className="h-4 w-auto max-w-5 object-contain" />,
                                        },
                                        {
                                            key: 'maya' as PayMethod,
                                            label: 'Maya',
                                            icon: <img src="/images/Maya.png" alt="Maya" className="h-3 w-auto max-w-11 object-contain" />,
                                        },
                                        {
                                            key: 'card' as PayMethod,
                                            label: 'Credit/Debit Card',
                                            icon: (
                                                <img src="/images/debit.png" alt="Credit/Debit Card" className="h-6 w-auto max-w-10 object-contain" />
                                            ),
                                        },
                                        {
                                            key: 'bank' as PayMethod,
                                            label: 'Bank Transfer',
                                            icon: (
                                                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                                                    <path d="M16 4L3 11h26L16 4z" fill="#9ca3af" />
                                                    <rect x="5" y="14" width="3.5" height="9" rx="0.5" fill="#9ca3af" />
                                                    <rect x="14.25" y="14" width="3.5" height="9" rx="0.5" fill="#9ca3af" />
                                                    <rect x="23.5" y="14" width="3.5" height="9" rx="0.5" fill="#9ca3af" />
                                                    <rect x="3" y="24" width="26" height="2.5" rx="1" fill="#9ca3af" />
                                                    <rect x="3" y="11" width="26" height="2.5" fill="#6b7280" />
                                                </svg>
                                            ),
                                        },
                                    ] as { key: PayMethod; label: string; icon: ReactNode }[]
                                ).map((m) => (
                                    <button
                                        key={m.key}
                                        onClick={() => setPayMethod(m.key)}
                                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                                            payMethod === m.key ? 'border-[#d4af37] bg-[#d4af37]/5' : 'border-[#2a2a2e] hover:border-[#d4af37]/40'
                                        }`}
                                    >
                                        {/* Radio */}
                                        <div
                                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                                payMethod === m.key ? 'border-[#d4af37]' : 'border-[#3a3a3e]'
                                            }`}
                                        >
                                            {payMethod === m.key && <div className="h-2.5 w-2.5 rounded-full bg-[#d4af37]" />}
                                        </div>
                                        {/* Icon */}
                                        <div className="flex w-10 shrink-0 items-center justify-center">{m.icon}</div>
                                        <span className="text-sm font-medium">{m.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 border-t border-[#2a2a2e] px-6 py-4">
                            <button
                                onClick={() => setModalStep('secure')}
                                className="rounded-lg border border-[#2a2a2e] px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[#2a2a2e]"
                            >
                                Back
                            </button>
                            <button
                                onClick={() => setModalStep('success')}
                                className="rounded-lg bg-[#d4af37] px-5 py-2 text-sm font-bold text-black shadow-[0_4px_12px_rgba(212,175,55,0.3)] transition-opacity hover:opacity-90"
                            >
                                Pay Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Payment Successful ─────────────────────────────────── */}
            {modalStep === 'success' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#2a2a2e] bg-[#18181b] shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-[#2a2a2e] px-6 py-4">
                            <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                                    <Check className="h-3.5 w-3.5 text-white" />
                                </div>
                                <h2 className="text-base font-bold">Payment Successful</h2>
                            </div>
                            <button
                                onClick={() => setModalStep(null)}
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-[#2a2a2e] hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex flex-col gap-4 px-6 py-5">
                            <p className="text-center text-sm text-muted-foreground">
                                Your reservation fee has been received.
                                <br />
                                Your booking is now secured.
                            </p>

                            {/* Booking info card */}
                            <div className="rounded-xl border border-[#2a2a2e] bg-[#0d0d10] px-5 py-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Job Order #:</span>
                                    <span className="text-sm font-bold text-[#d4af37]">
                                        JO-{String(Math.floor(10000 + Math.random() * 90000)).slice(0, 5)}
                                    </span>
                                </div>
                                <p className="mb-4 text-sm font-semibold">
                                    {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, {slot.time}
                                </p>
                                <div className="grid grid-cols-2 gap-3 border-t border-[#2a2a2e] pt-3">
                                    <div>
                                        <p className="mb-0.5 text-xs text-muted-foreground">Arrival Time:</p>
                                        <p className="text-sm font-semibold">
                                            {estStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}{' '}
                                            &mdash;&mdash; {estEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="mb-0.5 text-xs text-muted-foreground">Service:</p>
                                        <p className="text-sm font-semibold text-[#d4af37]">{selectedService.name}</p>
                                        <p className="text-xs text-muted-foreground">Vehicle: Toyota Innova - CAV 1234</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex flex-col gap-3 border-t border-[#2a2a2e] px-6 py-4">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setModalStep(null)}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#2a2a2e] py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-[#3a3a3e]"
                                >
                                    <span className="flex gap-0.5">
                                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d4af37]" style={{ animationDelay: '0ms' }} />
                                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d4af37]" style={{ animationDelay: '150ms' }} />
                                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d4af37]" style={{ animationDelay: '300ms' }} />
                                    </span>
                                    Track Service
                                </button>
                                <button
                                    onClick={() => setModalStep(null)}
                                    className="flex-1 rounded-lg border border-[#2a2a2e] py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-[#2a2a2e]"
                                >
                                    Back to Dashboard
                                </button>
                            </div>
                            <p className="text-center text-xs text-muted-foreground">You'll receive a notification when your vehicle is ready.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Verify Phone Number ────────────────────────────────── */}
            {modalStep === 'verify-phone' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalStep(null)} />
                    <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#2a2a2e] bg-[#18181b] shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-[#2a2a2e] px-6 py-4">
                            <h2 className="text-base font-bold">Verify Your Phone Number</h2>
                            <button
                                onClick={() => setModalStep(null)}
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-[#2a2a2e] hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex flex-col gap-4 px-6 py-5">
                            <p className="text-sm text-muted-foreground">
                                To continue without paying a reservation fee, please verify your mobile number.
                            </p>
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-foreground">Phone Number</label>
                                <div className="flex items-center overflow-hidden rounded-lg border border-[#2a2a2e] bg-[#0d0d10] focus-within:border-[#d4af37] focus-within:ring-1 focus-within:ring-[#d4af37]/40">
                                    <span className="border-r border-[#2a2a2e] px-3 py-2.5 text-sm text-muted-foreground">+63</span>
                                    <input
                                        type="tel"
                                        placeholder="9XX XXX XXXX"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        className="flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 border-t border-[#2a2a2e] px-6 py-4">
                            <button
                                onClick={() => setModalStep('secure')}
                                className="rounded-lg border border-[#2a2a2e] px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[#2a2a2e]"
                            >
                                Back
                            </button>
                            <button
                                onClick={startOtp}
                                disabled={phone.length < 10}
                                className="rounded-lg bg-[#d4af37] px-5 py-2 text-sm font-bold text-black shadow-[0_4px_12px_rgba(212,175,55,0.3)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Send Verification Code
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Enter Verification Code ───────────────────────────── */}
            {modalStep === 'verify-otp' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalStep(null)} />
                    <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#2a2a2e] bg-[#18181b] shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-[#2a2a2e] px-6 py-4">
                            <h2 className="text-base font-bold">Enter Verification Code</h2>
                            <button
                                onClick={() => setModalStep(null)}
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-[#2a2a2e] hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex flex-col items-center gap-5 px-6 py-6">
                            <p className="text-center text-sm text-muted-foreground">
                                We sent a 6-digit code to <span className="font-medium text-foreground">+63 9{phone.slice(0, 2)}X XXX XXXX</span>
                            </p>

                            {/* 6-box OTP input */}
                            <div className="flex items-center gap-2.5">
                                {otp.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        ref={(el) => {
                                            otpRefs.current[idx] = el;
                                        }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpInput(idx, e.target.value)}
                                        onKeyDown={(e) => handleOtpKey(idx, e)}
                                        className="h-12 w-10 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] text-center text-lg font-bold text-foreground caret-[#d4af37] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/40 focus:outline-none"
                                    />
                                ))}
                            </div>

                            {/* Verify button */}
                            <button
                                onClick={() => setModalStep('reserved')}
                                disabled={otp.some((d) => d === '')}
                                className="w-full rounded-lg bg-[#d4af37] py-2.5 text-sm font-bold text-black shadow-[0_4px_12px_rgba(212,175,55,0.3)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Verify
                            </button>

                            {/* Resend */}
                            <p className="text-sm text-muted-foreground">
                                {otpCountdown > 0 ? (
                                    <>
                                        Resend code in <span className="font-semibold text-[#d4af37]">{fmtCountdown}</span>
                                    </>
                                ) : (
                                    <button onClick={startOtp} className="font-semibold text-[#d4af37] transition-opacity hover:opacity-80">
                                        Resend code
                                    </button>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Reservation Successful ─────────────────────────────── */}
            {modalStep === 'reserved' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#2a2a2e] bg-[#18181b] shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-[#2a2a2e] px-6 py-4">
                            <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#d4af37]">
                                    <Check className="h-3.5 w-3.5 text-black" />
                                </div>
                                <h2 className="text-base font-bold">Reservation Confirmed</h2>
                            </div>
                            <button
                                onClick={() => setModalStep(null)}
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-[#2a2a2e] hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex flex-col gap-4 px-6 py-5">
                            <p className="text-center text-sm text-muted-foreground">
                                Your slot has been reserved.
                                <br />
                                Please arrive on time and pay at the shop.
                            </p>

                            {/* Booking info card */}
                            <div className="rounded-xl border border-[#2a2a2e] bg-[#0d0d10] px-5 py-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Job Order #:</span>
                                    <span className="font-mono text-sm font-bold text-[#d4af37]">
                                        JO-{String(Math.floor(10000 + Math.random() * 90000)).slice(0, 5)}
                                    </span>
                                </div>
                                <p className="mb-4 text-sm font-semibold">
                                    {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, {slot.time}
                                </p>
                                <div className="grid grid-cols-2 gap-3 border-t border-[#2a2a2e] pt-3">
                                    <div>
                                        <p className="mb-0.5 text-xs text-muted-foreground">Service:</p>
                                        <p className="text-sm font-semibold text-[#d4af37]">{selectedService.name}</p>
                                    </div>
                                    <div>
                                        <p className="mb-0.5 text-xs text-muted-foreground">Vehicle:</p>
                                        <p className="text-sm font-semibold">Toyota Innova</p>
                                        <p className="text-xs text-muted-foreground">CAV 1234</p>
                                    </div>
                                    <div>
                                        <p className="mb-0.5 text-xs text-muted-foreground">Est. Start:</p>
                                        <p className="text-sm font-semibold">
                                            {fmtTime(estStart)} &mdash; {fmtTime(estEnd)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="mb-0.5 text-xs text-muted-foreground">Payment:</p>
                                        <p className="text-sm font-semibold">Pay at shop</p>
                                    </div>
                                </div>
                            </div>

                            {/* Notice */}
                            <div className="flex items-start gap-2.5 rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/5 px-3 py-2.5 text-xs text-[#d4af37]">
                                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <span>Your booking is pending shop approval. You'll be notified once confirmed.</span>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex flex-col gap-3 border-t border-[#2a2a2e] px-6 py-4">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setModalStep(null)}
                                    className="flex-1 rounded-lg border border-[#2a2a2e] py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-[#2a2a2e]"
                                >
                                    Back to Services
                                </button>
                                <button
                                    onClick={() => setModalStep(null)}
                                    className="flex-1 rounded-lg bg-[#d4af37] py-2.5 text-sm font-bold text-black shadow-[0_4px_16px_rgba(212,175,55,0.35)] transition-opacity hover:opacity-90"
                                >
                                    Done
                                </button>
                            </div>
                            <p className="text-center text-xs text-muted-foreground">You'll receive a notification when your booking is approved.</p>
                        </div>
                    </div>
                </div>
            )}
        </CustomerLayout>
    );
}
