import type { ReactNode } from 'react';
import { useReveal } from '../lib/useReveal';

export function Section({ id, eyebrow, title, subtitle, children }: { id: string; eyebrow: string; title: string; subtitle: string; children: ReactNode }) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section className="section" id={id}>
      <div className="section-head reveal" ref={ref}>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {children}
    </section>
  );
}
