import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface SegOption<T extends string> {
  value: T;
  label: ReactNode;
}

interface SegmentedProps<T extends string> {
  value: T;
  options: SegOption<T>[];
  onChange: (v: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

/** Radio group with a sliding highlight pill. Arrow keys move the selection. */
export function Segmented<T extends string>({ value, options, onChange, ariaLabel, size = 'md', disabled }: SegmentedProps<T>) {
  const wrap = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = wrap.current?.querySelector<HTMLElement>('[aria-checked="true"]');
      if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [value, options]);

  const onKey = (e: KeyboardEvent) => {
    const i = options.findIndex((o) => o.value === value);
    let n = i;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % options.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + options.length) % options.length;
    else return;
    e.preventDefault();
    onChange(options[n].value);
    wrap.current?.querySelectorAll<HTMLElement>('[role="radio"]')[n]?.focus();
  };

  return (
    <div
      ref={wrap}
      className={`segmented seg-${size}${disabled ? ' is-disabled' : ''}`}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKey}
    >
      {pill && <span className="seg-pill" style={{ transform: `translateX(${pill.left}px)`, width: pill.width }} aria-hidden />}
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          disabled={disabled}
          className="seg-btn"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
