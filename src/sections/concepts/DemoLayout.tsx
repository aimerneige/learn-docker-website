import type { ReactNode } from 'react';
import { useI18n } from '../../i18n';
import { CheckIcon } from '../../components/ui/Icons';

export function DemoLayout({ title, desc, points, children }: { title: string; desc: string; points: string[]; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="demo">
      <div className="demo-info">
        <h3>{title}</h3>
        <p>{desc}</p>
        <div className="demo-points">
          <span className="demo-points-title">{t.common.keyPoints}</span>
          <ul>
            {points.map((p, i) => (
              <li key={p} style={{ animationDelay: `${120 + i * 80}ms` }}>
                <CheckIcon width={16} height={16} />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="demo-stage">{children}</div>
    </div>
  );
}

/** Renders inline `code` for text wrapped in backticks-free command strings. */
export function Mono({ children }: { children: ReactNode }) {
  return <code className="mono">{children}</code>;
}

export const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

export const randomHex = (n = 12) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
