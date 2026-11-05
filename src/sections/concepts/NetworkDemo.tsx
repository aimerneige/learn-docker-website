import { useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import { Button } from '../../components/ui/Button';
import { Stepper } from '../../components/ui/Stepper';
import { Switch } from '../../components/ui/Switch';
import { BoxIcon, DatabaseIcon, LockIcon, MonitorIcon } from '../../components/ui/Icons';
import { DemoLayout, sleep } from './DemoLayout';

type Pt = { x: number; y: number };

export function NetworkDemo() {
  const { t } = useI18n();
  const [publish, setPublish] = useState(true);
  const [port, setPort] = useState(8080);
  const [shared, setShared] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string; cmd: string } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const packet = useRef<HTMLSpanElement>(null);
  const refs = {
    browser: useRef<HTMLDivElement>(null),
    port: useRef<HTMLDivElement>(null),
    web: useRef<HTMLDivElement>(null),
    app: useRef<HTMLDivElement>(null),
    db: useRef<HTMLDivElement>(null),
  };

  const center = (el: HTMLElement | null): Pt => {
    const s = stage.current!.getBoundingClientRect();
    const r = el!.getBoundingClientRect();
    return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 };
  };

  const fly = async (pts: Pt[], tone: string, ms: number, fade = false) => {
    const p = packet.current!;
    p.className = `packet is-${tone}`;
    const frames = pts.map((q, i) => ({
      transform: `translate(${q.x}px, ${q.y}px) scale(${i === 0 ? 0.6 : 1})`,
      opacity: fade && i === pts.length - 1 ? 0 : 1,
    }));
    await p.animate(frames, { duration: ms, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' }).finished;
  };

  const hide = () => packet.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' });

  const blink = async (k: string) => {
    setFlash(k);
    await sleep(380);
    setFlash(null);
  };

  const request = async () => {
    setBusy(true);
    setResult(null);
    const b = center(refs.browser.current);
    const pt = center(refs.port.current);
    const cmd = `curl http://localhost:${port}`;
    if (publish) {
      const w = center(refs.web.current);
      await fly([b, pt, w], 'req', 1100);
      await blink('web');
      await fly([w, pt, b], 'ok', 900);
      setResult({ ok: true, text: t.network.ok, cmd });
    } else {
      await fly([b, pt], 'req', 650);
      await blink('port');
      await fly([pt, b], 'bad', 550);
      setResult({ ok: false, text: t.network.refused, cmd });
    }
    hide();
    setBusy(false);
  };

  const ping = async () => {
    setBusy(true);
    setResult(null);
    const a = center(refs.app.current);
    const d = center(refs.db.current);
    const cmd = 'docker exec app ping -c1 db';
    if (shared) {
      await fly([a, d], 'req', 650);
      await blink('db');
      await fly([d, a], 'ok', 550);
      setResult({ ok: true, text: t.network.resolved, cmd });
    } else {
      const mid = { x: (a.x + d.x) / 2, y: (a.y + d.y) / 2 };
      await fly([a, mid], 'bad', 700, true);
      setResult({ ok: false, text: t.network.unresolved, cmd });
    }
    hide();
    setBusy(false);
  };

  const dbNode = (
    <div ref={refs.db} className={`net-node${flash === 'db' ? ' is-flash' : ''}`}>
      <DatabaseIcon width={16} height={16} />
      <span>db</span>
      <small>:5432</small>
    </div>
  );

  return (
    <DemoLayout title={t.network.title} desc={t.network.desc} points={t.network.points}>
      <div className="net-stage" ref={stage}>
        <div className="net-browser" ref={refs.browser}>
          <MonitorIcon width={22} height={22} />
          <span>{t.network.browser}</span>
          <code>localhost:{port}</code>
        </div>
        <div className="net-host">
          <span className="net-zone-label">{t.network.host}</span>
          <div ref={refs.port} className={`net-port${publish ? ' is-open' : ''}${flash === 'port' ? ' is-shake' : ''}`}>
            {publish ? `:${port}` : <LockIcon width={14} height={14} />}
          </div>
          <div className="net-docker">
            <span className="net-zone-label">Docker</span>
            <div className={`net-bubble${shared ? ' is-shared' : ''}`}>
              <span className="net-bubble-label">{shared ? 'app-net' : 'bridge'}</span>
              <div ref={refs.web} className={`net-node is-web${flash === 'web' ? ' is-flash' : ''}`}>
                <BoxIcon width={16} height={16} />
                <span>web</span>
                <small>:80</small>
              </div>
              <div ref={refs.app} className="net-node">
                <BoxIcon width={16} height={16} />
                <span>app</span>
              </div>
              {shared && dbNode}
            </div>
            {!shared && (
              <div className="net-bubble is-other">
                <span className="net-bubble-label">isolated-net</span>
                {dbNode}
              </div>
            )}
          </div>
        </div>
        <span className="packet" ref={packet} aria-hidden />
      </div>
      <div className={`stage-msg mono${result ? (result.ok ? ' is-ok' : ' is-bad') : ''}`} aria-live="polite">
        {result ? (
          <>
            <span className="term-prompt">$</span> {result.cmd}
            <br />
            {result.text}
          </>
        ) : (
          <>
            <span className="term-prompt">$</span> docker run -d {publish ? `-p ${port}:80 ` : ''}
            {shared ? '--network app-net ' : ''}--name web nginx
          </>
        )}
      </div>
      <div className="stage-options two">
        <Switch checked={publish} onChange={setPublish} label={t.network.publish} hint={`-p ${port}:80`} disabled={busy} />
        <div className="field">
          <span className="field-text">
            <span className="field-label">{t.network.hostPort}</span>
          </span>
          <Stepper value={port} min={1024} max={65535} onChange={setPort} ariaLabel={t.network.hostPort} disabled={busy || !publish} />
        </div>
        <Switch checked={shared} onChange={setShared} label={t.network.sameNet} hint="--network app-net" disabled={busy} />
      </div>
      <div className="stage-controls">
        <Button variant="primary" onClick={request} disabled={busy}>
          {t.network.request}
        </Button>
        <Button variant="soft" onClick={ping} disabled={busy}>
          <span className="mono-label">{t.network.ping}</span>
        </Button>
      </div>
    </DemoLayout>
  );
}
