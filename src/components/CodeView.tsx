import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { fmt, useI18n } from '../i18n';
import { diffLines, type LineDiff } from '../lib/diff';
import { highlight, type Lang } from '../lib/highlight';
import type { Line } from '../lib/out';
import { Button } from './ui/Button';
import { CheckIcon, CopyIcon, DownloadIcon } from './ui/Icons';
import { useToast } from './ui/Toast';

interface CodeViewProps {
  lines: Line[];
  lang: Lang;
  filename: string;
  /** Lines whose tag equals or is nested under this tag are highlighted. */
  hoverTag?: string | null;
  maxHeight?: number;
  empty?: string;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for file:// or older browsers.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

const matches = (tag: string | undefined, hover: string | null | undefined) =>
  !!hover && !!tag && (tag === hover || tag.startsWith(`${hover}.`));

export function CodeView({ lines, lang, filename, hoverTag, maxHeight, empty }: CodeViewProps) {
  const { t } = useI18n();
  const toast = useToast();
  const scroller = useRef<HTMLDivElement>(null);
  const prev = useRef<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [badge, setBadge] = useState<{ n: number; key: number } | null>(null);
  const version = useRef(0);

  const texts = useMemo(() => lines.map((l) => l.text), [lines]);
  const joined = texts.join('\n');

  const diff: LineDiff | null = useMemo(() => {
    if (!prev.current || prev.current.join('\n') === joined) return null;
    version.current++;
    return diffLines(prev.current, texts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined]);

  useEffect(() => {
    if (diff && diff.changed > 0) setBadge({ n: diff.changed, key: version.current });
    prev.current = texts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined]);

  useEffect(() => {
    if (!badge) return;
    const id = window.setTimeout(() => setBadge(null), 1800);
    return () => window.clearTimeout(id);
  }, [badge]);

  // Bring the first changed line into view inside the code panel (never scrolls the page).
  useLayoutEffect(() => {
    const box = scroller.current;
    if (!box || !diff) return;
    const target = box.querySelector<HTMLElement>('.ln-added, .ln-removed-before');
    if (!target) return;
    const top = target.offsetTop;
    if (top < box.scrollTop + 24 || top > box.scrollTop + box.clientHeight - 48) {
      box.scrollTo({ top: Math.max(0, top - box.clientHeight / 3), behavior: 'smooth' });
    }
  }, [diff]);

  // Scroll hovered lines into view as well.
  useEffect(() => {
    const box = scroller.current;
    if (!box || !hoverTag) return;
    const id = window.setTimeout(() => {
      const target = box.querySelector<HTMLElement>('.ln-hover');
      if (!target) return;
      const top = target.offsetTop;
      if (top < box.scrollTop || top > box.scrollTop + box.clientHeight - 40)
        box.scrollTo({ top: Math.max(0, top - 40), behavior: 'smooth' });
    }, 220);
    return () => window.clearTimeout(id);
  }, [hoverTag]);

  const onCopy = async () => {
    const ok = await copyText(joined);
    toast(ok ? t.common.copied : t.common.copyFailed, ok ? 'success' : 'error');
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  };

  const onDownload = () => {
    const blob = new Blob([joined + '\n'], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(fmt(t.common.downloaded, { file: filename }), 'success');
  };

  const anyHover = !!hoverTag && lines.some((l) => matches(l.tag, hoverTag));

  return (
    <div className={`code${anyHover ? ' has-hover' : ''}`}>
      <div className="code-head">
        <span className="code-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="code-file">{filename}</span>
        {badge && (
          <span key={badge.key} className="code-badge">
            {fmt(t.playground.changed, { n: badge.n })}
          </span>
        )}
        <span className="code-actions">
          <Button size="sm" variant="ghost" icon={copied ? <CheckIcon /> : <CopyIcon />} onClick={onCopy} disabled={!lines.length}>
            {t.common.copy}
          </Button>
          <Button size="sm" variant="ghost" icon={<DownloadIcon />} onClick={onDownload} disabled={!lines.length} iconOnly aria-label={t.common.download} title={t.common.download} />
        </span>
      </div>
      <div className="code-body" ref={scroller} style={maxHeight ? { maxHeight } : undefined}>
        {lines.length === 0 ? (
          <div className="code-empty">{empty}</div>
        ) : (
          <pre>
            <code>
              {lines.map((l, i) => {
                const added = diff?.added.has(i);
                const cls = [
                  'ln',
                  added ? 'ln-added' : '',
                  diff?.removedBefore.has(i) ? 'ln-removed-before' : '',
                  matches(l.tag, hoverTag) ? 'ln-hover' : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <span key={added ? `a${version.current}-${i}` : `l${i}`} className={cls}>
                    <span className="ln-no" aria-hidden>
                      {i + 1}
                    </span>
                    <span className="ln-code">
                      {highlight(l.text, lang).map((tk, k) =>
                        tk.c ? (
                          <span key={k} className={`tk-${tk.c}`}>
                            {tk.s}
                          </span>
                        ) : (
                          tk.s
                        ),
                      )}
                      {'\n'}
                    </span>
                  </span>
                );
              })}
              {diff?.removedAtEnd && <span className="ln ln-removed-end" aria-hidden />}
            </code>
          </pre>
        )}
      </div>
    </div>
  );
}
