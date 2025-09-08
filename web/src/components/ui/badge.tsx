import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
        variant === 'default' && 'bg-accent text-accent-foreground border-transparent',
        variant === 'outline' && 'bg-transparent border-[var(--border)] text-foreground/80',
        className
      )}
      {...props}
    />
  )
}

