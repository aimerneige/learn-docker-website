import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AlertIcon, CheckIcon, InfoIcon } from './Icons';

type Kind = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  kind: Kind;
  text: string;
  leaving?: boolean;
}

const ToastContext = createContext<(text: string, kind?: Kind) => void>(() => {});

/** Non-blocking, themed notifications that replace window.alert. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 260);
  }, []);

  const push = useCallback(
    (text: string, kind: Kind = 'success') => {
      const id = ++seq.current;
      setItems((list) => [...list.slice(-2), { id, kind, text }]);
      window.setTimeout(() => dismiss(id), 2600);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}${t.leaving ? ' is-leaving' : ''}`} onClick={() => dismiss(t.id)}>
            <span className="toast-icon">
              {t.kind === 'success' ? <CheckIcon /> : t.kind === 'error' ? <AlertIcon /> : <InfoIcon />}
            </span>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
