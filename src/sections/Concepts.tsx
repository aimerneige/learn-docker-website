import { useState } from 'react';
import { useI18n } from '../i18n';
import { Section } from '../components/Section';
import { Tabs } from '../components/ui/Tabs';
import { ImageDemo } from './concepts/ImageDemo';
import { LayersDemo } from './concepts/LayersDemo';
import { LifecycleDemo } from './concepts/LifecycleDemo';
import { VolumesDemo } from './concepts/VolumesDemo';
import { NetworkDemo } from './concepts/NetworkDemo';
import { ComposeDemo } from './concepts/ComposeDemo';
import { useReveal } from '../lib/useReveal';

const DEMOS = { image: ImageDemo, layers: LayersDemo, lifecycle: LifecycleDemo, volumes: VolumesDemo, network: NetworkDemo, compose: ComposeDemo };
type Id = keyof typeof DEMOS;

export function Concepts() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Id>('image');
  const ref = useReveal<HTMLDivElement>();
  const Demo = DEMOS[tab];
  const ids = Object.keys(DEMOS) as Id[];
  return (
    <Section id="concepts" eyebrow={t.concepts.eyebrow} title={t.concepts.title} subtitle={t.concepts.subtitle}>
      <div className="card concepts-card reveal" ref={ref}>
        <Tabs idPrefix="concepts" ariaLabel={t.concepts.title} value={tab} onChange={setTab} items={ids.map((id) => ({ id, label: t.concepts.tabs[id] }))} />
        <div className="tab-panel" role="tabpanel" id="concepts-panel" aria-labelledby={`concepts-tab-${tab}`} key={tab}>
          <Demo />
        </div>
      </div>
    </Section>
  );
}
