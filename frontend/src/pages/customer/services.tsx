import CustomerLayout from '@/components/layout/customer-layout';
import { ArrowRight, Check, ChevronDown, Clock, Star, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

// ── types ─────────────────────────────────────────────────────────────────────
type Category = 'Maintenance' | 'Cleaning' | 'Repair';

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
    {
        id: 1,
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
        id: 2,
        name: 'Change Oil',
        priceLabel: 'P300–P800',
        priceFixed: 1200,
        duration: '30 mins',
        estimatedDuration: '45–60 mins',
        rating: 4.5,
        ratingCount: 183,
        category: 'Maintenance',
        features: ['Exterior + Interior'],
        queueLabel: '2-3 In Que',
        includes: ['Synthetic oil refill', 'Oil filter replacement', '21-point inspection'],
        recommended: true,
        recommendedNote: 'You last changed your oil 5 months ago',
    },
    {
        id: 3,
        name: 'Air-Con Repair',
        priceLabel: 'P300–P800',
        priceFixed: 2500,
        duration: '30 mins',
        estimatedDuration: '60–90 mins',
        rating: 4.5,
        ratingCount: 183,
        category: 'Repair',
        features: ['Exterior + Interior'],
        queueLabel: '2-3 In Que',
        includes: ['AC diagnostics', 'Refrigerant top-up', 'Filter cleaning'],
    },
    {
        id: 4,
        name: 'Brake Inspection',
        priceLabel: 'P500–P1200',
        priceFixed: 800,
        duration: '45 mins',
        estimatedDuration: '40–50 mins',
        rating: 4.7,
        ratingCount: 120,
        category: 'Maintenance',
        features: ['Full inspection'],
        queueLabel: '1-2 In Que',
        includes: ['Brake pad check', 'Rotor inspection', 'Brake fluid top-up'],
    },
    {
        id: 5,
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
    {
        id: 6,
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

const TIME_SLOTS = [
    { time: '10:00 AM', status: 'available' as const, slotsLeft: 1 },
    { time: '11:00 AM', status: 'full' as const, slotsLeft: 0 },
    { time: '12:00 PM', status: 'available' as const, slotsLeft: 2 },
    { time: '12:30 PM', status: 'available' as const, slotsLeft: 4 },
];

const CATEGORIES: Category[] = ['Maintenance', 'Cleaning', 'Repair'];

// ── helpers ───────────────────────────────────────────────────────────────────
function Stars({ rating, count }: { rating: number; count?: number }) {
    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
                <Star
                    key={i}
                    className={`h-3 w-3 ${i <= Math.round(rating) ? 'fill-[#d4af37] text-[#d4af37]' : 'fill-none text-[#d4af37]/30'}`}
                />
            ))}
            <span className="ml-0.5 text-xs text-muted-foreground">
                {rating.toFixed(1)}{count != null ? `(${count})` : ''}
            </span>
        </div>
    );
}

