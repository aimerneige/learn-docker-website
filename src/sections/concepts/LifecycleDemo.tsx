import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import { Button } from '../../components/ui/Button';
import { DemoLayout, randomHex } from './DemoLayout';

type S = 'none' | 'created' | 'running' | 'paused' | 'exited';
interface Cmd {
  id: string;
  from: S[];
  to: S;
  cli: string;
  out: (id: string) => string;
  tone?: 'primary' | 'danger';
}

const CMDS: Cmd[] = [
  { id: 'run', from: ['none'], to: 'running', cli: 'docker run -d --name demo nginx', out: (id) => id, tone: 'primary' },
  { id: 'create', from: ['none'], to: 'created', cli: 'docker create --name demo nginx', out: (id) => id },
  { id: 'start', from: ['created', 'exited'], to: 'running', cli: 'docker start demo', out: () => 'demo' },
  { id: 'pause', from: ['running'], to: 'paused', cli: 'docker pause demo', out: () => 'demo' },
  { id: 'unpause', from: ['paused'], to: 'running', cli: 'docker unpause demo', out: () => 'demo' },
  { id: 'stop', from: ['running'], to: 'exited', cli: 'docker stop demo', out: () => 'demo' },
  { id: 'kill', from: ['running'], to: 'exited', cli: 'docker kill demo', out: () => 'demo' },
  { id: 'restart', from: ['running', 'exited'], to: 'running', cli: 'docker restart demo', out: () => 'demo' },
  { id: 'rm', from: ['created', 'exited'], to: 'none', cli: 'docker rm demo', out: () => 'demo', tone: 'danger' },
  { id: 'rmf', from: ['running', 'paused'], to: 'none', cli: 'docker rm -f demo', out: () => 'demo', tone: 'danger' },
];

const NODES: Record<S, { x: number; y: number }> = {
  none: { x: 80, y: 130 },
  created: { x: 250, y: 45 },
  running: { x: 440, y: 130 },
  paused: { x: 590, y: 45 },
  exited: { x: 250, y: 215 },
};

interface Edge {
  key: string;
  from: S;
  to: S;
  d: string;
  label: string;
  lx: number;
  ly: number;
}
const EDGES: Edge[] = [
  { key: 'create', from: 'none', to: 'created', d: 'M80 110 Q 86 45 188 45', label: 'create', lx: 92, ly: 60 },
  { key: 'run', from: 'none', to: 'running', d: 'M142 130 L 378 130', label: 'run', lx: 260, ly: 122 },
  { key: 'start1', from: 'created', to: 'running', d: 'M312 45 Q 430 45 432 108', label: 'start', lx: 400, ly: 58 },
  { key: 'pause', from: 'running', to: 'paused', d: 'M502 122 Q 590 122 590 67', label: 'pause', lx: 575, ly: 112 },
  { key: 'unpause', from: 'paused', to: 'running', d: 'M528 38 Q 470 30 460 108', label: 'unpause', lx: 470, ly: 30 },
  { key: 'stop', from: 'running', to: 'exited', d: 'M462 152 Q 462 228 312 222', label: 'stop · kill', lx: 476, ly: 214 },
  { key: 'start2', from: 'exited', to: 'running', d: 'M312 206 Q 400 198 418 152', label: 'start · restart', lx: 330, ly: 186 },
  { key: 'rm1', from: 'exited', to: 'none', d: 'M188 215 Q 80 215 80 152', label: 'rm', lx: 96, ly: 206 },
  { key: 'rm2', from: 'created', to: 'none', d: 'M200 66 Q 150 112 142 122', label: '', lx: 0, ly: 0 },
];

interface LogLine {
  k: number;
  cmd: string;
  out: string;
  err?: boolean;
}

