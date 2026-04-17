import AppLayout from '@/components/layout/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Car, Crown, Download, Mail, Minus, Phone, Plus, Search, UserPlus, X } from 'lucide-react';
import { useMemo, useState } from 'react';

type CustomerTier = 'VIP' | 'Fleet' | 'Active' | 'Inactive';
type SegmentFilter = 'all' | 'active' | 'vip' | 'fleet' | 'inactive';

interface VehicleSummary {
    name: string;
    year: number;
    plate: string;
    lastService: string;
    nextDue: string;
}

interface CustomerRow {
    id: number;
    code: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    primaryVehicle: string;
    extraVehicles: number;
    lastVisit: string;
    totalJobs: number;
    totalSpent: number;
    status: 'Active' | 'Inactive';
    tiers: CustomerTier[];
    customerSince: string;
    vehicles: VehicleSummary[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Customers', href: '/customers' }];

const customersSeed: CustomerRow[] = [
    {
        id: 1,
        code: 'CUS-20240892',
        name: 'John Nabunturan',
        phone: '+63 912 345 6780',
        email: 'john.nabunt@email.com',
        address: '123 Main St, Davao City',
        primaryVehicle: 'Toyota Innova · CAV-1234',
        extraVehicles: 0,
        lastVisit: '4 days ago',
        totalJobs: 12,
        totalSpent: 45230,
        status: 'Active',
        tiers: ['VIP'],
        customerSince: '2 years ago',
        vehicles: [{ name: 'Toyota Innova', year: 2020, plate: 'CAV1234', lastService: '4 days ago', nextDue: '-87 days ago' }],
    },
    {
        id: 2,
        code: 'CUS-20240893',
        name: 'Eddy Villanueva',
        phone: '+63 998 321 1104',
        email: 'eddy.v@email.com',
        address: 'Catalunan Grande, Davao City',
        primaryVehicle: 'Honda City · NOA-0789',
        extraVehicles: 1,
        lastVisit: '1 week ago',
        totalJobs: 8,
        totalSpent: 28900,
        status: 'Active',
        tiers: ['Fleet'],
        customerSince: '1 year ago',
        vehicles: [
            { name: 'Honda City', year: 2019, plate: 'NOA0789', lastService: '1 week ago', nextDue: '24 days' },
            { name: 'Toyota Hilux', year: 2021, plate: 'LFT2210', lastService: '3 weeks ago', nextDue: '5 days' },
        ],
    },
    {
        id: 3,
        code: 'CUS-20240894',
        name: 'Anna Emiquez',
        phone: '+63 917 100 2210',
        email: 'anna.emiquez@email.com',
        address: 'Buhangin, Davao City',
        primaryVehicle: 'Hyundai Accent · LLE-1236',
        extraVehicles: 0,
        lastVisit: '4 days ago',
        totalJobs: 4,
        totalSpent: 22800,
        status: 'Active',
        tiers: ['Active'],
        customerSince: '8 months ago',
        vehicles: [{ name: 'Hyundai Accent', year: 2018, plate: 'LLE1236', lastService: '4 days ago', nextDue: '12 days' }],
    },
    {
        id: 4,
        code: 'CUS-20240895',
        name: 'Dale Santos',
        phone: '+63 921 558 2201',
        email: 'dale.santos@email.com',
        address: 'Matina, Davao City',
        primaryVehicle: 'Toyota Fortuner · AUC-7884',
        extraVehicles: 0,
        lastVisit: '4 days ago',
        totalJobs: 6,
        totalSpent: 18900,
        status: 'Active',
        tiers: ['Active'],
        customerSince: '11 months ago',
        vehicles: [{ name: 'Toyota Fortuner', year: 2022, plate: 'AUC7884', lastService: '4 days ago', nextDue: '20 days' }],
    },
    {
        id: 5,
        code: 'CUS-20240896',
        name: 'Gary Olivar',
        phone: '+63 939 002 7611',
        email: 'gary.olivar@email.com',
        address: 'Panacan, Davao City',
        primaryVehicle: 'Mazda 3 · NOV-4009',
        extraVehicles: 0,
        lastVisit: '4 days ago',
        totalJobs: 3,
        totalSpent: 6450,
        status: 'Active',
        tiers: ['Active'],
        customerSince: '6 months ago',
        vehicles: [{ name: 'Mazda 3', year: 2017, plate: 'NOV4009', lastService: '4 days ago', nextDue: '40 days' }],
    },
    {
        id: 6,
        code: 'CUS-20240897',
        name: 'Michael Torres',
        phone: '+63 917 333 9210',
        email: 'm.torres@email.com',
        address: 'Toril, Davao City',
        primaryVehicle: 'Toyota Vios · RED-0012',
        extraVehicles: 0,
        lastVisit: '4 days ago',
        totalJobs: 2,
        totalSpent: 4370,
        status: 'Inactive',
        tiers: ['Inactive'],
        customerSince: '4 months ago',
        vehicles: [{ name: 'Toyota Vios', year: 2016, plate: 'RED0012', lastService: '4 days ago', nextDue: 'overdue' }],
    },
    {
        id: 7,
        code: 'CUS-20240898',
        name: 'Vicente Ramirez',
        phone: '+63 945 410 7719',
        email: 'vicente.r@email.com',
        address: 'Buhangin, Davao City',
        primaryVehicle: 'Toyota Vios · PAA-1234',
        extraVehicles: 0,
        lastVisit: '4 days ago',
        totalJobs: 15,
        totalSpent: 52300,
        status: 'Active',
        tiers: ['VIP', 'Fleet'],
        customerSince: '3 years ago',
        vehicles: [{ name: 'Toyota Vios', year: 2021, plate: 'PAA1234', lastService: '4 days ago', nextDue: '15 days' }],
    },
];

function formatPeso(amount: number): string {
    return `P${amount.toLocaleString('en-US')}`;
}

function segmentMatches(customer: CustomerRow, segment: SegmentFilter): boolean {
    if (segment === 'all') return true;
    if (segment === 'active') return customer.status === 'Active';
    if (segment === 'inactive') return customer.status === 'Inactive';
    if (segment === 'vip') return customer.tiers.includes('VIP');
    return customer.tiers.includes('Fleet');
}

function TierChip({ tier }: { tier: CustomerTier }) {
    const config: Record<CustomerTier, { label: string; className: string; dot: string }> = {
        VIP: {
            label: 'VIP',
            className: 'border-[#d4af37]/35 bg-[#d4af37]/12 text-[#d4af37]',
            dot: 'bg-[#d4af37]',
        },
        Fleet: {
            label: 'Fleet',
            className: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
            dot: 'bg-blue-400',
        },
        Active: {
            label: 'Active',
            className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
            dot: 'bg-emerald-400',
        },
        Inactive: {
            label: 'Inactive',
            className: 'border-zinc-500/40 bg-zinc-500/10 text-zinc-300',
            dot: 'bg-zinc-400',
        },
    };

    const tierConfig = config[tier];

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${tierConfig.className}`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${tierConfig.dot}`} />
            {tierConfig.label}
        </span>
    );
}

