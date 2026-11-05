import { useMemo } from 'react';
import { useI18n } from '../../i18n';
import { CodeView } from '../../components/CodeView';
import { Select } from '../../components/ui/Select';
import { Slider } from '../../components/ui/Slider';
import { Stepper } from '../../components/ui/Stepper';
import { AlertIcon } from '../../components/ui/Icons';
import { genRun, RUN_IMAGES, type RunImage, type RunState, type Restart } from '../../lib/genRun';
import { Field, Group, Reveal, Toggle, useHoverTag } from './parts';

export const RESTARTS: Restart[] = ['no', 'always', 'unless-stopped', 'on-failure'];

export function RunBuilder({ s, set, comments }: { s: RunState; set: (p: Partial<RunState>) => void; comments: boolean }) {
  const { t } = useI18n();
  const p = t.playground.run;
  const hover = useHoverTag();
  const out = useMemo(() => genRun(s, t, comments), [s, t, comments]);

  return (
    <div className="pg">
      <div className="pg-controls" {...hover.handlers}>
        <p className="pg-intro">{p.intro}</p>
        <Group title={p.groupBasic}>
          <Field label={p.image} hint={p.imageHint} tag="image">
            <Select
              ariaLabel={p.image}
              value={s.image}
              onChange={(v) => set({ image: v })}
              minWidth={220}
              options={(Object.keys(RUN_IMAGES) as RunImage[]).map((k) => ({
                value: k,
                label: RUN_IMAGES[k].ref,
                text: k,
                description: `:${RUN_IMAGES[k].port} · ${RUN_IMAGES[k].mount}`,
              }))}
            />
          </Field>
          <Toggle tag="detach" checked={s.detach} onChange={(v) => set({ detach: v })} label={p.detach} hint={p.detachHint} />
          <Toggle tag="rm" checked={s.rm} onChange={(v) => set({ rm: v })} label={p.autoRemove} hint={p.autoRemoveHint} />
          <Toggle tag="name" checked={s.name} onChange={(v) => set({ name: v })} label={p.name} hint={p.nameHint} />
          <Toggle tag="publish" checked={s.publish} onChange={(v) => set({ publish: v })} label={p.publish} hint={p.publishHint} />
          <Reveal show={s.publish}>
            <Field label={p.hostPort} tag="publish">
              <Stepper value={s.hostPort} min={1} max={65535} onChange={(v) => set({ hostPort: v })} ariaLabel={p.hostPort} />
            </Field>
          </Reveal>
          <Toggle tag="volume" checked={s.volume} onChange={(v) => set({ volume: v })} label={p.volume} hint={p.volumeHint} />
          <Toggle tag="env" checked={s.env} onChange={(v) => set({ env: v })} label={p.env} hint={p.envHint} />
        </Group>
        <Group title={p.groupRuntime}>
          <Toggle tag="network" checked={s.network} onChange={(v) => set({ network: v })} label={p.network} hint={p.networkHint} />
          <Field label={p.restart} hint={p.restartHint} tag="restart">
            <Select
              ariaLabel={p.restart}
              value={s.restart}
              onChange={(v) => set({ restart: v })}
              minWidth={230}
              options={RESTARTS.map((r) => ({ value: r, label: r, description: t.playground.restart[r] }))}
            />
          </Field>
          <Toggle tag="memory" checked={s.memory} onChange={(v) => set({ memory: v })} label={p.memory} hint={p.memoryHint} />
          <Reveal show={s.memory}>
            <Field label="" tag="memory" stacked>
              <Slider
                value={s.memoryMb}
                min={128}
                max={2048}
                step={128}
                onChange={(v) => set({ memoryMb: v })}
                ariaLabel={p.memory}
                format={(v) => (v >= 1024 ? `${(v / 1024).toFixed(v % 1024 ? 2 : 0)} GB` : `${v} MB`)}
              />
            </Field>
          </Reveal>
          <Toggle tag="readOnly" checked={s.readOnly} onChange={(v) => set({ readOnly: v })} label={p.readOnly} hint={p.readOnlyHint} />
        </Group>
      </div>
      <div className="pg-output is-double">
        <span className="pg-output-label">{p.command}</span>
        <CodeView lines={out.cmd} lang="shell" filename="run.sh" hoverTag={hover.tag} />
        {out.conflict && (
          <div className="notice">
            <AlertIcon width={16} height={16} />
            {p.rmRestartConflict}
          </div>
        )}
        <span className="pg-output-label">{p.equivalent}</span>
        <CodeView lines={out.yaml} lang="yaml" filename="compose.yaml" hoverTag={hover.tag} />
      </div>
    </div>
  );
}
