import { NextRequest, NextResponse } from 'next/server'
import { aiChat } from '@/lib/ai'
import config from '@/vertical.config'
import { isAiTool } from '@/vertical.config'

export interface Question {
  question:    string
  options:     { A: string; B: string; C: string; D: string }
  answer:      'A' | 'B' | 'C' | 'D'
  explanation: string
  difficulty:  'easy' | 'medium' | 'hard'
  forPlayer?:  string   // player name this question was generated for
}

// Age → difficulty mapping
function ageToDifficulty(age: number): 'easy' | 'medium' | 'hard' {
  if (age <= 12) return 'easy'
  if (age <= 17) return 'medium'
  return 'hard'
}

// How many questions per difficulty level
function difficultyToCount(difficulty: 'easy' | 'medium' | 'hard'): number {
  if (difficulty === 'easy')   return 8   // shorter — kids lose focus
  if (difficulty === 'medium') return 10  // standard
  return 12                               // adults get the full challenge
}

// Shared fallback questions (one set, used if AI fails)
const FALLBACK_QUESTIONS: Question[] = [
  {
    question:    'What is the largest planet in our solar system?',
    options:     { A: 'Earth', B: 'Saturn', C: 'Jupiter', D: 'Neptune' },
    answer:      'C',
    explanation: 'Jupiter is the largest planet — over 1,300 Earths could fit inside it!',
    difficulty:  'easy',
  },
  {
    question:    'Which country has the most natural lakes?',
    options:     { A: 'Russia', B: 'USA', C: 'Brazil', D: 'Canada' },
    answer:      'D',
    explanation: 'Canada has over 60% of the world\'s freshwater lakes.',
    difficulty:  'medium',
  },
  {
    question:    'In which year did the Berlin Wall fall?',
    options:     { A: '1987', B: '1989', C: '1991', D: '1993' },
    answer:      'B',
    explanation: 'The Berlin Wall fell on 9th November 1989.',
    difficulty:  'hard',
  },
  {
    question:    'What colour is a polar bear\'s skin underneath its fur?',
    options:     { A: 'White', B: 'Pink', C: 'Black', D: 'Grey' },
    answer:      'C',
    explanation: 'Polar bears have black skin to absorb heat from the sun.',
    difficulty:  'easy',
  },
  {
    question:    'How many strings does a standard guitar have?',
    options:     { A: '4', B: '5', C: '6', D: '8' },
    answer:      'C',
    explanation: 'A standard guitar has 6 strings, tuned E-A-D-G-B-E.',
    difficulty:  'easy',
  },
  {
    question:    'Which element has the chemical symbol "Au"?',
    options:     { A: 'Silver', B: 'Gold', C: 'Aluminium', D: 'Argon' },
    answer:      'B',
    explanation: 'Au comes from the Latin word "aurum", meaning gold.',
    difficulty:  'medium',
  },
  {
    question:    'What is the capital city of Australia?',
    options:     { A: 'Sydney', B: 'Melbourne', C: 'Brisbane', D: 'Canberra' },
    answer:      'D',
    explanation: 'Canberra is the capital — chosen as a compromise between Sydney and Melbourne.',
    difficulty:  'easy',
  },
  {
    question:    'How many sides does a hexagon have?',
    options:     { A: '5', B: '6', C: '7', D: '8' },
    answer:      'B',
    explanation: '"Hex" means six in Greek — hexagons appear in honeycombs.',
    difficulty:  'easy',
  },
  {
    question:    'Which ocean is the largest?',
    options:     { A: 'Atlantic', B: 'Indian', C: 'Arctic', D: 'Pacific' },
    answer:      'D',
    explanation: 'The Pacific Ocean covers more than 30% of Earth\'s surface.',
    difficulty:  'easy',
  },
  {
    question:    'Who painted the Mona Lisa?',
    options:     { A: 'Michelangelo', B: 'Raphael', C: 'Leonardo da Vinci', D: 'Caravaggio' },
    answer:      'C',
    explanation: 'Leonardo da Vinci painted the Mona Lisa between 1503–1519.',
    difficulty:  'easy',
  },
]

function extractJSON(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) return fenceMatch[1].trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) return jsonMatch[0]
  return text.trim()
}

