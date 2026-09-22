/**
 * `npm run check` — proves the keys work before the app depends on them.
 *
 * Each provider is exercised for real: one small Claude request, one listing of
 * the account's ElevenLabs voices, one second of actual speech. Anything that
 * fails prints the reason and what to do about it, rather than a stack trace.
 */

import { writeFileSync } from 'node:fs'
import * as claude from './claude.js'
import { listVoices, synthesize, voiceProvider } from './tts.js'

const ok = (line: string) => console.log(`  ✓ ${line}`)
const bad = (line: string) => console.log(`  ✗ ${line}`)
const hint = (line: string) => console.log(`    → ${line}`)

function reason(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/\s+/g, ' ').slice(0, 300)
}

async function checkClaude(): Promise<boolean> {
  console.log('\nNarrator — Anthropic')
  if (!claude.hasCredentials()) {
    bad('ANTHROPIC_API_KEY is not set')
    hint('Get one at console.anthropic.com, then put it in server/.env')
    hint('Without it the app writes nights with its own local engine.')
    return false
  }

  try {
    const plan = await claude.plan({
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
    })
    ok(`${claude.MODEL} answered`)
    ok(`it planned "${plan.title}" — you become ${plan.persona.who || '(unnamed)'}`)
    return true
  } catch (error) {
    bad(`request failed: ${reason(error)}`)
    if (reason(error).includes('401')) hint('The key is wrong or revoked.')
    if (reason(error).includes('credit')) hint('The account is out of credit.')
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
    try {
      const voices = await listVoices()
      ok(`${voices.length} voice(s) on the account`)
      const configured = process.env.ELEVENLABS_VOICE_ID
      const match = voices.find((v) => v.id === configured)
      if (configured && !match) {
        bad(`ELEVENLABS_VOICE_ID ${configured} is not on this account`)
        hint('Run `npm run voices` and copy an id from there.')
        return false
      }
      if (match) ok(`default voice: ${match.name}`)
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

const narrator = await checkClaude()
const voice = await checkVoice()

console.log('\n' + '─'.repeat(52))
console.log(`narrator: ${narrator ? 'Claude' : 'local engine'}`)
console.log(`voice:    ${voice ? voiceProvider() : 'browser speech synthesis'}`)
console.log(
  narrator && voice
    ? 'Both ready. Start the server with `npm start`.'
    : 'The app still runs — the parts above just fall back.',
)
