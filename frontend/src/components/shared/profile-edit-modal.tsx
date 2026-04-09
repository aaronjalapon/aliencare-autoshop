import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';

export interface EditField {
    label: string;
    key: string;
    value: string;
    type?: 'text' | 'email' | 'tel' | 'textarea';
}

interface ProfileEditModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    fields: EditField[];
    onSave: (values: Record<string, string>) => Promise<void>;
}

export function ProfileEditModal({ open, onClose, title, fields, onSave }: ProfileEditModalProps) {
    const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.key, f.value])));
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Re-sync values when fields change (different section/vehicle opened)
    useEffect(() => {
        setValues(Object.fromEntries(fields.map((f) => [f.key, f.value])));
        setSaveError(null);
    }, [fields]);

    const handleChange = (key: string, val: string) => setValues((prev) => ({ ...prev, [key]: val }));

    const handleSave = async () => {
        setSaving(true);
        setSaveError(null);
        try {
            await onSave(values);
            onClose();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save changes.';
            setSaveError(message);
        } finally {
            setSaving(false);
        }
    };

    const handleOpenChange = (o: boolean) => {
        if (!o && !saving) onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="border-[#2a2a2e] bg-linear-to-br from-[#1e1e22] to-[#0d0d10] sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-2">
                    {fields.map((field) => (
                        <div key={field.key} className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
                            {field.type === 'textarea' ? (
                                <textarea
                                    value={values[field.key] ?? ''}
                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                    rows={3}
                                    className="w-full resize-none rounded-md border border-[#2a2a2e] bg-[#0d0d10] px-3 py-2 text-sm text-foreground transition outline-none placeholder:text-muted-foreground focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/40"
                                />
                            ) : (
                                <Input
                                    type={field.type ?? 'text'}
                                    value={values[field.key] ?? ''}
                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                    className="border-[#2a2a2e] bg-[#0d0d10] focus-visible:border-[#d4af37] focus-visible:ring-[#d4af37]/40"
                                />
                            )}
                        </div>
                    ))}

                    {saveError && <p className="text-xs text-red-500">{saveError}</p>}
                </div>

                <DialogFooter className="gap-2">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-lg border border-[#2a2a2e] px-4 py-2 text-sm font-medium transition-colors hover:bg-[#1e1e22] disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#e6c24e] disabled:opacity-60"
                    >
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
