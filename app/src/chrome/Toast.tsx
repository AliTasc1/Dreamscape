import { useEffect } from 'react'
import { useI18n } from '../i18n'
import { useApp } from '../state/appState'
import styles from './Toast.module.css'

const TOAST_MS = 3200

/** Messages are stored as dictionary paths so they survive a language switch. */
function resolve(path: string, dictionary: Record<string, unknown>): string {
  let node: unknown = dictionary
  for (const key of path.split('.')) {
    if (!node || typeof node !== 'object') return ''
    node = (node as Record<string, unknown>)[key]
  }
  return typeof node === 'string' ? node : ''
}

export function Toast() {
  const { t } = useI18n()
  const { toast, dismissToast } = useApp()

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(dismissToast, TOAST_MS)
    return () => window.clearTimeout(id)
  }, [toast, dismissToast])

  if (!toast) return null
  const message = resolve(toast, t as unknown as Record<string, unknown>)
  if (!message) return null

  return (
    <div className={styles.toast} role="status">
      {message}
    </div>
  )
}
