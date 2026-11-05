import { useCallback, useRef, type KeyboardEvent, type PointerEvent } from 'react';

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  ariaLabel: string;
  format?: (v: number) => string;
  disabled?: boolean;
  /** Show tick marks at each step (use for small ranges). */
  ticks?: boolean;
}

/** Pointer-driven slider with a value bubble; supports arrows, PageUp/Down, Home/End. */
export function Slider({ value, min, max, step, onChange, ariaLabel, format = String, disabled, ticks }: SliderProps) {
  const track = useRef<HTMLDivElement>(null);
  const pct = ((value - min) / (max - min)) * 100;

  const snap = useCallback(
    (v: number) => {
      const s = Math.round((v - min) / step) * step + min;
      return Math.min(max, Math.max(min, Number(s.toFixed(4))));
    },
    [min, max, step],
  );

  const fromPointer = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const next = snap(min + ratio * (max - min));
    if (next !== value) onChange(next);
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.classList.add('is-dragging');
    fromPointer(e.clientX);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e.clientX);
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('is-dragging');
  };

  const onKey = (e: KeyboardEvent) => {
    const big = Math.max(step, (max - min) / 10);
    const map: Record<string, number> = {
      ArrowRight: value + step,
      ArrowUp: value + step,
      ArrowLeft: value - step,
      ArrowDown: value - step,
      PageUp: value + big,
      PageDown: value - big,
      Home: min,
      End: max,
    };
    if (e.key in map) {
      e.preventDefault();
      onChange(snap(map[e.key]));
    }
  };

  const tickCount = ticks ? Math.round((max - min) / step) + 1 : 0;

  return (
    <div
      className={`slider${disabled ? ' is-disabled' : ''}`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <div className="slider-track" ref={track}>
        <div className="slider-fill" style={{ width: `${pct}%` }} />
        {ticks &&
          Array.from({ length: tickCount }, (_, i) => (
            <span
              key={i}
              className={`slider-tick${(i / (tickCount - 1)) * 100 <= pct ? ' is-on' : ''}`}
              style={{ left: `${(i / (tickCount - 1)) * 100}%` }}
            />
          ))}
        <div
          className="slider-thumb"
          style={{ left: `${pct}%` }}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={ariaLabel}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={format(value)}
          aria-disabled={disabled}
          onKeyDown={onKey}
        >
          <span className="slider-bubble">{format(value)}</span>
        </div>
      </div>
    </div>
  );
}
