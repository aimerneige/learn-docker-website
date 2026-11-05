import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, ChevronDown } from './Icons';

export interface SelectOption<T extends string> {
  value: T;
  label: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  /** Text used for type-ahead; defaults to label when it is a string. */
  text?: string;
}

interface SelectProps<T extends string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (v: T) => void;
  ariaLabel: string;
  /** Replace the trigger's content (e.g. compact language button). */
  renderTrigger?: (selected: SelectOption<T> | undefined, open: boolean) => ReactNode;
  triggerClassName?: string;
  align?: 'start' | 'end';
  disabled?: boolean;
  minWidth?: number;
}

interface Pos {
  top: number;
  left: number;
  width: number;
  up: boolean;
  maxHeight: number;
}

/** Fully custom listbox: portal-rendered so it is never clipped, with keyboard + type-ahead support. */
export function Select<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  renderTrigger,
  triggerClassName = '',
  align = 'start',
  disabled,
  minWidth = 0,
}: SelectProps<T>) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<Pos | null>(null);
  const typed = useRef({ text: '', at: 0 });
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const selected = options[selectedIndex];

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.max(r.width, minWidth);
    const below = innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 220 && above > below;
    let left = align === 'end' ? r.right - width : r.left;
    left = Math.min(Math.max(8, left), innerWidth - width - 8);
    setPos({ top: up ? r.top - 6 : r.bottom + 6, left, width, up, maxHeight: Math.min(320, up ? above : below) });
  }, [align, minWidth]);

  const openList = () => {
    if (disabled) return;
    place();
    setActive(selectedIndex);
    setClosing(false);
    setOpen(true);
  };

  const close = useCallback((focusTrigger = true) => {
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 140);
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  const choose = (i: number) => {
    onChange(options[i].value);
    close();
  };

  useLayoutEffect(() => {
    if (open && !closing) listRef.current?.focus({ preventScroll: true });
  }, [open, closing]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!listRef.current?.contains(t) && !triggerRef.current?.contains(t)) close(false);
    };
    const onMove = () => place();
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open, close, place]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const onTriggerKey = (e: KeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      openList();
    }
  };

  const onListKey = (e: KeyboardEvent) => {
    const n = options.length;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((a) => (a + 1) % n);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((a) => (a - 1 + n) % n);
        break;
      case 'Home':
        e.preventDefault();
        setActive(0);
        break;
      case 'End':
        e.preventDefault();
        setActive(n - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        choose(active);
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        close(false);
        break;
      default:
        if (e.key.length === 1) {
          const now = Date.now();
          typed.current.text = (now - typed.current.at > 600 ? '' : typed.current.text) + e.key.toLowerCase();
          typed.current.at = now;
          const hit = options.findIndex((o) =>
            (o.text ?? (typeof o.label === 'string' ? o.label : String(o.value))).toLowerCase().startsWith(typed.current.text),
          );
          if (hit >= 0) setActive(hit);
        }
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`select-trigger${open && !closing ? ' is-open' : ''} ${triggerClassName}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onTriggerKey}
      >
        {renderTrigger ? (
          renderTrigger(selected, open)
        ) : (
          <>
            {selected?.icon && <span className="select-icon">{selected.icon}</span>}
            <span className="select-value">{selected?.label}</span>
            <ChevronDown className="select-chevron" width={16} height={16} />
          </>
        )}
      </button>
      {open &&
        pos &&
        createPortal(
          <ul
            ref={listRef}
            id={`${id}-list`}
            role="listbox"
            tabIndex={-1}
            aria-label={ariaLabel}
            aria-activedescendant={`${id}-opt-${active}`}
            className={`select-list${pos.up ? ' is-up' : ''}${closing ? ' is-closing' : ''}`}
            style={{
              top: pos.up ? undefined : pos.top,
              bottom: pos.up ? innerHeight - pos.top : undefined,
              left: pos.left,
              minWidth: pos.width,
              maxHeight: pos.maxHeight,
            }}
            onKeyDown={onListKey}
          >
            {options.map((o, i) => (
              <li
                key={o.value}
                id={`${id}-opt-${i}`}
                data-index={i}
                role="option"
                aria-selected={o.value === value}
                className={`select-option${i === active ? ' is-active' : ''}${o.value === value ? ' is-selected' : ''}`}
                style={{ animationDelay: `${Math.min(i, 8) * 18}ms` }}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
              >
                {o.icon && <span className="select-icon">{o.icon}</span>}
                <span className="select-option-text">
                  <span>{o.label}</span>
                  {o.description && <small>{o.description}</small>}
                </span>
                <CheckIcon className="select-check" width={16} height={16} />
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  );
}
