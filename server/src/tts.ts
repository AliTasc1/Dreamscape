import type { TtsRequest } from './contracts.js'

/**
 * Two adapters, one contract: give me words, get back MP3 bytes.
 *
 * ElevenLabs is preferred because its v3 models read the inline performance
 * markers the narrator writes — [breathes], [laughs], [whispers] — as real
 * breath and laughter. OpenAI has no inline tags, so the markers are lifted
 * out of the text and folded into its `instructions` field instead.
 */

const ELEVEN_ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech'
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/audio/speech'

export type VoiceProvider = 'elevenlabs' | 'openai' | 'none'

/**
 * ElevenLabs voice ids are account-specific, so they are configured rather
 * than guessed. Set at least ELEVENLABS_VOICE_ID for a single default voice.
 */
function elevenVoiceId(voice: string): string | null {
  const perVoice = process.env[`ELEVENLABS_VOICE_${voice.toUpperCase()}`]
  return perVoice || process.env.ELEVENLABS_VOICE_ID || null
}

/** OpenAI ships a fixed voice roster; these are the closest matches. */
const OPENAI_VOICES: Record<string, string> = {
  female: 'nova',
  male: 'onyx',
  neutral: 'alloy',
  warm: 'coral',
  deep: 'onyx',
  whisper: 'sage',
}

export function voiceProvider(): VoiceProvider {
  if (process.env.ELEVENLABS_API_KEY && elevenVoiceId('warm')) return 'elevenlabs'
  if (process.env.OPENAI_API_KEY) return 'openai'
  return 'none'
}

const MARKER_PATTERN = /\[([a-z ]+)\]/gi

/** Pulls the markers out and leaves readable text behind. */
function stripMarkers(text: string): { clean: string; markers: string[] } {
  const markers: string[] = []
  const clean = text
    .replace(MARKER_PATTERN, (_match, name: string) => {
      const marker = name.trim().toLowerCase()
      markers.push(marker)
      // A pause has to survive as punctuation or the line runs on.
      return marker.includes('pause') ? '…' : ''
    })
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.!?…])/g, '$1')
    .trim()
  return { clean, markers: [...new Set(markers)] }
}

function openAiInstructions(req: TtsRequest, markers: string[]): string {
  const parts = [
    req.tone === 'mature'
      ? 'Intimate and close, low and unhurried.'
      : req.tone === 'romantic'
        ? 'Warm, affectionate and close.'
        : 'Calm, gentle and reassuring — a voice for falling asleep to.',
    req.intensity === 'whisper'
      ? 'Almost whispering.'
      : req.intensity === 'soft'
        ? 'Soft and low, close to the microphone.'
        : 'Natural volume, still warm.',
    req.speed === 'verySlow'
      ? 'Very slow, with long pauses between sentences.'
      : req.speed === 'slow'
        ? 'Slow and unhurried.'
        : 'A relaxed, natural pace.',
  ]
  if (markers.some((m) => m.includes('laugh') || m.includes('chuckle'))) {
    parts.push('Let a soft laugh slip in where the words invite one.')
  }
  if (markers.some((m) => m.includes('breath') || m.includes('sigh'))) {
    parts.push('Take audible breaths; let a sigh land where it belongs.')
  }
  return parts.join(' ')
}

/** ElevenLabs stability drops as intimacy rises — more expression, less flatness. */
function elevenSettings(req: TtsRequest) {
  const stability = req.tone === 'gentle' ? 0.55 : req.tone === 'romantic' ? 0.4 : 0.32
  return {
    stability,
    similarity_boost: 0.8,
    style: req.tone === 'gentle' ? 0.15 : 0.45,
    use_speaker_boost: true,
    speed: req.speed === 'verySlow' ? 0.75 : req.speed === 'slow' ? 0.88 : 1,
  }
}

export async function synthesize(req: TtsRequest): Promise<ArrayBuffer> {
  const provider = voiceProvider()

  if (provider === 'elevenlabs') {
    const voiceId = elevenVoiceId(req.voice)
    if (!voiceId) throw new Error('no ElevenLabs voice configured')

    // v3 reads the inline markers, so the text goes through untouched.
    const response = await fetch(
      `${ELEVEN_ENDPOINT}/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY as string,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          text: req.text,
          model_id: process.env.ELEVENLABS_MODEL || 'eleven_v3',
          language_code: req.lang,
          voice_settings: elevenSettings(req),
        }),
      },
    )
    if (!response.ok) {
      throw new Error(`ElevenLabs ${response.status}: ${await response.text()}`)
    }
    return response.arrayBuffer()
  }

  if (provider === 'openai') {
    const { clean, markers } = stripMarkers(req.text)
    const response = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.OPENAI_API_KEY as string}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
        voice: OPENAI_VOICES[req.voice] ?? 'alloy',
        input: clean,
        instructions: openAiInstructions(req, markers),
        response_format: 'mp3',
      }),
    })
    if (!response.ok) {
      throw new Error(`OpenAI TTS ${response.status}: ${await response.text()}`)
    }
    return response.arrayBuffer()
  }

  throw new Error('no voice provider configured')
}
