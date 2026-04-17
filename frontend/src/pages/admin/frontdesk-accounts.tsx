import AdminLayout from '@/components/layout/admin-layout';
import { api } from '@/services/api';
import { type BreadcrumbItem } from '@/types';
import { Eye, EyeOff, LoaderCircle, Plus, Trash2, Users, X } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin Dashboard', href: '/admin' },
    { title: 'Front Desk Accounts', href: '/admin/frontdesk-accounts' },
];

interface FrontDeskAccount {
    id: number;
    name: string;
    email: string;
    created_at: string;
}

export default function FrontDeskAccounts() {
    const [accounts, setAccounts] = useState<FrontDeskAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [deleting, setDeleting] = useState<number | null>(null);

    const fetchAccounts = useCallback(async () => {
        try {
            const data = await api.get<FrontDeskAccount[]>('/v1/admin/frontdesk-accounts');
            setAccounts(data);
        } catch {
            // silently fail
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this front desk account?')) return;
        setDeleting(id);
        try {
            await api.delete(`/v1/admin/frontdesk-accounts/${id}`);
            setAccounts((prev) => prev.filter((a) => a.id !== id));
        } catch {
            alert('Failed to delete account.');
        } finally {
            setDeleting(null);
        }
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full min-h-0 flex-1 flex-col gap-6 overflow-hidden p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">Create and manage front desk staff accounts.</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#e6c24e]"
                    >
                        <Plus className="h-4 w-4" />
                        Add Account
                    </button>
                </div>

                {/* Accounts Table */}
                <div className="min-h-0 flex-1">
                    <div className="profile-card max-h-full overflow-hidden rounded-xl">
                        {loading ? (
                            <div className="flex items-center justify-center p-12">
                                <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : accounts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-3 p-12 text-muted-foreground">
                                <Users className="h-10 w-10" />
                                <p>No front desk accounts yet.</p>
                            </div>
                        ) : (
                            <div className="max-h-full overflow-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b text-left text-sm text-muted-foreground">
                                            <th className="px-4 py-3 font-medium">Name</th>
                                            <th className="px-4 py-3 font-medium">Email</th>
                                            <th className="px-4 py-3 font-medium">Created</th>
                                            <th className="px-4 py-3 font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {accounts.map((account) => (
                                            <tr key={account.id} className="border-b last:border-0 hover:bg-muted/50">
                                                <td className="px-4 py-3 font-medium">{account.name}</td>
                                                <td className="px-4 py-3 text-sm text-muted-foreground">{account.email}</td>
                                                <td className="px-4 py-3 text-sm text-muted-foreground">
                                                    {new Date(account.created_at).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                    })}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => handleDelete(account.id)}
                                                        disabled={deleting === account.id}
                                                        className="inline-flex items-center gap-1 rounded-lg py-1.5 pr-3 pl-0 text-sm text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                                                    >
                                                        {deleting === account.id ? (
                                                            <LoaderCircle className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <CreateAccountModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={(account) => {
                        setAccounts((prev) => [account, ...prev]);
                        setShowCreateModal(false);
                    }}
                />
            )}
        </AdminLayout>
    );
}

function CreateAccountModal({ onClose, onCreated }: { onClose: () => void; onCreated: (account: FrontDeskAccount) => void }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setError('');

        try {
            const account = await api.post<FrontDeskAccount>('/v1/admin/frontdesk-accounts', {
                name,
                email,
                password,
                password_confirmation: passwordConfirmation,
            });
            onCreated(account);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create account.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div className="profile-card w-full max-w-md rounded-xl p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Create Front Desk Account</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {error && <div className="mt-4 rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>}

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Full Name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            placeholder="Enter full name"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            placeholder="email@example.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                placeholder="Enter password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Confirm Password</label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={passwordConfirmation}
                            onChange={(e) => setPasswordConfirmation(e.target.value)}
                            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            placeholder="Confirm password"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex-1 rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#e6c24e] disabled:opacity-50"
                        >
                            {processing ? <LoaderCircle className="mx-auto h-4 w-4 animate-spin" /> : 'Create Account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