// Generate 10 questions tailored to a specific player's age
async function generateForPlayer(
  player: { name: string; age: number },
  topic: string,
  systemPrompt: string,
): Promise<Question[]> {
  const difficulty = ageToDifficulty(player.age)
  const ageLabel   = player.age <= 12 ? 'child' : player.age <= 17 ? 'teenager' : 'adult'

  const difficultyGuide =
    difficulty === 'easy'
      ? `EASY — for ${player.name}, age ${player.age} (child):
GOAL: Make them laugh and say "wow!" — not feel like school.
- Short fun questions, conversational tone, emoji in the question ✅
- Great themes for this age: animals 🐾, Minecraft/Roblox/gaming 🎮, food 🍕, superheroes, Pokémon, nature surprises
- Questions like: "Which animal sleeps standing up? 🐴" or "What colour is a flamingo? 🦩"
- Wrong answers: make 1-2 of them obviously silly/funny (e.g. "a flying pizza")
- Avoid: dates, capitals, science vocab, anything that sounds like homework
- Explanation: start with "Did you know? 🤩" — one surprising fun fact in simple words`
      : difficulty === 'medium'
      ? `MEDIUM — for ${player.name}, age ${player.age} (teenager):
GOAL: Cool, current, slightly challenging — nothing cringe or outdated.
- Reference 2024/2025 culture: AI tools, viral moments, streaming shows, esports, TikTok trends (tasteful), space news
- Sports: Premier League, NBA, Olympics 2024, F1
- Tech: ChatGPT, iPhones, gaming (Fortnite, Minecraft, FIFA), YouTube
- Science: cool recent discoveries, space, climate, biology facts that surprise
- Questions should feel like something a smart friend would ask, not a teacher
- Wrong answers: plausible but clearly wrong on reflection
- Explanation: one cool "here's why" sentence — casual tone`
      : `HARD — for ${player.name}, age ${player.age} (adult):
GOAL: Genuinely challenging — not just obscure, but satisfyingly hard.
- Mix depth with breadth: history, world geography, science, economics, literature, current affairs 2024/2025
- Go beyond surface knowledge — ask about causes, mechanisms, comparisons
- Include some questions about modern AI, geopolitics, climate, tech industry
- Wrong answers must be plausible — no obvious throwaways
- Explanation: concise and informative, adds context they didn't know`

  const count = difficultyToCount(difficulty)

  const userMessage = `Generate exactly ${count} quiz questions on the topic "${topic}" for ${player.name}.

${difficultyGuide}

Return ONLY valid JSON — no markdown, no explanation outside JSON:
{
  "questions": [
    {
      "question": "string",
      "options": { "A": "string", "B": "string", "C": "string", "D": "string" },
      "answer": "A" | "B" | "C" | "D",
      "explanation": "age-appropriate fun fact, 1-2 sentences",
      "difficulty": "${difficulty}"
    }
  ]
}`

  const rawResponse = await aiChat(
    [{ role: 'user', content: userMessage }],
    systemPrompt,
  )

  const jsonStr = extractJSON(rawResponse)
  const parsed  = JSON.parse(jsonStr)

  if (!Array.isArray(parsed?.questions) || parsed.questions.length === 0) {
    throw new Error('Invalid question structure')
  }

  const valid = parsed.questions.filter((q: Partial<Question>) =>
    q.question && q.options?.A && q.options?.B && q.options?.C && q.options?.D && q.answer
  ) as Question[]

  if (valid.length < 3) throw new Error('Too few valid questions')

  return valid.slice(0, count).map(q => ({ ...q, forPlayer: player.name }))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { topic, members } = body as {
      topic:   string
      members: { name: string; age: number }[]
    }

    if (!topic) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 })
    }

    const systemPrompt = isAiTool(config) ? config.aiSystemPrompt : ''
    const players      = members?.length ? members : [{ name: 'Player', age: 18 }]

    // Generate per-player questions in parallel
    const results = await Promise.allSettled(
      players.map(p => generateForPlayer(p, topic, systemPrompt))
    )

    // Build per-player question map; fall back to shared fallback on failure
    const playerQuestions: Record<string, Question[]> = {}
    results.forEach((r, i) => {
      const name = players[i].name
      if (r.status === 'fulfilled') {
        playerQuestions[name] = r.value
      } else {
        console.error(`[kwizzo] AI failed for ${name}:`, r.reason)
        // Tag fallback questions with player name
        playerQuestions[name] = FALLBACK_QUESTIONS.map(q => ({ ...q, forPlayer: name }))
      }
    })

    // Also return a flat shared list (the first player's questions) for backwards compat
    const firstPlayerName = players[0].name
    const questions       = playerQuestions[firstPlayerName] ?? FALLBACK_QUESTIONS

    return NextResponse.json({ questions, playerQuestions })

  } catch (err) {
    console.error('[kwizzo] /api/quiz/generate error:', err)
    return NextResponse.json(
      { questions: FALLBACK_QUESTIONS, playerQuestions: {} },
      { status: 200 },
    )
  }
}
