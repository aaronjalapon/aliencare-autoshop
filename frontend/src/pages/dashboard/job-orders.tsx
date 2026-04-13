import AppLayout from '@/components/layout/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Car, CheckCircle2, Clock3, Search, ShieldCheck, UserRoundPlus, Wrench } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Job Orders', href: '/job-orders' }];

type JobOrderStatus = 'pending_approval' | 'confirmed' | 'in_progress' | 'ready_for_settlement' | 'completed';
type JobOrderSource = 'Online Booking' | 'Walk-in';
type SegmentFilter = 'all' | 'online' | 'walkin' | 'active' | 'completed';

interface JobOrderRecord {
    id: number;
    joNumber: string;
    source: JobOrderSource;
    customerName: string;
    customerPhone: string;
    vehicleLabel: string;
    plateNumber: string;
    serviceName: string;
    scheduleLabel: string;
    status: JobOrderStatus;
    estimatedAmount: number;
    balance: number;
    bay: string;
    updatedAt: string;
    notes: string;
}

const seedJobOrders: JobOrderRecord[] = [
    {
        id: 1,
        joNumber: 'JO-10521',
        source: 'Online Booking',
        customerName: 'John Nabunturan',
        customerPhone: '+63 912 345 6780',
        vehicleLabel: 'Toyota Innova 2020',
        plateNumber: 'CAV1234',
        serviceName: 'Change Oil + Filter',
        scheduleLabel: 'Today · 09:00 AM',
        status: 'pending_approval',
        estimatedAmount: 2200,
        balance: 2200,
        bay: 'Bay 2',
        updatedAt: '2 mins ago',
        notes: 'Requested pickup before 11:00 AM',
    },
    {
        id: 2,
        joNumber: 'JO-10522',
        source: 'Walk-in',
        customerName: 'Eddy Villanueva',
        customerPhone: '+63 998 321 1104',
        vehicleLabel: 'Honda City 2019',
        plateNumber: 'NOA0789',
        serviceName: 'Brake Inspection',
        scheduleLabel: 'Today · 09:35 AM',
        status: 'in_progress',
        estimatedAmount: 1800,
        balance: 1800,
        bay: 'Bay 1',
        updatedAt: '5 mins ago',
        notes: 'Slight vibration when braking.',
    },
    {
        id: 3,
        joNumber: 'JO-10523',
        source: 'Online Booking',
        customerName: 'Anna Emiquez',
        customerPhone: '+63 917 100 2210',
        vehicleLabel: 'Hyundai Accent 2018',
        plateNumber: 'LLE1236',
        serviceName: 'Premium Car Wash',
        scheduleLabel: 'Today · 10:00 AM',
        status: 'confirmed',
        estimatedAmount: 650,
        balance: 650,
        bay: 'Wash Bay',
        updatedAt: '11 mins ago',
        notes: 'Include interior vacuuming.',
    },
    {
        id: 4,
        joNumber: 'JO-10524',
        source: 'Walk-in',
        customerName: 'Dale Santos',
        customerPhone: '+63 921 558 2201',
        vehicleLabel: 'Toyota Fortuner 2022',
        plateNumber: 'AUC7884',
        serviceName: 'Battery Replacement',
        scheduleLabel: 'Today · 10:20 AM',
        status: 'ready_for_settlement',
        estimatedAmount: 4700,
        balance: 4700,
        bay: 'Bay 3',
        updatedAt: '1 min ago',
        notes: 'Old battery retained by customer.',
    },
    {
        id: 5,
        joNumber: 'JO-10519',
        source: 'Online Booking',
        customerName: 'Vicente Ramirez',
        customerPhone: '+63 945 410 7719',
        vehicleLabel: 'Toyota Vios 2021',
        plateNumber: 'PAA1234',
        serviceName: 'Air-Con Repair',
        scheduleLabel: 'Today · 08:00 AM',
        status: 'completed',
        estimatedAmount: 3600,
        balance: 0,
        bay: 'Bay 4',
        updatedAt: '30 mins ago',
        notes: 'Refrigerant topped up and tested.',
    },
];

