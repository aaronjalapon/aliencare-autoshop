import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface AddVehicleModalProps {
    open: boolean;
    onClose: () => void;
}

interface VehicleForm {
    make: string;
    model: string;
    year: string;
    plateNumber: string;
    color: string;
    type: string;
}

const INITIAL_FORM: VehicleForm = {
    make: '',
    model: '',
    year: '',
    plateNumber: '',
    color: '',
    type: '',
};

const VEHICLE_TYPES = ['Sedan', 'SUV', 'Pickup Truck', 'Van', 'Hatchback', 'Motorcycle', 'Other'];

export function AddVehicleModal({ open, onClose }: AddVehicleModalProps) {
    const [form, setForm] = useState<VehicleForm>(INITIAL_FORM);
    const [errors, setErrors] = useState<Partial<VehicleForm>>({});

    const set = (key: keyof VehicleForm, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => ({ ...prev, [key]: '' }));
    };

    const validate = (): boolean => {
        const newErrors: Partial<VehicleForm> = {};
        if (!form.make.trim()) newErrors.make = 'Brand / Make is required.';
        if (!form.model.trim()) newErrors.model = 'Model is required.';
        if (!form.year.trim()) {
            newErrors.year = 'Year is required.';
        } else if (!/^\d{4}$/.test(form.year) || +form.year < 1900 || +form.year > new Date().getFullYear() + 1) {
            newErrors.year = 'Enter a valid 4-digit year.';
        }
        if (!form.plateNumber.trim()) newErrors.plateNumber = 'Plate number is required.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;
        // TODO: connect to API when backend vehicle endpoints are ready
        setForm(INITIAL_FORM);
        setErrors({});
        onClose();
    };

    const handleClose = () => {
        setForm(INITIAL_FORM);
        setErrors({});
        onClose();
    };

    const fieldClass = 'border-[#2a2a2e] bg-[#0d0d10] focus-visible:border-[#d4af37] focus-visible:ring-[#d4af37]/40';

    return (
        <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
            <DialogContent className="border-[#2a2a2e] bg-linear-to-br from-[#1e1e22] to-[#0d0d10] sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-base font-semibold">Add New Vehicle</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-2">
                    {/* Make / Brand */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                            Brand / Make <span className="text-red-500">*</span>
                        </label>
                        <Input
                            placeholder="e.g. Toyota, Honda, Ford"
                            value={form.make}
                            onChange={(e) => set('make', e.target.value)}
                            className={fieldClass}
                        />
                        {errors.make && <p className="text-xs text-red-500">{errors.make}</p>}
                    </div>

                    {/* Model */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                            Model <span className="text-red-500">*</span>
                        </label>
                        <Input
                            placeholder="e.g. Innova, Civic, Ranger"
                            value={form.model}
                            onChange={(e) => set('model', e.target.value)}
                            className={fieldClass}
                        />
                        {errors.model && <p className="text-xs text-red-500">{errors.model}</p>}
                    </div>

                    {/* Year + Type side by side */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-muted-foreground">
                                Year <span className="text-red-500">*</span>
                            </label>
                            <Input
                                placeholder="e.g. 2022"
                                maxLength={4}
                                value={form.year}
                                onChange={(e) => set('year', e.target.value)}
                                className={fieldClass}
                            />
                            {errors.year && <p className="text-xs text-red-500">{errors.year}</p>}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Vehicle Type</label>
                            <select
                                value={form.type}
                                onChange={(e) => set('type', e.target.value)}
                                className="h-9 w-full rounded-md border border-[#2a2a2e] bg-[#0d0d10] px-3 py-1 text-sm text-foreground transition outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/40"
                            >
                                <option value="">Select type</option>
                                {VEHICLE_TYPES.map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Plate Number */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                            Plate Number <span className="text-red-500">*</span>
                        </label>
                        <Input
                            placeholder="e.g. ABC 1234"
                            value={form.plateNumber}
                            onChange={(e) => set('plateNumber', e.target.value.toUpperCase())}
                            className={fieldClass}
                        />
                        {errors.plateNumber && <p className="text-xs text-red-500">{errors.plateNumber}</p>}
                    </div>

                    {/* Color */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Color</label>
                        <Input
                            placeholder="e.g. White, Midnight Black"
                            value={form.color}
                            onChange={(e) => set('color', e.target.value)}
                            className={fieldClass}
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-lg border border-[#2a2a2e] px-4 py-2 text-sm font-medium transition-colors hover:bg-[#1e1e22]"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#e6c24e]"
                    >
                        Add Vehicle
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
