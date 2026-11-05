import type { Messages } from './locales/en';
import en from './locales/en';
import zhCN from './locales/zh-CN';
import ja from './locales/ja';

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends string ? string : T[K] extends readonly string[] ? string[] : DeepPartial<T[K]>;
};

export interface LocaleDef {
  /** BCP 47 tag, also written to <html lang>. */
  code: string;
  /** Name in its own language, shown in the switcher. */
  name: string;
  /** Short badge shown in the compact header button. */
  short: string;
  dir?: 'ltr' | 'rtl';
  /** May be partial: missing keys fall back to English. */
  messages: DeepPartial<Messages>;
}

/**
 * To add a language: create `locales/<code>.ts` (typed as `DeepPartial<Messages>` or `Messages`)
 * and append one entry here. Nothing else needs to change.
 */
export const LOCALES: LocaleDef[] = [
  { code: 'en', name: 'English', short: 'EN', messages: en },
  { code: 'zh-CN', name: '简体中文', short: '中', messages: zhCN },
  { code: 'ja', name: '日本語', short: '日', messages: ja },
];

export const FALLBACK = en;
