/**
 * lib/ai.ts — Universal AI fallback chain
 *
 * Priority order (free first, paid last resort):
 *   1. Groq      — llama-3.3-70b-versatile  (free, very fast, high quality)
 *   2. Groq      — gemma2-9b-it              (free lighter fallback within Groq)
 *   3. Gemini    — gemini-2.0-flash          (free, latest stable Google)
 *   4. Gemini    — gemini-2.5-flash-preview  (free preview, most capable Google)
 *   5. Cerebras  — llama3.1-70b              (free, very fast inference)
 *   6. Anthropic — claude-haiku-4-5          (paid, absolute last resort)
 *
 * Models are picked at runtime — upgrading = change one string here.
 * Errors from each provider are logged so you know which are failing.
 *
 * Lesson learned from NinjaPA (2026-05): always have ≥3 free providers
 * so a single exhausted credit balance never takes the product down.
 */
import Groq from 'groq-sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import config from '@/vertical.config'

// ── Model roster ─────────────────────────────────────────────────────────────
// Change these strings to upgrade without touching caller code
const GROQ_PRIMARY    = 'llama-3.3-70b-versatile'        // best free Groq model
const GROQ_FALLBACK   = 'gemma2-9b-it'                   // lighter Groq fallback
const GEMINI_PRIMARY  = 'gemini-2.0-flash'               // latest stable free Gemini
const GEMINI_HEAVY    = 'gemini-2.5-flash-preview-05-20' // most capable free preview
const CEREBRAS_MODEL  = 'llama3.1-70b'                   // free, very fast
const CLAUDE_FALLBACK = 'claude-haiku-4-5-20251001'      // cheapest Claude (paid)

// ── Lazy clients — instantiated at request time, not build time ──────────────
function groq()      { return new Groq({ apiKey: process.env.GROQ_API_KEY! }) }
function gemini()    { return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!) }
function cerebras()  {
  return new OpenAI({
    apiKey: process.env.CEREBRAS_API_KEY!,
    baseURL: 'https://api.cerebras.ai/v1',
  })
}
function anthropic() { return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! }) }

type Msg = { role: 'user' | 'assistant'; content: string }

// Race a promise against a timeout — rejects with 'timeout' if too slow
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ])
}

export async function aiChat(messages: Msg[], systemPrompt?: string): Promise<string> {
  const system    = systemPrompt ?? config.aiSystemPrompt
  const groqMsgs  = [{ role: 'system' as const, content: system }, ...messages]
  const TIMEOUT   = 12000  // 12s per provider — switch fast on hang

  // ── 1. Groq llama-3.3-70b (free, fast, high quality) ────────────────────
  if (process.env.GROQ_API_KEY) {
    try {
      const res = await withTimeout(
        groq().chat.completions.create({
          model:       GROQ_PRIMARY,
          messages:    groqMsgs,
          max_tokens:  3000,
          temperature: 0.7,
        }),
        TIMEOUT, 'Groq primary'
      )
      const text = res.choices[0]?.message?.content
      if (text) return text
    } catch (e: any) {
      console.warn('[AI] Groq primary failed:', e?.message ?? e)
    }

    // ── 2. Groq gemma2-9b (free, lighter fallback) ──────────────────────
    try {
      const res = await withTimeout(
        groq().chat.completions.create({
          model:      GROQ_FALLBACK,
          messages:   groqMsgs,
          max_tokens: 3000,
        }),
        TIMEOUT, 'Groq fallback'
      )
      const text = res.choices[0]?.message?.content
      if (text) return text
    } catch (e: any) {
      console.warn('[AI] Groq fallback failed:', e?.message ?? e)
    }
  }

  // ── 3. Gemini 2.0 Flash (free tier, very fast) ──────────────────────────
  if (process.env.GEMINI_API_KEY) {
    try {
      const model   = gemini().getGenerativeModel({ model: GEMINI_PRIMARY, systemInstruction: system })
      const history = messages.slice(0, -1).map(m => ({
        role:  m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }))
      const chat = model.startChat({ history })
      const res  = await withTimeout(
        chat.sendMessage(messages.at(-1)!.content),
        TIMEOUT, 'Gemini 2.0'
      )
      const text = res.response.text()
      if (text) return text
    } catch (e: any) {
      console.warn('[AI] Gemini 2.0 failed:', e?.message ?? e)
    }

    // ── 4. Gemini 2.5 Flash Preview (free, most capable Google) ──────────
    try {
      const model = gemini().getGenerativeModel({ model: GEMINI_HEAVY, systemInstruction: system })
      const chat  = model.startChat({
        history: messages.slice(0, -1).map(m => ({
          role:  m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        }))
      })
      const res  = await withTimeout(
        chat.sendMessage(messages.at(-1)!.content),
        TIMEOUT, 'Gemini 2.5'
      )
      const text = res.response.text()
      if (text) return text
    } catch (e: any) {
      console.warn('[AI] Gemini 2.5 failed:', e?.message ?? e)
    }
  }

  // ── 5. Cerebras llama3.1-70b (free, very fast inference) ────────────────
  if (process.env.CEREBRAS_API_KEY) {
    try {
      const res = await withTimeout(
        cerebras().chat.completions.create({
          model:      CEREBRAS_MODEL,
          messages:   groqMsgs,
          max_tokens: 3000,
        }),
        TIMEOUT, 'Cerebras'
      )
      const text = res.choices[0]?.message?.content
      if (text) return text
    } catch (e: any) {
      console.warn('[AI] Cerebras failed:', e?.message ?? e)
    }
  }

  // ── 6. Claude Haiku (paid, absolute last resort) ─────────────────────────
  const res = await withTimeout(
    anthropic().messages.create({
      model:      CLAUDE_FALLBACK,
      max_tokens: 3000,
      system,
      messages,
    }),
    20000, 'Claude Haiku'
  )
  return (res.content[0] as { text: string }).text
}

// ── In-memory response cache (per-process, 1h TTL) ───────────────────────────
// Use aiCached() to avoid calling the AI for identical prompts within the hour.
// Key should be deterministic for the same logical request.
const cache = new Map<string, { text: string; ts: number }>()
const TTL   = 60 * 60 * 1000

export async function aiCached(key: string, fn: () => Promise<string>): Promise<string> {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.ts < TTL) return hit.text
  const text = await fn()
  cache.set(key, { text, ts: Date.now() })
  return text
}
