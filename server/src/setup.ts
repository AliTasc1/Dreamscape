/**
 * `npm run setup` — writes .env by asking, so nobody has to hand-edit a
 * dotfile or work out what a voice id is.
 *
 * Keys are typed straight into this process and go nowhere else. Existing
 * values are kept unless replaced, and are only ever shown masked.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

const FILE = '.env'

const rl = createInterface({ input: stdin, output: stdout })

let closed = false
rl.on('close', () => {
  closed = true
})

/**
 * A prompt that survives the input ending. Without this, a closed stdin — a
 * pipe, a Ctrl+D — leaves the question pending forever and the file unwritten.
 */
async function ask(prompt: string): Promise<string> {
  if (closed) return ''
  return Promise.race([
    rl.question(prompt),
    new Promise<string>((resolve) => rl.once('close', () => resolve(''))),
  ])
}

/** Keeps anything already in the file, including keys this script never asks about. */
function readEnv(): Map<string, string> {
  const values = new Map<string, string>()
  if (!existsSync(FILE)) return values
  for (const line of readFileSync(FILE, 'utf8').split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line)
    if (!match) continue
    const value = match[2].trim().replace(/^["']|["']$/g, '')
    if (value) values.set(match[1], value)
  }
  return values
}

function mask(value: string | undefined): string {
  if (!value) return 'not set'
  return value.length <= 8 ? '•'.repeat(value.length) : `${value.slice(0, 4)}…${value.slice(-4)}`
}

async function askSecret(label: string, key: string, values: Map<string, string>) {
  const current = values.get(key)
  const answer = (
    await ask(`\n${label}\n  current: ${mask(current)}\n  paste it (Enter to keep): `)
  ).trim()
  if (answer) values.set(key, answer)
}

async function pickVoice(values: Map<string, string>) {
  const key = values.get('ELEVENLABS_API_KEY')
  if (!key) return

  process.stdout.write('\nFetching your voices… ')
  let voices: { id: string; name: string; labels: Record<string, string> }[]
  try {
    const { listVoices } = await import('./tts.js')
    process.env.ELEVENLABS_API_KEY = key
    voices = await listVoices()
  } catch (error) {
    console.log('failed.')
    console.log(`  ${error instanceof Error ? error.message : String(error)}`)
    console.log('  Check the key, and that it has the Voices: Read permission.')
    return
  }

  if (voices.length === 0) {
    console.log('none found.')
    console.log('  Add a voice to your account in the ElevenLabs voice library first.')
    return
  }

  console.log(`${voices.length} found.\n`)
  const width = Math.max(...voices.map((v) => v.name.length))
  voices.forEach((voice, i) => {
    const traits = [voice.labels.gender, voice.labels.language, voice.labels.accent]
      .filter(Boolean)
      .join(', ')
    console.log(`  ${String(i + 1).padStart(2)}. ${voice.name.padEnd(width)}  ${traits}`)
  })

  const current = values.get('ELEVENLABS_VOICE_ID')
  const currentName = voices.find((v) => v.id === current)?.name
  const answer = (
    await ask(`\n  which one should speak?${currentName ? ` (Enter to keep ${currentName})` : ''} `)
  ).trim()

  if (!answer) return
  const index = Number(answer) - 1
  if (Number.isInteger(index) && index >= 0 && index < voices.length) {
    values.set('ELEVENLABS_VOICE_ID', voices[index].id)
    console.log(`  → ${voices[index].name}`)
  } else {
    console.log('  Not a number on the list; leaving the voice unchanged.')
  }
}

function write(values: Map<string, string>) {
  const lines = [
    '# Written by `npm run setup`. Never commit this file — it is gitignored.',
    '',
    ...[...values.entries()].map(([key, value]) => `${key}=${value}`),
    '',
  ]
  writeFileSync(FILE, lines.join('\n'))
}

console.log('\nDreamscape setup')
console.log('Nothing you type here leaves this machine.\n' + '─'.repeat(52))

const values = readEnv()

await askSecret('Anthropic key — who writes the night (console.anthropic.com)', 'ANTHROPIC_API_KEY', values)
await askSecret('ElevenLabs key — who speaks it (elevenlabs.io → profile)', 'ELEVENLABS_API_KEY', values)
await pickVoice(values)

write(values)
rl.close()

console.log('\n' + '─'.repeat(52))
console.log(`Saved to server/${FILE}:`)
for (const key of ['ANTHROPIC_API_KEY', 'ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID']) {
  console.log(`  ${key.padEnd(20)} ${mask(values.get(key))}`)
}
console.log('\nNow run:  npm run check')
