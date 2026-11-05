import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface TabItem<T extends string> {
  id: T;
  label: ReactNode;
  icon?: ReactNode;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  idPrefix: string;
}

/** Tab bar with an animated underline indicator; horizontally scrollable on small screens. */
export function Tabs<T extends string>({ items, value, onChange, ariaLabel, idPrefix }: TabsProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current?.querySelector<HTMLElement>('[aria-selected="true"]');
      if (el) setInd({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [value, items]);

  // Keep the active tab visible inside the horizontally scrollable bar (never scrolls the page).
  useLayoutEffect(() => {
    const bar = ref.current;
    const el = bar?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!bar || !el) return;
    if (el.offsetLeft < bar.scrollLeft) bar.scrollTo({ left: el.offsetLeft - 8, behavior: 'smooth' });
    else if (el.offsetLeft + el.offsetWidth > bar.scrollLeft + bar.clientWidth)
      bar.scrollTo({ left: el.offsetLeft + el.offsetWidth - bar.clientWidth + 8, behavior: 'smooth' });
  }, [value]);

  const onKey = (e: KeyboardEvent) => {
    const i = items.findIndex((t) => t.id === value);
    let n = i;
    if (e.key === 'ArrowRight') n = (i + 1) % items.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + items.length) % items.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = items.length - 1;
    else return;
    e.preventDefault();
    onChange(items[n].id);
    ref.current?.querySelectorAll<HTMLElement>('[role="tab"]')[n]?.focus();
  };

  return (
    <div className="tabs" role="tablist" aria-label={ariaLabel} ref={ref} onKeyDown={onKey}>
      {ind && <span className="tabs-indicator" style={{ transform: `translateX(${ind.left}px)`, width: ind.width }} />}
      {items.map((t, i) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          id={`${idPrefix}-tab-${t.id}`}
          aria-controls={`${idPrefix}-panel`}
          aria-selected={t.id === value}
          tabIndex={t.id === value ? 0 : -1}
          className="tab"
          onClick={() => onChange(t.id)}
        >
          <span className="tab-num">{String(i + 1).padStart(2, '0')}</span>
          {t.icon}
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}
