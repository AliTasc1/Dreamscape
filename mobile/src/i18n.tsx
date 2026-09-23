import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { en } from './shared/i18n/en'
import { tr } from './shared/i18n/tr'
import { LANGUAGE_IDS, type LanguageId, type Locale } from './shared/i18n/types'

export type { LanguageId, Locale }
export { LANGUAGE_IDS }

export const LOCALES: Record<LanguageId, Locale> = { tr, en }

export function isLanguageId(value: unknown): value is LanguageId {
  return typeof value === 'string' && (LANGUAGE_IDS as readonly string[]).includes(value)
}

export function fill(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  )
}

interface I18nValue {
  lang: LanguageId
  t: Locale
  f: typeof fill
  minutes: (n: number) => string
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ lang, children }: { lang: LanguageId; children: ReactNode }) {
  const value = useMemo<I18nValue>(() => {
    const t = LOCALES[lang]
    return { lang, t, f: fill, minutes: (n) => fill(t.common.minutes, { n }) }
  }, [lang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>')
  return value
}
