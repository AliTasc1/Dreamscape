import { PLANS, PREMIUM_FEATURES } from '../data/content'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import { Pressable } from '../ui/Pressable'
import { Screen } from '../ui/Screen'
import styles from './Premium.module.css'

export function Premium() {
  const { plan, setPlan } = useApp()

  return (
    <Screen className={styles.premium}>
      <div className={styles.hero}>
        <div className={styles.moon} />
        <div className={styles.heroScrim} />
      </div>

      <div className={styles.body}>
        <div className={styles.title}>Go deeper into your dreams.</div>

        <div className={styles.features}>
          {PREMIUM_FEATURES.map((feature) => (
            <div key={feature} className={styles.feature}>
              <div className={styles.bullet} />
              <div className={styles.featureText}>{feature}</div>
            </div>
          ))}
        </div>

        <div className={styles.plans}>
          {PLANS.map((option) => (
            <Pressable
              key={option.name}
              className={`${styles.plan}${plan === option.name ? ` ${styles.planActive}` : ''}`}
              onClick={() => setPlan(option.name)}
              pressed={plan === option.name}
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
        >
          Start 7 quiet nights free
        </Button>
        <div className={styles.fine}>Cancel any time. No reminders, ever.</div>
      </div>
    </Screen>
  )
}
