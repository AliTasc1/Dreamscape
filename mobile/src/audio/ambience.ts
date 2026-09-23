import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio'
import { Directory, File, Paths } from 'expo-file-system'
import { renderAmbience, toWav, type AmbienceKind } from '../shared/audio/ambienceSynth'
import type { AmbienceId } from '../shared/domain/options'

/**
 * Ambient sound on the phone.
 *
 * There is no Web Audio API here, so the bed cannot be synthesised live. The
 * loop is rendered once into the cache as a WAV and played on repeat. Nothing
 * is shipped, nothing is downloaded, nothing is licensed and nothing is paid
 * for — the phone makes its own rain.
 *
 * The sound itself is in `../shared/audio/ambienceSynth`, which is platform
 * neutral and measured by `tests/ambience.test.ts`. This file is only the part
 * that has to know about files and players.
 */

const RATE = 22_050
/**
 * Long enough that the ear stops noticing it comes back around. Twenty
 * seconds rather than twelve because the rarest things in here — an owl, a log
 * giving way — happen a few times a minute, and on a short loop the ear learns
 * exactly when they are coming.
 */
const SECONDS = 20
/** Bump when the synthesis changes, or phones keep playing the old loop. */
const VERSION = 3

function isKind(ambience: AmbienceId): ambience is AmbienceKind {
  return ambience !== 'none'
}

/**
 * Writes the loop the first time it is needed and reuses it forever after.
 *
 * A twelve-second stereo loop is about a megabyte and takes a moment to
 * render, which is why it happens off the render path and only once.
 */
function fileFor(kind: AmbienceKind): string | null {
  try {
    const dir = new Directory(Paths.cache, 'ambience')
    if (!dir.exists) dir.create({ intermediates: true })

    const file = new File(dir, `${kind}-v${VERSION}.wav`)
    if (!file.exists) {
      file.create()
      file.write(toWav(renderAmbience(kind, RATE, SECONDS)))
    }
    return file.uri
  } catch {
    // No cache, no space, no permission — the night runs without a bed.
    return null
  }
}

export class Ambience {
  private player: AudioPlayer | null = null
  private current: AmbienceId | null = null
  private level = 0.62
  private muted = false
  /** Guards against a slow render finishing after the bed has moved on. */
  private generation = 0

  /** Keeps playing with the screen off and does not silence the ringer switch. */
  static async configure(): Promise<void> {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'mixWithOthers',
      })
    } catch {
      // Older runtime; playback still works with the defaults.
    }
  }

  play(ambience: AmbienceId): void {
    if (ambience === this.current) return
    this.teardown()
    this.current = ambience
    if (!isKind(ambience)) return

    const mine = ++this.generation
    // Rendering a megabyte of audio would hold up the first frame of the
    // session, so it waits for the screen to exist before it starts.
    setTimeout(() => {
      if (mine !== this.generation) return
      const uri = fileFor(ambience)
      if (!uri || mine !== this.generation) return
      try {
        const player = createAudioPlayer(uri)
        player.loop = true
        player.volume = this.volume()
        player.play()
        this.player = player
      } catch {
        this.player = null
      }
    }, 0)
  }

  setLevel(level: number): void {
    this.level = Math.min(1, Math.max(0, level))
    if (this.player) this.player.volume = this.volume()
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.player) this.player.volume = this.volume()
  }

  stop(): void {
    this.teardown()
    this.current = null
  }

  /** Perceived loudness is closer to the square of the slider position. */
  private volume(): number {
    return this.muted ? 0 : this.level * this.level * 0.85
  }

  private teardown(): void {
    this.generation++
    if (!this.player) return
    try {
      this.player.pause()
      this.player.remove()
    } catch {
      // Already gone.
    }
    this.player = null
  }
}