function parseTime(timeStr: string): { h: number; m: number } {
    const [timePart, meridiem] = timeStr.split(' ');
    let [h, m] = timePart.split(':').map(Number);
    if (meridiem === 'PM' && h !== 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    return { h, m };
}

function fmtTime(d: Date) {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ── page ──────────────────────────────────────────────────────────────────────
export default function CustomerServices() {
    const [activeCategory, setActiveCategory] = useState<Category>('Maintenance');
    const [selectedId, setSelectedId] = useState(2);
    const [selectedDateIdx, setSelectedDateIdx] = useState(0);
    const [selectedTimeIdx, setSelectedTimeIdx] = useState(0);

    const recommended = ALL_SERVICES.find((s) => s.recommended);
    const popularServices = ALL_SERVICES.filter((s) => s.category === activeCategory);
    const selectedService = ALL_SERVICES.find((s) => s.id === selectedId) ?? ALL_SERVICES[0];

    // Build next-6-day chips from today
    const dateChips = useMemo(() => {
        const base = new Date();
        return Array.from({ length: 6 }, (_, i) => {
            const d = new Date(base);
            d.setDate(base.getDate() + i);
            return {
                day: d.toLocaleDateString('en-US', { weekday: 'short' }),
                date: d.getDate(),
                month: d.toLocaleDateString('en-US', { month: 'short' }),
            };
        });
    }, []);

    // Booking summary times
    const chip = dateChips[selectedDateIdx];
    const slot = TIME_SLOTS[selectedTimeIdx];
    const arrivalStr = `${chip.day} ${chip.month} ${chip.date}, ${slot.time}`;

    const { h, m } = parseTime(slot.time);
    const estStart = new Date();
    estStart.setHours(h, m + 15, 0, 0);
    const durNums = selectedService.estimatedDuration.match(/\d+/g) ?? ['30'];
    const durMaxMin = parseInt(durNums[durNums.length - 1], 10);
    const estEnd = new Date(estStart);
    estEnd.setMinutes(estEnd.getMinutes() + durMaxMin);

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
                                <p className="text-xs text-muted-foreground">{recommended.recommendedNote}</p>
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
                            {/* Decorative car silhouette */}
                            <div className="pointer-events-none absolute right-0 top-0 h-full w-52">
                                <div className="h-full w-full bg-linear-to-l from-[#d4af37]/8 to-transparent" />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
                                    <svg viewBox="0 0 120 60" className="h-28 w-48 fill-[#d4af37]">
                                        <path d="M10 40 L20 20 Q30 10 50 10 L70 10 Q90 10 100 20 L110 40 L115 42 Q118 44 118 47 L118 50 Q118 52 116 52 L104 52 Q102 52 101 50 Q100 46 96 46 Q92 46 91 50 Q90 52 88 52 L32 52 Q30 52 29 50 Q28 46 24 46 Q20 46 19 50 Q18 52 16 52 L4 52 Q2 52 2 50 L2 47 Q2 44 5 42 Z" />
                                        <ellipse cx="24" cy="52" rx="8" ry="4" />
                                        <ellipse cx="96" cy="52" rx="8" ry="4" />
                                        {/* headlights */}
                                        <rect x="106" y="28" width="8" height="5" rx="2" fill="white" opacity="0.6" />
                                        <rect x="6" y="28" width="8" height="5" rx="2" fill="white" opacity="0.3" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Services Offered + Category Tabs */}
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Services Offered</p>
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

                        <div className="grid grid-cols-2 gap-3">
                            {popularServices.slice(0, 3).map((service) => (
                                <div
                                    key={service.id}
                                    onClick={() => setSelectedId(service.id)}
                                    className={`profile-card cursor-pointer rounded-xl p-4 transition-all ${
                                        selectedId === service.id
                                            ? 'shadow-[0_0_0_1px_#d4af37,0_0_16px_rgba(212,175,55,0.15)]'
                                            : 'hover:shadow-[0_0_0_1px_rgba(212,175,55,0.3)]'
                                    }`}
                                >
                                    <div className="flex flex-col gap-2">
                                        <p className="text-sm font-bold leading-snug">{service.name}</p>
                                        <p className="text-xs font-semibold text-muted-foreground">{service.priceLabel}</p>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3 shrink-0" />
                                            <span>{service.duration}</span>
                                        </div>
                                        <Stars rating={service.rating} count={service.ratingCount} />
                                        {service.features.map((f) => (
                                            <div key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <Check className="h-3 w-3 shrink-0 text-[#d4af37]" />
                                                <span>{f}</span>
                                            </div>
                                        ))}
                                        <div className="mt-1 flex items-center justify-between">
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Users className="h-3 w-3 shrink-0" />
                                                <span>{service.queueLabel}</span>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedId(service.id); }}
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

                        <div className="flex justify-end">
                            <button className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-[#d4af37]">
                                See all Services <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT PANEL (Booking) ─────────────────────────────────── */}
                <div className="profile-card sticky top-5 flex flex-col gap-4 rounded-xl p-5">

                    {/* Service Header */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1">
                            <p className="text-base font-bold">{selectedService.name}</p>
                            <Stars rating={selectedService.rating} count={selectedService.ratingCount} />
                            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3 shrink-0" />
                                <span>Estimated duration: {selectedService.estimatedDuration}</span>
                            </div>
                        </div>
                        <p className="shrink-0 text-base font-bold">P {selectedService.priceFixed.toLocaleString()}</p>
                    </div>

                    {/* Includes */}
                    <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Includes</p>
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
                    <div>
                        <p className="mb-2 text-xs font-semibold text-foreground">Select arrival date</p>
                        <div className="flex flex-wrap gap-1.5">
                            {dateChips.map((chip, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedDateIdx(idx)}
                                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                        selectedDateIdx === idx
                                            ? 'bg-[#d4af37] text-black shadow-[0_0_8px_rgba(212,175,55,0.4)]'
                                            : 'border border-[#2a2a2e] text-muted-foreground hover:border-[#d4af37]/50 hover:text-foreground'
                                    }`}
                                >
                                    {chip.day} {chip.date}
                                </button>
                            ))}
                            <button className="flex items-center gap-0.5 rounded-lg border border-[#2a2a2e] px-2.5 py-1.5 text-xs text-muted-foreground hover:border-[#d4af37]/50">
                                More <ChevronDown className="h-3 w-3" />
                            </button>
                        </div>
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
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                                    </svg>
                                </div>
                                <span>Toyota Innova  CAV 1234</span>
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
                                <span className="text-right font-medium">{fmtTime(estStart)} – {fmtTime(estEnd)}</span>
                            </div>
                        </div>
                    </div>

                    {/* CTA */}
                    <button className="w-full rounded-lg bg-[#d4af37] py-2.5 text-sm font-bold text-black shadow-[0_4px_16px_rgba(212,175,55,0.35)] transition-opacity hover:opacity-90">
                        Schedule Now
                    </button>
                </div>
            </div>
        </CustomerLayout>
    );
}

