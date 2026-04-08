import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

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
}

export function ProfileEditModal({ open, onClose, title, fields }: ProfileEditModalProps) {
    const [values, setValues] = useState<Record<string, string>>(
        () => Object.fromEntries(fields.map((f) => [f.key, f.value])),
    );

    // Re-sync when fields change (different modal section opened)
    const handleChange = (key: string, val: string) =>
        setValues((prev) => ({ ...prev, [key]: val }));

    const handleSave = () => {
        // TODO: wire up to API when backend endpoints are ready
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="border-[#2a2a2e] bg-linear-to-br from-[#1e1e22] to-[#0d0d10] sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-2">
                    {fields.map((field) => (
                        <div key={field.key} className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-muted-foreground">
                                {field.label}
                            </label>
                            {field.type === 'textarea' ? (
                                <textarea
                                    value={values[field.key] ?? ''}
                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                    rows={3}
                                    className="w-full resize-none rounded-md border border-[#2a2a2e] bg-[#0d0d10] px-3 py-2 text-sm text-foreground outline-none transition focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/40 placeholder:text-muted-foreground"
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
                </div>

                <DialogFooter className="gap-2">
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-[#2a2a2e] px-4 py-2 text-sm font-medium transition-colors hover:bg-[#1e1e22]"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#e6c24e]"
                    >
                        Save Changes
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
