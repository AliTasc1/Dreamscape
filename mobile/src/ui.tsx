import type { ReactNode } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { color, radius, space } from './theme'

/**
 * The shared pieces, in one file.
 *
 * Small enough to read at once, and keeping them together means the two type
 * voices — interface sans, companion serif — are defined in exactly one place.
 */

/* ------------------------------------------------------------ type ---- */

export function UiText({
  children,
  size = 14,
  weight = '300',
  tone = color.ink55,
  style,
  center,
  upper,
}: {
  children: ReactNode
  size?: number
  weight?: TextStyle['fontWeight']
  tone?: string
  style?: StyleProp<TextStyle>
  center?: boolean
  upper?: boolean
}) {
  return (
    <Text
      style={[
        { fontSize: size, fontWeight: weight, color: tone, lineHeight: size * 1.65 },
        center && { textAlign: 'center' },
        upper && { textTransform: 'uppercase', letterSpacing: size * 0.18 },
        style,
      ]}
    >
      {children}
    </Text>
  )
}

/** Anything the companion would say out loud takes the serif. */
export function VoiceText({
  children,
  size = 20,
  tone = color.ink70,
  style,
  center,
  italic = true,
}: {
  children: ReactNode
  size?: number
  tone?: string
  style?: StyleProp<TextStyle>
  center?: boolean
  italic?: boolean
}) {
  return (
    <Text
      style={[
        {
          fontFamily: 'serif',
          fontSize: size,
          lineHeight: size * 1.5,
          color: tone,
          fontStyle: italic ? 'italic' : 'normal',
          fontWeight: '300',
        },
        center && { textAlign: 'center' },
        style,
      ]}
    >
      {children}
    </Text>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <Text style={styles.eyebrow} allowFontScaling>
      {children}
    </Text>
  )
}

/* ---------------------------------------------------------- layout ---- */

export function Screen({
  children,
  scroll,
  style,
  padded = true,
}: {
  children: ReactNode
  scroll?: boolean
  style?: StyleProp<ViewStyle>
  padded?: boolean
}) {
  const insets = useSafeAreaInsets()
  const padding = padded
    ? {
        paddingTop: insets.top + 16,
        paddingHorizontal: space.screenX,
        paddingBottom: space.navHeight + insets.bottom + 24,
      }
    : null

  if (scroll) {
    return (
      <ScrollView
        style={styles.fill}
        contentContainerStyle={[padding, style]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    )
  }
  return <View style={[styles.fill, padding, style]}>{children}</View>
}

/* ---------------------------------------------------------- button ---- */

type Variant = 'solid' | 'outline' | 'ghost' | 'glass' | 'danger' | 'gradientDusk' | 'gradientEmber'

export function Button({
  label,
  onPress,
  variant = 'solid',
  height = 54,
  fontSize = 14,
  block,
  disabled,
  style,
}: {
  label: string
  onPress?: () => void
  variant?: Variant
  height?: number
  fontSize?: number
  block?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const gradient =
    variant === 'gradientDusk'
      ? (['#6E76D8', '#8E7FD0', '#C08C7A'] as const)
      : variant === 'gradientEmber'
        ? (['#6E76D8', '#9A82CE', '#E3A176'] as const)
        : null

  const text: TextStyle = {
    fontSize,
    fontWeight: variant === 'solid' || gradient ? '500' : '300',
    color:
      variant === 'solid' || gradient
        ? color.nightInk
        : variant === 'danger'
          ? color.danger
          : variant === 'ghost'
            ? color.ink35
            : color.ink70,
  }

  const body = (
    <View
      style={[
        styles.button,
        { height, borderRadius: radius.pill },
        variant === 'solid' && { backgroundColor: color.inkBright },
        variant === 'outline' && { borderWidth: 1, borderColor: 'rgba(234,236,247,0.16)' },
        variant === 'glass' && {
          borderWidth: 1,
          borderColor: 'rgba(234,236,247,0.14)',
          backgroundColor: color.surface,
        },
        variant === 'danger' && { borderWidth: 1, borderColor: color.dangerLine },
        block && styles.block,
        disabled && styles.disabled,
        !gradient && style,
      ]}
    >
      <Text style={text}>{label}</Text>
    </View>
  )

  const content = gradient ? (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.button,
        { height, borderRadius: radius.pill },
        block && styles.block,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={text}>{label}</Text>
    </LinearGradient>
  ) : (
    body
  )

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [pressed && !disabled && styles.pressed, block && styles.block]}
    >
      {content}
    </Pressable>
  )
}

/* ------------------------------------------------------------ chip ---- */

export function Chip({
  label,
  active,
  onPress,
  disabled,
}: {
  label: string
  active?: boolean
  onPress?: () => void
  disabled?: boolean
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </Pressable>
  )
}

export function Card({
  children,
  onPress,
  style,
}: {
  children: ReactNode
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
    >
      {children}
    </Pressable>
  )
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>
}

export function Wrap({ children }: { children: ReactNode }) {
  return <View style={styles.wrap}>{children}</View>
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  eyebrow: {
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: color.ink32,
  },
  button: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26 },
  block: { width: '100%' },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.4 },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: 'rgba(234,236,247,0.09)',
  },
  chipActive: {
    backgroundColor: 'rgba(169,176,255,0.18)',
    borderColor: 'rgba(169,176,255,0.5)',
  },
  chipLabel: { fontSize: 12.5, fontWeight: '300', color: color.ink55 },
  chipLabelActive: { color: color.inkBright },
  card: {
    borderRadius: 20,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
    padding: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
