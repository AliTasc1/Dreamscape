# Dreamscape narrator service

Holds the API keys and does the two things the browser must not: writing the
night with Claude, and turning it into a voice.

```bash
npm install
cp .env.example .env    # optional — see below
npm run build && npm start
```

The app proxies `/api` here in development (`app/vite.config.ts`). Point it
somewhere else with `VITE_API_TARGET` in dev, or `VITE_API_BASE` in a build.

## Endpoints

| Route | What it does |
| --- | --- |
| `GET /api/capabilities` | What this deployment can actually do. The app asks on boot and adapts. |
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
