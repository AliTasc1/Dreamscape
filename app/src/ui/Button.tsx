import type { ButtonHTMLAttributes, CSSProperties } from 'react'
import styles from './Button.module.css'

type Variant =
  | 'solid'
  | 'solidSoft'
  | 'outline'
  | 'ghost'
  | 'link'
  | 'danger'
  | 'gradientDusk'
  | 'gradientEmber'
  | 'glass'
  | 'glassFlat'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: Variant
  block?: boolean
  /** Fixed pill height in px, matching the design. */
  height?: number
  paddingX?: number
  fontSize?: number
  /** Scale applied on hover; omit for buttons that stay still. */
  hoverScale?: number
}

export function Button({
  variant,
  block,
  height,
  paddingX,
  fontSize,
  hoverScale,
  className,
  style,
  ...rest
}: Props) {
  const classes = [styles.button, styles[variant]]
  if (block) classes.push(styles.block)
  if (hoverScale) classes.push(styles.lift)
  if (className) classes.push(className)

  const vars: CSSProperties = {
    height,
    paddingLeft: paddingX,
    paddingRight: paddingX,
    fontSize,
    ...(hoverScale ? ({ '--hover-scale': hoverScale } as CSSProperties) : null),
    ...style,
  }

  return <button type="button" className={classes.join(' ')} style={vars} {...rest} />
}
