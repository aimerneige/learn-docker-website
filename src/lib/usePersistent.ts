import { useCallback, useEffect, useState } from 'react';

function mergeDefaults<T>(defaults: T, saved: unknown): T {
  if (defaults === null || typeof defaults !== 'object') return typeof saved === typeof defaults ? (saved as T) : defaults;
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return defaults;
  const out = { ...(defaults as object) } as Record<string, unknown>;
  for (const k of Object.keys(out)) {
    const d = out[k];
    const v = (saved as Record<string, unknown>)[k];
    if (v === undefined) continue;
    if (d && typeof d === 'object') out[k] = mergeDefaults(d, v);
    else if (typeof v === typeof d) out[k] = v;
  }
  return out as T;
}

/** State saved to localStorage; unknown/invalid keys fall back to defaults. */
export function usePersistent<T>(key: string, defaults: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? mergeDefaults(defaults, JSON.parse(raw)) : defaults;
    } catch {
      return defaults;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [key, value]);
  const reset = useCallback(() => setValue(defaults), [defaults]);
  return [value, setValue, reset] as const;
}
