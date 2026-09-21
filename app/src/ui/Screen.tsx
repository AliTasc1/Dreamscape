import type { CSSProperties, ReactNode } from 'react'
import styles from './Screen.module.css'

interface Props {
  children: ReactNode
  /** Adds the standard scrolling list padding (status bar above, nav below). */
  scroll?: boolean
  fade?: boolean
  className?: string
  style?: CSSProperties
  onClick?: () => void
}

export function Screen({ children, scroll, fade, className, style, onClick }: Props) {
  const classes = [styles.screen]
  if (scroll) classes.push(styles.scroll)
  if (fade) classes.push(styles.fade)
  if (className) classes.push(className)

  return (
    <div className={classes.join(' ')} style={style} onClick={onClick}>
      {children}
    </div>
  )
}
