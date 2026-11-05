import { useState } from 'react';
import { useI18n } from '../i18n';
import { Section } from '../components/Section';
import { Button } from '../components/ui/Button';
import { ResetIcon } from '../components/ui/Icons';
import { Switch } from '../components/ui/Switch';
import { Tabs } from '../components/ui/Tabs';
import { useToast } from '../components/ui/Toast';
import { COMPOSE_DEFAULTS } from '../lib/genCompose';
import { DF_DEFAULTS } from '../lib/genDockerfile';
import { RUN_DEFAULTS } from '../lib/genRun';
import { usePersistent } from '../lib/usePersistent';
import { useReveal } from '../lib/useReveal';
import { ComposeBuilder } from './playground/ComposeBuilder';
import { DockerfileBuilder } from './playground/DockerfileBuilder';
import { RunBuilder } from './playground/RunBuilder';

type Tab = 'run' | 'dockerfile' | 'compose';

export function Playground() {
  const { t } = useI18n();
  const toast = useToast();
  const ref = useReveal<HTMLDivElement>();
  const [savedTab, setTab] = usePersistent<Tab>('ld-pg-tab', 'compose');
  const tab: Tab = (['run', 'dockerfile', 'compose'] as const).includes(savedTab) ? savedTab : 'compose';
  const [comments, setComments] = usePersistent('ld-pg-comments', true);
  const [run, setRun, resetRun] = usePersistent('ld-pg-run', RUN_DEFAULTS);
  const [df, setDf, resetDf] = usePersistent('ld-pg-df', DF_DEFAULTS);
  const [compose, setCompose, resetCompose] = usePersistent('ld-pg-compose', COMPOSE_DEFAULTS);
  const [spin, setSpin] = useState(0);

  const reset = () => {
    ({ run: resetRun, dockerfile: resetDf, compose: resetCompose })[tab]();
    setSpin((n) => n + 1);
    toast(t.common.resetDone, 'info');
  };

  const tabs: Tab[] = ['compose', 'dockerfile', 'run'];

  return (
    <Section id="playground" eyebrow={t.playground.eyebrow} title={t.playground.title} subtitle={t.playground.subtitle}>
      <div className="card pg-card reveal" ref={ref}>
        <div className="pg-top">
          <Tabs idPrefix="pg" ariaLabel={t.playground.title} value={tab} onChange={setTab} items={tabs.map((id) => ({ id, label: t.playground.tabs[id] }))} />
          <div className="pg-top-actions">
            <div className="compact-switch">
              <Switch checked={comments} onChange={setComments} label={t.playground.comments} />
            </div>
            <Button variant="ghost" size="sm" icon={<ResetIcon key={spin} className={spin ? 'spin-once' : ''} />} onClick={reset}>
              {t.common.reset}
            </Button>
          </div>
        </div>
        <p className="pg-hover-hint">{t.playground.hoverHint}</p>
        <div className="tab-panel" role="tabpanel" id="pg-panel" aria-labelledby={`pg-tab-${tab}`} key={tab}>
          {tab === 'run' && <RunBuilder s={run} set={(p) => setRun({ ...run, ...p })} comments={comments} />}
          {tab === 'dockerfile' && <DockerfileBuilder s={df} set={(p) => setDf({ ...df, ...p })} comments={comments} />}
          {tab === 'compose' && <ComposeBuilder s={compose} set={setCompose} comments={comments} />}
        </div>
      </div>
    </Section>
  );
}
