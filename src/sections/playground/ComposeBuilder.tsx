import { useMemo } from 'react';
import { useI18n } from '../../i18n';
import { CodeView } from '../../components/CodeView';
import { Segmented } from '../../components/ui/Segmented';
import { Select } from '../../components/ui/Select';
import { Slider } from '../../components/ui/Slider';
import { Stepper } from '../../components/ui/Stepper';
import { genCompose, type ComposeState, type Engine } from '../../lib/genCompose';
import type { Runtime } from '../../lib/genDockerfile';
import { RESTARTS } from './RunBuilder';
import { Field, Group, Reveal, Toggle, useHoverTag } from './parts';

type Patch<K extends keyof ComposeState> = Partial<ComposeState[K]>;

export function ComposeBuilder({ s, set, comments }: { s: ComposeState; set: (next: ComposeState) => void; comments: boolean }) {
  const { t } = useI18n();
  const p = t.playground.compose;
  const hover = useHoverTag();
  const lines = useMemo(() => genCompose(s, t, comments), [s, t, comments]);
  const up = <K extends keyof ComposeState>(k: K, patch: Patch<K>) => set({ ...s, [k]: { ...s[k], ...patch } });

  return (
    <div className="pg">
      <div className="pg-controls" {...hover.handlers}>
        <p className="pg-intro">{p.intro}</p>

        <Group title={p.web} hint={p.webHint} tag="web" enabled={s.web.on} onToggle={(v) => up('web', { on: v })} toggleLabel={p.enabled}>
          <Field label={p.server} tag="web.server">
            <Segmented
              size="sm"
              ariaLabel={p.server}
              value={s.web.server}
              onChange={(v) => up('web', { server: v })}
              options={[
                { value: 'nginx', label: 'nginx' },
                { value: 'caddy', label: 'Caddy' },
              ]}
            />
          </Field>
          <Field label={p.hostPort} tag="web.port">
            <Stepper value={s.web.port} min={1} max={65535} onChange={(v) => up('web', { port: v })} ariaLabel={p.hostPort} />
          </Field>
          <Toggle tag="web.https" checked={s.web.https} onChange={(v) => up('web', { https: v })} label={p.https} />
        </Group>

        <Group title={p.app} hint={p.appHint} tag="app" enabled={s.app.on} onToggle={(v) => up('app', { on: v })} toggleLabel={p.enabled}>
          <Field label={p.runtime} tag="app.runtime">
            <Segmented
              size="sm"
              ariaLabel={p.runtime}
              value={s.app.runtime}
              onChange={(v: Runtime) => up('app', { runtime: v })}
              options={[
                { value: 'node', label: 'Node' },
                { value: 'python', label: 'Python' },
                { value: 'go', label: 'Go' },
              ]}
            />
          </Field>
          <Field label={p.source} tag="app.source">
            <Segmented
              size="sm"
              ariaLabel={p.source}
              value={s.app.source}
              onChange={(v) => up('app', { source: v })}
              options={[
                { value: 'build', label: p.sources.build },
                { value: 'image', label: p.sources.image },
              ]}
            />
          </Field>
          <Toggle tag="app.devMount" checked={s.app.devMount} onChange={(v) => up('app', { devMount: v })} label={p.devMount} hint={p.devMountHint} />
          <Field label={p.replicas} tag="app.replicas" stacked>
            <Slider value={s.app.replicas} min={1} max={5} step={1} ticks onChange={(v) => up('app', { replicas: v })} ariaLabel={p.replicas} format={(v) => `× ${v}`} />
          </Field>
        </Group>

        <Group title={p.db} hint={p.dbHint} tag="db" enabled={s.db.on} onToggle={(v) => up('db', { on: v })} toggleLabel={p.enabled}>
          <Field label={p.engine} tag="db.engine">
            <Select
              ariaLabel={p.engine}
              value={s.db.engine}
              onChange={(v: Engine) => up('db', { engine: v })}
              minWidth={200}
              options={[
                { value: 'postgres', label: 'PostgreSQL', description: 'postgres:17-alpine' },
                { value: 'mysql', label: 'MySQL', description: 'mysql:8.4' },
                { value: 'mongo', label: 'MongoDB', description: 'mongo:8' },
              ]}
            />
          </Field>
          <Toggle tag="db.persist" checked={s.db.persist} onChange={(v) => up('db', { persist: v })} label={p.persist} hint={p.persistHint} />
          <Toggle tag="db.health" checked={s.db.health} onChange={(v) => up('db', { health: v })} label={p.healthcheck} hint={p.healthcheckHint} />
          <Toggle tag="db.secrets" checked={s.db.secrets} onChange={(v) => up('db', { secrets: v })} label={p.secrets} hint={p.secretsHint} />
          <Toggle tag="db.expose" checked={s.db.expose} onChange={(v) => up('db', { expose: v })} label={p.exposeDb} hint={p.exposeDbHint} />
        </Group>

        <Group title={p.cache} hint={p.cacheHint} tag="cache" enabled={s.cache.on} onToggle={(v) => up('cache', { on: v })} toggleLabel={p.enabled}>
          <Toggle tag="cache.aof" checked={s.cache.aof} onChange={(v) => up('cache', { aof: v })} label={p.cachePersist} hint={p.cachePersistHint} />
        </Group>

        <Group title={p.global} hint={p.globalHint} tag="global">
          <Field label={p.restart} tag="global.restart">
            <Select
              ariaLabel={p.restart}
              value={s.global.restart}
              onChange={(v) => up('global', { restart: v })}
              minWidth={230}
              options={RESTARTS.map((r) => ({ value: r, label: r, description: t.playground.restart[r] }))}
            />
          </Field>
          <Toggle tag="global.networks" checked={s.global.networks} onChange={(v) => up('global', { networks: v })} label={p.networks} hint={p.networksHint} />
          <Toggle tag="global.limits" checked={s.global.limits} onChange={(v) => up('global', { limits: v })} label={p.limits} hint={p.limitsHint} />
          <Reveal show={s.global.limits}>
            <Field label={p.cpus} tag="global.limits" stacked>
              <Slider value={s.global.cpus} min={0.25} max={4} step={0.25} onChange={(v) => up('global', { cpus: v })} ariaLabel={p.cpus} format={(v) => `${v} CPU`} />
            </Field>
            <Field label={p.memory} tag="global.limits">
              <Segmented
                size="sm"
                ariaLabel={p.memory}
                value={String(s.global.memory)}
                onChange={(v) => up('global', { memory: Number(v) })}
                options={['256', '512', '1024', '2048'].map((m) => ({ value: m, label: Number(m) >= 1024 ? `${Number(m) / 1024}G` : `${m}M` }))}
              />
            </Field>
          </Reveal>
          <Toggle tag="global.logging" checked={s.global.logging} onChange={(v) => up('global', { logging: v })} label={p.logging} hint={p.loggingHint} />
        </Group>
      </div>
      <div className="pg-output">
        <CodeView lines={lines} lang="yaml" filename="compose.yaml" hoverTag={hover.tag} empty={p.empty} />
      </div>
    </div>
  );
}
