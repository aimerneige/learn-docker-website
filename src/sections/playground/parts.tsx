import { useState, type FocusEvent, type MouseEvent, type ReactNode } from 'react';
import { Switch } from '../../components/ui/Switch';

/** Collapsed content must not be reachable by keyboard: toggle the `inert` attribute. */
const inert = (on: boolean) => (el: HTMLElement | null) => {
  if (el) on ? el.setAttribute('inert', '') : el.removeAttribute('inert');
};

/** Tracks which option (data-tag) the pointer or keyboard focus is on. */
export function useHoverTag() {
  const [tag, setTag] = useState<string | null>(null);
  const pick = (e: MouseEvent | FocusEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-tag]');
    setTag(el?.dataset.tag ?? null);
  };
  return {
    tag,
    handlers: {
      onMouseOver: pick,
      onFocus: pick,
      onMouseLeave: () => setTag(null),
      onBlur: () => setTag(null),
    },
  };
}

export function Group({
  title,
  hint,
  tag,
  enabled,
  onToggle,
  toggleLabel,
  children,
}: {
  title: string;
  hint?: string;
  tag?: string;
  enabled?: boolean;
  onToggle?: (v: boolean) => void;
  toggleLabel?: string;
  children: ReactNode;
}) {
  const collapsible = onToggle !== undefined;
  const open = !collapsible || enabled;
  return (
    <section className={`opt-group${open ? ' is-open' : ' is-closed'}`} data-tag={tag}>
      <header className="opt-group-head">
        <div>
          <h4>{title}</h4>
          {hint && <p>{hint}</p>}
        </div>
        {collapsible && (
          <button
            type="button"
            role="switch"
            aria-checked={!!enabled}
            aria-label={`${toggleLabel ?? ''} ${title}`.trim()}
            className={`switch-inline${enabled ? ' is-on' : ''}`}
            onClick={() => onToggle!(!enabled)}
          >
            <span className="switch" aria-hidden>
              <span className="switch-thumb" />
            </span>
          </button>
        )}
      </header>
      <div className="opt-group-body" ref={inert(!open)}>
        <div className="opt-group-inner">{children}</div>
      </div>
    </section>
  );
}

export function Field({ label, hint, tag, children, stacked }: { label: string; hint?: string; tag?: string; children: ReactNode; stacked?: boolean }) {
  return (
    <div className={`field${stacked ? ' is-stacked' : ''}`} data-tag={tag}>
      <span className="field-text">
        <span className="field-label">{label}</span>
        {hint && <span className="field-hint">{hint}</span>}
      </span>
      <div className="field-control">{children}</div>
    </div>
  );
}

export function Toggle({ tag, ...p }: { tag?: string; checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <div data-tag={tag}>
      <Switch {...p} />
    </div>
  );
}

/** Smoothly reveal nested options (e.g. port stepper under "Publish port"). */
export function Reveal({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <div className={`reveal-nested${show ? ' is-open' : ''}`} ref={inert(!show)}>
      <div>{children}</div>
    </div>
  );
}
