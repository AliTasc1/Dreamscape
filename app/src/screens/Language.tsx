import { useState } from 'react'
import { LANGUAGE_IDS, LOCALES, preferredLanguage, type LanguageId } from '../i18n'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import { Pressable } from '../ui/Pressable'
import { Screen } from '../ui/Screen'
import styles from './Language.module.css'

/**
 * The first real decision. Everything after it — the narration, the voice, the
 * interface — is in whichever language is chosen here.
 *
 * Each option is written in its own language, so it is readable to the person
 * who needs it even if the app guessed wrong.
 */
export function Language() {
  const { chooseLanguage, lang } = useApp()
  const [selected, setSelected] = useState<LanguageId>(lang ?? preferredLanguage())
  const copy = LOCALES[selected].language

  return (
    <Screen className={styles.language}>
      <div className={styles.moon} />
      <div className={styles.title}>{copy.title}</div>
      <div className={styles.subtitle}>{copy.subtitle}</div>

      <div className={styles.choices} role="radiogroup" aria-label={copy.title}>
        {LANGUAGE_IDS.map((id) => {
          const meta = LOCALES[id].meta
          const active = selected === id
          return (
            <Pressable
              key={id}
              className={`${styles.choice}${active ? ` ${styles.choiceActive}` : ''}`}
              onClick={() => setSelected(id)}
              pressed={active}
              label={meta.nativeName}
            >
              <div>
                <div className={styles.native}>{meta.nativeName}</div>
                <div className={styles.english}>{meta.name}</div>
              </div>
              <div className={`${styles.tick}${active ? ` ${styles.tickOn}` : ''}`}>
                {active ? '✓' : ''}
              </div>
            </Pressable>
          )
        })}
      </div>

      <Button
        variant="gradientDusk"
        block
        height={56}
        fontSize={15}
        hoverScale={1.02}
        className={styles.cta}
        onClick={() => chooseLanguage(selected)}
      >
        {copy.cta}
      </Button>
      <div className={styles.note}>{copy.note}</div>
    </Screen>
  )
}
