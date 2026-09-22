import { useI18n } from '../i18n'
import { useNightSession } from '../session/useNightSession'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import { Screen } from '../ui/Screen'
import { Conversation } from './Conversation'
import styles from './Session.module.css'

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function Session() {
  const { t, f } = useI18n()
  const app = useApp()
  const night = useNightSession()
  const orbSize = app.playing ? 112 : 88

  return (
    <Screen
      className={styles.session}
      onClick={() => {
        night.resumeAudio()
        app.wakeUi()
      }}
    >
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

      {app.plan?.persona.who && <div className={styles.persona}>{app.plan.persona.who}</div>}

      <div className={styles.narration} key={night.line}>
        {night.line}
      </div>

      <div className={`${styles.ui}${app.ui ? '' : ` ${styles.uiDim}`}`}>
        <div className={styles.topBar}>
          <Button
            variant="glassFlat"
            className={styles.pill}
            onClick={() => app.endNight('complete')}
          >
            {t.session.end}
          </Button>
          <div>
            <div className={styles.state}>
              {night.buffering
                ? t.session.listening
                : app.playing
                  ? t.session.speaking
                  : t.session.paused}
            </div>
            <div className={styles.clock}>
              {f(t.session.remaining, { time: clock(night.remaining) })}
            </div>
          </div>
          <Button variant="glassFlat" className={styles.pill} onClick={() => app.endNight('fade')}>
            {t.session.sleep}
          </Button>
        </div>

        <div className={styles.controls} hidden={app.talk}>
          {app.prefs.amb !== 'none' && (
            <div className={styles.mixRow}>
              <div className={styles.mixLabel}>{t.options.amb[app.prefs.amb]}</div>
              <div className={styles.mixTrack}>
                <div
                  className={styles.mixFill}
                  style={{ width: `${app.ambienceLevel * 100}%` }}
                />
                <div
                  className={styles.mixKnob}
                  style={{ left: `${app.ambienceLevel * 100}%` }}
                />
                <input
                  className={styles.mixInput}
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(app.ambienceLevel * 100)}
                  onChange={(event) => app.setAmbienceLevel(Number(event.target.value) / 100)}
                  aria-label={t.options.amb[app.prefs.amb]}
                />
              </div>
            </div>
          )}
          <div className={styles.transport}>
            <Button
              variant="glass"
              className={`${styles.round}${app.talk ? ` ${styles.roundOn}` : ''}`}
              onClick={app.talk ? app.closeTalk : app.openTalk}
              aria-pressed={app.talk}
            >
              {t.session.talk}
            </Button>
            <Button
              variant="solidSoft"
              className={styles.play}
              hoverScale={1.05}
              onClick={app.togglePlay}
            >
              {app.playing ? t.session.pause : t.session.play}
            </Button>
            <Button variant="glass" className={styles.round} onClick={app.openSheet}>
              {t.session.mix}
            </Button>
          </div>
        </div>
      </div>

      {app.talk && <Conversation night={night} />}

      {night.finished && (
        <div className={styles.timeUp}>
          <div className={styles.timeUpTitle}>
            {app.premium ? t.fade.goodnight : t.session.timeUpFree}
          </div>
          {!app.premium && <div className={styles.timeUpBody}>{t.session.timeUpFreeBody}</div>}
          <div className={styles.timeUpActions}>
            <Button
              variant="outline"
              height={50}
              paddingX={26}
              fontSize={13}
              onClick={() => app.endNight('complete')}
            >
              {t.complete.eyebrow}
            </Button>
            {!app.premium && (
              <Button
                variant="solid"
                height={50}
                paddingX={26}
                fontSize={13}
                onClick={() => app.go('premium')}
              >
                {t.session.seePremium}
              </Button>
            )}
          </div>
        </div>
      )}
    </Screen>
  )
}
