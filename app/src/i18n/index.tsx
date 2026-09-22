import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { en } from './en'
import { tr } from './tr'
import { LANGUAGE_IDS, type LanguageId, type Locale } from './types'

export type { LanguageId, Locale }
export { LANGUAGE_IDS }

export const LOCALES: Record<LanguageId, Locale> = { tr, en }

/** Ordered for the picker: the device's own language first when we know it. */
export function preferredLanguage(): LanguageId {
  const navigatorLanguages =
    typeof navigator === 'undefined' ? [] : [navigator.language, ...(navigator.languages ?? [])]
  for (const tag of navigatorLanguages) {
    const base = tag?.slice(0, 2).toLowerCase()
    if (base && (LANGUAGE_IDS as readonly string[]).includes(base)) return base as LanguageId
  }
  return 'en'
}

export function isLanguageId(value: unknown): value is LanguageId {
  return typeof value === 'string' && (LANGUAGE_IDS as readonly string[]).includes(value)
}

/** Replaces `{name}` style placeholders. */
export function fill(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  )
}

interface I18nValue {
  lang: LanguageId
  t: Locale
  /** Formats a template string from the dictionary. */
  f: (template: string, vars?: Record<string, string | number>) => string
  /** Locale-aware minute label, e.g. "30 min" / "30 dk". */
  minutes: (n: number) => string
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ lang, children }: { lang: LanguageId; children: ReactNode }) {
  const value = useMemo<I18nValue>(() => {
    const t = LOCALES[lang]
    return {
      lang,
      t,
      f: fill,
      minutes: (n: number) => fill(t.common.minutes, { n }),
    }
  }, [lang])

  useEffect(() => {
    document.documentElement.lang = LOCALES[lang].meta.htmlLang
  }, [lang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>')
  return value
}
