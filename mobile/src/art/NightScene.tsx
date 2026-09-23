import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg'

/**
 * The same moonlit scene as the web app, drawn with react-native-svg.
 *
 * Drawn rather than photographed so it weighs nothing in the bundle, scales to
 * any card, and retints per context — four palettes cover the whole product.
 * The web version animates its stars; here they are still, because a looping
 * animation behind a sleep app is a battery cost with no payoff.
 */

export type ScenePalette = 'indigo' | 'ember' | 'violet' | 'teal'

const PALETTES: Record<
  ScenePalette,
  { skyTop: string; skyMid: string; skyLow: string; ridgeFar: string; ridgeNear: string; water: string; glow: string }
> = {
  indigo: { skyTop: '#1B2450', skyMid: '#111A3C', skyLow: '#0A0E20', ridgeFar: '#141C3A', ridgeNear: '#0A0F22', water: '#0D1430', glow: '#96A0FF' },
  ember: { skyTop: '#2C2545', skyMid: '#241A2E', skyLow: '#120C18', ridgeFar: '#241A28', ridgeNear: '#120B14', water: '#1A1020', glow: '#F0BA8C' },
  violet: { skyTop: '#2A2358', skyMid: '#1C1740', skyLow: '#0D0A20', ridgeFar: '#1E1942', ridgeNear: '#100C26', water: '#150F30', glow: '#C4A9E8' },
  teal: { skyTop: '#16323F', skyMid: '#0F2430', skyLow: '#07131A', ridgeFar: '#102A2A', ridgeNear: '#071616', water: '#0A1E26', glow: '#A0DCE1' },
}

const STARS: readonly (readonly [number, number, number])[] = [
  [28, 26, 1.1], [61, 18, 0.9], [96, 40, 1.3], [134, 22, 0.8], [168, 46, 1.1],
  [205, 15, 1.0], [246, 38, 0.9], [288, 24, 1.2], [332, 44, 0.9], [358, 20, 1.1],
  [44, 62, 0.8], [118, 70, 1.0], [190, 78, 0.8], [262, 66, 1.1], [318, 82, 0.9],
  [82, 100, 0.8], [228, 104, 0.9], [300, 118, 0.8],
]

export function NightScene({
  palette = 'indigo',
  moonX = 0.72,
}: {
  palette?: ScenePalette
  moonX?: number
}) {
  const p = PALETTES[palette]
  const cx = 390 * moonX
  const id = palette

  return (
    <Svg viewBox="0 0 390 280" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={p.skyTop} />
          <Stop offset="55%" stopColor={p.skyMid} />
          <Stop offset="100%" stopColor={p.skyLow} />
        </LinearGradient>
        <RadialGradient id={`${id}-halo`} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={p.glow} stopOpacity="0.30" />
          <Stop offset="55%" stopColor={p.glow} stopOpacity="0.10" />
          <Stop offset="100%" stopColor={p.glow} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={`${id}-moon`} cx="36%" cy="32%" r="72%">
          <Stop offset="0%" stopColor="#FBFAFF" />
          <Stop offset="45%" stopColor="#DCDDF5" />
          <Stop offset="78%" stopColor="#A9ADD4" />
          <Stop offset="100%" stopColor="#70739B" />
        </RadialGradient>
        <LinearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={p.water} />
          <Stop offset="100%" stopColor={p.skyLow} />
        </LinearGradient>
        <LinearGradient id={`${id}-scrim`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={p.skyLow} stopOpacity="0" />
          <Stop offset="100%" stopColor={p.skyLow} stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id={`${id}-reflection`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
      </Defs>

      <Rect width="390" height="280" fill={`url(#${id}-sky)`} />

      {STARS.map(([x, y, r], i) => (
        <Circle key={i} cx={x} cy={y} r={r} fill="#EAECF7" opacity={0.5} />
      ))}

      <Ellipse cx="150" cy="98" rx="200" ry="20" fill={p.glow} opacity={0.06} />

      <Circle cx={cx} cy={74} r={66} fill={`url(#${id}-halo)`} />
      <Circle cx={cx} cy={74} r={27} fill={`url(#${id}-moon)`} />
      <Circle cx={cx - 8} cy={67} r={6} fill="#B9BCDC" opacity={0.35} />
      <Circle cx={cx + 7} cy={82} r={4} fill="#B9BCDC" opacity={0.28} />

      <Path
        d="M0 196 L38 178 L74 188 L116 162 L158 182 L196 166 L238 186 L286 160 L330 184 L390 168 L390 280 L0 280 Z"
        fill={p.ridgeFar}
        opacity={0.78}
      />
      <Path
        d="M0 214 L46 200 L92 212 L140 192 L190 210 L242 196 L296 214 L344 200 L390 212 L390 280 L0 280 Z"
        fill={p.ridgeNear}
      />

      <Rect x="0" y="236" width="390" height="44" fill={`url(#${id}-water)`} />
      <Rect x={cx - 15} y="238" width="30" height="40" fill={`url(#${id}-reflection)`} opacity={0.75} />
      <Rect x={cx - 24} y="243" width="48" height="1.5" rx="0.75" fill="#FFFFFF" opacity={0.14} />
      <Rect x={cx - 17} y="252" width="34" height="1.2" rx="0.6" fill="#FFFFFF" opacity={0.1} />

      <Rect x="0" y="222" width="390" height="58" fill={`url(#${id}-scrim)`} opacity={0.85} />
    </Svg>
  )
}
