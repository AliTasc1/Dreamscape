/**
 * `npm run voices` — prints the account's voice ids, ready to paste into .env.
 *
 * ElevenLabs voice ids are per-account, so they cannot ship as defaults. This
 * turns the one genuinely fiddly setup step into a copy and a paste.
 */

import { listVoices } from './tts.js'

if (!process.env.ELEVENLABS_API_KEY) {
  console.error('ELEVENLABS_API_KEY is not set. Put it in server/.env first.')
  process.exit(1)
}

try {
  const voices = await listVoices()
  if (voices.length === 0) {
    console.log('No voices on this account yet. Add one in the ElevenLabs voice library.')
    process.exit(0)
  }

  const width = Math.max(...voices.map((v) => v.name.length))
  console.log(`\n${voices.length} voice(s):\n`)
  for (const voice of voices) {
    const traits = [voice.labels.gender, voice.labels.age, voice.labels.accent]
      .filter(Boolean)
      .join(', ')
    console.log(`  ${voice.name.padEnd(width)}  ${voice.id}${traits ? `   (${traits})` : ''}`)
  }

  console.log('\nPaste one into server/.env as the default:\n')
  console.log(`  ELEVENLABS_VOICE_ID=${voices[0].id}`)
  console.log('\nOptionally give each preference its own actor:\n')
  for (const key of ['FEMALE', 'MALE', 'NEUTRAL', 'WARM', 'DEEP', 'WHISPER']) {
    console.log(`  ELEVENLABS_VOICE_${key}=`)
  }
  console.log('')
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
