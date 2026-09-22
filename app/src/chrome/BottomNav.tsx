import { useI18n } from '../i18n'
import { useApp } from '../state/appState'
import type { Screen } from '../types'
import styles from './BottomNav.module.css'

interface Tab {
  id: Screen
  label: string
  /** Sub-screens that keep this tab lit. */
  owns?: readonly Screen[]
}

export function BottomNav() {
  const { screen, go } = useApp()
  const { t } = useI18n()

  const TABS: readonly Tab[] = [
    { id: 'home', label: t.nav.home },
    { id: 'explore', label: t.nav.explore },
    { id: 'create', label: t.nav.create },
    { id: 'nights', label: t.nav.sessions, owns: ['detail'] },
    {
      id: 'profile',
      label: t.nav.profile,
      owns: ['privacy', 'premium', 'notif', 'companion', 'memory'],
    },
  ]

  return (
    <nav className={styles.nav}>
      {TABS.map((tab) => {
        const active = screen === tab.id || !!tab.owns?.includes(screen)
        const isCreate = tab.id === 'create'
        const dotClass = isCreate
          ? `${styles.orb}${active ? ` ${styles.orbActive}` : ''}`
          : `${styles.dot}${active ? ` ${styles.dotActive}` : ''}`

        return (
          <button
            key={tab.id}
            type="button"
            className={`${styles.item}${isCreate ? ` ${styles.itemCreate}` : ''}`}
            onClick={() => go(tab.id)}
            aria-current={active ? 'page' : undefined}
          >
            <div className={dotClass} />
            <div className={`${styles.label}${active ? ` ${styles.labelActive}` : ''}`}>
              {tab.label}
            </div>
          </button>
        )
      })}
    </nav>
  )
}
