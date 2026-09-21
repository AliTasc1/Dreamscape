import { STAR_POSITIONS } from '../data/content'
import styles from './Sky.module.css'

export function Sky() {
  return (
    <>
      <div className={styles.base} />
      <div className={styles.field} aria-hidden="true">
        {STAR_POSITIONS.map(([left, top], i) => (
          <div
            key={`${left}-${top}`}
            data-decor
            className={styles.star}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              animation: `twinkle ${5 + (i % 5)}s ease-in-out ${i * 0.4}s infinite`,
            }}
          />
        ))}
        <div data-decor className={styles.cloud} />
      </div>
    </>
  )
}
