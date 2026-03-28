import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

interface TextLinkProps extends LinkProps {
    className?: string;
    children?: ReactNode;
}

export default function TextLink({ className = '', children, ...props }: TextLinkProps) {
    return (
        <Link
            className={cn(
                'text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500',
                className,
            )}
            {...props}
        >
            {children}
        </Link>
    );
}
