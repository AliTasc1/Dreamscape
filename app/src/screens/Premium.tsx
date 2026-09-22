import { NightScene } from '../art/NightScene'
import { useI18n } from '../i18n'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import { Pressable } from '../ui/Pressable'
import { Screen } from '../ui/Screen'
import styles from './Premium.module.css'

export function Premium() {
  const { t } = useI18n()
  const app = useApp()

  const plans = [
    { id: 'monthly' as const, ...t.premium.plans.monthly },
    { id: 'yearly' as const, ...t.premium.plans.yearly },
  ]

  return (
    <Screen className={styles.premium}>
      <div className={styles.hero}>
        <NightScene palette="violet" moonX={0.5} />
        <div className={styles.heroScrim} />
      </div>

      <div className={styles.body}>
        <div className={styles.title}>{t.premium.title}</div>

        <div className={styles.features}>
          {t.premium.features.map((feature) => (
            <div key={feature} className={styles.feature}>
              <div className={styles.bullet} />
              <div className={styles.featureText}>{feature}</div>
            </div>
          ))}
        </div>

        <div className={styles.plans}>
          {plans.map((option) => (
            <Pressable
              key={option.id}
              className={`${styles.plan}${app.billing === option.id ? ` ${styles.planActive}` : ''}`}
              onClick={() => app.setBilling(option.id)}
              pressed={app.billing === option.id}
              label={`${option.name}, ${option.price}, ${option.note}`}
            >
              <div className={styles.planName}>{option.name}</div>
              <div className={styles.planPrice}>{option.price}</div>
              <div className={styles.planNote}>{option.note}</div>
            </Pressable>
          ))}
        </div>

        <Button
          variant="gradientEmber"
          block
          height={56}
          fontSize={15}
          className={styles.cta}
          onClick={app.purchasePremium}
          disabled={app.premium || app.purchasing}
          style={app.premium ? { opacity: 0.6, cursor: 'default' } : undefined}
        >
          {app.premium
            ? t.premium.ctaOwned
            : app.purchasing
              ? t.premium.purchasing
              : t.premium.cta}
        </Button>

        <div className={styles.fine}>{t.premium.fine}</div>

        {app.premium && (
          <Button
            variant="ghost"
            block
            className={styles.manage}
            onClick={app.cancelPremium}
          >
            {t.premium.cancel}
          </Button>
        )}
      </div>
    </Screen>
  )
}
