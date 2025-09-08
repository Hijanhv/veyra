'use client'

import { sonicscanAddressUrl, sonicscanTxUrl } from '@/lib/explorer'
import { cn } from '@/lib/utils'

type Props = {
  address?: string
  tx?: string
  label?: string
  className?: string
}

export default function ExplorerLink({ address, tx, label = 'View on SonicScan', className }: Props) {
  if (!address && !tx) return null
  const href = address ? sonicscanAddressUrl(address) : sonicscanTxUrl(tx!)
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('inline-flex items-center gap-1 text-xs text-foreground/70 hover:text-foreground underline-offset-2 hover:underline', className)}
    >
      {label}
      <span aria-hidden>↗</span>
    </a>
  )
}

