import { NIGHTS } from '../data/content'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import { Pressable } from '../ui/Pressable'
import { Screen } from '../ui/Screen'
import styles from './MyNights.module.css'

export function MyNights() {
  const { nightsEmpty, toggleNightsEmpty, go } = useApp()

  return (
    <Screen scroll>
      <div className={styles.header}>
        <div className={styles.title}>My Nights</div>
        {/* Carried over from the prototype so the empty state stays reviewable. */}
        <Button variant="link" className={styles.stateToggle} onClick={toggleNightsEmpty}>
          {nightsEmpty ? 'show filled state' : 'show empty state'}
        </Button>
      </div>

      {nightsEmpty ? (
        <div className={styles.empty}>
          <div className={styles.emptyRing}>
            <div className={styles.emptyMoon} />
          </div>
          <div className={styles.emptyLine}>Your first journey is waiting.</div>
          <div className={styles.emptyCopy}>
            Describe a place tonight and it will live here in the morning.
          </div>
          <Button
            variant="solid"
            height={50}
            paddingX={32}
            fontSize={14}
            onClick={() => go('create')}
          >
            Create a Dream
          </Button>
        </div>
      ) : (
        <div className={styles.list}>
          {NIGHTS.map((night) => (
            <Pressable key={night.title} className={styles.row} onClick={() => go('detail')}>
              <div className={styles.thumb} style={{ background: night.art }} />
              <div className={styles.rowText}>
                <div className={styles.rowTitle}>{night.title}</div>
                <div className={styles.rowMeta}>{night.meta}</div>
                <div className={styles.rowAmbient}>{night.ambient}</div>
              </div>
              <div className={styles.chevron} aria-hidden="true">
                &rsaquo;
              </div>
            </Pressable>
          ))}
        </div>
      )}
    </Screen>
  )
}