export default function Customers() {
    const [customers, setCustomers] = useState<CustomerRow[]>(customersSeed);
    const [segment, setSegment] = useState<SegmentFilter>('all');
    const [searchValue, setSearchValue] = useState('');
    const [selectedId, setSelectedId] = useState<number>(customersSeed[0]?.id ?? 0);

    const totals = useMemo(() => {
        return {
            total: customers.length,
            active: customers.filter((customer) => customer.status === 'Active').length,
            vip: customers.filter((customer) => customer.tiers.includes('VIP')).length,
            fleet: customers.filter((customer) => customer.tiers.includes('Fleet')).length,
        };
    }, [customers]);

    const filteredCustomers = useMemo(() => {
        const normalized = searchValue.trim().toLowerCase();

        return customers.filter((customer) => {
            const matchSegment = segmentMatches(customer, segment);
            if (!matchSegment) return false;

            if (!normalized) return true;

            const searchable = [customer.name, customer.phone, customer.email, customer.primaryVehicle, customer.code].join(' ').toLowerCase();

            return searchable.includes(normalized);
        });
    }, [customers, searchValue, segment]);

    const selectedCustomer = useMemo(() => {
        const fromFiltered = filteredCustomers.find((customer) => customer.id === selectedId);
        if (fromFiltered) return fromFiltered;
        return filteredCustomers[0] ?? null;
    }, [filteredCustomers, selectedId]);

    const setPrimaryTier = (customer: CustomerRow): CustomerTier => {
        if (customer.tiers.includes('VIP')) return 'VIP';
        if (customer.tiers.includes('Fleet')) return 'Fleet';
        if (customer.status === 'Inactive') return 'Inactive';
        return 'Active';
    };

    const handleNewCustomer = () => {
        const now = Date.now();
        const nextId = customers.length ? Math.max(...customers.map((customer) => customer.id)) + 1 : 1;
        const generatedCode = `CUS-${now.toString().slice(-8)}`;

        const newCustomer: CustomerRow = {
            id: nextId,
            code: generatedCode,
            name: `New Customer ${nextId}`,
            phone: '+63 9XX XXX XXXX',
            email: `customer${nextId}@email.com`,
            address: 'Address not set',
            primaryVehicle: 'Vehicle not set',
            extraVehicles: 0,
            lastVisit: 'Never',
            totalJobs: 0,
            totalSpent: 0,
            status: 'Active',
            tiers: ['Active'],
            customerSince: 'Just now',
            vehicles: [{ name: 'No vehicle yet', year: new Date().getFullYear(), plate: '---', lastService: 'N/A', nextDue: 'N/A' }],
        };

        setCustomers((prev) => [newCustomer, ...prev]);
        setSelectedId(newCustomer.id);
    };

    const handleToggleStatus = () => {
        if (!selectedCustomer) return;

        setCustomers((prev) =>
            prev.map((customer) => {
                if (customer.id !== selectedCustomer.id) return customer;

                const toStatus = customer.status === 'Active' ? 'Inactive' : 'Active';
                const nextTiers: CustomerTier[] = customer.tiers.filter((tier): tier is 'VIP' | 'Fleet' => tier === 'VIP' || tier === 'Fleet');
                nextTiers.push(toStatus);

                return {
                    ...customer,
                    status: toStatus,
                    tiers: nextTiers,
                };
            }),
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="h-full min-h-0 flex-1 overflow-hidden p-5">
                <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-4 overflow-hidden">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold tracking-[0.18em] text-[#d4af37] uppercase">Frontdesk Workspace</p>
                            <h1 className="mt-2 text-3xl font-bold tracking-tight">Customers</h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Manage customer profiles, service activity, and quick frontdesk actions.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleNewCustomer}
                                className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
                            >
                                <UserPlus className="h-4 w-4" /> New Customer
                            </button>
                            <button className="inline-flex items-center gap-2 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground">
                                <Download className="h-4 w-4" /> Export
                            </button>
                        </div>
                    </div>

                    <div className="grid min-h-0 flex-1 gap-4 overflow-hidden xl:grid-cols-[1.9fr_0.72fr]">
                        <div className="flex min-w-0 flex-col gap-3">
                            <div className="flex flex-col gap-3 rounded-xl border border-[#2a2a2e] bg-[#0d0d10]/80 p-3">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        value={searchValue}
                                        onChange={(event) => setSearchValue(event.target.value)}
                                        placeholder="Search by name, phone, or plate number..."
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#090a0d] pr-3 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#d4af37]/70 focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none"
                                    />
                                </div>

                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                    <div className="rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/7 px-3 py-2.5">
                                        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Total</p>
                                        <p className="mt-1 text-2xl font-bold text-[#d4af37]">{totals.total}</p>
                                    </div>
                                    <div className="rounded-lg border border-[#2a2a2e] bg-[#090a0d] px-3 py-2.5">
                                        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Active</p>
                                        <p className="mt-1 text-2xl font-bold">{totals.active}</p>
                                    </div>
                                    <div className="rounded-lg border border-[#2a2a2e] bg-[#090a0d] px-3 py-2.5">
                                        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">VIP</p>
                                        <p className="mt-1 text-2xl font-bold">{totals.vip}</p>
                                    </div>
                                    <div className="rounded-lg border border-[#2a2a2e] bg-[#090a0d] px-3 py-2.5">
                                        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Fleet</p>
                                        <p className="mt-1 text-2xl font-bold">{totals.fleet}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-1.5 rounded-xl border border-[#2a2a2e] bg-[#0d0d10]/70 p-1.5">
                                {(
                                    [
                                        { key: 'all', label: 'All Customers' },
                                        { key: 'active', label: 'Active' },
                                        { key: 'vip', label: 'VIP' },
                                        { key: 'fleet', label: 'Fleet' },
                                        { key: 'inactive', label: 'Inactive' },
                                    ] as Array<{ key: SegmentFilter; label: string }>
                                ).map((item) => (
                                    <button
                                        key={item.key}
                                        onClick={() => setSegment(item.key)}
                                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                                            segment === item.key
                                                ? 'bg-[#d4af37] text-black shadow-[0_0_12px_rgba(212,175,55,0.35)]'
                                                : 'text-muted-foreground hover:bg-[#1e1e22] hover:text-foreground'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>

                            <div className="overflow-hidden rounded-xl border border-[#2a2a2e] bg-[#0d0d10]/80">
                                <div className="hidden grid-cols-[1.1fr_1.2fr_1.5fr_0.9fr_0.8fr_0.8fr] border-b border-[#2a2a2e] px-4 py-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase lg:grid">
                                    <span>Customer</span>
                                    <span>Contact</span>
                                    <span>Primary Vehicle</span>
                                    <span>Last Visit</span>
                                    <span>Total Jobs</span>
                                    <span>Status</span>
                                </div>

                                <div className="max-h-140 overflow-y-auto">
                                    {filteredCustomers.length === 0 ? (
                                        <div className="px-5 py-20 text-center text-sm text-muted-foreground">No customers matched your filter.</div>
                                    ) : (
                                        filteredCustomers.map((customer) => {
                                            const selected = selectedCustomer?.id === customer.id;
                                            return (
                                                <button
                                                    key={customer.id}
                                                    onClick={() => setSelectedId(customer.id)}
                                                    className={`grid w-full border-b border-[#1b1d22] px-4 py-3 text-left transition-colors last:border-b-0 lg:grid-cols-[1.1fr_1.2fr_1.5fr_0.9fr_0.8fr_0.8fr] ${
                                                        selected
                                                            ? 'bg-[#d4af37]/7 shadow-[inset_0_0_0_1px_rgba(212,175,55,0.55)]'
                                                            : 'hover:bg-[#1a1b20]/65'
                                                    }`}
                                                >
                                                    <div className="mb-2 lg:mb-0">
                                                        <p className="text-sm font-semibold">{customer.name}</p>
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {customer.tiers.map((tier) => (
                                                                <TierChip key={`${customer.id}-${tier}`} tier={tier} />
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="mb-2 lg:mb-0">
                                                        <p className="text-sm text-foreground/90">{customer.phone}</p>
                                                        <p className="text-xs text-muted-foreground">{customer.email}</p>
                                                    </div>

                                                    <div className="mb-2 lg:mb-0">
                                                        <p className="text-sm">{customer.primaryVehicle}</p>
                                                        {customer.extraVehicles > 0 && (
                                                            <p className="text-xs text-muted-foreground">+{customer.extraVehicles} more</p>
                                                        )}
                                                    </div>

                                                    <div className="mb-2 text-sm text-muted-foreground lg:mb-0">{customer.lastVisit}</div>

                                                    <div className="mb-2 lg:mb-0">
                                                        <p className="text-sm font-semibold">{customer.totalJobs} jobs</p>
                                                        <p className="text-xs text-muted-foreground">{formatPeso(customer.totalSpent)}</p>
                                                    </div>

                                                    <div>
                                                        <span
                                                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                                                customer.status === 'Active'
                                                                    ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                                                                    : 'border border-zinc-500/35 bg-zinc-500/12 text-zinc-300'
                                                            }`}
                                                        >
                                                            {customer.status}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        <aside className="min-h-0 overflow-y-auto rounded-xl border border-[#2a2a2e] bg-[#0d0d10]/90 p-4">
                            {selectedCustomer ? (
                                <div className="flex h-full flex-col gap-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                {selectedCustomer.code}
                                            </p>
                                            <h2 className="mt-2 text-2xl leading-tight font-bold">{selectedCustomer.name}</h2>
                                            <div className="mt-2 flex items-center gap-1.5">
                                                <TierChip tier={setPrimaryTier(selectedCustomer)} />
                                            </div>
                                        </div>
                                        <button className="rounded-full border border-[#2a2a2e] p-1.5 text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>

                                    <div className="rounded-xl border border-[#2a2a2e] bg-[#0a0b0f] p-3">
                                        <button className="mb-2 inline-flex w-full items-center justify-center rounded-lg bg-[#d4af37] px-3 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90">
                                            New Job Order
                                        </button>
                                        <div className="grid grid-cols-3 gap-2">
                                            <button className="rounded-md border border-[#2a2a2e] px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
                                                Call
                                            </button>
                                            <button className="rounded-md border border-[#2a2a2e] px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
                                                SMS
                                            </button>
                                            <button className="rounded-md border border-[#2a2a2e] px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
                                                Email
                                            </button>
                                        </div>
                                        <button className="mt-2 w-full rounded-md border border-[#2a2a2e] px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground">
                                            Edit Customer
                                        </button>
                                    </div>

                                    <div className="rounded-xl border border-[#2a2a2e] bg-[#0a0b0f] p-3">
                                        <div className="mb-3 flex items-center justify-between">
                                            <p className="text-sm font-semibold">Contact Information</p>
                                            <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                                        </div>
                                        <div className="space-y-3 text-sm">
                                            <div className="flex items-center justify-between gap-2 text-muted-foreground">
                                                <span className="inline-flex items-center gap-1 text-xs uppercase">
                                                    <Phone className="h-3.5 w-3.5" /> Phone
                                                </span>
                                                <span className="text-right text-foreground">{selectedCustomer.phone}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-2 text-muted-foreground">
                                                <span className="inline-flex items-center gap-1 text-xs uppercase">
                                                    <Mail className="h-3.5 w-3.5" /> Email
                                                </span>
                                                <span className="text-right text-foreground">{selectedCustomer.email}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-2 text-muted-foreground">
                                                <span className="text-xs uppercase">Address</span>
                                                <span className="text-right text-foreground">{selectedCustomer.address}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-2 text-muted-foreground">
                                                <span className="text-xs uppercase">Customer Since</span>
                                                <span className="text-right text-foreground">{selectedCustomer.customerSince}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-[#2a2a2e] bg-[#0a0b0f] p-3">
                                        <div className="mb-3 flex items-center justify-between">
                                            <p className="text-sm font-semibold">Vehicles ({selectedCustomer.vehicles.length})</p>
                                            <button className="rounded-full border border-[#2a2a2e] p-1 text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground">
                                                <Plus className="h-3 w-3" />
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            {selectedCustomer.vehicles.map((vehicle) => (
                                                <div
                                                    key={`${selectedCustomer.id}-${vehicle.plate}`}
                                                    className="rounded-lg border border-[#23252b] bg-[#111217] p-2.5"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <p className="inline-flex items-center gap-1 text-sm font-semibold">
                                                                <Car className="h-3.5 w-3.5 text-[#d4af37]" />
                                                                {vehicle.name}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">{vehicle.year}</p>
                                                        </div>
                                                        <button className="rounded p-0.5 text-red-400/75 hover:bg-red-500/10 hover:text-red-300">
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                    <div className="mt-2 space-y-1 text-xs">
                                                        <div className="flex items-center justify-between text-muted-foreground">
                                                            <span>Plate</span>
                                                            <span className="text-foreground">{vehicle.plate}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-muted-foreground">
                                                            <span>Last Service</span>
                                                            <span className="text-foreground">{vehicle.lastService}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-muted-foreground">
                                                            <span>Next Due</span>
                                                            <span className="text-foreground">{vehicle.nextDue}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleToggleStatus}
                                        className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg border border-[#2a2a2e] px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                                    >
                                        {selectedCustomer.status === 'Active' ? (
                                            <Crown className="h-4 w-4" />
                                        ) : (
                                            <Crown className="h-4 w-4 text-[#d4af37]" />
                                        )}
                                        Toggle Active Status
                                    </button>
                                </div>
                            ) : (
                                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[#2a2a2e] p-6 text-sm text-muted-foreground">
                                    Select a customer to view details.
                                </div>
                            )}
                        </aside>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
