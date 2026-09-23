#!/usr/bin/env node
/**
 * Starts the app on a public address and prints the one line worth sending.
 *
 * `expo start --tunnel` already does the hard part. Two things it does not do
 * are done here.
 *
 * The first is keeping the address the same. By default the tunnel takes a
 * random subdomain, so every restart produces a new link and whoever you gave
 * the old one to is left with a dead address. `EXPO_TUNNEL_SUBDOMAIN` pins it,
 * so the link you send today still opens next week.
 *
 * The second is saying plainly what to send. The terminal fills with a QR code
 * and a page of hints, and the address is one line in the middle of it.
 *
 * No account and no login: the tunnel is anonymous, and everything the app
 * needs to run a night is already on the phone.
 */

import { spawn } from 'node:child_process'

/**
 * Subdomains are global, so this one is specific enough not to collide. If it
 * ever is taken the tunnel will say so — set EXPO_TUNNEL_SUBDOMAIN to
 * something else, or to an empty string for a random one.
 */
const DEFAULT_SUBDOMAIN = 'dreamscape-night'

const subdomain = process.env.EXPO_TUNNEL_SUBDOMAIN ?? DEFAULT_SUBDOMAIN

console.log('')
console.log('  Dreamscape — starting a public tunnel.')
console.log('')
console.log('  In a moment the line below the QR code will read')
console.log('')
console.log(
  subdomain
    ? `      exp://${subdomain}… .exp.direct`
    : '      exp://… .exp.direct   (a different address every time)',
)
console.log('')
console.log('  That whole line is the link to send. Copy it exactly as printed.')
if (subdomain) {
  console.log('  It stays the same every time you run this, so send it once.')
}
console.log('')
console.log('  This window has to stay open while anyone is using the app.')
console.log('')

const child = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['expo', 'start', '--tunnel'],
  {
    // Inherited throughout, or the QR code and the keyboard shortcuts stop
    // working — the CLI checks whether it is talking to a terminal.
    stdio: 'inherit',
    env: { ...process.env, ...(subdomain ? { EXPO_TUNNEL_SUBDOMAIN: subdomain } : {}) },
    shell: process.platform === 'win32',
  },
)

child.on('exit', (code) => process.exit(code ?? 0))
child.on('error', (error) => {
  console.error('\n  Could not start Expo:', error.message)
  process.exit(1)
})
