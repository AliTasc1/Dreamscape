import { NARRATION } from '../data/content'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import { Screen } from '../ui/Screen'
import { TalkOverlay } from './TalkOverlay'
import styles from './Session.module.css'

export function Session() {
  const app = useApp()
  const orbSize = app.playing ? 112 : 88

  return (
    <Screen className={styles.session} onClick={app.wakeUi}>
      <div className={styles.horizon}>
        <div data-decor className={styles.waves} />
      </div>
      <div data-decor className={styles.fire} />

      <div className={styles.orbStack}>
        <div data-decor className={styles.orbRing} />
        <div
          className={styles.orb}
          style={{
            width: orbSize,
            height: orbSize,
            animation: `breathe ${app.playing ? 7 : 11}s ease-in-out infinite`,
          }}
        />
      </div>

      <div className={`${styles.ui}${app.ui ? '' : ` ${styles.uiDim}`}`}>
        <div className={styles.topBar}>
          <Button
            variant="glassFlat"
            className={styles.pill}
            onClick={() => app.go('complete')}
          >
            End
          </Button>
          <div className={styles.state}>{app.playing ? 'Speaking' : 'Paused'}</div>
          <Button
            variant="glassFlat"
            className={styles.pill}
            onClick={() => app.go('fade')}
          >
            Sleep
          </Button>
        </div>

        <div className={styles.narration}>{NARRATION}</div>

        <div className={styles.controls}>
          {app.amb !== 'None' && (
            <div className={styles.mixRow}>
              <div className={styles.mixLabel}>{app.amb}</div>
              <div className={styles.mixTrack}>
                <div className={styles.mixFill} />
                <div className={styles.mixKnob} />
              </div>
            </div>
          )}
          <div className={styles.transport}>
            <Button variant="glass" className={styles.round} onClick={app.openTalk}>
              Talk
            </Button>
            <Button
              variant="solidSoft"
              className={styles.play}
              hoverScale={1.05}
              onClick={app.togglePlay}
            >
              {app.playing ? 'Pause' : 'Play'}
            </Button>
            <Button variant="glass" className={styles.round} onClick={app.openSheet}>
              Mix
            </Button>
          </div>
        </div>
      </div>

      {app.talk && <TalkOverlay dismissLabel="Back to the dream" />}
    </Screen>
  )
}
