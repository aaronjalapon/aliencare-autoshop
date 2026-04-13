import CustomerLayout from '@/components/layout/customer-layout';
import InputError from '@/components/shared/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { flattenValidationErrors } from '@/lib/validation-errors';
import { ApiError } from '@/services/api';
import { customerService } from '@/services/customerService';
import { Car, LoaderCircle, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type ContactMethod = 'sms' | 'call' | 'email';

interface VehicleForm {
    make: string;
    model: string;
    year: string;
    plate_number: string;
    color: string;
    vin: string;
}

const CAR_BRAND_OPTIONS = [
    'Toyota',
    'Honda',
    'Nissan',
    'Mitsubishi',
    'Hyundai',
    'Kia',
    'Mazda',
    'Subaru',
    'Suzuki',
    'Isuzu',
    'Ford',
    'Chevrolet',
    'Volkswagen',
    'BMW',
    'Mercedes-Benz',
    'Audi',
    'Lexus',
    'Porsche',
    'Jeep',
    'Land Rover',
    'Peugeot',
    'Renault',
    'Volvo',
    'Tesla',
    'BYD',
    'Chery',
    'Geely',
    'GAC',
    'MG',
    'Foton',
] as const;

const VEHICLE_YEAR_OPTIONS = Array.from({ length: new Date().getFullYear() - 1898 }, (_, index) => String(new Date().getFullYear() + 1 - index));

function emptyVehicle(): VehicleForm {
    return {
        make: '',
        model: '',
        year: '',
        plate_number: '',
        color: '',
        vin: '',
    };
}

export default function CustomerOnboarding() {
    const navigate = useNavigate();
    const location = useLocation();
    const makeListId = 'customer-onboarding-car-brands';

    const returnToPath = useMemo(() => {
        const rawReturnTo = new URLSearchParams(location.search).get('returnTo');
        if (!rawReturnTo) return null;
        if (!rawReturnTo.startsWith('/customer')) return null;
        if (rawReturnTo.startsWith('//')) return null;
        return rawReturnTo;
    }, [location.search]);

    const postOnboardingPath = returnToPath ?? '/customer';

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [address, setAddress] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [preferredContactMethod, setPreferredContactMethod] = useState<ContactMethod>('sms');
    const [specialNotes, setSpecialNotes] = useState('');
    const [vehicles, setVehicles] = useState<VehicleForm[]>([emptyVehicle()]);

    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadStatus = async () => {
            try {
                const response = await customerService.getOnboardingStatus();
                const status = response.data;

                if (cancelled) return;

                if (status.onboarding_completed) {
                    navigate(postOnboardingPath, { replace: true });
                    return;
                }

                const customer = status.customer;
                if (customer) {
                    setFirstName(customer.first_name ?? '');
                    setLastName(customer.last_name ?? '');
                    setPhoneNumber(customer.phone_number ?? '');
                    setAddress(customer.address ?? '');
                    setLicenseNumber(customer.license_number ?? '');
                    if (
                        customer.preferred_contact_method === 'sms' ||
                        customer.preferred_contact_method === 'call' ||
                        customer.preferred_contact_method === 'email'
                    ) {
                        setPreferredContactMethod(customer.preferred_contact_method);
                    }
                    setSpecialNotes(customer.special_notes ?? '');

                    if (customer.vehicles.length > 0) {
                        setVehicles(
                            customer.vehicles.map((vehicle) => ({
                                make: vehicle.make,
                                model: vehicle.model,
                                year: String(vehicle.year),
                                plate_number: vehicle.plate_number,
                                color: vehicle.color ?? '',
                                vin: vehicle.vin ?? '',
                            })),
                        );
                    }
                }
            } catch (error) {
                if (!cancelled) {
                    setFormError(error instanceof Error ? error.message : 'Failed to load onboarding data.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadStatus();

        return () => {
            cancelled = true;
        };
    }, [navigate, postOnboardingPath]);

    const updateVehicle = (index: number, key: keyof VehicleForm, value: string) => {
        setVehicles((prev) => prev.map((vehicle, i) => (i === index ? { ...vehicle, [key]: value } : vehicle)));
    };

    const addVehicle = () => {
        setVehicles((prev) => [...prev, emptyVehicle()]);
    };

    const removeVehicle = (index: number) => {
        setVehicles((prev) => {
            if (prev.length === 1) return prev;
            return prev.filter((_, i) => i !== index);
        });
    };

    const getVehicleFieldError = (index: number, field: keyof VehicleForm): string | undefined => {
        return errors[`vehicles.${index}.${field}`];
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setProcessing(true);
        setErrors({});
        setFormError(null);

        try {
            await customerService.completeOnboarding({
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                phone_number: phoneNumber.trim(),
                address: address.trim() || undefined,
                license_number: licenseNumber.trim() || undefined,
                preferred_contact_method: preferredContactMethod,
                special_notes: specialNotes.trim() || undefined,
                vehicles: vehicles.map((vehicle) => ({
                    make: vehicle.make.trim(),
                    model: vehicle.model.trim(),
                    year: Number.parseInt(vehicle.year, 10),
                    plate_number: vehicle.plate_number.trim().toUpperCase(),
                    color: vehicle.color.trim() || undefined,
                    vin: vehicle.vin.trim() || undefined,
                })),
            });

            navigate(postOnboardingPath, { replace: true });
        } catch (error) {
            if (error instanceof ApiError && error.status === 422) {
                const flatErrors = flattenValidationErrors(error.validationErrors);
                if (Object.keys(flatErrors).length > 0) {
                    setErrors(flatErrors);
                } else {
                    setFormError(error.message || 'Please review your onboarding details and try again.');
                }
            } else {
                setFormError(error instanceof Error ? error.message : 'Failed to complete onboarding.');
            }
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <CustomerLayout>
                <div className="flex h-full min-h-[60vh] items-center justify-center p-6 text-muted-foreground">
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                    <span className="ml-2">Loading onboarding…</span>
                </div>
            </CustomerLayout>
        );
    }

    return (
        <CustomerLayout>
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Complete Your Onboarding</h1>
                    <p className="text-sm text-muted-foreground">Finish your profile so you can book services and manage your account.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <InputError
                        message={formError ?? undefined}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300"
                    />

                    <section className="profile-card rounded-xl p-5">
                        <h2 className="mb-4 text-lg font-semibold">Personal Information</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="first_name">First Name</Label>
                                <Input id="first_name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                                <InputError message={errors.first_name} className="text-xs text-red-400" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="last_name">Last Name</Label>
                                <Input id="last_name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                                <InputError message={errors.last_name} className="text-xs text-red-400" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone_number">Phone Number</Label>
                                <Input id="phone_number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                                <InputError message={errors.phone_number} className="text-xs text-red-400" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="license_number">License Number (Optional)</Label>
                                <Input id="license_number" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
                                <InputError message={errors.license_number} className="text-xs text-red-400" />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="address">Address (Optional)</Label>
                                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
                                <InputError message={errors.address} className="text-xs text-red-400" />
                            </div>
                        </div>
                    </section>

                    <section className="profile-card rounded-xl p-5">
                        <div className="mb-4 flex items-center justify-between gap-2">
                            <h2 className="text-lg font-semibold">My Vehicles</h2>
                            <Button type="button" variant="outline" onClick={addVehicle} className="gap-2">
                                <Plus className="h-4 w-4" />
                                Add Vehicle
                            </Button>
                        </div>
                        <InputError message={errors.vehicles} className="mb-3 text-xs text-red-400" />

                        <div className="space-y-4">
                            {vehicles.map((vehicle, index) => (
                                <div key={index} className="rounded-lg border border-[#2a2a2e] bg-[#0d0d10] p-4">
                                    <div className="mb-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm font-semibold">
                                            <Car className="h-4 w-4 text-[#d4af37]" />
                                            Vehicle {index + 1}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeVehicle(index)}
                                            disabled={vehicles.length === 1}
                                            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-[#1e1e22] hover:text-red-400 disabled:opacity-40"
                                            aria-label={`Remove vehicle ${index + 1}`}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label htmlFor={`vehicle_make_${index}`}>Make</Label>
                                            <Input
                                                id={`vehicle_make_${index}`}
                                                list={makeListId}
                                                placeholder="Search or type a brand"
                                                value={vehicle.make}
                                                onChange={(e) => updateVehicle(index, 'make', e.target.value)}
                                            />
                                            <InputError message={getVehicleFieldError(index, 'make')} className="text-xs text-red-400" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>Model</Label>
                                            <Input value={vehicle.model} onChange={(e) => updateVehicle(index, 'model', e.target.value)} />
                                            <InputError message={getVehicleFieldError(index, 'model')} className="text-xs text-red-400" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor={`vehicle_year_${index}`}>Year</Label>
                                            <select
                                                id={`vehicle_year_${index}`}
                                                value={vehicle.year}
                                                onChange={(e) => updateVehicle(index, 'year', e.target.value)}
                                                className="h-10 w-full rounded-md border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm text-foreground outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/40"
                                            >
                                                <option value="">Select year</option>
                                                {VEHICLE_YEAR_OPTIONS.map((year) => (
                                                    <option key={year} value={year}>
                                                        {year}
                                                    </option>
                                                ))}
                                            </select>
                                            <InputError message={getVehicleFieldError(index, 'year')} className="text-xs text-red-400" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>Plate Number</Label>
                                            <Input
                                                value={vehicle.plate_number}
                                                onChange={(e) => updateVehicle(index, 'plate_number', e.target.value.toUpperCase())}
                                            />
                                            <InputError message={getVehicleFieldError(index, 'plate_number')} className="text-xs text-red-400" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>Color (Optional)</Label>
                                            <Input value={vehicle.color} onChange={(e) => updateVehicle(index, 'color', e.target.value)} />
                                            <InputError message={getVehicleFieldError(index, 'color')} className="text-xs text-red-400" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>VIN (Optional)</Label>
                                            <Input value={vehicle.vin} onChange={(e) => updateVehicle(index, 'vin', e.target.value)} />
                                            <InputError message={getVehicleFieldError(index, 'vin')} className="text-xs text-red-400" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <datalist id={makeListId}>
                            {CAR_BRAND_OPTIONS.map((brand) => (
                                <option key={brand} value={brand} />
                            ))}
                        </datalist>
                    </section>

                    <section className="profile-card rounded-xl p-5">
                        <h2 className="mb-4 text-lg font-semibold">Special Information</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="preferred_contact_method">Preferred Contact</Label>
                                <select
                                    id="preferred_contact_method"
                                    value={preferredContactMethod}
                                    onChange={(e) => setPreferredContactMethod(e.target.value as ContactMethod)}
                                    className="h-10 w-full rounded-md border border-[#2a2a2e] bg-[#0d0d10] px-3 text-sm text-foreground outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/40"
                                >
                                    <option value="sms">SMS</option>
                                    <option value="call">Call</option>
                                    <option value="email">Email</option>
                                </select>
                                <InputError message={errors.preferred_contact_method} className="text-xs text-red-400" />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="special_notes">Notes (Optional)</Label>
                                <textarea
                                    id="special_notes"
                                    value={specialNotes}
                                    onChange={(e) => setSpecialNotes(e.target.value)}
                                    rows={4}
                                    className="w-full resize-none rounded-md border border-[#2a2a2e] bg-[#0d0d10] px-3 py-2 text-sm text-foreground outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/40"
                                />
                                <InputError message={errors.special_notes} className="text-xs text-red-400" />
                            </div>
                        </div>
                    </section>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={processing} className="min-w-48">
                            {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                            {processing ? 'Saving…' : 'Complete Onboarding'}
                        </Button>
                    </div>
                </form>
            </div>
        </CustomerLayout>
    );
}
