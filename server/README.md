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

### Who writes the night

Either key works, and neither is required. With no key at all the app writes
the night on the device, which is slower prose but costs nothing and runs on a
plane.

**Gemini — free.** `aistudio.google.com` → Get API key. No card. The free tier
is a few hundred requests a day, which is a couple of full nights; a night is
one plan, a segment every few minutes and one reflection. Check
[the pricing page](https://ai.google.dev/gemini-api/docs/pricing) for today's
limits rather than trusting a number written here.

```
GEMINI_API_KEY=AIza...
```

**Anthropic — paid, and the better writer.** `console.anthropic.com` → API
keys. Credits are billed separately under Plans & Billing.

```
ANTHROPIC_API_KEY=sk-ant-...
```

Set both and Anthropic is used, because a paid key is a deliberate act. To go
the other way, `NARRATOR=gemini`.

Running out of the free tier is a `429`, and it is the likeliest failure of
all — the app treats it the same as no key at all and writes the night itself,
so the listener sees a night rather than an error.

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

The wire types are in `src/contracts.ts`; identical copies live at
`app/src/ai/contracts.ts` and `mobile/src/shared/ai/contracts.ts`. Three
deployables, one shape — `tests/drift.test.ts` fails if they stop matching.

## Before this is on a public address

This service holds your Gemini, Anthropic and ElevenLabs keys, so a request to
it is not data, it is a bill. Four things are already done for you:

- **Nothing over the wire is believed.** `src/validate.ts` checks every field
  and clamps it to something a real night could contain: `minutes` to 120, a
  prompt to 4,000 characters, an arc to 40 beats, memory to 40 entries a list.
  Every preference id is narrowed to one the app actually offers — which is
  also what stops a caller choosing which `ELEVENLABS_VOICE_*` variable gets
  read. Anything that cannot be repaired is a `400` naming the field.
- **There is a per-address budget**, 40 requests a minute by default. Tune it
  with `RATE_MAX` and `RATE_WINDOW_MS`; behind a proxy set `TRUST_PROXY=1` so
  it counts the real caller.
- **Errors say nothing about the server.** An upstream message can carry a URL,
  a header or a fragment of a key, so it is logged and never returned — the app
  only needs to know whether to retry or write the night itself.
- **`APP_TOKEN` closes the front door.** Set it and every `/api/` request must
  carry it as `x-dreamscape-token`, capabilities included; the comparison is
  constant-time. The app sends it from `EXPO_PUBLIC_API_TOKEN` on a phone or
  `VITE_API_TOKEN` on the web.

Be clear about what that last one is and is not. The token ships inside the app
that has to send it, so anybody willing to unpack a bundle can read it. What it
stops is what actually happens to a public address: a scanner finds it and
starts spending. It cannot tell two listeners apart, cannot revoke one, and
cannot say who spent what. That needs real accounts, and this has none — so
keep the address to people you know until it does.

Two things are still yours to do:

- **Set `CORS_ORIGIN`.** It defaults to `*`, which is right on your own machine
  and wrong on a public address: with `*`, any website can drive your keys.
- **Put TLS in front of it.** The app refuses a plain-http address that is not
  on a local network, because a night's narration is the answer to something
  private.

`tests/server.test.ts` starts this build with no keys, plants a secret file
above the static root, tries twelve ways of reaching it, and checks that every
endpoint refuses a caller without the token.

## Putting it on a server

Any Linux box with Node 20 or newer. These are the steps for aaPanel, which is
the same shape anywhere: get the code, build it, keep it running, put a real
domain and certificate in front of it.

**1. Node and the code.** In aaPanel install **Node.js** from the App Store
(20 LTS or newer), and **PM2** with it. Then over SSH:

```bash
cd ~
git clone https://github.com/AliTasc1/Dreamscape.git
cd Dreamscape/server
npm install
npm run build
```

Your home directory, not `/www/wwwroot`. That folder is nginx's, owned by
root, and it is for sites nginx serves directly off disk. This one listens on
a port and hides behind nginx, so where the code lives is nobody's business
but yours — and cloning into `/www/wwwroot` as an ordinary user just earns a
`Permission denied`.

If `node` is not found after installing it through aaPanel, its Node lives
outside the default `PATH`. Find it and add it:

```bash
ls /www/server/nodejs
echo 'export PATH=/www/server/nodejs/v20.19.0/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
node -v
```

Use whatever version `ls` actually printed.

**2. The keys.** Create `~/Dreamscape/server/.env` from `.env.example` and
fill in what you have. It is gitignored and must stay that
way. At minimum, for a public server:

```
GEMINI_API_KEY=AIza...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...
APP_TOKEN=<a long random string>
CORS_ORIGIN=https://your.domain
TRUST_PROXY=1
PORT=8787
```

`TRUST_PROXY=1` matters here: behind nginx every request arrives from the
proxy, so without it the whole internet shares one rate-limit bucket.

```bash
npm run check          # proves the keys work before anything depends on them
```

**3. Keep it running.** PM2 restarts it on a crash and on reboot:

```bash
pm2 start dist/index.js --name dreamscape
pm2 save
pm2 startup            # run the line it prints
pm2 logs dreamscape
```

**4. A domain and a certificate.** In aaPanel: **Website → Add site** with your
domain, then that site's **Reverse proxy → Add**, target `http://127.0.0.1:8787`.
Then **SSL → Let's Encrypt**, issue, and turn on **Force HTTPS**. The app will
not talk to a plain-http address that is not on a local network, so the
certificate is not optional.

**5. Point the app at it.** In `mobile/`:

```bash
EXPO_PUBLIC_API_BASE=https://your.domain EXPO_PUBLIC_API_TOKEN=<the same token> npm run share
```

Both are compiled into the bundle, so changing either means republishing.

**Firewall:** 8787 should *not* be open to the internet — nginx reaches it on
localhost. Open 80 and 443 only, in aaPanel's **Security** and at your host's
firewall if it has one.

**Updating:**

```bash
cd ~/Dreamscape && git pull
cd server && npm install && npm run build && pm2 restart dreamscape
```

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
