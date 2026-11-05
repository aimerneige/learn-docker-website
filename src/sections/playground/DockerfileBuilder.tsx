import { useMemo } from 'react';
import { useI18n } from '../../i18n';
import { CodeView } from '../../components/CodeView';
import { Segmented } from '../../components/ui/Segmented';
import { Stepper } from '../../components/ui/Stepper';
import { DEFAULT_PORTS, genDockerfile, VARIANTS, type DfState, type Runtime } from '../../lib/genDockerfile';
import { useAnimatedNumber } from '../../lib/useAnimatedNumber';
import { Field, Group, Toggle, useHoverTag } from './parts';

const RUNTIME_LABEL: Record<Runtime, string> = { node: 'Node.js', python: 'Python', go: 'Go' };
const fmtSize = (mb: number) => (mb >= 1000 ? `${(mb / 1000).toFixed(2)} GB` : mb >= 10 ? `${Math.round(mb)} MB` : `${mb.toFixed(1)} MB`);

export function DockerfileBuilder({ s, set, comments }: { s: DfState; set: (p: Partial<DfState>) => void; comments: boolean }) {
  const { t } = useI18n();
  const p = t.playground.dockerfile;
  const hover = useHoverTag();
  const out = useMemo(() => genDockerfile(s, t, comments), [s, t, comments]);
  const total = useAnimatedNumber(out.total);
  const max = 1400;

  const setRuntime = (r: Runtime) => {
    const variant = VARIANTS[r].includes(s.variant) ? s.variant : 'alpine';
    set({ runtime: r, variant, port: DEFAULT_PORTS[r] });
  };

  return (
    <div className="pg">
      <div className="pg-controls" {...hover.handlers}>
        <p className="pg-intro">{p.intro}</p>
        <Group title={p.groupBase}>
          <Field label={p.runtime} hint={p.runtimeHint} tag="base" stacked>
            <Segmented
              ariaLabel={p.runtime}
              value={s.runtime}
              onChange={setRuntime}
              options={(['node', 'python', 'go'] as Runtime[]).map((r) => ({ value: r, label: RUNTIME_LABEL[r] }))}
            />
          </Field>
          <Field label={p.variant} hint={p.variantHint} tag="base" stacked>
            <Segmented
              ariaLabel={p.variant}
              value={s.variant}
              onChange={(v) => set({ variant: v })}
              options={VARIANTS[s.runtime].map((v) => ({ value: v, label: p.variants[v] }))}
            />
          </Field>
        </Group>
        <Group title={p.groupBuild}>
          <Toggle tag="multiStage" checked={s.multiStage} onChange={(v) => set({ multiStage: v })} label={p.multiStage} hint={p.multiStageHint} />
          <Toggle tag="cacheDeps" checked={s.cacheDeps} onChange={(v) => set({ cacheDeps: v })} label={p.cacheDeps} hint={p.cacheDepsHint} />
          <Toggle tag="prodEnv" checked={s.prodEnv} onChange={(v) => set({ prodEnv: v })} label={p.env} hint={p.envHint} />
        </Group>
        <Group title={p.groupSecurity}>
          <Toggle tag="nonRoot" checked={s.nonRoot} onChange={(v) => set({ nonRoot: v })} label={p.nonRoot} hint={p.nonRootHint} />
          <Toggle tag="healthcheck" checked={s.healthcheck} onChange={(v) => set({ healthcheck: v })} label={p.healthcheck} hint={p.healthcheckHint} />
          <Field label={p.port} hint={p.portHint} tag="port">
            <Stepper value={s.port} min={1} max={65535} onChange={(v) => set({ port: v })} ariaLabel={p.port} />
          </Field>
        </Group>
      </div>
      <div className="pg-output">
        <CodeView lines={out.lines} lang="dockerfile" filename="Dockerfile" hoverTag={hover.tag} />
        <div className="size-card">
          <div className="size-head">
            <span>{p.size}</span>
            <strong className={out.total < 200 ? 'is-small' : out.total > 700 ? 'is-big' : ''}>
              {t.common.approx} {fmtSize(total)}
            </strong>
          </div>
          <div className="size-bar" aria-hidden>
            {out.layers.map((l, i) => (
              <span key={i} className={`size-seg k-${l.kind}`} style={{ width: `${(l.size / max) * 100}%` }} />
            ))}
          </div>
          <ul className="size-layers">
            {out.layers.map((l, i) => (
              <li key={`${l.label}-${i}`} className={`k-${l.kind}`}>
                <i />
                <code>{l.label}</code>
                <span>{fmtSize(l.size)}</span>
              </li>
            ))}
            {out.discarded.length > 0 && (
              <li className="is-discarded">
                <i />
                <code>builder: {out.discarded.map((l) => l.label.split(' ')[0]).join(' · ')}</code>
                <span>−{fmtSize(out.discarded.reduce((a, l) => a + l.size, 0))}</span>
              </li>
            )}
          </ul>
          <p className="size-note">{p.sizeNote}</p>
        </div>
      </div>
    </div>
  );
}
