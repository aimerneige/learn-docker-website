import { useMemo, useState } from 'react';
import { fmt, useI18n } from '../i18n';
import type { Messages } from '../i18n/locales/en';
import { Section } from '../components/Section';
import { copyText } from '../components/CodeView';
import { useToast } from '../components/ui/Toast';
import { CopyIcon, SearchIcon, XIcon } from '../components/ui/Icons';
import { highlight } from '../lib/highlight';
import { useReveal } from '../lib/useReveal';

type ItemId = keyof Messages['cheatsheet']['items'];
type GroupId = keyof Messages['cheatsheet']['groups'];

const DATA: { group: GroupId; items: [ItemId, string][] }[] = [
  {
    group: 'images',
    items: [
      ['pull', 'docker pull nginx:alpine'],
      ['build', 'docker build -t myapp:1.0 .'],
      ['images', 'docker images'],
      ['tag', 'docker tag myapp:1.0 registry.example.com/myapp:1.0'],
      ['push', 'docker push registry.example.com/myapp:1.0'],
    ],
  },
  {
    group: 'containers',
    items: [
      ['run', 'docker run -d --name web -p 8080:80 nginx'],
      ['ps', 'docker ps'],
      ['stop', 'docker stop web'],
      ['start', 'docker start web'],
      ['rm', 'docker rm web'],
    ],
  },
  {
    group: 'debug',
    items: [
      ['logs', 'docker logs -f web'],
      ['exec', 'docker exec -it web sh'],
      ['inspect', 'docker inspect web'],
      ['stats', 'docker stats'],
      ['cp', 'docker cp web:/etc/nginx/nginx.conf .'],
    ],
  },
  {
    group: 'compose',
    items: [
      ['up', 'docker compose up -d'],
      ['down', 'docker compose down'],
      ['composeLogs', 'docker compose logs -f'],
      ['composePs', 'docker compose ps'],
      ['composeBuild', 'docker compose build'],
    ],
  },
  {
    group: 'cleanup',
    items: [
      ['df', 'docker system df'],
      ['imagePrune', 'docker image prune'],
      ['volumePrune', 'docker volume prune'],
      ['prune', 'docker system prune -a'],
    ],
  },
];

export function Cheatsheet() {
  const { t } = useI18n();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const ref = useReveal<HTMLDivElement>();

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return DATA.map((g) => ({
      ...g,
      items: g.items.filter(([id, cmd]) => !needle || cmd.toLowerCase().includes(needle) || t.cheatsheet.items[id].toLowerCase().includes(needle)),
    })).filter((g) => g.items.length);
  }, [q, t]);

  const copy = async (cmd: string) => {
    const ok = await copyText(cmd);
    toast(ok ? t.common.copied : t.common.copyFailed, ok ? 'success' : 'error');
    if (ok) {
      setCopied(cmd);
      window.setTimeout(() => setCopied((c) => (c === cmd ? null : c)), 1400);
    }
  };

  return (
    <Section id="cheatsheet" eyebrow={t.cheatsheet.eyebrow} title={t.cheatsheet.title} subtitle={t.cheatsheet.subtitle}>
      <div className="reveal" ref={ref}>
        <div className="search">
          <SearchIcon />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.cheatsheet.search} aria-label={t.cheatsheet.search} spellCheck={false} />
          {q && (
            <button type="button" className="search-clear" onClick={() => setQ('')} aria-label={t.cheatsheet.clear}>
              <XIcon width={14} height={14} />
            </button>
          )}
        </div>
        {groups.length === 0 ? (
          <p className="cs-empty">{fmt(t.cheatsheet.empty, { q })}</p>
        ) : (
          <div className="cs-grid">
            {groups.map((g) => (
              <div key={g.group} className="card cs-group">
                <h3>{t.cheatsheet.groups[g.group]}</h3>
                <ul>
                  {g.items.map(([id, cmd]) => (
                    <li key={id}>
                      <button type="button" className={`cs-item${copied === cmd ? ' is-copied' : ''}`} onClick={() => copy(cmd)}>
                        <code>
                          {highlight(cmd, 'shell').map((tk, k) => (
                            <span key={k} className={tk.c ? `tk-${tk.c}` : undefined}>
                              {tk.s}
                            </span>
                          ))}
                        </code>
                        <span className="cs-desc">{t.cheatsheet.items[id]}</span>
                        <span className="cs-copy" aria-hidden>
                          <CopyIcon width={14} height={14} />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}
