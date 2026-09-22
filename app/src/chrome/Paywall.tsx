import { FREE_MAX_MINUTES, PREMIUM_MAX_MINUTES } from '../domain/options'
import { useI18n } from '../i18n'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import styles from './Paywall.module.css'

/** Shown the moment a free account reaches for a length it cannot have. */
export function Paywall() {
  const { t, f } = useI18n()
  const app = useApp()

  return (
    <>
      <button
        type="button"
        className={styles.backdrop}
        onClick={app.closePaywall}
        aria-label={t.common.close}
      />
      <div className={styles.panel} role="dialog" aria-label={t.paywall.title}>
        <div className={styles.grabber} />
        <div className={styles.moon} />
        <div className={styles.title}>{t.paywall.title}</div>
        <div className={styles.body}>
          {f(t.paywall.body, { free: FREE_MAX_MINUTES, premium: PREMIUM_MAX_MINUTES })}
        </div>
        <Button
          variant="gradientEmber"
          block
          height={54}
          fontSize={15}
          className={styles.cta}
          onClick={() => {
            app.closePaywall()
            app.go('premium')
          }}
        >
          {t.paywall.cta}
        </Button>
        <Button variant="ghost" block className={styles.later} onClick={app.closePaywall}>
          {t.paywall.later}
        </Button>
      </div>
    </>
  )
}
