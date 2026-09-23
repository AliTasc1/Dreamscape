# Tests

One suite for all three projects.

```bash
cd ../server && npm install && npm run build   # server.test.ts runs the real build
cd ../tests && npm install && npm test
```

TypeScript compiles to `dist/` and Node's own test runner runs it — no
framework, no config beyond `tsconfig.json`.

| File | What it protects |
| --- | --- |
| `sky.test.ts` | Open-Meteo: real responses, broken ones, an offline phone, and the rounding that happens before a coordinate leaves the device |
| `validate.test.ts` | Everything arriving at the server: lengths, ids, memory, and the fields that would otherwise become a bill |
| `server.test.ts` | The built server over a socket: path traversal, rate limiting, method handling, and what an error is allowed to say |
| `drift.test.ts` | The modules that exist as copies in more than one project, and the two dictionaries |
| `freeMode.test.ts` | The night that runs with no keys at all |

## Two things worth knowing

**`sky.test.ts` never touches the network.** `fetch` is replaced per case, so
the suite runs offline. It proves the parsing and the failure paths; it does
not prove Open-Meteo is up. That is what running the app does.

**`server.test.ts` starts the real server** as a child process with every API
key explicitly blank, plants a file called `secret.txt` one directory above the
build, and then tries twelve ways of reaching it. A traversal check that passes
in a unit test and fails behind `http.createServer` has protected nobody.
