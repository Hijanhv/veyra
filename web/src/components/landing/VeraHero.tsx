'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

export default function VeraHero() {
  return (
    <section className="relative overflow-hidden min-h-[460px] sm:min-h-[560px] lg:min-h-[700px]">
      <div className="site-container py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center h-full">
        <div>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-tight animate-fade-in-up">
            <span className="text-white">VEYRA</span>
            <span className="block text-white/90 mt-2">AI Yield Strategist</span>
          </h1>
          <p className="mt-6 text-lg text-gray-300 max-w-xl animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Autonomous, risk-aware rebalancing across Sonic EVM strategies. Minimal, precise, and fast.
          </p>
          <div className="mt-8 flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <ConnectButton />
            <Button variant="outline" onClick={() => document.getElementById('vaults')?.scrollIntoView({ behavior: 'smooth' })}>
              Explore Vault
            </Button>
          </div>
        </div>
      </div>
      
      {/* Hero image positioned to touch bottom, constrained to site container and clipped glow */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 select-none" aria-hidden>
        <div className="site-container relative">
          <div className="absolute right-0 bottom-0 w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] lg:w-[480px] lg:h-[480px] overflow-hidden">
            <div className="absolute inset-0 blur-2xl bg-[radial-gradient(closest-side,rgba(139,92,246,0.25),transparent_70%)]" />
            <Image
              src="/hero.png"
              alt="Veyra hero"
              width={480}
              height={480}
              sizes="(min-width: 1024px) 480px, (min-width: 640px) 400px, 320px"
              className="relative z-10 w-full h-full object-contain"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  )
}
