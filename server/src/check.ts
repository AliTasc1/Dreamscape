/**
 * `npm run check` — proves the keys work before the app depends on them.
 *
 * Each provider is exercised for real: one small request to whichever narrator
 * is configured, one listing of the account's ElevenLabs voices, and one
 * second of actual speech. Anything that fails prints the reason and what to
 * do about it, rather than a stack trace.
 */

import { writeFileSync } from 'node:fs'
import * as narrator from './narrator.js'
import { listVoices, synthesize, voiceProvider } from './tts.js'

const ok = (line: string) => console.log(`  ✓ ${line}`)
const bad = (line: string) => console.log(`  ✗ ${line}`)
const hint = (line: string) => console.log(`    → ${line}`)

function reason(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/\s+/g, ' ').slice(0, 300)
}

/**
 * The shape of a key, before spending a request on it.
 *
 * Most bad keys are bad in a visible way — a stray quote from an editor, a
 * space from a copy that grabbed too much, a value from the wrong product —
 * and the API answers all of them with the same opaque 401.
 */
function inspectKey(raw: string, label: string, prefix: string, minLength: number): boolean {
  const value = raw
  let sound = true

  if (value !== value.trim()) {
    bad(`${label} has whitespace around it`)
    hint('Remove the spaces or the line break after the = sign.')
    sound = false
  }
  if (/^["']|["']$/.test(value.trim())) {
    bad(`${label} is wrapped in quotes`)
    hint('Write it bare: KEY=value — no quotes.')
    sound = false
  }
  if (/\s/.test(value.trim())) {
    bad(`${label} contains a space or line break inside it`)
    hint('The paste was probably broken across lines. Paste it as one line.')
    sound = false
  }
  if (!value.trim().startsWith(prefix)) {
    bad(`${label} does not start with "${prefix}"`)
    hint(`Keys for this service look like ${prefix}…  — this may be from elsewhere.`)
    sound = false
  }
  if (value.trim().length < minLength) {
    bad(`${label} is only ${value.trim().length} characters — it looks truncated`)
    hint('Copy the whole key; the console only shows it once.')
    sound = false
  }
  return sound
}

/** One prompt, the same for whichever narrator is configured. */
const SAMPLE = {
  lang: 'en',
  prompt: 'A quiet beach at midnight. Rain is falling. Talk to me like an old friend.',
  minutes: 10,
  tone: 'gentle',
  prefs: {
    voice: 'warm',
    mood: 'calm',
    amb: 'rain',
    personality: 'gentle',
    style: 'story',
    speed: 'slow',
    intensity: 'soft',
  },
  memory: { themes: [], feelings: [], personas: [], moments: [], nights: 0 },
} as const

async function checkNarrator(): Promise<boolean> {
  const who = narrator.provider()
  console.log(`\nNarrator — ${who === 'gemini' ? 'Gemini' : who === 'claude' ? 'Anthropic' : 'none'}`)

  if (who === 'none') {
    bad('neither GEMINI_API_KEY nor ANTHROPIC_API_KEY is set')
    hint('Free: aistudio.google.com → Get API key. No card, a few hundred a day.')
    hint('Paid, and the better writer: console.anthropic.com → API keys.')
    hint('Without either the app writes nights with its own local engine.')
    return false
  }

  // Key shapes differ, and a mangled paste is the commonest failure of all.
  if (who === 'claude') {
    if (!inspectKey(process.env.ANTHROPIC_API_KEY ?? '', 'ANTHROPIC_API_KEY', 'sk-ant-', 40)) {
      hint('Create a fresh one at console.anthropic.com → API keys.')
      return false
    }
  } else if (!inspectKey(process.env.GEMINI_API_KEY ?? '', 'GEMINI_API_KEY', 'AIza', 30)) {
    hint('Create a fresh one at aistudio.google.com → Get API key.')
    return false
  }

  try {
    const plan = await narrator.plan({ ...SAMPLE, prefs: { ...SAMPLE.prefs }, memory: { ...SAMPLE.memory, themes: [], feelings: [], personas: [], moments: [] } })
    ok(`${narrator.model()} answered`)
    ok(`it planned "${plan.title}" — you become ${plan.persona.who || '(unnamed)'}`)
    return true
  } catch (error) {
    const why = reason(error)
    bad(`request failed: ${why}`)
    if (why.includes('401') || why.includes('403')) hint('The key is wrong or revoked.')
    if (why.includes('credit')) hint('The account is out of credit.')
    if (why.includes('429')) hint("Out of today's free requests, or too many at once.")
    return false
  }
}

async function checkVoice(): Promise<boolean> {
  console.log('\nVoice')
  const provider = voiceProvider()

  if (provider === 'none') {
    bad('no voice provider configured')
    if (process.env.ELEVENLABS_API_KEY) {
      hint('ELEVENLABS_API_KEY is set but no voice id is.')
      hint('Run `npm run voices` to list yours, then set ELEVENLABS_VOICE_ID.')
    } else {
      hint('Set ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID, or OPENAI_API_KEY.')
      hint('Without either, the app uses the browser’s own speech synthesis.')
    }
    return false
  }

  ok(`provider: ${provider}`)

  if (provider === 'elevenlabs') {
    if (!inspectKey(process.env.ELEVENLABS_API_KEY ?? '', 'ELEVENLABS_API_KEY', 'sk_', 30)) {
      hint('Create a fresh one at elevenlabs.io → profile → API key.')
      return false
    }
    try {
      const voices = await listVoices()
      ok(`${voices.length} voice(s) on the account`)
      // Every configured id, not just the default — a wrong one only shows up
      // when a listener happens to pick that voice, which is far too late.
      const configured = Object.keys(process.env)
        .filter((name) => name.startsWith('ELEVENLABS_VOICE_'))
        .map((name) => ({ name, id: (process.env[name] ?? '').trim() }))
        .filter((entry) => entry.id.length > 0)

      if (configured.length === 0) {
        bad('no voice id configured')
        hint('Run `npm run voices` and set ELEVENLABS_VOICE_ID.')
        return false
      }

      let allFound = true
      for (const entry of configured) {
        const match = voices.find((v) => v.id === entry.id)
        if (match) ok(`${entry.name} → ${match.name}`)
        else {
          bad(`${entry.name} (${entry.id}) is not on this account`)
          allFound = false
        }
      }
      if (!allFound) {
        hint('Run `npm run voices` and copy ids from there.')
        hint('A voice browsed in the library must be added to your voices first.')
        hint('Leave the optional ones blank to fall back to ELEVENLABS_VOICE_ID.')
        return false
      }
    } catch (error) {
      bad(`could not list voices: ${reason(error)}`)
      return false
    }
  }

  // The real thing: markers and all, exactly as the narrator writes them.
  try {
    const audio = await synthesize({
      text: '[whispers] Close your eyes. [breathes] You are already somewhere else.',
      lang: 'en',
      voice: 'warm',
      intensity: 'soft',
      speed: 'slow',
      tone: 'gentle',
    })
    const kb = Math.round(audio.byteLength / 1024)
    if (audio.byteLength < 1000) {
      bad(`spoke, but returned only ${audio.byteLength} bytes`)
      return false
    }
    writeFileSync('voice-check.mp3', Buffer.from(audio))
    ok(`spoke ${kb} KB — saved to server/voice-check.mp3, play it`)
    return true
  } catch (error) {
    bad(`speech failed: ${reason(error)}`)
    if (reason(error).includes('401')) hint('The ElevenLabs key is wrong.')
    if (reason(error).includes('404')) hint('That voice id does not exist on this account.')
    if (reason(error).includes('quota') || reason(error).includes('429')) {
      hint('Out of credits, or too many requests at once.')
    }
    return false
  }
}

const narratorReady = await checkNarrator()
const voice = await checkVoice()

console.log('\n' + '─'.repeat(52))
console.log(`narrator: ${narratorReady ? `${narrator.provider()} (${narrator.model()})` : 'local engine'}`)
console.log(`voice:    ${voice ? voiceProvider() : 'browser speech synthesis'}`)
console.log(
  narratorReady && voice
    ? 'Both ready. Start the server with `npm start`.'
    : 'The app still runs — the parts above just fall back.',
)
