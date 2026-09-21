# Dreamscape

A sleep and AI-dream-companion app, implemented from the Claude Design handoff in
[`../project/Dreamscape.dc.html`](../project/Dreamscape.dc.html).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
npm run preview    # serve the production build
```

## The idea the design is built around

The phone gets darker, quieter and emptier the closer the user gets to sleep. The nav
exists on the browsing screens only; from generation onward the app removes itself.
Session controls fade after five seconds and a tap brings them back for five more. The
sleep fade ends on a single word.

Two type voices carry that: **Poppins Light** for the interface, **Cormorant Garamond
italic** for anything the AI would say out loud. One accent (indigo `#8B93FF`) and one
warmth (amber `#F0A868`) — the rest of the atmosphere is gradient depth, not extra hue.

## Layout

```
src/
  App.tsx                 screen switch + persistent chrome
  state/appState.tsx      the whole store: screen, preferences, timers
  data/content.ts         every string, gradient and list in the app
  types.ts
  styles/global.css       tokens, reset, keyframes, reduced-motion
  chrome/                 Sky, BottomNav, SettingsSheet
  ui/                     Button, Chip, Eyebrow, Pressable, Screen
  screens/                the seventeen screens + TalkOverlay
```

Styling is CSS Modules against the custom properties in `styles/global.css`; screen
files import their own module last so their rules layer over the shared ones.

## Screens

Splash → Onboarding (5 steps) → Home → Create → Generating → Session → Sleep Fade →
Complete, plus Explore, My Nights (filled and empty), Dream Detail, AI Companion,
Profile, Privacy, Premium, Notifications and the Error state.

Each one is addressable by hash — `#/premium`, `#/error` — so any screen can be opened
directly for review without a screen-picker in the UI. Normal navigation keeps the hash
in step.

## Pacing

Timings are the prototype's, and live in `state/appState.tsx`:

| Constant | Value | What it does |
| --- | --- | --- |
| `SPLASH_MS` | 3000 | splash dissolves into onboarding |
| `GEN_STEP_MS` × `GEN_STEPS` | 1200 × 4 | generation phrases and the hairline bar |
| `DIM_MS` | 5000 | session controls fade; a tap restarts it |
| `FADE_MS` | 5200 | sleep fade hands over to the summary |

## Notes on the port

- The design-tool chrome (screen rail, phone bezel, design-notes column) is not part of
  the app. The screens fill the viewport, and hold a single phone-width column on
  anything wider than `--app-max-width`.
- The status bar, dynamic island and home indicator were the simulator's, so they are
  gone; their space is kept through `--screen-pt` and `--nav-pb`, which grow only on
  devices with real safe-area insets.
- Atmosphere is still gradient placeholder art, as in the prototype. Real imagery,
  ambient audio mixing and an Android variant were the design's own next steps.
- `prefers-reduced-motion` drops the decorative drift, twinkle, ripple and wave. The orb
  keeps breathing without the scale change — it is the app's pulse, not decoration.
