import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { customerService } from '@/services/customerService';
import { useState } from 'react';

interface AddVehicleModalProps {
    open: boolean;
    onClose: () => void;
    customerId: number;
    onSuccess?: () => void;
}

interface VehicleForm {
    make: string;
    model: string;
    year: string;
    plateNumber: string;
    color: string;
}

const INITIAL_FORM: VehicleForm = {
    make: '',
    model: '',
    year: '',
    plateNumber: '',
    color: '',
};

export function AddVehicleModal({ open, onClose, customerId, onSuccess }: AddVehicleModalProps) {
    const [form, setForm] = useState<VehicleForm>(INITIAL_FORM);
    const [errors, setErrors] = useState<Partial<VehicleForm>>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

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

    const handleSubmit = async () => {
        if (!validate()) return;
        setSubmitting(true);
        setSubmitError(null);
        try {
            await customerService.addVehicle(customerId, {
                make: form.make.trim(),
                model: form.model.trim(),
                year: parseInt(form.year, 10),
                plate_number: form.plateNumber.trim(),
                color: form.color.trim() || undefined,
            });
            setForm(INITIAL_FORM);
            setErrors({});
            onSuccess?.();
            onClose();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to add vehicle.';
            setSubmitError(message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        if (submitting) return;
        setForm(INITIAL_FORM);
        setErrors({});
        setSubmitError(null);
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

                    {/* Year */}
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

                    {submitError && <p className="text-xs text-red-500">{submitError}</p>}
                </div>

                <DialogFooter className="gap-2">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={submitting}
                        className="rounded-lg border border-[#2a2a2e] px-4 py-2 text-sm font-medium transition-colors hover:bg-[#1e1e22] disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#e6c24e] disabled:opacity-60"
                    >
                        {submitting ? 'Adding…' : 'Add Vehicle'}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
