'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import VaultSelector from '@/components/vault/VaultSelector'

export default function AppHeader() {
  const pathname = usePathname()
  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-md text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${pathname === href ? 'text-white bg-white/10' : 'text-gray-300 hover:text-white/80 hover:bg-white/5'}`}
      aria-current={pathname === href ? 'page' : undefined}
    >
      {label}
    </Link>
  )

  return (
    <header className="sticky top-0 z-20 bg-black/20 backdrop-blur supports-[backdrop-filter]:bg-black/10">
      <div className="site-container h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-[var(--foreground)] text-sm tracking-[0.2em] uppercase font-semibold hover:text-white/90 transition-colors">VEYRA</Link>
          <nav className="hidden md:flex items-center gap-1">
            {link('/', 'Home')}
            {link('/vaults', 'Vaults')}
            {link('/analytics', 'Analytics')}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <VaultSelector />
          <ConnectButton />
        </div>
      </div>
    </header>
  )
}
