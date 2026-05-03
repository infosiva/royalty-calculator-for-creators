'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Trash2, ArrowRight, Users, Zap, Pencil } from 'lucide-react'
import config from '@/vertical.config'
import { isAiTool } from '@/vertical.config'
import { theme, btn } from '@/lib/theme'
import { Suspense } from 'react'

type Member   = { name: string; age: string }
type GameType = 'quiz' | 'draw'
type Mode     = 'solo' | 'group' | 'join'

const SUBJECTS = isAiTool(config) ? config.subjects : []

function PlayContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const modeParam      = searchParams.get('mode') ?? 'solo'
  const defaultSubject = searchParams.get('subject') ?? ''
  const defaultGame    = (searchParams.get('game') as GameType) ?? 'quiz'

  const [gameType, setGameType] = useState<GameType>(defaultGame)
  const [mode,     setMode]     = useState<Mode>(
    modeParam === 'group' ? 'group' : modeParam === 'join' ? 'join' : 'solo'
  )
  const [members,  setMembers]  = useState<Member[]>([{ name: '', age: '' }])
  const [subject,  setSubject]  = useState(defaultSubject)
  const [creating, setCreating] = useState(false)
  const [error,    setError]    = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [joinError,setJoinError]= useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('kwizzo_family')
      if (saved) {
        const data = JSON.parse(saved)
        if (data.members?.length) setMembers(data.members)
      }
    } catch { /* ignore */ }
  }, [])

  function addMember()    { setMembers(prev => [...prev, { name: '', age: '' }]) }
  function removeMember(i: number) { setMembers(prev => prev.filter((_, idx) => idx !== i)) }
  function updateMember(i: number, field: keyof Member, value: string) {
    setMembers(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m))
  }
  function generateCode() { return String(Math.floor(1000 + Math.random() * 9000)) }

  async function handleStart() {
    setError('')
    if (gameType === 'quiz' && !subject) { setError('Pick a topic first.'); return }
    const validMembers = members.filter(m => m.name.trim() && m.age)
    if (validMembers.length < 1) { setError('Add at least one player with a name and age.'); return }
    // Catch accidental number-as-name (e.g. typing age in name field)
    const numericName = validMembers.find(m => /^\d+$/.test(m.name.trim()))
    if (numericName) { setError(`"${numericName.name}" doesn't look like a name — enter a name in the first box, age in the second.`); return }
    if (gameType === 'draw' && validMembers.length < 2) {
      setError('Draw & Guess needs at least 2 players.')
      return
    }

    setCreating(true)
    try {
      const code = generateCode()
      localStorage.setItem('kwizzo_family', JSON.stringify({ members: validMembers }))
      localStorage.setItem(`kwizzo_room_${code}`, JSON.stringify({
        familyName: validMembers.map(m => m.name).join(' & '),
        members: validMembers,
        subject,
        code,
      }))
      if (gameType === 'draw') {
        router.push(`/draw/${code}`)
      } else {
        router.push(`/quiz/${code}?subject=${subject}`)
      }
    } catch {
      setError('Something went wrong. Try again.')
      setCreating(false)
    }
  }

  function handleJoin() {
    setJoinError('')
    const code = roomCode.trim()
    if (!/^\d{4}$/.test(code)) { setJoinError('Enter a valid 4-digit room code.'); return }
    router.push(gameType === 'draw' ? `/draw/${code}` : `/quiz/${code}`)
  }

  const isSetup = mode === 'solo' || mode === 'group'

  return (
    <div className="min-h-screen px-3 sm:px-4 py-8 sm:py-10 max-w-xl mx-auto">

      {/* Header */}
      <div className="text-center mb-7 fade-up">
        <div className="text-4xl mb-2">🧠</div>
        <h1 className="text-2xl font-extrabold text-white mb-1">
          <span className={theme.gradientText}>Kwizzo</span>
        </h1>
        <p className="text-white/40 text-sm">AI games — any topic, any age</p>
      </div>

      {/* Game type selector */}
      <div className="flex gap-2 mb-4">
        {([
          { id: 'quiz', label: 'Quiz',          icon: '🧠', desc: 'Answer AI questions' },
          { id: 'draw', label: 'Draw & Guess',  icon: '🎨', desc: 'Draw it, guess it' },
        ] as const).map(g => (
          <button
            key={g.id}
            onClick={() => setGameType(g.id)}
            className={`flex-1 p-3 rounded-2xl text-left transition-all border ${
              gameType === g.id
                ? `bg-gradient-to-br ${theme.gradient} border-transparent text-white`
                : `${theme.card} ${theme.cardHover} border-white/[0.06]`
            }`}
          >
            <div className="text-xl mb-1">{g.icon}</div>
            <div className="font-bold text-sm">{g.label}</div>
            <div className={`text-xs ${gameType === g.id ? 'text-white/70' : 'text-white/35'}`}>{g.desc}</div>
          </button>
        ))}
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1.5 p-1 rounded-2xl glass mb-5">
        {([
          { id: 'solo',  label: gameType === 'quiz' ? 'Play Solo' : 'Play Together', icon: <Zap size={14} /> },
          { id: 'group', label: 'With Others', icon: <Users size={14} /> },
          { id: 'join',  label: 'Join Room',   icon: '🔑' },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${
              mode === tab.id
                ? `bg-gradient-to-r ${theme.gradient} text-white shadow`
                : 'text-white/45 hover:text-white/70'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Join room */}
      {mode === 'join' && (
        <div className={`${theme.card} p-6 fade-up rounded-2xl`}>
          <h2 className="text-base font-bold text-white mb-1">Join a game</h2>
          <p className="text-white/40 text-xs mb-5">Enter the 4-digit code from the host</p>
          <input
            className="input-dark text-center text-3xl font-bold tracking-widest mb-4"
            placeholder="0000"
            maxLength={4}
            value={roomCode}
            onChange={e => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
          />
          {joinError && <p className="text-red-400 text-xs mb-3">{joinError}</p>}
          <button onClick={handleJoin} className={btn.primary + ' w-full justify-center py-3'}>
            Join Room <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Setup */}
      {isSetup && (
        <div className={`${theme.card} p-5 fade-up rounded-2xl space-y-5`}>

          {/* Topic — quiz only */}
          {gameType === 'quiz' && (
            <div>
              <label className="block text-white/50 text-xs font-semibold mb-3 uppercase tracking-wider">Topic</label>
              <div className="grid grid-cols-2 gap-2">
                {SUBJECTS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSubject(s.id)}
                    className={`p-3 rounded-xl text-left flex items-center gap-2 text-sm transition-all ${
                      subject === s.id
                        ? `bg-gradient-to-r ${theme.gradient} text-white font-semibold shadow`
                        : `${theme.card} ${theme.cardHover} text-white/60`
                    }`}
                  >
                    <span className="text-base">{s.icon}</span>
                    <span className="truncate">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Draw & Guess info */}
          {gameType === 'draw' && (
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🎨</span>
                <span className="font-semibold text-white text-sm">Draw & Guess</span>
              </div>
              <ul className="text-xs text-white/50 space-y-1">
                <li>✦ AI picks a word tailored to each player's age</li>
                <li>✦ Drawer sees the word privately, draws on paper</li>
                <li>✦ Others type their guess — AI checks if it's close</li>
                <li>✦ Hint unlocks after 30s if no one gets it</li>
              </ul>
              {mode === 'solo' && <p className="text-amber-400/70 text-xs mt-2">⚠ Needs at least 2 players to play</p>}
            </div>
          )}

          {/* Players */}
          <div>
            <label className="block text-white/50 text-xs font-semibold mb-1 uppercase tracking-wider">Players</label>
            <p className="text-white/30 text-xs mb-3">
              {gameType === 'draw'
                ? 'Add everyone playing — AI picks age-appropriate words for each'
                : 'Add players — AI adapts quiz difficulty to each person\'s age'}
            </p>
            {/* Column headers */}
            <div className="flex gap-2 mb-1">
              <div className="flex-1 text-[10px] text-white/30 uppercase tracking-wider pl-1">Name</div>
              <div className="w-16 text-[10px] text-white/30 uppercase tracking-wider text-center">Age</div>
              {members.length > 1 && <div className="w-6" />}
            </div>
            <div className="space-y-2.5">
              {members.map((m, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    className="input-dark flex-1 py-2.5 text-sm"
                    placeholder={i === 0 ? 'e.g. Sam' : `Player ${i + 1}`}
                    value={m.name}
                    onChange={e => updateMember(i, 'name', e.target.value)}
                  />
                  <input
                    className="input-dark w-16 py-2.5 text-sm text-center"
                    type="number"
                    placeholder="8"
                    min="3"
                    max="110"
                    value={m.age}
                    onChange={e => updateMember(i, 'age', e.target.value)}
                  />
                  {members.length > 1 && (
                    <button onClick={() => removeMember(i)} className="text-white/25 hover:text-red-400 transition-colors p-1">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-white/20 text-[11px] mt-2">Name + age — AI personalises for each player</p>
            <button
              onClick={addMember}
              className={`mt-3 flex items-center gap-1.5 text-xs ${theme.textAccent} hover:opacity-70 transition-opacity`}
            >
              <Plus size={14} /> Add player
            </button>
          </div>

          {mode === 'group' && (
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 py-3 text-xs text-white/40">
              💡 A room code will be generated — share it so remote players can join
            </div>
          )}

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            onClick={handleStart}
            disabled={creating}
            className={btn.primary + ' w-full justify-center py-3.5 text-base'}
          >
            {creating
              ? 'Setting up…'
              : gameType === 'draw'
              ? <><Pencil size={16} /> Start Drawing!</>
              : <>{mode === 'solo' ? 'Start Quiz' : 'Start Game'} <ArrowRight size={16} /></>
            }
          </button>
        </div>
      )}
    </div>
  )
}

export default function PlayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/40 text-sm">Loading…</div>
      </div>
    }>
      <PlayContent />
    </Suspense>
  )
}
