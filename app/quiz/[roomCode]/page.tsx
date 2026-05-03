'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { ArrowRight, Trophy, RotateCcw, Home, CheckCircle, XCircle } from 'lucide-react'
import { theme, btn } from '@/lib/theme'
import { Suspense } from 'react'
import type { Question } from '@/app/api/quiz/generate/route'

type Member = { name: string; age: string }
type GameState = 'loading' | 'choosing' | 'playing' | 'answered' | 'finished'
type PlayerScore = { name: string; age: string; score: number; answers: boolean[] }

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const
type OptionKey = typeof OPTION_LABELS[number]

function QuizContent() {
  const params       = useParams()
  const searchParams = useSearchParams()
  const router       = useRouter()

  const roomCode       = params.roomCode as string
  const subjectFromUrl = searchParams.get('subject') ?? ''

  const [gameState,       setGameState]       = useState<GameState>('loading')
  // Per-player question banks: { playerName: Question[] }
  const [playerQuestions, setPlayerQuestions] = useState<Record<string, Question[]>>({})
  // Shared fallback questions (single-player or fallback)
  const [questions,       setQuestions]       = useState<Question[]>([])
  const [currentQ,        setCurrentQ]        = useState(0)
  const [selected,        setSelected]        = useState<OptionKey | null>(null)
  const [scores,          setScores]          = useState<PlayerScore[]>([])
  const [familyName,      setFamilyName]      = useState('Your Family')
  const [topic,           setTopic]           = useState(subjectFromUrl)
  const [loadError,       setLoadError]       = useState('')
  // Which player is currently answering (round-robin)
  const [activePlayerIdx, setActivePlayerIdx] = useState(0)
  const [members,         setMembers]         = useState<Member[]>([])

  const topRef = useRef<HTMLDivElement>(null)

  // Scroll to top whenever a new question loads or a new player starts
  useEffect(() => {
    if (gameState === 'playing') {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [currentQ, activePlayerIdx, gameState])

  const loadQuestions = useCallback(async (ms: Member[], topicId: string) => {
    setGameState('loading')
    setLoadError('')
    try {
      const res = await fetch('/api/quiz/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          topic:   topicId,
          members: ms.map(m => ({ name: m.name, age: Number(m.age) })),
        }),
      })
      const data = await res.json()
      if (data?.questions?.length) {
        setQuestions(data.questions)
        // Store per-player banks if available
        if (data.playerQuestions && Object.keys(data.playerQuestions).length > 0) {
          setPlayerQuestions(data.playerQuestions)
        }
        setGameState(ms.length > 1 ? 'choosing' : 'playing')
      } else {
        setLoadError('Could not load questions. Please try again.')
      }
    } catch {
      setLoadError('Network error. Please check your connection and try again.')
    }
  }, [])

  useEffect(() => {
    try {
      const roomData = localStorage.getItem(`kwizzo_room_${roomCode}`)
      if (roomData) {
        const data       = JSON.parse(roomData)
        const ms: Member[] = data.members ?? []
        const topicId    = data.subject ?? subjectFromUrl

        setFamilyName(data.familyName ?? 'Your Family')
        setTopic(topicId)
        setMembers(ms)
        setScores(ms.map(m => ({ name: m.name, age: m.age, score: 0, answers: [] })))
        loadQuestions(ms, topicId)
      } else {
        const family     = localStorage.getItem('kwizzo_family')
        const ms: Member[] = family ? (JSON.parse(family).members ?? []) : [{ name: 'Player', age: '18' }]
        const topicId    = subjectFromUrl || 'general'

        setTopic(topicId)
        setMembers(ms)
        setScores(ms.map(m => ({ name: m.name, age: m.age, score: 0, answers: [] })))
        loadQuestions(ms, topicId)
      }
    } catch {
      const ms = [{ name: 'Player', age: '18' }]
      setTopic(subjectFromUrl || 'general')
      setMembers(ms)
      setScores(ms.map(m => ({ name: m.name, age: m.age, score: 0, answers: [] })))
      loadQuestions(ms, subjectFromUrl || 'general')
    }
  }, [roomCode, subjectFromUrl, loadQuestions])

  // Get the question for the current active player
  function getCurrentQuestion(): Question | null {
    if (members.length === 0) return questions[currentQ] ?? null
    const activeName  = members[activePlayerIdx]?.name
    const playerBank  = playerQuestions[activeName]
    // Use per-player question bank if available, else shared
    const bank = playerBank?.length ? playerBank : questions
    return bank[currentQ] ?? null
  }

  function handleAnswer(opt: OptionKey) {
    if (gameState !== 'playing') return
    const q = getCurrentQuestion()
    if (!q) return
    setSelected(opt)
    setGameState('answered')

    const correct   = opt === q.answer
    const activeName = members[activePlayerIdx]?.name ?? scores[0]?.name
    setScores(prev => prev.map(s =>
      s.name === activeName
        ? { ...s, score: s.score + (correct ? 1 : 0), answers: [...s.answers, correct] }
        : s
    ))
  }

  function handleNext() {
    const totalQs = (() => {
      if (members.length === 0) return questions.length
      const activeName = members[activePlayerIdx]?.name
      const bank = playerQuestions[activeName]?.length ? playerQuestions[activeName] : questions
      return bank.length
    })()

    const nextQ = currentQ + 1

    if (nextQ >= totalQs) {
      // This player is done — move to next player or finish
      const nextPlayerIdx = activePlayerIdx + 1
      if (nextPlayerIdx < members.length) {
        // Next player's turn
        setActivePlayerIdx(nextPlayerIdx)
        setCurrentQ(0)
        setSelected(null)
        setGameState('choosing')
      } else {
        setGameState('finished')
      }
    } else {
      setCurrentQ(nextQ)
      setSelected(null)
      setGameState('playing')
    }
  }

  function handlePlayAgain() {
    setCurrentQ(0)
    setSelected(null)
    setActivePlayerIdx(0)
    setScores(prev => prev.map(s => ({ ...s, score: 0, answers: [] })))
    setQuestions([])
    setPlayerQuestions({})
    try {
      const roomData = localStorage.getItem(`kwizzo_room_${roomCode}`)
      if (roomData) {
        const data = JSON.parse(roomData)
        loadQuestions(data.members ?? [], data.subject ?? topic)
      } else {
        loadQuestions(members.length ? members : [{ name: 'Player', age: '18' }], topic)
      }
    } catch {
      loadQuestions([{ name: 'Player', age: '18' }], topic)
    }
  }

  const q         = getCurrentQuestion()
  const activeName = members[activePlayerIdx]?.name ?? scores[0]?.name ?? ''
  const activeAge  = members[activePlayerIdx]?.age ?? '?'
  // Guard: if name is purely numeric (e.g. user typed age in name field), show 'Player'
  const displayName = (name: string) => /^\d+$/.test(name.trim()) ? 'Player' : (name || 'Player')
  const totalQsForPlayer = (() => {
    const bank = playerQuestions[activeName]?.length ? playerQuestions[activeName] : questions
    return bank.length
  })()
  const progress  = totalQsForPlayer > 0
    ? ((currentQ + (gameState === 'answered' ? 1 : 0)) / totalQsForPlayer) * 100
    : 0
  const sortedScores = [...scores].sort((a, b) => b.score - a.score)

  const topicLabel = topic.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  // ── Loading ───────────────────────────────────────────────
  if (gameState === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <div className="text-5xl mb-5 float">🤖</div>
        <h2 className="text-xl font-bold text-white mb-2">Cooking up your quiz…</h2>
        <p className="text-white/40 text-sm mb-1 capitalize">Topic: <span className="text-white/60">{topicLabel}</span></p>
        <p className="text-white/30 text-xs mb-8">Personalising for each player's age — takes a few seconds</p>
        {loadError ? (
          <div className="space-y-3">
            <p className="text-red-400 text-sm px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">{loadError}</p>
            <button onClick={() => router.push('/play')} className={btn.secondary}>← Back</button>
          </div>
        ) : (
          <div className="flex gap-2 justify-center">
            <div className={`w-2 h-2 rounded-full ${theme.solid} animate-bounce`} style={{ animationDelay: '0ms' }} />
            <div className={`w-2 h-2 rounded-full ${theme.solid} animate-bounce`} style={{ animationDelay: '150ms' }} />
            <div className={`w-2 h-2 rounded-full ${theme.solid} animate-bounce`} style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
    )
  }

  // ── Player handoff screen ─────────────────────────────────
  if (gameState === 'choosing') {
    const prevPlayerIdx = activePlayerIdx - 1
    const prevPlayer    = prevPlayerIdx >= 0 ? members[prevPlayerIdx] : null
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        {prevPlayer && (
          <div className="mb-8 text-white/50 text-sm">
            ✅ {prevPlayer.name} finished their round
          </div>
        )}
        <div className="text-6xl mb-6">🎮</div>
        <h2 className="text-3xl font-extrabold text-white mb-2">
          Your turn, <span className={theme.gradientText}>{displayName(activeName)}</span>!
        </h2>
        <p className="text-white/50 mb-2">Age {activeAge} · {totalQsForPlayer} questions ready for you</p>
        <p className="text-white/30 text-sm mb-10 capitalize">Topic: {topic.replace(/-/g, ' ')}</p>
        <button
          onClick={() => setGameState('playing')}
          className={btn.primary + ' text-lg px-12 py-4'}
        >
          I'm ready <ArrowRight size={20} />
        </button>
        {/* Show other players' scores so far */}
        {scores.some(s => s.answers.length > 0) && (
          <div className="mt-10 w-full max-w-sm">
            <div className="text-xs text-white/30 mb-3 uppercase tracking-widest">Scores so far</div>
            <div className="flex flex-wrap gap-2 justify-center">
              {sortedScores.filter(s => s.answers.length > 0).map(s => (
                <div key={s.name} className={`${theme.card} px-3 py-2 rounded-xl flex items-center gap-2`}>
                  <span className="text-white/70 text-xs font-medium">{s.name}</span>
                  <span className={`${theme.textAccent} font-bold text-sm`}>{s.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Finished ──────────────────────────────────────────────
  if (gameState === 'finished') {
    const medals = ['🥇', '🥈', '🥉']
    return (
      <div className="min-h-screen px-4 py-12 max-w-xl mx-auto">
        <div className="text-center mb-10 fade-up">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="text-3xl font-extrabold text-white mb-2">{familyName}</h1>
          <p className={`${theme.textAccent} font-semibold`}>Quiz Complete!</p>
          <p className="text-white/30 text-sm mt-1">Everyone played their own age-adapted round</p>
        </div>

        <div className={`${theme.card} p-6 mb-6 fade-up`}>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Trophy size={20} className={theme.textAccent} /> Final Leaderboard
          </h2>
          <div className="space-y-3">
            {sortedScores.map((s, i) => {
              const playerBank = playerQuestions[s.name]?.length ? playerQuestions[s.name] : questions
              const total      = playerBank.length || 10
              return (
                <div
                  key={s.name}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    i === 0 ? `bg-gradient-to-r ${theme.gradient} bg-opacity-20` : 'glass'
                  }`}
                >
                  <span className="text-2xl w-8 flex-shrink-0">{medals[i] ?? `${i + 1}`}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-white">{s.name}</div>
                    <div className="text-white/40 text-xs">Age {s.age} · {i === 0 ? 'Leaderboard leader 🎉' : `${Math.round((s.score / total) * 100)}% correct`}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-extrabold ${i === 0 ? 'text-white' : theme.textAccent}`}>
                      {s.score}/{total}
                    </div>
                    <div className="text-white/40 text-xs">
                      {Math.round((s.score / total) * 100)}%
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 fade-up">
          <button onClick={handlePlayAgain} className={btn.primary + ' flex-1 justify-center py-4'}>
            <RotateCcw size={18} /> Play Again
          </button>
          <button onClick={() => router.push('/play')} className={btn.secondary + ' flex-1 justify-center py-4'}>
            <Home size={18} /> New Game
          </button>
        </div>
      </div>
    )
  }

  if (!q) return null

  const options   = Object.entries(q.options) as [OptionKey, string][]
  const isCorrect = selected === q.answer

  // ── Playing / Answered ────────────────────────────────────
  return (
    <div ref={topRef} className="min-h-screen px-3 sm:px-4 py-5 sm:py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-3">
        {/* Left: logo + player info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-2xl shrink-0">🧠</span>
          <div className="min-w-0">
            <div className="text-white font-bold text-sm leading-tight truncate">{displayName(activeName)}</div>
            <div className="text-white/35 text-xs truncate">Age {activeAge} · <span className="capitalize">{topicLabel}</span></div>
          </div>
        </div>
        {/* Right: Q number */}
        <div className="shrink-0 text-right">
          <div className={`text-base font-extrabold ${theme.textAccentBold} tabular-nums leading-tight`}>
            {currentQ + 1}<span className="text-white/30 font-normal text-sm">/{totalQsForPlayer}</span>
          </div>
          <div className="text-white/25 text-[10px] uppercase tracking-widest">Question</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-white/20 rounded-full mb-5 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${theme.gradient} transition-all duration-500`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Difficulty badge */}
      <div className="flex items-center gap-2 mb-4">
        {q.difficulty && (
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
            q.difficulty === 'easy'   ? 'bg-green-500/20 text-green-400' :
            q.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                                        'bg-red-500/20 text-red-400'
          }`}>
            {q.difficulty}
          </span>
        )}
        <span className={`${theme.badge} px-2.5 py-1 rounded-full text-xs`}>for {displayName(activeName)}</span>
        <span className="text-white/25 text-xs">{totalQsForPlayer} questions</span>
      </div>

      {/* Question */}
      <div className={`${theme.card} p-5 md:p-8 mb-5`}>
        <div className={`text-xs font-bold ${theme.textAccent} uppercase tracking-widest mb-3`}>
          Question {currentQ + 1}
        </div>
        <p className="text-xl md:text-3xl font-bold text-white leading-tight">
          {q.question}
        </p>
      </div>

      {/* Answer buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
        {options.map(([key, val]) => {
          let cardClass = `${theme.card} ${theme.cardHover} p-3.5 sm:p-4 rounded-2xl text-left w-full transition-all duration-200 flex items-start gap-3 cursor-pointer`

          if (gameState === 'answered') {
            if (key === q.answer) {
              cardClass = 'bg-green-500/20 border border-green-500/40 p-3.5 sm:p-4 rounded-2xl text-left w-full flex items-start gap-3'
            } else if (key === selected) {
              cardClass = 'bg-red-500/20 border border-red-500/40 p-3.5 sm:p-4 rounded-2xl text-left w-full flex items-start gap-3 opacity-80'
            } else {
              cardClass = 'glass p-3.5 sm:p-4 rounded-2xl text-left w-full flex items-start gap-3 opacity-40'
            }
          }

          return (
            <button
              key={key}
              onClick={() => handleAnswer(key)}
              disabled={gameState === 'answered'}
              className={cardClass}
            >
              <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                gameState === 'playing'
                  ? `bg-gradient-to-br ${theme.gradient} text-white`
                  : key === q.answer
                  ? 'bg-green-500 text-white'
                  : key === selected
                  ? 'bg-red-500 text-white'
                  : 'bg-white/10 text-white/50'
              }`}>
                {key}
              </span>
              <span className={`text-sm md:text-base leading-snug font-medium pt-1 ${
                gameState === 'answered' && key !== q.answer && key !== selected
                  ? 'text-white/40'
                  : 'text-white'
              }`}>
                {val}
              </span>
            </button>
          )
        })}
      </div>

      {/* Result + explanation */}
      {gameState === 'answered' && (
        <div className={`${theme.card} p-5 mb-6 border ${isCorrect ? 'border-green-500/30' : 'border-red-500/30'}`}>
          <div className={`flex items-center gap-2 font-bold mb-2 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
            {isCorrect
              ? <><CheckCircle size={18} /> Correct! Well done, {displayName(activeName)}!</>
              : <><XCircle size={18} /> Not quite — the answer is {q.answer}</>
            }
          </div>
          <p className="text-white/60 text-sm leading-relaxed">{q.explanation}</p>
        </div>
      )}

      {/* Next button */}
      {gameState === 'answered' && (
        <button onClick={handleNext} className={btn.primary + ' w-full justify-center py-4 text-base'}>
          {currentQ + 1 >= totalQsForPlayer ? (
            activePlayerIdx + 1 < members.length
              ? <><ArrowRight size={18} /> Pass to {members[activePlayerIdx + 1]?.name}</>
              : <><Trophy size={18} /> See Leaderboard</>
          ) : (
            <>Next Question <ArrowRight size={18} /></>
          )}
        </button>
      )}

      {/* Score strip */}
      {scores.length > 1 && (
        <div className="mt-8 pt-6 border-t border-white/[0.06]">
          <div className="text-xs text-white/30 mb-3 uppercase tracking-widest">Scores</div>
          <div className="flex flex-wrap gap-2">
            {[...scores].sort((a, b) => b.score - a.score).map(s => (
              <div key={s.name} className={`${theme.card} px-3 py-2 rounded-xl flex items-center gap-2 ${s.name === activeName ? 'ring-1 ring-violet-400' : ''}`}>
                <span className="text-white/70 text-xs font-medium">{s.name}</span>
                <span className={`${theme.textAccent} font-bold text-sm`}>{s.score}</span>
                {s.name === activeName && <span className="text-[10px] text-white/30">playing</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function QuizPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/50">Loading quiz…</div>
      </div>
    }>
      <QuizContent />
    </Suspense>
  )
}
