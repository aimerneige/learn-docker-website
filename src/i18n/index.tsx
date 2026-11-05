import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Messages } from './locales/en';
import { FALLBACK, LOCALES, type DeepPartial, type LocaleDef } from './registry';

const STORAGE_KEY = 'ld-locale';

function merge<T>(base: T, over: DeepPartial<T> | undefined): T {
  if (!over) return base;
  const out: Record<string, unknown> = Array.isArray(base) ? ([...base] as never) : { ...(base as object) };
  for (const [k, v] of Object.entries(over)) {
    const b = (base as Record<string, unknown>)[k];
    if (v === undefined) continue;
    out[k] = b && typeof b === 'object' && !Array.isArray(b) ? merge(b, v as never) : v;
  }
  return out as T;
}

/** Replace `{name}` placeholders. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

function detect(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LOCALES.some((l) => l.code === saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  const wanted = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : [];
  for (const tag of wanted) {
    const lower = tag.toLowerCase();
    const exact = LOCALES.find((l) => l.code.toLowerCase() === lower);
    if (exact) return exact.code;
    const prefix = LOCALES.find((l) => l.code.toLowerCase().split('-')[0] === lower.split('-')[0]);
    if (prefix) return prefix.code;
  }
  return LOCALES[0].code;
}

interface I18nValue {
  t: Messages;
  locale: LocaleDef;
  locales: LocaleDef[];
  setLocale: (code: string) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState(detect);
  const locale = LOCALES.find((l) => l.code === code) ?? LOCALES[0];
  const t = useMemo(() => merge(FALLBACK, locale.messages), [locale]);

  useEffect(() => {
    document.documentElement.lang = locale.code;
    document.documentElement.dir = locale.dir ?? 'ltr';
    document.title = t.meta.title;
  }, [locale, t]);

  const setLocale = useCallback((next: string) => {
    setCode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ t, locale, locales: LOCALES, setLocale }), [t, locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
