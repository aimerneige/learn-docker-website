import { useEffect, useRef, useState } from 'react';

interface StepperProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  ariaLabel: string;
  disabled?: boolean;
}

/** −/+ number control. Hold a button to repeat; the field is editable and validated on blur. */
export function Stepper({ value, min, max, step = 1, onChange, ariaLabel, disabled }: StepperProps) {
  const [draft, setDraft] = useState(String(value));
  const [bump, setBump] = useState<'up' | 'down' | null>(null);
  const hold = useRef<{ t?: number; i?: number }>({});
  const latest = useRef(value);
  latest.current = value;

  useEffect(() => setDraft(String(value)), [value]);
  useEffect(() => () => stop(), []);

  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const nudge = (dir: 1 | -1) => {
    const next = clamp(latest.current + dir * step);
    if (next !== latest.current) {
      latest.current = next;
      onChange(next);
      setBump(dir > 0 ? 'up' : 'down');
    }
  };
  const start = (dir: 1 | -1) => {
    nudge(dir);
    hold.current.t = window.setTimeout(() => {
      hold.current.i = window.setInterval(() => nudge(dir), 60);
    }, 380);
  };
  function stop() {
    window.clearTimeout(hold.current.t);
    window.clearInterval(hold.current.i);
  }

  const commit = () => {
    const n = parseInt(draft, 10);
    if (Number.isNaN(n)) setDraft(String(value));
    else {
      const c = clamp(n);
      onChange(c);
      setDraft(String(c));
    }
  };

  return (
    <div className={`stepper${disabled ? ' is-disabled' : ''}`}>
      <button
        type="button"
        aria-label={`${ariaLabel} −`}
        disabled={disabled || value <= min}
        onPointerDown={() => start(-1)}
        onPointerUp={stop}
        onPointerLeave={stop}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), nudge(-1))}
      >
        −
      </button>
      <input
        key={bump ? `${value}-${bump}` : 'v'}
        className={`stepper-input${bump ? ` bump-${bump}` : ''}`}
        inputMode="numeric"
        aria-label={ariaLabel}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'ArrowUp') (e.preventDefault(), nudge(1));
          if (e.key === 'ArrowDown') (e.preventDefault(), nudge(-1));
        }}
      />
      <button
        type="button"
        aria-label={`${ariaLabel} +`}
        disabled={disabled || value >= max}
        onPointerDown={() => start(1)}
        onPointerUp={stop}
        onPointerLeave={stop}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), nudge(1))}
      >
        +
      </button>
    </div>
  );
}
