# Dreamscape for iPhone and Android

The same night as [`../app`](../app), built with Expo so it can be installed
from the App Store and Play Store. Everything the web app does, it does — the
language gate, the persona the prompt asks for, memory across nights, the
paywall, the real weather — with the phone's own voice reading it.

```bash
npm install
npm start          # then scan the QR code with Expo Go
npm run typecheck
npm run export     # bundles both platforms, the way a store build would
```

## Trying it in Expo Go

1. Install **Expo Go** from the App Store or Play Store.
2. `npm install && npm start` in this folder.
3. Scan the QR code the terminal prints — iPhone with the Camera app, Android
   from inside Expo Go.

Nothing needs an account and nothing needs an API key. Expo Go loads the app,
the phone writes the night and the phone's own voice reads it.

## Giving somebody else the app

```bash
npm run share
```

That is `expo start --tunnel` with two things added. It serves the app from a
public address instead of the local network, so the person you send it to can
be in another city; and it pins the tunnel's subdomain, so the link is the same
every time you run it rather than a fresh random one that leaves whoever you
gave the last one to holding a dead address.

Send them the `exp://…exp.direct` line the terminal prints. They open it in
Expo Go and that is all — no account, no login, no sign-up, on either side.

**The window has to stay open.** The app is served from your computer, so when
you close the terminal or shut down, their copy stops loading. That is the one
real cost of this route, and for a person who wants to fall asleep to it after
you have gone to bed it is the wrong one. `npm run publish` is the other route:
it puts the bundle on Expo's servers with `eas update`, so the link keeps
working with your computer off — but that one does need an Expo account, and
`runtimeVersion` is already set to `{"policy": "sdkVersion"}` so the result
still opens in Expo Go.

If the tunnel ever refuses the subdomain because somebody else took it, set
`EXPO_TUNNEL_SUBDOMAIN` to something else, or to an empty string for a random
one.

What they get either way is the free app: the night written on their phone and
read by their phone's voice. `EXPO_PUBLIC_API_BASE` is compiled into the
bundle, so a hosted narrator or voice would have to be a public HTTPS address
that is up whenever they are — and this server has no authentication, so a
public address is an open wallet. Keep the hosted voice on your own machine
until there is a real deployment behind a login.

Tell them to download their phone's good voice, too. iOS keeps it in Settings →
Accessibility → Spoken Content → Voices; Android in Settings → System →
Languages → Text-to-speech. Without it the app is stuck with the flat one.

## What it costs to run: nothing

The app has **one** outside dependency and it is free, keyless and opt-in:

| What | Who | Key | Why it is here |
| --- | --- | --- | --- |
| Weather and sunset | [Open-Meteo](https://open-meteo.com/) | none | So "it is raining outside" is true rather than decorative |

Everything else runs on the device:

- **The night itself** is written by `src/shared/ai/localEngine.ts`, which
  reads the prompt for place, person and feeling, and writes from that in the
  listener's language.
- **The voice** is `expo-speech`, the system narrator every phone already has.
- **The ambience** is generated on the phone: `src/audio/ambience.ts` synthesises
  an eight-second seamless WAV loop for rain, ocean, fire, wind, forest, night
  and café, cross-fades its own tail onto its head so the loop has no seam, and
  plays it under the narration. No downloads, no licences, no sound files.
- **The artwork** is `src/art/NightScene.tsx`, drawn as SVG at whatever size it
  is given, in four palettes that follow the ambience.

Open-Meteo asks for nothing and is free for non-commercial use — check their
terms before this ships as a paid app.

`EXPO_PUBLIC_API_BASE` is the one way to change this. Point it at a running
[`../server`](../server) and the narration comes from Claude and the voice from
ElevenLabs instead. Left unset — which is the default — none of that is reached
and the app is entirely free to run.

## Location, and what leaves the phone

The weather switch lives in **Profile → Match tonight to the real sky** and is
off until it is turned on. When it is:

- The app asks for coarse location once (`ACCESS_FINE_LOCATION` is blocked in
  `app.json`, so the precise permission cannot even be requested).
- The coordinate is **rounded to two decimals — about a kilometre —** before it
  is sent. The weather is the same across a town and nobody needs to know which
  building.
- Nothing else goes with it: no id, no account, no prompt.
- Turning the switch off forgets the reading immediately.

If the permission is declined, or the request fails, or the phone is offline,
the switch turns itself back off and the night is written exactly as before.

## Why the microphone is not here

On the web you can answer the companion out loud. On the phone you type.

On-device speech recognition needs a native module, and Expo Go can only load
the native modules it was built with — so a microphone button in Expo Go would
be a button that does nothing. Typing works everywhere, and the companion
answers in character either way. When this moves to a development build,
`expo-speech-recognition` is the piece to add, and `Conversation` in
`src/screens/Session.tsx` is the one place that changes.

## Versions

Every dependency is pinned to the version **Expo SDK 57 bundles**
(`expo/bundledNativeModules.json`). This is not fussiness: Expo Go ships one
exact set of native modules, so a newer `react-native` or `react-native-svg`
does not load — and it fails on the phone, not at install time. `npx expo
install <package>` picks the right version; `npm install <package>` does not.

`npm run export` bundles both platforms with Metro and is the fastest way to
find out whether a change survives a real build.

## Where the code is

```
App.tsx                  the screen router
src/theme.ts             colours, spacing, type
src/ui.tsx               Button, Chip, Card, Screen, the two type voices
src/chrome.tsx           bottom nav, settings sheet, paywall, toast
src/art/NightScene.tsx   the SVG artwork
src/audio/narrator.ts    the speaking queue, with a watchdog per paragraph
src/audio/ambience.ts    the generated ambience loops
src/session/             one night: segments, clock, talking back
src/screens/             every screen
src/state/appState.tsx   all of it, in one store
src/shared/              the platform-neutral half, copied from ../app
```

`src/shared/**` is a deliberate copy of the modules the web app and this app
both need — the dictionaries, the wire contract, the offline narrator, the
weather reader, the memory rules. Metro can be pointed at a folder outside the
project, but it is fragile in Expo Go and it breaks EAS builds in ways that are
hard to see. `tests/drift.test.ts` in the repository root fails the moment any
copy stops matching its original, which is the guarantee that matters.

## Going to the stores

```bash
npm install -g eas-cli
eas login
eas build:configure      # writes the real projectId into app.json
eas build --platform ios
eas build --platform android
eas submit --platform ios
```

Before the first submission: replace the placeholder `extra.eas.projectId` in
`app.json`, raise `ios.buildNumber` and `android.versionCode` for every upload,
and write a privacy policy — both stores require one, and the honest version is
short, because the only thing that leaves the phone is a rounded coordinate,
and only when the switch is on.
