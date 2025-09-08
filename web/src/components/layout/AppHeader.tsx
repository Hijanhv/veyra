'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function AppHeader() {
  const pathname = usePathname()

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-md text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${pathname === href ? 'bg-accent text-accent-foreground' : 'text-foreground/70 hover:text-foreground hover:bg-accent'}`}
      aria-current={pathname === href ? 'page' : undefined}
    >
      {label}
    </Link>
  )

  return (
    <>
      <header className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-background/60 bg-background/80 border-b">
        <div className="site-container h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-foreground text-sm tracking-[0.2em] uppercase font-semibold hover:text-foreground/80 transition-colors">VEYRA</Link>
            <nav className="hidden md:flex items-center gap-1">
              {link('/', 'Home')}
              {link('/vaults', 'Vaults')}
              {link('/catalog', 'Catalog')}
              {link('/analytics', 'Analytics')}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <ConnectButton />
          </div>
        </div>
      </header>
      <div className="bg-blue-50 dark:bg-blue-950/50 border-b border-blue-200 dark:border-blue-800">
        <div className="site-container py-2">
          <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
            🧪 <strong>Hackathon Demo:</strong> Mock ERC20 tokens available with integrated mock Aave, Rings, EEGS, Shadow, Pendle, STS, Beets, SwapX contracts
          </p>
        </div>
      </div>
    </>
  )
}
