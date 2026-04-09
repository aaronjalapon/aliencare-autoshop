import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

const SHIRT_COLOR: Record<UserRole, string> = {
    customer: '#22c55e', // green
    frontdesk: '#3b82f6', // blue
    admin: '#ef4444', // red
};

interface RoleAvatarProps {
    role: UserRole;
    className?: string;
}

/**
 * Role-based SVG avatar.
 * Green shirt = customer · Blue shirt = frontdesk · Red shirt = admin
 */
export function RoleAvatar({ role, className }: RoleAvatarProps) {
    const shirt = SHIRT_COLOR[role] ?? '#6b7280';

    return (
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className={cn('rounded-full', className)} aria-hidden="true">
            {/* ── background ─────────────────────────────────────────── */}
            <circle cx="50" cy="50" r="50" fill="#1a1a1f" />

            {/* ── shirt / shoulders ──────────────────────────────────── */}
            {/*   Fills from bottom up; top edge is a gentle arc that    */}
            {/*   forms the shoulder line.                                */}
            <path
                d="M -5,105
                   C -5,78 18,64 50,64
                   C 82,64 105,78 105,105
                   Z"
                fill={shirt}
            />

            {/* ── collar highlight (slightly lighter shade) ─────────── */}
            <path
                d="M 42,64 L 50,72 L 58,64
                   C 55,62 50,60 50,60
                   C 50,60 45,62 42,64 Z"
                fill="rgba(255,255,255,0.15)"
            />

            {/* ── neck ───────────────────────────────────────────────── */}
            <rect x="43" y="54" width="14" height="13" rx="4" fill="#d4a574" />

            {/* ── head ───────────────────────────────────────────────── */}
            <circle cx="50" cy="38" r="21" fill="#d4a574" />

            {/* ── hair ────────────────────────────────────────────────  */}
            {/*   Single closed path — top of the head                   */}
            <path
                d="M 29,36
                   C 29,17 71,17 71,36
                   C 71,26 63,18 50,18
                   C 37,18 29,26 29,36
                   Z"
                fill="#2e1f14"
            />

            {/* ── subtle face shadow / definition ────────────────────── */}
            <ellipse cx="50" cy="42" rx="12" ry="8" fill="rgba(0,0,0,0.06)" />
        </svg>
    );
}