const statusMeta: Record<JobOrderStatus, { label: string; className: string }> = {
    pending_approval: { label: 'Pending Approval', className: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
    confirmed: { label: 'Confirmed', className: 'border-blue-500/30 bg-blue-500/10 text-blue-300' },
    in_progress: { label: 'In Progress', className: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300' },
    ready_for_settlement: { label: 'Ready for Settlement', className: 'border-violet-500/30 bg-violet-500/10 text-violet-300' },
    completed: { label: 'Completed', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
};

const statusFlow: JobOrderStatus[] = ['pending_approval', 'confirmed', 'in_progress', 'ready_for_settlement', 'completed'];

function formatPeso(amount: number): string {
    return `P${amount.toLocaleString('en-US')}`;
}

function statusForSegment(order: JobOrderRecord, segment: SegmentFilter): boolean {
    if (segment === 'all') return true;
    if (segment === 'online') return order.source === 'Online Booking';
    if (segment === 'walkin') return order.source === 'Walk-in';
    if (segment === 'completed') return order.status === 'completed';
    return order.status !== 'completed';
}

export default function JobOrders() {
    const [jobOrders, setJobOrders] = useState<JobOrderRecord[]>(seedJobOrders);
    const [searchValue, setSearchValue] = useState('');
    const [segment, setSegment] = useState<SegmentFilter>('all');
    const [selectedId, setSelectedId] = useState<number>(seedJobOrders[0]?.id ?? 0);
    const [showWalkInModal, setShowWalkInModal] = useState(false);

    const [walkInForm, setWalkInForm] = useState({
        customerName: '',
        phone: '',
        vehicleLabel: '',
        plateNumber: '',
        serviceName: '',
        bay: 'Bay 1',
        estimatedAmount: '',
        notes: '',
    });

    const totals = useMemo(() => {
        return {
            active: jobOrders.filter((order) => order.status !== 'completed').length,
            onlinePending: jobOrders.filter((order) => order.source === 'Online Booking' && order.status === 'pending_approval').length,
            walkInToday: jobOrders.filter((order) => order.source === 'Walk-in').length,
            completedToday: jobOrders.filter((order) => order.status === 'completed').length,
        };
    }, [jobOrders]);

    const filteredOrders = useMemo(() => {
        const normalized = searchValue.trim().toLowerCase();

        return jobOrders.filter((order) => {
            if (!statusForSegment(order, segment)) return false;
            if (!normalized) return true;

            const source = [order.joNumber, order.customerName, order.vehicleLabel, order.plateNumber, order.serviceName].join(' ').toLowerCase();

            return source.includes(normalized);
        });
    }, [jobOrders, searchValue, segment]);

    const selectedOrder = useMemo(() => {
        const exact = filteredOrders.find((order) => order.id === selectedId);
        return exact ?? filteredOrders[0] ?? null;
    }, [filteredOrders, selectedId]);

    const advanceStatus = () => {
        if (!selectedOrder) return;

        const currentIndex = statusFlow.indexOf(selectedOrder.status);
        if (currentIndex === -1 || currentIndex === statusFlow.length - 1) return;

        const nextStatus = statusFlow[currentIndex + 1];

        setJobOrders((prev) =>
            prev.map((order) =>
                order.id === selectedOrder.id
                    ? {
                          ...order,
                          status: nextStatus,
                          balance: nextStatus === 'completed' ? 0 : order.balance,
                          updatedAt: 'Just now',
                      }
                    : order,
            ),
        );
    };

    const getPrimaryActionLabel = (status: JobOrderStatus): string => {
        if (status === 'pending_approval') return 'Approve Booking';
        if (status === 'confirmed') return 'Start Service';
        if (status === 'in_progress') return 'Mark Ready for Settlement';
        if (status === 'ready_for_settlement') return 'Complete and Settle';
        return 'Job Order Completed';
    };

    const createWalkInJobOrder = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!walkInForm.customerName || !walkInForm.vehicleLabel || !walkInForm.serviceName) {
            return;
        }

        const nextId = jobOrders.length ? Math.max(...jobOrders.map((order) => order.id)) + 1 : 1;
        const estimatedAmount = Number.parseFloat(walkInForm.estimatedAmount) || 0;
        const newOrder: JobOrderRecord = {
            id: nextId,
            joNumber: `JO-${String(10500 + nextId)}`,
            source: 'Walk-in',
            customerName: walkInForm.customerName,
            customerPhone: walkInForm.phone || '+63 9XX XXX XXXX',
            vehicleLabel: walkInForm.vehicleLabel,
            plateNumber: walkInForm.plateNumber || 'N/A',
            serviceName: walkInForm.serviceName,
            scheduleLabel: 'Today · Walk-in',
            status: 'in_progress',
            estimatedAmount,
            balance: estimatedAmount,
            bay: walkInForm.bay,
            updatedAt: 'Just now',
            notes: walkInForm.notes || 'Walk-in service created by frontdesk.',
        };

        setJobOrders((prev) => [newOrder, ...prev]);
        setSelectedId(newOrder.id);
        setShowWalkInModal(false);
        setWalkInForm({
            customerName: '',
            phone: '',
            vehicleLabel: '',
            plateNumber: '',
            serviceName: '',
            bay: 'Bay 1',
            estimatedAmount: '',
            notes: '',
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="h-full min-h-0 flex-1 overflow-hidden p-5">
                <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-5 overflow-hidden">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-xs font-semibold tracking-[0.18em] text-[#d4af37] uppercase">Frontdesk Workspace</p>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Handle online customer bookings and instant walk-in job orders in one queue.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowWalkInModal(true)}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
                        >
                            <UserRoundPlus className="h-4 w-4" /> New Walk-in Job Order
                        </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="profile-card rounded-xl p-4">
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Active Queue</p>
                            <p className="mt-2 text-3xl font-bold">{totals.active}</p>
                        </div>
                        <div className="profile-card rounded-xl p-4">
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Online Pending</p>
                            <p className="mt-2 text-3xl font-bold">{totals.onlinePending}</p>
                        </div>
                        <div className="profile-card rounded-xl p-4">
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Walk-ins Today</p>
                            <p className="mt-2 text-3xl font-bold">{totals.walkInToday}</p>
                        </div>
                        <div className="profile-card rounded-xl p-4">
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Completed Today</p>
                            <p className="mt-2 text-3xl font-bold">{totals.completedToday}</p>
                        </div>
                    </div>

                    <div className="grid min-h-0 flex-1 gap-5 overflow-hidden xl:grid-cols-[1.55fr_1fr]">
                        <div className="profile-card rounded-xl p-5">
                            <div className="mb-4 flex flex-col gap-3">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        value={searchValue}
                                        onChange={(event) => setSearchValue(event.target.value)}
                                        placeholder="Search JO number, customer, plate, or service"
                                        className="h-10 w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] pr-3 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none"
                                    />
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {(
                                        [
                                            { key: 'all', label: 'All' },
                                            { key: 'online', label: 'Online Booking' },
                                            { key: 'walkin', label: 'Walk-in' },
                                            { key: 'active', label: 'Active Queue' },
                                            { key: 'completed', label: 'Completed' },
                                        ] as Array<{ key: SegmentFilter; label: string }>
                                    ).map((item) => (
                                        <button
                                            key={item.key}
                                            onClick={() => setSegment(item.key)}
                                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                                                segment === item.key
                                                    ? 'bg-[#d4af37] text-black shadow-[0_0_12px_rgba(212,175,55,0.35)]'
                                                    : 'border border-[#2a2a2e] text-muted-foreground hover:border-[#d4af37]/40 hover:text-foreground'
                                            }`}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-xl border border-[#2a2a2e]">
                                <div className="hidden grid-cols-[1.1fr_1fr_1.3fr_1fr_0.8fr_0.8fr] border-b border-[#2a2a2e] bg-[#0d0d10] px-4 py-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase lg:grid">
                                    <span>JO / Source</span>
                                    <span>Customer</span>
                                    <span>Vehicle / Service</span>
                                    <span>Schedule</span>
                                    <span>Status</span>
                                    <span>Amount</span>
                                </div>

                                <div className="max-h-140 overflow-y-auto">
                                    {filteredOrders.length === 0 ? (
                                        <div className="px-5 py-16 text-center text-sm text-muted-foreground">
                                            No job orders matched your filters.
                                        </div>
                                    ) : (
                                        filteredOrders.map((order) => {
                                            const selected = selectedOrder?.id === order.id;
                                            return (
                                                <button
                                                    key={order.id}
                                                    onClick={() => setSelectedId(order.id)}
                                                    className={`grid w-full border-b border-[#1b1d22] px-4 py-3 text-left transition-colors last:border-b-0 lg:grid-cols-[1.1fr_1fr_1.3fr_1fr_0.8fr_0.8fr] ${
                                                        selected
                                                            ? 'bg-[#d4af37]/7 shadow-[inset_0_0_0_1px_rgba(212,175,55,0.55)]'
                                                            : 'hover:bg-[#1a1b20]/65'
                                                    }`}
                                                >
                                                    <div className="mb-2 lg:mb-0">
                                                        <p className="text-sm font-semibold">{order.joNumber}</p>
                                                        <p className="mt-1 inline-flex rounded-full border border-[#2a2a2e] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                                            {order.source}
                                                        </p>
                                                    </div>

                                                    <div className="mb-2 lg:mb-0">
                                                        <p className="text-sm">{order.customerName}</p>
                                                        <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                                                    </div>

                                                    <div className="mb-2 lg:mb-0">
                                                        <p className="text-sm">{order.vehicleLabel}</p>
                                                        <p className="text-xs text-muted-foreground">{order.serviceName}</p>
                                                    </div>

                                                    <div className="mb-2 text-sm text-muted-foreground lg:mb-0">{order.scheduleLabel}</div>

                                                    <div className="mb-2 lg:mb-0">
                                                        <span
                                                            className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusMeta[order.status].className}`}
                                                        >
                                                            {statusMeta[order.status].label}
                                                        </span>
                                                    </div>

                                                    <div className="text-sm font-semibold text-[#d4af37]">{formatPeso(order.estimatedAmount)}</div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        <aside className="profile-card min-h-0 overflow-y-auto rounded-xl p-5">
                            {selectedOrder ? (
                                <div className="flex h-full flex-col gap-4">
                                    <div>
                                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                            {selectedOrder.joNumber}
                                        </p>
                                        <h2 className="mt-2 text-xl font-bold">{selectedOrder.customerName}</h2>
                                        <p className="mt-1 text-sm text-muted-foreground">{selectedOrder.customerPhone}</p>
                                        <div className="mt-2 inline-flex rounded-full border border-[#2a2a2e] bg-[#0d0d10] px-2 py-0.5 text-[11px] text-muted-foreground">
                                            {selectedOrder.source}
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-3">
                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center justify-between text-muted-foreground">
                                                <span className="inline-flex items-center gap-1">
                                                    <Car className="h-3.5 w-3.5" /> Vehicle
                                                </span>
                                                <span className="text-right text-foreground">{selectedOrder.vehicleLabel}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-muted-foreground">
                                                <span>Plate</span>
                                                <span className="text-right text-foreground">{selectedOrder.plateNumber}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-muted-foreground">
                                                <span className="inline-flex items-center gap-1">
                                                    <Wrench className="h-3.5 w-3.5" /> Service
                                                </span>
                                                <span className="text-right text-foreground">{selectedOrder.serviceName}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-muted-foreground">
                                                <span>Bay</span>
                                                <span className="text-right text-foreground">{selectedOrder.bay}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-muted-foreground">
                                                <span className="inline-flex items-center gap-1">
                                                    <Clock3 className="h-3.5 w-3.5" /> Schedule
                                                </span>
                                                <span className="text-right text-foreground">{selectedOrder.scheduleLabel}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-3">
                                        <div className="mb-2 flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Estimated Amount</span>
                                            <span className="font-semibold text-[#d4af37]">{formatPeso(selectedOrder.estimatedAmount)}</span>
                                        </div>
                                        <div className="mb-2 flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Balance</span>
                                            <span className="font-semibold">{formatPeso(selectedOrder.balance)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Updated</span>
                                            <span className="text-foreground">{selectedOrder.updatedAt}</span>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-[#2a2a2e] bg-[#0d0d10] p-3">
                                        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Notes</p>
                                        <p className="text-sm text-muted-foreground">{selectedOrder.notes}</p>
                                    </div>

                                    <button
                                        disabled={selectedOrder.status === 'completed'}
                                        onClick={advanceStatus}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                                    >
                                        {selectedOrder.status === 'completed' ? (
                                            <CheckCircle2 className="h-4 w-4" />
                                        ) : (
                                            <ShieldCheck className="h-4 w-4" />
                                        )}
                                        {getPrimaryActionLabel(selectedOrder.status)}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[#2a2a2e] p-6 text-sm text-muted-foreground">
                                    Select a job order to inspect details.
                                </div>
                            )}
                        </aside>
                    </div>
                </div>
            </div>

            {showWalkInModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowWalkInModal(false)}>
                    <div className="profile-card w-full max-w-2xl rounded-xl p-5" onClick={(event) => event.stopPropagation()}>
                        <h3 className="text-lg font-semibold">Create Walk-in Job Order</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Record an on-the-spot service request from a walk-in customer.</p>

                        <form onSubmit={createWalkInJobOrder} className="mt-4 space-y-3">
                            <div className="grid gap-3 md:grid-cols-2">
                                <input
                                    value={walkInForm.customerName}
                                    onChange={(event) => setWalkInForm((prev) => ({ ...prev, customerName: event.target.value }))}
                                    placeholder="Customer name"
                                    required
                                    className="h-10 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                />
                                <input
                                    value={walkInForm.phone}
                                    onChange={(event) => setWalkInForm((prev) => ({ ...prev, phone: event.target.value }))}
                                    placeholder="Phone number"
                                    className="h-10 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                />
                                <input
                                    value={walkInForm.vehicleLabel}
                                    onChange={(event) => setWalkInForm((prev) => ({ ...prev, vehicleLabel: event.target.value }))}
                                    placeholder="Vehicle (make/model/year)"
                                    required
                                    className="h-10 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                />
                                <input
                                    value={walkInForm.plateNumber}
                                    onChange={(event) => setWalkInForm((prev) => ({ ...prev, plateNumber: event.target.value }))}
                                    placeholder="Plate number"
                                    className="h-10 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                />
                                <input
                                    value={walkInForm.serviceName}
                                    onChange={(event) => setWalkInForm((prev) => ({ ...prev, serviceName: event.target.value }))}
                                    placeholder="Requested service"
                                    required
                                    className="h-10 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                />
                                <input
                                    value={walkInForm.estimatedAmount}
                                    onChange={(event) => setWalkInForm((prev) => ({ ...prev, estimatedAmount: event.target.value }))}
                                    placeholder="Estimated amount"
                                    type="number"
                                    min="0"
                                    className="h-10 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                                />
                                <select
                                    value={walkInForm.bay}
                                    onChange={(event) => setWalkInForm((prev) => ({ ...prev, bay: event.target.value }))}
                                    className="h-10 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm focus:border-[#d4af37] focus:outline-none md:col-span-2"
                                >
                                    <option>Bay 1</option>
                                    <option>Bay 2</option>
                                    <option>Bay 3</option>
                                    <option>Bay 4</option>
                                    <option>Wash Bay</option>
                                </select>
                            </div>

                            <textarea
                                value={walkInForm.notes}
                                onChange={(event) => setWalkInForm((prev) => ({ ...prev, notes: event.target.value }))}
                                placeholder="Notes"
                                rows={3}
                                className="w-full rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none"
                            />

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowWalkInModal(false)}
                                    className="rounded-lg border border-[#2a2a2e] px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90"
                                >
                                    Create Job Order
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
