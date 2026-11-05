import { useRef, useState } from 'react';
import { fmt, useI18n } from '../../i18n';
import { Button } from '../../components/ui/Button';
import { EditIcon, PlusIcon } from '../../components/ui/Icons';
import { Switch } from '../../components/ui/Switch';
import { highlight } from '../../lib/highlight';
import { DemoLayout, sleep } from './DemoLayout';

type Dep = 'src' | 'pkg';
interface Step {
  ins: string;
  meta?: boolean;
  deps: Dep[];
  ms: number;
  size: string;
}
type Status = 'idle' | 'running' | 'cached' | 'built';

const FROM: Step = { ins: 'FROM node:22-alpine', deps: [], ms: 900, size: '160 MB' };
const WORKDIR: Step = { ins: 'WORKDIR /app', meta: true, deps: [], ms: 120, size: '0 B' };
const CMD: Step = { ins: 'CMD ["node", "server.js"]', meta: true, deps: [], ms: 80, size: '0 B' };
const INSTALL: Step = { ins: 'RUN npm ci', deps: [], ms: 2600, size: '86 MB' };

const OPTIMIZED: Step[] = [
  FROM,
  WORKDIR,
  { ins: 'COPY package*.json ./', deps: ['pkg'], ms: 160, size: '4 KB' },
  INSTALL,
  { ins: 'COPY . .', deps: ['src', 'pkg'], ms: 260, size: '1.2 MB' },
  CMD,
];
const NAIVE: Step[] = [FROM, WORKDIR, { ins: 'COPY . .', deps: ['src', 'pkg'], ms: 260, size: '1.2 MB' }, INSTALL, CMD];

const FILES: Record<Dep, string> = { src: 'src/server.js', pkg: 'package.json' };

export function LayersDemo() {
  const { t } = useI18n();
  const [optimized, setOptimized] = useState(true);
  const [dirty, setDirty] = useState<Set<Dep>>(new Set());
  const [status, setStatus] = useState<Status[]>([]);
  const [building, setBuilding] = useState(false);
  const [time, setTime] = useState<number | null>(null);
  const lastBuilt = useRef<string[] | null>(null);
  const steps = optimized ? OPTIMIZED : NAIVE;

  const build = async () => {
    setBuilding(true);
    const prev = lastBuilt.current;
    const st: Status[] = steps.map(() => 'idle');
    setStatus([...st]);
    let miss = false;
    let total = 0;
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      miss = miss || !prev || prev[i] !== s.ins || s.deps.some((d) => dirty.has(d));
      st[i] = 'running';
      setStatus([...st]);
      if (miss) {
        await sleep(s.ms * 0.55);
        total += s.ms;
        st[i] = 'built';
      } else {
        await sleep(140);
        total += 40;
        st[i] = 'cached';
      }
      setStatus([...st]);
    }
    lastBuilt.current = steps.map((s) => s.ins);
    setDirty(new Set());
    setTime(total / 1000);
    setBuilding(false);
  };

  const touch = (d: Dep) => setDirty((s) => new Set(s).add(d));

  const toggleOptimize = (v: boolean) => {
    setOptimized(v);
    setStatus([]);
  };

  const statusText = !lastBuilt.current
    ? t.layers.never
    : dirty.size
      ? fmt(t.layers.changed, { files: [...dirty].map((d) => FILES[d]).join(', ') })
      : t.layers.clean;

  const label = (s: Status) =>
    s === 'cached' ? t.layers.cached : s === 'built' ? t.layers.built : s === 'running' ? t.layers.running : t.layers.waiting;

  const layerSteps = steps.map((s, i) => ({ s, i })).filter(({ s }) => !s.meta);

  return (
    <DemoLayout title={t.layers.title} desc={t.layers.desc} points={t.layers.points}>
      <div className="ly-stage">
        <div className="ly-file">
          <div className="ly-file-head">Dockerfile</div>
          <ol className="ly-steps">
            {steps.map((s, i) => {
              const st = status[i] ?? 'idle';
              const touched = s.deps.some((d) => dirty.has(d));
              return (
                <li key={`${optimized}-${i}`} className={`ly-step is-${st}${s.meta ? ' is-meta' : ''}${touched ? ' is-touched' : ''}`}>
                  <span className="ly-step-no">#{i + 1}</span>
                  <code className="ly-step-code">
                    {highlight(s.ins, 'dockerfile').map((tk, k) => (
                      <span key={k} className={tk.c ? `tk-${tk.c}` : undefined}>
                        {tk.s}
                      </span>
                    ))}
                  </code>
                  <span className="ly-step-status">
                    {st === 'running' && <span className="spin" />}
                    {s.meta && st === 'idle' ? t.layers.metadata : st !== 'idle' ? label(st) : ''}
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="ly-status">
            <span>{statusText}</span>
            {time !== null && <span className="ly-time">{fmt(t.layers.time, { s: time.toFixed(1) })}</span>}
          </div>
        </div>
        <div className="ly-stack" aria-label={t.layers.stack}>
          <span className="ly-stack-title">{t.layers.stack}</span>
          <div className="ly-stack-layers">
            {[...layerSteps].reverse().map(({ s, i }) => {
              const st = status[i] ?? 'idle';
              return (
                <div key={`${optimized}-${i}`} className={`ly-layer is-${st}`}>
                  <span className="ly-layer-name">{s.ins.split(' ').slice(0, 2).join(' ')}</span>
                  <span className="ly-layer-size">{s.size}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="stage-controls">
        <Button variant="primary" loading={building} onClick={build}>
          <span className="mono-label">{building ? t.layers.building : t.layers.build}</span>
        </Button>
        <Button variant="soft" icon={<EditIcon />} disabled={building} onClick={() => touch('src')}>
          {t.layers.editSrc}
        </Button>
        <Button variant="soft" icon={<PlusIcon />} disabled={building} onClick={() => touch('pkg')}>
          {t.layers.editPkg}
        </Button>
      </div>
      <div className="stage-options">
        <Switch checked={optimized} onChange={toggleOptimize} label={t.layers.optimize} hint={t.layers.optimizeHint} disabled={building} />
      </div>
    </DemoLayout>
  );
}
