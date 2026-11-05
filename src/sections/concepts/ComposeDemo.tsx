import { useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
import { BoxIcon, CheckIcon, DatabaseIcon, PlayIcon, StopIcon, XIcon } from '../../components/ui/Icons';
import { highlight } from '../../lib/highlight';
import { DemoLayout, sleep } from './DemoLayout';

type St = 'absent' | 'creating' | 'created' | 'starting' | 'healthy' | 'running' | 'stopping';
type Key = 'net' | 'vol' | 'db' | 'app' | 'web';

const YAML = `services:
  web:
    image: nginx:alpine
    ports: ["8080:80"]
    depends_on: [app]
  app:
    build: ./app
    depends_on:
      db:
        condition: service_healthy
  db:
    image: postgres:17
    volumes: [db-data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD", "pg_isready"]
volumes:
  db-data:`;

const INIT: Record<Key, St> = { net: 'absent', vol: 'absent', db: 'absent', app: 'absent', web: 'absent' };

interface Log {
  k: number;
  name: string;
  state: string;
  tone: 'ok' | 'wait' | 'down';
}

export function ComposeDemo() {
  const { t } = useI18n();
  const [st, setSt] = useState<Record<Key, St>>(INIT);
  const [busy, setBusy] = useState(false);
  const [rmVol, setRmVol] = useState(false);
  const [log, setLog] = useState<Log[]>([]);
  const seq = useRef(0);
  const up = st.web === 'running';

  const set = (k: Key, v: St) => setSt((s) => ({ ...s, [k]: v }));
  const add = (name: string, state: string, tone: Log['tone']) =>
    setLog((l) => {
      const i = l.findIndex((x) => x.name === name);
      const entry = { k: ++seq.current, name, state, tone };
      if (i >= 0) return l.map((x, j) => (j === i ? entry : x));
      return [...l, entry];
    });

  const NAMES: Record<Key, string> = {
    net: 'Network myapp_default',
    vol: 'Volume "myapp_db-data"',
    db: 'Container myapp-db-1',
    app: 'Container myapp-app-1',
    web: 'Container myapp-web-1',
  };

  const start = async () => {
    setBusy(true);
    setLog([]);
    for (const k of ['net', 'vol'] as Key[]) {
      if (st[k] === 'created') continue;
      set(k, 'creating');
      add(NAMES[k], 'Creating', 'wait');
      await sleep(380);
      set(k, 'created');
      add(NAMES[k], 'Created', 'ok');
    }
    for (const k of ['db', 'app', 'web'] as Key[]) {
      set(k, 'creating');
      add(NAMES[k], 'Creating', 'wait');
      await sleep(300);
      set(k, 'starting');
      add(NAMES[k], k === 'db' ? 'Waiting' : 'Starting', 'wait');
      await sleep(k === 'db' ? 1100 : 450);
      const final: St = k === 'db' ? 'healthy' : 'running';
      set(k, final);
      add(NAMES[k], k === 'db' ? 'Healthy' : 'Started', 'ok');
    }
    setBusy(false);
  };

  const stop = async () => {
    setBusy(true);
    setLog([]);
    for (const k of ['web', 'app', 'db'] as Key[]) {
      set(k, 'stopping');
      add(NAMES[k], 'Stopping', 'wait');
      await sleep(380);
      set(k, 'absent');
      add(NAMES[k], 'Removed', 'down');
    }
    const rest: Key[] = rmVol ? ['net', 'vol'] : ['net'];
    for (const k of rest) {
      set(k, 'stopping');
      await sleep(250);
      set(k, 'absent');
      add(NAMES[k], 'Removed', 'down');
    }
    setBusy(false);
  };

  const chip = (s: St) => {
    const map: Partial<Record<St, string>> = {
      absent: t.compose.states.idle,
      creating: t.compose.states.creating,
      created: t.compose.states.running,
      starting: t.compose.states.starting,
      healthy: t.compose.states.healthy,
      running: t.compose.states.running,
      stopping: t.compose.states.stopping,
    };
    return <span className={`cp-chip is-${s}`}>{map[s]}</span>;
  };

  const svc = (k: 'web' | 'app' | 'db', icon: JSX.Element, sub: string) => (
    <div className={`cp-svc is-${st[k]}`}>
      <span className="cp-svc-icon">{icon}</span>
      <span className="cp-svc-name">{k}</span>
      <small>{sub}</small>
      {chip(st[k])}
    </div>
  );

  return (
    <DemoLayout title={t.compose.title} desc={t.compose.desc} points={t.compose.points}>
      <div className="cp-stage">
        <div className="cp-yaml">
          <div className="ly-file-head">compose.yaml</div>
          <pre>
            {YAML.split('\n').map((line, i) => (
              <div key={i}>
                {highlight(line, 'yaml').map((tk, k) => (
                  <span key={k} className={tk.c ? `tk-${tk.c}` : undefined}>
                    {tk.s}
                  </span>
                ))}
              </div>
            ))}
          </pre>
        </div>
        <div className={`cp-viz${st.net !== 'absent' ? ' has-net' : ''}`}>
          <div className={`cp-net is-${st.net}`}>
            <span>
              {t.compose.network}: <code>myapp_default</code>
            </span>
          </div>
          <div className="cp-chain">
            {svc('web', <BoxIcon width={18} height={18} />, ':8080 → :80')}
            <span className={`cp-dep${st.app !== 'absent' && st.web !== 'absent' ? ' is-on' : ''}`} aria-hidden />
            {svc('app', <BoxIcon width={18} height={18} />, 'build: ./app')}
            <span className={`cp-dep${st.db !== 'absent' && st.app !== 'absent' ? ' is-on' : ''}`} aria-hidden />
            {svc('db', <DatabaseIcon width={18} height={18} />, 'postgres:17')}
          </div>
          <div className={`cp-vol is-${st.vol}`}>
            <DatabaseIcon width={15} height={15} /> {t.compose.volume}: <code>db-data</code>
            {st.vol === 'created' && st.db === 'absent' && <span className="cp-kept"><CheckIcon width={13} height={13} /></span>}
          </div>
        </div>
      </div>
      <div className="terminal compact">
        <div className="terminal-body">
          {log.length === 0 ? (
            <div className="term-cursor">
              <span className="term-prompt">$</span> {up ? t.compose.down : t.compose.up}
              <span className="caret" />
            </div>
          ) : (
            log.map((l) => (
              <div key={l.name} className={`cp-log is-${l.tone}`}>
                <span className="cp-log-mark">{l.tone === 'wait' ? <span className="spin" /> : l.tone === 'ok' ? <CheckIcon width={14} height={14} /> : <XIcon width={14} height={14} />}</span>
                <span className="cp-log-name">{l.name}</span>
                <span className="cp-log-state">{l.state}</span>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="stage-controls">
        <Button variant="primary" icon={<PlayIcon />} onClick={start} disabled={busy || up}>
          <span className="mono-label">{t.compose.up}</span>
        </Button>
        <Button variant="danger" icon={<StopIcon />} onClick={stop} disabled={busy || !up}>
          <span className="mono-label">
            {t.compose.down}
            {rmVol ? ' -v' : ''}
          </span>
        </Button>
      </div>
      <div className="stage-options">
        <Switch checked={rmVol} onChange={setRmVol} label={t.compose.withVolumes} disabled={busy} />
      </div>
    </DemoLayout>
  );
}
