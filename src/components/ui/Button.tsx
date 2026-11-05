import { forwardRef, useCallback, useRef, useState, type ButtonHTMLAttributes, type PointerEvent, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'soft' | 'ghost' | 'danger' | 'outline';

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  iconRight?: ReactNode;
  /** Square icon-only button. Remember to pass aria-label. */
  iconOnly?: boolean;
  loading?: boolean;
}

let rippleId = 0;

/** Button with a press-scale spring and a ripple that grows from the pointer position. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'soft', size = 'md', icon, iconRight, iconOnly, loading, className = '', children, onPointerDown, disabled, ...rest },
  ref,
) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const timers = useRef<number[]>([]);

  const spawn = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      onPointerDown?.(e);
      if (disabled || loading) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2.2;
      const r = { id: ++rippleId, x: e.clientX - rect.left - size / 2, y: e.clientY - rect.top - size / 2, size };
      setRipples((list) => [...list, r]);
      timers.current.push(window.setTimeout(() => setRipples((list) => list.filter((it) => it.id !== r.id)), 650));
    },
    [onPointerDown, disabled, loading],
  );

  const cls = ['btn', `btn-${variant}`, `btn-${size}`, iconOnly ? 'btn-icon' : '', loading ? 'is-loading' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <button ref={ref} type="button" className={cls} onPointerDown={spawn} disabled={disabled || loading} {...rest}>
      <span className="btn-ripples" aria-hidden>
        {ripples.map((r) => (
          <span key={r.id} className="btn-ripple" style={{ left: r.x, top: r.y, width: r.size, height: r.size }} />
        ))}
      </span>
      {loading ? <span className="btn-spinner" aria-hidden /> : icon}
      {children !== undefined && children !== null && <span className="btn-label">{children}</span>}
      {iconRight}
    </button>
  );
});
