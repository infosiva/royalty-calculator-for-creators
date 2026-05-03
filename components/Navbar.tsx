'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import config from '@/vertical.config'
import { btn, theme } from '@/lib/theme'

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 glass-strong border-b border-white/[0.06]">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-xl">🧠</span>
          <span className={`${theme.gradientText} font-extrabold tracking-tight`}>{config.name}</span>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm text-white/55">
          <Link href="/#how-it-works" className="hover:text-white transition-colors">How it works</Link>
          <Link href="/#subjects"     className="hover:text-white transition-colors">Topics</Link>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Link href="/play?mode=solo"   className={btn.secondary + ' text-sm py-2 px-4'}>Play Solo</Link>
          <Link href="/play?mode=create" className={btn.primary   + ' text-sm py-2 px-4'}>Multiplayer</Link>
        </div>

        <button className="md:hidden p-2 text-white/60 hover:text-white" onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/[0.06] px-6 py-4 flex flex-col gap-3 text-sm">
          <Link href="/#how-it-works"   className="text-white/70 hover:text-white" onClick={() => setOpen(false)}>How it works</Link>
          <Link href="/#subjects"       className="text-white/70 hover:text-white" onClick={() => setOpen(false)}>Topics</Link>
          <Link href="/play?mode=solo"  className={btn.secondary}                  onClick={() => setOpen(false)}>Play Solo</Link>
          <Link href="/play?mode=create" className={btn.primary}                   onClick={() => setOpen(false)}>Multiplayer</Link>
        </div>
      )}
    </nav>
  )
}
