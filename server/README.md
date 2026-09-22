# Dreamscape narrator service

Holds the API keys and does the two things the browser must not: writing the
night with Claude, and turning it into a voice.

```bash
npm install
npm run setup           # asks for the keys and writes .env — no hand-editing
npm run check           # proves they work before anything depends on them
npm start
```

`npm run setup` prompts for each key, lists the voices on the ElevenLabs
account so one can be picked by number, and writes `.env`. It keeps anything
already in the file — Enter at any prompt leaves that value alone — and shows
existing keys masked. Nothing typed into it leaves the machine.

Hand-editing still works if you prefer: `cp .env.example .env` (`copy` on
Windows) and fill it in.

Every script here is cross-platform. `npm run dev` rebuilds once and then
restarts the server on each change to `dist`; run `npm run watch` in a second
terminal if you want TypeScript recompiling as you edit.

## Setting up the keys

Both are optional and the app runs without either — this is what each one buys.

### Anthropic — who writes the night

1. [console.anthropic.com](https://console.anthropic.com) → **API keys** → create one
2. Put it in `.env` as `ANTHROPIC_API_KEY=`
3. `npm run check` — it sends one real planning request and prints the title
   and persona it came back with

Credits are bought separately from the key — **Plans & Billing** in the same
console. A valid key with an empty balance answers `400 credit balance is too
low`, which `npm run check` reports as such.

**Model.** `claude-opus-5` is the default and the best writer. A night is many
requests — one plan, then a segment every three minutes — so the model is the
one lever that really moves the bill; `ANTHROPIC_MODEL` switches it without a
code change (`claude-sonnet-5` is roughly half the price and still writes
well). Whoever pays should make that call, not the default.

Without a key at all, `ai/localEngine.ts` in the app writes the night instead:
it reads the prompt for place, persona and feeling and composes from written
banks. It works, in both languages, but it is not Claude.

### ElevenLabs — who speaks it

1. [elevenlabs.io](https://elevenlabs.io) → profile → **API key**
2. Put it in `.env` as `ELEVENLABS_API_KEY=`
3. `npm run voices` — lists every voice on the account with its id
4. Paste one in as `ELEVENLABS_VOICE_ID=`
5. `npm run check` — synthesises a line *with markers in it* and writes
   `voice-check.mp3`. Play it: you should hear the whisper and the breath.

Voice ids are per-account, which is why none ship as defaults. Optionally set
`ELEVENLABS_VOICE_FEMALE` / `_MALE` / `_NEUTRAL` / `_WARM` / `_DEEP` /
`_WHISPER` to give each of the app's voice settings its own actor; anything
unset falls back to `ELEVENLABS_VOICE_ID`.

**Model.** `eleven_v3` is the default because it is the one that performs the
inline markers. `eleven_multilingual_v2` is cheaper and flatter;
`eleven_flash_v2_5` is the fastest. Override with `ELEVENLABS_MODEL`.

**Cost, roughly.** About 1,000 characters of text becomes a minute of speech,
and on the multilingual models one character is one credit. A ten-minute night
is on the order of 6–9k characters. Creator ($22/mo, 121k credits) is about
two hours of narration a month; Pro ($99/mo, 600k credits) about ten. Overage
runs ~$0.17–0.18 a minute. Budget per *finished* night, not per request —
a listener who interrupts generates extra speech.

Without ElevenLabs the browser's own `speechSynthesis` speaks instead, with the
markers stripped and their pauses kept as punctuation. Free, offline, and much
flatter.

The app proxies `/api` here in development (`app/vite.config.ts`). Point it
somewhere else with `VITE_API_TARGET` in dev, or `VITE_API_BASE` in a build.

## Endpoints

| Route | What it does |
| --- | --- |
| `GET /api/capabilities` | What this deployment can actually do. The app asks on boot and adapts. |
| `GET /api/voices` | The account's ElevenLabs voices and their ids. Setup only. |
| `POST /api/plan` | Reads the prompt and returns who to become, where it happens, and the arc. |
| `POST /api/narrate` | Streams one segment of narration as SSE (`{type:"delta"}` … `{type:"done"}`). |
| `POST /api/reflect` | Reads a finished night and returns what is worth remembering. |
| `POST /api/tts` | Returns MP3 for one paragraph. |

The wire types are in `src/contracts.ts`; an identical copy lives at
`app/src/ai/contracts.ts`. Two deployables, one shape — change one, change both.

## Running without keys

Nothing here is required. `GET /api/capabilities` reports `narrator: "none"` /
`voice: "none"`, the other routes answer `503 not_configured`, and the app falls
back to its own engine (`app/src/ai/localEngine.ts`) and the browser's speech
synthesis. The whole product works, including memory and premium — the writing
is simply not Claude's.

## How the night is written

`plan` is one short request at low effort: read the prompt, work out the place,
the persona and what the listener actually needs, and return JSON. A prompt that
says *"talk to me like my father so I am not afraid"* is a request for safety,
not a character sheet, and the plan is built to name that.

`narrate` then streams the night a **segment** at a time — about three minutes
of speech each — so a sixty-minute session is never one enormous request, and
the first words arrive in seconds. The app asks for the next segment when the
voice runs out of things to say, and passes back a condensed `soFar` plus
anything the listener said out loud.

`reflect` runs once at the end and returns a handful of short lines — themes,
feelings, who the listener asked you to be, a moment or two worth quoting. Those
merge into the profile on the device and come back as context on the next night.

## Tone

`TONE_BRIEF` in `src/prompt.ts` is the single place that decides how far the
companion goes. Three settings reach it from the app: `gentle`, `romantic` and
`mature`, the last one gated behind an explicit age confirmation.

`mature` is written as adult and sensual but suggestive rather than graphic.
That is a deliberate stopping point, and it is also a practical one: most model
providers — Anthropic included — do not permit explicit sexual content, so a
harder brief would be declined at the API rather than produce anything. If you
run a model whose terms allow it, that constant is the one place to change, and
`claude.ts` is the one file to repoint.

Refusals are not treated as crashes: `stop_reason: "refusal"` surfaces as
`422 {error:"refused"}`, and the app quietly writes the night itself instead.
