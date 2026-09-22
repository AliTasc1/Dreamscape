# Dreamscape

Describe a world in a sentence and fall asleep inside it, narrated by a
companion who becomes whoever you asked for. Implemented from the Claude Design
handoff in [`../project/Dreamscape.dc.html`](../project/Dreamscape.dc.html).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
npm run preview    # serve the production build
```

The night is written and spoken by [`../server`](../server), which holds the API
keys. Run it alongside (`cd ../server && npm start`) — dev proxies `/api` there.
**Without it the app still runs end to end** on its own engine and the browser's
speech synthesis, so nothing here needs a key to try.

## The idea the design is built around

The phone gets darker, quieter and emptier the closer you get to sleep. Nav
exists on the browsing screens only; from generation onward the app removes
itself. Session controls fade after five seconds and a tap brings them back for
five more. The sleep fade ends on a single word.

Two type voices carry that: **Poppins Light** for the interface, **Cormorant
Garamond italic** for anything the companion would say out loud. One accent
(indigo `#8B93FF`) and one warmth (amber `#F0A868`).

## What happens in a night

1. **Language** is chosen right after the splash, and everything after it — UI,
   narration and voice — is in that language. Turkish and English are complete;
   `src/i18n/en.ts` is the shape every other locale is typed against, so a
   missing key is a compile error, not a blank label.
2. **Consent** sets how far the companion may go: gentle, romantic, or adult
   behind an explicit 18+ confirmation. It travels with every request.
3. **Create** takes a sentence and a length. Free nights run to 10 minutes;
   premium to 60, and reaching past the limit opens the paywall rather than
   failing.
4. **Generating** reads the prompt: where you want to be, who you want the
   companion to be, what you actually need. "Talk to me like my father so I am
   not afraid" produces a father, not a narrator describing one.
5. **Session** streams the narration a segment at a time, speaks it, and paces
   it to real reading speed. Talk sends what you say back into the dream.
6. **Complete** reflects on the night and files what it learned.

At any point in step 5 you can talk back — by voice or by typing — and the
companion answers inside the dream before carrying on.

## Sound

Two things play at once during a session.

**The voice** comes from the service when one is configured, and from the
browser's own synthesis otherwise. Paragraphs are paced to real reading speed
(`WPM` in `ai/voice.ts`) so a muted or voiceless device cannot race an hour-long
night into thirty seconds.

**The ambient bed** is synthesised in the browser — `audio/ambience.ts`. No
files, no API, no licensing, and no loop point, which matters more here than
fidelity: a recorded loop gives itself away within minutes and these sessions
run for an hour. Each bed is coloured noise through a moving filter for the body
of the sound, plus sparse scheduled grains for the events on top — droplets,
crackles, birdsong, crickets, the murmur of a café. The mix slider on the
session screen is a real `<input type="range">` over the drawn one, and the bed
ducks while the listener is speaking.

## Talking back

The Talk button opens a conversation panel rather than a modal: the orb stays
visible and the night keeps running behind it. The microphone stays open;
starting to speak pauses the narration, a pause in speaking ends the turn, and
what was said goes back into the next request so the companion answers in
character before carrying on. Typing does the same for anyone who cannot or
would rather not speak. `session/useSpeech.ts` handles the turn-taking and
restarts the recognition stream that Chrome closes on its own every so often.

## Memory

`src/state/memory.ts` keeps a short, human-readable profile — themes, feelings,
who you asked the companion to be, and a few quotable moments. It is built from
your own words, it lives only in this browser, and every line has a *forget*
beside it on the Memory screen. Create shows the most recent thing it remembers,
so the companion calling back to last week is visible before you start.

## Layout

```
src/
  App.tsx                 screen switch + persistent chrome
  ai/                     contracts, service client, local engine, voice
  session/                the runtime that plays one night
  state/                  store, persistence, preferences, memory
  domain/options.ts       every choice, as stable ids
  i18n/                   en + tr dictionaries, typed against each other
  data/content.ts         gradients and geometry — no words
  art/NightScene.tsx      the one piece of artwork, in four palettes
  audio/ambience.ts       synthesised ambient beds
  chrome/                 Sky, BottomNav, SettingsSheet, Paywall, Toast
  ui/                     Button, Chip, Eyebrow, Pressable, Screen
  screens/                twenty screens + TalkOverlay
```

Styling is CSS Modules over the tokens in `styles/global.css`; screen files
import their own module last so their rules layer over the shared ones.

Every screen is addressable by hash — `#/premium`, `#/memory`, `#/error` — so
any of them can be opened directly for review. Normal navigation keeps the hash
in step.

## Pacing

| Constant | Where | Value |
| --- | --- | --- |
| `SPLASH_MS` | `state/appState.tsx` | 3000 — splash dissolves |
| `DIM_MS` | `state/appState.tsx` | 5000 — session controls fade |
| `FADE_MS` | `state/appState.tsx` | 5200 — sleep fade hands over |
| `MINUTES_PER_SEGMENT` | `state/appState.tsx` | 3 — speech per generated segment |
| `WPM` | `ai/voice.ts` | 75 / 95 / 120 — reading pace by speed setting |

`WPM` is what keeps a night honest: a muted session, a device with no installed
voices, or a synthesis engine that returns instantly would otherwise drain an
hour-long dream in seconds.

## Notes on the port

- The design-tool chrome (screen rail, phone bezel, design-notes column) is not
  part of the app. Screens fill the viewport and hold a single phone-width
  column on anything wider than `--app-max-width`.
- The status bar, dynamic island and home indicator were the simulator's. Their
  space is kept through `--screen-pt` and `--nav-pb`, which grow only on devices
  with real safe-area insets.
- The artwork is drawn, not photographed: `art/NightScene.tsx` is one moonlit
  scene in four palettes, used across onboarding, Home, Dream Detail and
  Premium. It weighs a few kilobytes, scales to any card, and retints per
  context instead of needing a picture per scene. `public/icon.svg` is the app
  mark.
- `prefers-reduced-motion` drops the decorative drift, twinkle, ripple and wave.
  The orb keeps breathing without the scale change.
- Premium is a local flag set by `purchasePremium` in `state/appState.tsx`.
  Everything downstream reads the flag, so StoreKit or Play Billing replaces
  that one function.
