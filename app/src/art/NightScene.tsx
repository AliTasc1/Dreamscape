import { useId } from 'react'

/**
 * The one piece of artwork in the app.
 *
 * A moon over a ridge, with water beneath it. It is drawn rather than
 * photographed so it scales to any card, weighs a few kilobytes, and can be
 * retinted per context instead of needing a picture for every scene. Four
 * palettes cover the whole product: cold night, firelight, deep dream, and the
 * green of somewhere wooded.
 */

export type ScenePalette = 'indigo' | 'ember' | 'violet' | 'teal'

interface Palette {
  skyTop: string
  skyMid: string
  skyLow: string
  haze: string
  ridgeFar: string
  ridgeNear: string
  water: string
  glow: string
}

const PALETTES: Record<ScenePalette, Palette> = {
  indigo: {
    skyTop: '#1B2450',
    skyMid: '#111A3C',
    skyLow: '#0A0E20',
    haze: 'rgba(120,132,255,.20)',
    ridgeFar: '#141C3A',
    ridgeNear: '#0A0F22',
    water: '#0D1430',
    glow: 'rgba(150,160,255,.30)',
  },
  ember: {
    skyTop: '#2C2545',
    skyMid: '#241a2e',
    skyLow: '#120C18',
    haze: 'rgba(240,168,104,.18)',
    ridgeFar: '#241A28',
    ridgeNear: '#120B14',
    water: '#1A1020',
    glow: 'rgba(240,186,140,.30)',
  },
  violet: {
    skyTop: '#2A2358',
    skyMid: '#1C1740',
    skyLow: '#0D0A20',
    haze: 'rgba(180,150,255,.20)',
    ridgeFar: '#1E1942',
    ridgeNear: '#100C26',
    water: '#150F30',
    glow: 'rgba(196,169,232,.32)',
  },
  teal: {
    skyTop: '#16323F',
    skyMid: '#0F2430',
    skyLow: '#07131A',
    haze: 'rgba(120,200,210,.16)',
    ridgeFar: '#102A2A',
    ridgeNear: '#071616',
    water: '#0A1E26',
    glow: 'rgba(160,220,225,.26)',
  },
}

/** Hand-placed so the field never reads as a grid. */
const STARS: readonly (readonly [number, number, number])[] = [
  [28, 26, 1.1],
  [61, 18, 0.9],
  [96, 40, 1.3],
  [134, 22, 0.8],
  [168, 46, 1.1],
  [205, 15, 1.0],
  [246, 38, 0.9],
  [288, 24, 1.2],
  [332, 44, 0.9],
  [358, 20, 1.1],
  [44, 62, 0.8],
  [118, 70, 1.0],
  [190, 78, 0.8],
  [262, 66, 1.1],
  [318, 82, 0.9],
  [82, 100, 0.8],
  [228, 104, 0.9],
  [300, 118, 0.8],
]

interface Props {
  palette?: ScenePalette
  /** Where the moon sits, as a fraction of the width. */
  moonX?: number
  className?: string
  /** Stars twinkle unless the scene is a small, static thumbnail. */
  still?: boolean
}

export function NightScene({
  palette = 'indigo',
  moonX = 0.72,
  className,
  still = false,
}: Props) {
  const id = useId().replace(/:/g, '')
  const p = PALETTES[palette]
  const cx = 390 * moonX

  return (
    <svg
      className={className}
      viewBox="0 0 390 280"
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
      aria-hidden="true"
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.skyTop} />
          <stop offset="55%" stopColor={p.skyMid} />
          <stop offset="100%" stopColor={p.skyLow} />
        </linearGradient>

        <radialGradient id={`${id}-halo`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={p.glow} />
          <stop offset="55%" stopColor={p.glow} stopOpacity="0.25" />
          <stop offset="100%" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>

        <radialGradient id={`${id}-moon`} cx="36%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#FBFAFF" />
          <stop offset="45%" stopColor="#DCDDF5" />
          <stop offset="78%" stopColor="#A9ADD4" />
          <stop offset="100%" stopColor="#70739B" />
        </radialGradient>

        <linearGradient id={`${id}-haze`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={p.haze} stopOpacity="0" />
          <stop offset="50%" stopColor={p.haze} />
          <stop offset="100%" stopColor={p.haze} stopOpacity="0" />
        </linearGradient>

        <linearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.water} />
          <stop offset="100%" stopColor={p.skyLow} />
        </linearGradient>

        <linearGradient id={`${id}-reflection`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        <linearGradient id={`${id}-scrim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.skyLow} stopOpacity="0" />
          <stop offset="100%" stopColor={p.skyLow} />
        </linearGradient>

        <filter id={`${id}-soft`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      <rect width="390" height="280" fill={`url(#${id}-sky)`} />

      <g>
        {STARS.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#EAECF7" opacity={0.5}>
            {!still && (
              <animate
                attributeName="opacity"
                values="0.18;0.85;0.18"
                dur={`${5 + (i % 5)}s`}
                begin={`${i * 0.37}s`}
                repeatCount="indefinite"
              />
            )}
          </circle>
        ))}
      </g>

      {/* A band of cloud, drifting slowly across the upper sky. */}
      <g opacity="0.55" filter={`url(#${id}-soft)`}>
        <ellipse cx="150" cy="98" rx="200" ry="20" fill={`url(#${id}-haze)`}>
          {!still && (
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0; -46 6; 0 0"
              dur="52s"
              repeatCount="indefinite"
            />
          )}
        </ellipse>
      </g>

      <circle cx={cx} cy="74" r="66" fill={`url(#${id}-halo)`} />
      <circle cx={cx} cy="74" r="27" fill={`url(#${id}-moon)`} />
      {/* Two faint maria, so the disc is a moon and not a dot. */}
      <circle cx={cx - 8} cy="67" r="6" fill="#B9BCDC" opacity="0.35" />
      <circle cx={cx + 7} cy="82" r="4" fill="#B9BCDC" opacity="0.28" />

      <path
        d="M0 196 L38 178 L74 188 L116 162 L158 182 L196 166 L238 186 L286 160 L330 184 L390 168 L390 280 L0 280 Z"
        fill={p.ridgeFar}
        opacity="0.78"
      />
      <path
        d="M0 214 L46 200 L92 212 L140 192 L190 210 L242 196 L296 214 L344 200 L390 212 L390 280 L0 280 Z"
        fill={p.ridgeNear}
      />

      <rect x="0" y="236" width="390" height="44" fill={`url(#${id}-water)`} />
      {/* The moon, broken up on the water. */}
      <g opacity="0.75">
        <rect x={cx - 15} y="238" width="30" height="40" fill={`url(#${id}-reflection)`} />
        <rect x={cx - 24} y="243" width="48" height="1.5" rx="0.75" fill="#FFFFFF" opacity="0.16" />
        <rect x={cx - 17} y="252" width="34" height="1.2" rx="0.6" fill="#FFFFFF" opacity="0.12" />
        <rect x={cx - 26} y="262" width="52" height="1" rx="0.5" fill="#FFFFFF" opacity="0.09" />
      </g>

      {/* Mist where the ridge meets the water, so the two are not a hard seam. */}
      <ellipse
        cx="196"
        cy="230"
        rx="240"
        ry="16"
        fill={p.skyLow}
        opacity="0.45"
        filter={`url(#${id}-soft)`}
      />
      <rect x="0" y="222" width="390" height="58" fill={`url(#${id}-scrim)`} opacity="0.85" />
    </svg>
  )
}
