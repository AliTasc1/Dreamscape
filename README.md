# Dreamscape

Describe a world in a sentence and fall asleep inside it, narrated by a
companion who becomes whoever you asked for.

> "Ormanın derinliklerindeyim, babam gibi konuşup öğüt veriyorsun ve beni
> sakinleştiriyorsun."

That sentence produces a father in a forest — not a narrator describing one —
speaking Turkish, for thirty minutes, remembering what you told it last time.

## The four projects

| | What it is | Needs a key |
| --- | --- | --- |
| [`app/`](app) | The web app — React, Vite, TypeScript | no |
| [`mobile/`](mobile) | The iPhone and Android app — Expo, React Native | no |
| [`server/`](server) | Writes the night with Claude, speaks it with ElevenLabs | yes, to be used at all |
| [`tests/`](tests) | One suite across all three | no |

Each has its own README. Start with [`mobile/README.md`](mobile/README.md) to
put it on a phone, or [`app/README.md`](app/README.md) for the browser.

## It runs without a single key

The server is optional. With no keys anywhere:

- the night is **written** by an offline engine that genuinely reads the prompt
  for place, person and feeling and writes from that, in the right language;
- it is **spoken** by the device — `expo-speech` on a phone, the browser's own
  speech synthesis on the web;
- the **ambience** is synthesised rather than downloaded — rain, ocean, fire,
  wind, forest, night and café, generated as seamless loops on the device;
- the **artwork** is SVG, drawn at whatever size it is given.

Set `ANTHROPIC_API_KEY` and the night is written by Claude instead. Set
`ELEVENLABS_API_KEY` and it is read by a voice that breathes and laughs. Both
are upgrades to something that already works.

## The one outside service

| What | Who | Key | CORS | Why |
| --- | --- | --- | --- | --- |
| Weather, sunrise, sunset | [Open-Meteo](https://open-meteo.com/) | none | yes | So "it is raining outside" is true rather than decorative |

Off by default. Turning it on asks for coarse location once and rounds the
coordinate to two decimals — about a kilometre — before it leaves the device.
Free for non-commercial use; read their terms before charging for this.

## Running the tests

```bash
cd server && npm install && npm run build   # the integration tests run the real build
cd ../tests && npm install && npm test
```

Eighty-one tests across four files: the weather reader against real and broken
responses, the server's input validation, the server itself over a socket
(path traversal, rate limiting, what it does and does not say in an error), the
offline narrator, and a drift check that fails the moment the copied modules
stop matching each other.

## Where this came from

A design mocked up in [Claude Design](https://claude.ai/design) and exported as
a handoff bundle. The original prototype is still here, unchanged, in
[`project/Dreamscape.dc.html`](project/Dreamscape.dc.html), and the conversation
that produced it is in [`chats/`](chats). The apps were built from those.
