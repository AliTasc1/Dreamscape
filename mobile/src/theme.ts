/**
 * The web app's design tokens, as plain values.
 *
 * Same numbers, same names — the two apps are meant to look like one product,
 * and a colour that drifts between them is a bug.
 */

export const color = {
  ink: '#EAECF7',
  inkBright: '#F2F3FF',
  inkBrightest: '#F7F6FF',
  ink70: 'rgba(234,236,247,0.70)',
  ink55: 'rgba(234,236,247,0.55)',
  ink45: 'rgba(234,236,247,0.45)',
  ink40: 'rgba(234,236,247,0.40)',
  ink35: 'rgba(234,236,247,0.35)',
  ink32: 'rgba(234,236,247,0.32)',

  night: '#05070F',
  nightDeep: '#03050B',
  nightInk: '#0B0E1A',

  indigo: '#8B93FF',
  indigoSoft: '#A9B0FF',
  amber: '#F0A868',

  surface: 'rgba(234,236,247,0.04)',
  surfaceHi: 'rgba(234,236,247,0.08)',
  surfaceIndigo: 'rgba(139,147,255,0.07)',
  line: 'rgba(234,236,247,0.06)',
  lineHi: 'rgba(234,236,247,0.10)',

  danger: 'rgba(226,140,140,0.85)',
  dangerLine: 'rgba(226,130,130,0.30)',
} as const

/**
 * The interface is the system sans; anything the companion says out loud is
 * the system serif. Custom fonts would mean bundling files, and the two
 * families only have to read as "interface" and "voice".
 */
export const font = {
  ui: undefined as string | undefined,
  voice: 'serif',
} as const

export const space = {
  screenX: 22,
  navHeight: 104,
} as const

export const radius = {
  pill: 999,
  card: 22,
  sheet: 28,
} as const
