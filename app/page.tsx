import Link from 'next/link'
import { ArrowRight, Sparkles, Zap, Trophy, Users } from 'lucide-react'
import config from '@/vertical.config'
import { theme, btn } from '@/lib/theme'
import { isAiTool } from '@/vertical.config'

const FEATURES = [
  { icon: <Sparkles size={18} />, title: 'Fresh every time', desc: 'AI generates new questions each game — never the same quiz twice.' },
  { icon: <Users size={18} />,    title: 'Any age, together', desc: 'Kids get easy, adults get hard — everyone plays the same round.' },
  { icon: <Zap size={18} />,      title: 'Ready in 30 seconds', desc: 'No accounts, no downloads. Pick a topic and go.' },
  { icon: <Trophy size={18} />,   title: 'Live leaderboard', desc: 'Scores update after every question — watch the rankings shift.' },
]

export default function HomePage() {
  const subjects = isAiTool(config) ? config.subjects : []

  return (
    <div className="overflow-hidden">

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 pt-10 sm:pt-16 pb-12 sm:pb-20 max-w-4xl mx-auto text-center">
        {/* Soft glow blob */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-15 blur-3xl -z-10 bg-gradient-to-br ${theme.gradient}`} />

        <div className="fade-up">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${theme.badge} text-xs font-medium mb-7`}>
            <Sparkles size={11} /> AI-powered · Free to play
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold leading-tight tracking-tight mb-4">
            <span className="text-white">Quiz anyone,</span><br />
            <span className={theme.gradientText}>any age.</span>
          </h1>

          <p className="text-white/50 text-base sm:text-lg mb-6 sm:mb-8 max-w-xl mx-auto leading-relaxed">
            Pick a topic, add your players. AI creates age-perfect questions for each person — play solo, with family, or with friends online.
          </p>

          {/* Two CTAs: solo play + create room */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Link href="/play?mode=solo" className={btn.primary + ' text-base px-8 py-3.5'}>
              Play Solo <ArrowRight size={16} />
            </Link>
            <Link href="/play?mode=create" className={btn.secondary + ' text-base px-8 py-3.5'}>
              <Users size={16} /> Play with Others
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-4 justify-center text-xs text-white/35">
            <span>✓ No sign-up</span>
            <span>✓ Any device</span>
            <span>✓ 100% free</span>
            <span>✓ Fresh AI questions</span>
          </div>
        </div>
      </section>

      {/* ── TOPIC GRID ────────────────────────────────────── */}
      <section id="subjects" className="py-10 sm:py-14 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Choose a topic</h2>
          <p className="text-white/40 text-sm">AI generates fresh questions every game</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {subjects.map(subject => (
            <Link
              key={subject.id}
              href={`/play?mode=solo&subject=${subject.id}`}
              className={`${theme.card} ${theme.cardHover} ${theme.glowHover} p-4 flex flex-col gap-1.5 group text-center items-center rounded-2xl transition-all`}
            >
              <span className="text-3xl mb-1">{subject.icon}</span>
              <span className="font-semibold text-white text-sm">{subject.label}</span>
              <span className="text-white/35 text-xs leading-snug hidden sm:block">{subject.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────── */}
      <section id="how-it-works" className="py-10 sm:py-14 px-4 sm:px-6 glass border-y border-white/[0.05]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-white mb-2">How it works</h2>
            <p className="text-white/40 text-sm">Up and playing in under a minute</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: '🎯', step: '1', title: 'Pick a topic', desc: 'Choose from 10 categories.' },
              { icon: '👤', step: '2', title: 'Add players', desc: 'Solo or up to 6 — with names & ages.' },
              { icon: '🤖', step: '3', title: 'AI generates', desc: 'Age-perfect questions in seconds.' },
              { icon: '🏆', step: '4', title: 'Play & win', desc: 'Answer, score, see the leaderboard.' },
            ].map(step => (
              <div key={step.step} className="text-center">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-xl mx-auto mb-3`}>
                  {step.icon}
                </div>
                <div className={`text-[10px] font-bold ${theme.textAccent} mb-1 uppercase tracking-widest`}>Step {step.step}</div>
                <h3 className="font-bold text-white text-sm mb-1">{step.title}</h3>
                <p className="text-white/45 text-xs leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────── */}
      <section className="py-10 sm:py-14 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className={`${theme.card} p-5 flex flex-col gap-3 rounded-2xl`}>
              <div className={`w-9 h-9 rounded-xl ${theme.solidLight} flex items-center justify-center ${theme.textAccent}`}>
                {f.icon}
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm mb-1">{f.title}</h4>
                <p className="text-white/45 text-xs leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="py-10 sm:py-16 px-4 sm:px-6">
        <div className={`max-w-2xl mx-auto text-center glass rounded-3xl p-6 sm:p-10 border ${theme.border} relative overflow-hidden`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-5 rounded-3xl`} />
          <div className="text-4xl mb-4 relative">🧠</div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3 relative">Ready to play?</h2>
          <p className="text-white/45 mb-7 text-base relative">Free. No download. Works on any phone or tablet.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center relative">
            <Link href="/play?mode=solo" className={btn.primary + ' text-base px-8 py-3.5'}>
              Start Solo <ArrowRight size={16} />
            </Link>
            <Link href="/play?mode=create" className={btn.secondary + ' text-base px-8 py-3.5'}>
              <Users size={16} /> Play with Others
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
