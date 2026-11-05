import { useRef, useState } from 'react';
import { fmt, useI18n } from '../../i18n';
import { Button } from '../../components/ui/Button';
import { LayersIcon, LockIcon, PlayIcon, StopIcon, TrashIcon, XIcon } from '../../components/ui/Icons';
import { useToast } from '../../components/ui/Toast';
import { DemoLayout, randomHex } from './DemoLayout';

const ADJ = ['brave', 'eager', 'happy', 'jolly', 'quirky', 'sleepy', 'vibrant', 'zen', 'clever', 'gentle', 'nifty', 'bold'];
const NAMES = ['turing', 'hopper', 'lovelace', 'curie', 'tesla', 'knuth', 'ritchie', 'torvalds', 'noether', 'euler', 'pike', 'kay'];

interface Ctr {
  id: string;
  name: string;
  running: boolean;
  leaving?: boolean;
}

const MAX = 6;

export function ImageDemo() {
  const { t } = useI18n();
  const toast = useToast();
  const [list, setList] = useState<Ctr[]>([]);
  const [pulse, setPulse] = useState(0);
  const used = useRef(new Set<string>());

  const run = () => {
    if (list.filter((c) => !c.leaving).length >= MAX) {
      toast(t.image.limit, 'info');
      return;
    }
    let name = '';
    do name = `${ADJ[Math.floor(Math.random() * ADJ.length)]}_${NAMES[Math.floor(Math.random() * NAMES.length)]}`;
    while (used.current.has(name));
    used.current.add(name);
    setPulse((p) => p + 1);
    setList((l) => [...l, { id: randomHex(), name, running: true }]);
  };

  const remove = (id: string) => {
    setList((l) => l.map((c) => (c.id === id ? { ...c, leaving: true } : c)));
    window.setTimeout(() => {
      setList((l) => {
        const gone = l.find((c) => c.id === id);
        if (gone) used.current.delete(gone.name);
        return l.filter((c) => c.id !== id);
      });
    }, 320);
  };

  const live = list.filter((c) => !c.leaving);
  const running = live.filter((c) => c.running).length;

  return (
    <DemoLayout title={t.image.title} desc={t.image.desc} points={t.image.points}>
      <div className="ic-stage">
        <div key={pulse} className={`ic-image${pulse ? ' is-pulse' : ''}`}>
          <div className="ic-image-icon">
            <LayersIcon width={26} height={26} />
          </div>
          <div className="ic-image-name">nginx:1.27-alpine</div>
          <div className="ic-image-meta">
            <LockIcon width={13} height={13} /> {t.image.readOnly}
          </div>
          <div className="ic-image-layers" aria-hidden>
            <span />
            <span />
            <span />
          </div>
          <span className="ic-image-label">{t.image.image}</span>
        </div>

        <div className={`ic-flow${pulse ? ' is-active' : ''}`} key={`f${pulse}`} aria-hidden>
          <span className="ic-flow-line" />
          <span className="ic-flow-dot" />
        </div>

        <div className="ic-containers">
          <div className="ic-containers-head">
            <span>{t.image.containers}</span>
            <span className="ic-count">
              <span className="dot-ok" /> {running} / {live.length}
            </span>
          </div>
          {list.length === 0 ? (
            <div className="ic-empty">{t.image.empty}</div>
          ) : (
            <div className="ic-grid">
              {list.map((c) => (
                <div key={c.id} className={`ic-ctr${c.running ? ' is-running' : ' is-stopped'}${c.leaving ? ' is-leaving' : ''}`}>
                  <button
                    type="button"
                    className="ic-ctr-main"
                    onClick={() => setList((l) => l.map((x) => (x.id === c.id ? { ...x, running: !x.running } : x)))}
                    aria-label={`${c.name}: ${c.running ? t.image.running : t.image.exited}`}
                  >
                    <span className="ic-ctr-top">
                      <span className="ic-ctr-status" />
                      <span className="ic-ctr-id">{c.id.slice(0, 12)}</span>
                    </span>
                    <span className="ic-ctr-name">{c.name}</span>
                    <span className="ic-ctr-state">
                      {c.running ? <PlayIcon width={11} height={11} /> : <StopIcon width={11} height={11} />}
                      {c.running ? t.image.running : t.image.exited}
                    </span>
                    <span className="ic-ctr-rw" aria-hidden />
                  </button>
                  <button type="button" className="ic-ctr-x" aria-label={fmt(t.image.remove, { name: c.name })} onClick={() => remove(c.id)}>
                    <XIcon width={14} height={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {list.length > 0 && <p className="stage-hint">{t.image.toggleHint}</p>}
        </div>
      </div>
      <div className="stage-controls">
        <Button variant="primary" icon={<PlayIcon />} onClick={run}>
          <span className="mono-label">{t.image.run}</span>
        </Button>
        <Button
          variant="soft"
          icon={<StopIcon />}
          disabled={running === 0}
          onClick={() => setList((l) => l.map((c) => ({ ...c, running: false })))}
        >
          {t.image.stopAll}
        </Button>
        <Button variant="danger" icon={<TrashIcon />} disabled={live.length === 0} onClick={() => live.forEach((c) => remove(c.id))}>
          {t.image.rmAll}
        </Button>
      </div>
    </DemoLayout>
  );
}
