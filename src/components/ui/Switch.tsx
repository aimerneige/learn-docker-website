import { useId } from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}

/** A full-row toggle: the whole row is clickable, the thumb springs across. */
export function Switch({ checked, onChange, label, hint, disabled }: SwitchProps) {
  const id = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={hint ? `${id}-hint` : undefined}
      disabled={disabled}
      className={`field switch-row${checked ? ' is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="field-text">
        <span className="field-label">{label}</span>
        {hint && (
          <span className="field-hint" id={`${id}-hint`}>
            {hint}
          </span>
        )}
      </span>
      <span className="switch" aria-hidden>
        <span className="switch-thumb" />
      </span>
    </button>
  );
}