export function LifecycleDemo() {
  const { t } = useI18n();
  const [state, setState] = useState<S>('none');
  const [cid, setCid] = useState('');
  const [log, setLog] = useState<LogLine[]>([]);
  const [travel, setTravel] = useState<{ d: string; k: number } | null>(null);
  const motion = useRef<SVGAnimateMotionElement>(null);
  const termRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!travel) return;
    motion.current?.beginElement();
    const id = window.setTimeout(() => setTravel((cur) => (cur?.k === travel.k ? null : cur)), 750);
    return () => window.clearTimeout(id);
  }, [travel]);
  useEffect(() => {
    termRef.current?.scrollTo({ top: termRef.current.scrollHeight, behavior: 'smooth' });
  }, [log]);

  const exec = (c: Cmd) => {
    const id = c.from.includes('none') ? randomHex(64) : cid;
    if (c.from.includes('none')) setCid(id);
    const edge = EDGES.find((e) => e.from === state && e.to === c.to);
    if (edge) setTravel({ d: edge.d, k: ++seq.current });
    setState(c.to);
    setLog((l) => [...l.slice(-30), { k: ++seq.current, cmd: c.cli, out: c.out(id) }]);
  };

  const ps = () => {
    const status =
      state === 'running' ? 'Up 3 seconds' : state === 'paused' ? 'Up 9 seconds (Paused)' : state === 'exited' ? 'Exited (0) 2 seconds ago' : 'Created';
    const out =
      state === 'none'
        ? 'CONTAINER ID   IMAGE   STATUS   NAMES'
        : `CONTAINER ID   IMAGE   STATUS${' '.repeat(Math.max(1, status.length - 4))}NAMES\n${cid.slice(0, 12)}   nginx   ${status}   demo`;
    setLog((l) => [...l.slice(-30), { k: ++seq.current, cmd: 'docker ps -a', out }]);
  };

  return (
    <DemoLayout title={t.lifecycle.title} desc={t.lifecycle.desc} points={t.lifecycle.points}>
      <div className="lc-diagram">
        <svg viewBox="0 0 680 260" role="img" aria-label={t.lifecycle.states[state]}>
          <defs>
            <marker id="lc-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 10 5 0 10Z" className="lc-arrow-head" />
            </marker>
            <marker id="lc-arrow-on" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 10 5 0 10Z" className="lc-arrow-head on" />
            </marker>
          </defs>
          {EDGES.map((e) => {
            const on = e.from === state;
            return (
              <g key={e.key} className={`lc-edge${on ? ' is-available' : ''}`}>
                <path d={e.d} markerEnd={`url(#${on ? 'lc-arrow-on' : 'lc-arrow'})`} />
                {e.label && (
                  <text x={e.lx} y={e.ly} className="lc-edge-label">
                    {e.label}
                  </text>
                )}
              </g>
            );
          })}
          {(Object.keys(NODES) as S[]).map((s) => {
            const n = NODES[s];
            return (
              <g key={s} className={`lc-node lc-${s}${state === s ? ' is-current' : ''}`} transform={`translate(${n.x} ${n.y})`}>
                <rect x={-62} y={-20} width={124} height={40} rx={20} />
                <circle cx={-44} cy={0} r={5} className="lc-node-dot" />
                <text x={6} y={5} textAnchor="middle">
                  {t.lifecycle.states[s]}
                </text>
              </g>
            );
          })}
          {travel && (
            <circle key={travel.k} r={7} className="lc-token">
              <animateMotion ref={motion} dur="0.6s" begin="indefinite" fill="freeze" path={travel.d} calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1" />
            </circle>
          )}
        </svg>
      </div>
      <div className="lc-controls">
        <span className="stage-label">{t.lifecycle.commands}</span>
        <div className="lc-cmds">
          {CMDS.map((c) => {
            const ok = c.from.includes(state);
            return (
              <Button
                key={c.id}
                size="sm"
                variant={ok ? (c.tone ?? 'soft') : 'ghost'}
                disabled={!ok}
                onClick={() => exec(c)}
                aria-label={ok ? c.cli : `${c.cli} — ${t.lifecycle.unavailable.replace('{state}', t.lifecycle.states[state])}`}
              >
                <span className="mono-label">{c.id === 'rmf' ? 'rm -f' : c.id}</span>
              </Button>
            );
          })}
          <Button size="sm" variant="outline" onClick={ps}>
            <span className="mono-label">ps -a</span>
          </Button>
        </div>
      </div>
      <div className="terminal">
        <div className="terminal-head">
          <span className="code-dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span>{t.lifecycle.terminal}</span>
          <Button size="sm" variant="ghost" onClick={() => setLog([])} disabled={!log.length}>
            {t.lifecycle.clear}
          </Button>
        </div>
        <div className="terminal-body" ref={termRef}>
          {log.map((l) => (
            <div key={l.k} className="term-entry">
              <div>
                <span className="term-prompt">$</span> {l.cmd}
              </div>
              <pre className="term-out">{l.out}</pre>
            </div>
          ))}
          <div className="term-cursor">
            <span className="term-prompt">$</span> <span className="caret" />
          </div>
        </div>
      </div>
    </DemoLayout>
  );
}
