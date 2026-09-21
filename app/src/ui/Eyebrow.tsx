import type { CSSProperties, ReactNode } from 'react'
import styles from './Eyebrow.module.css'

/** The small uppercase section label used across every list screen. */
export function Eyebrow({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className={styles.eyebrow} style={style}>
      {children}
    </div>
  )
}
