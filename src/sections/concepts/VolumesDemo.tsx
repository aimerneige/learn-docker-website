import { useState } from 'react';
import { useI18n } from '../../i18n';
import { Button } from '../../components/ui/Button';
import { Segmented } from '../../components/ui/Segmented';
import { BoxIcon, DatabaseIcon, FolderIcon, PlayIcon, PlusIcon, TrashIcon } from '../../components/ui/Icons';
import { highlight } from '../../lib/highlight';
import { DemoLayout, randomHex } from './DemoLayout';

type Mode = 'none' | 'named' | 'bind';
interface Rec {
  id: number;
  text: string;
}

const FLAGS: Record<Mode, string> = {
  none: 'docker run -d postgres:17',
  named: 'docker run -d -v db-data:/var/lib/postgresql/data postgres:17',
  bind: 'docker run -d -v ./data:/var/lib/postgresql/data postgres:17',
};

export function VolumesDemo() {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('named');
  const [ctr, setCtr] = useState<string | null>(() => randomHex(12));
  const [inCtr, setInCtr] = useState<Rec[]>([]);
  const [inVol, setInVol] = useState<Rec[]>([]);
  const [seq, setSeq] = useState(1);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const mounted = mode !== 'none';

  const changeMode = (m: Mode) => {
    setMode(m);
    setCtr(randomHex(12));
    setInCtr([]);
    setInVol([]);
    setSeq(1);
    setMsg(null);
  };

  const write = () => {
    const rec = { id: seq, text: `row #${seq}` };
    setSeq((s) => s + 1);
    if (mounted) setInVol((v) => [...v, rec]);
    else setInCtr((v) => [...v, rec]);
    setMsg(null);
  };

  const remove = () => {
    setCtr(null);
    const had = mounted ? inVol.length : inCtr.length;
    setInCtr([]);
    setMsg(!mounted && had ? { ok: false, text: t.volumes.lost } : null);
  };

  const recreate = () => {
    setCtr(randomHex(12));
    setMsg(mounted && inVol.length ? { ok: true, text: t.volumes.kept } : null);
  };

  const visible = mounted ? inVol : inCtr;
  const VolIcon = mode === 'bind' ? FolderIcon : DatabaseIcon;

  return (
    <DemoLayout title={t.volumes.title} desc={t.volumes.desc} points={t.volumes.points}>
      <div className="stage-row">
        <span className="stage-label">{t.volumes.mode}</span>
        <Segmented
          ariaLabel={t.volumes.mode}
          value={mode}
          onChange={changeMode}
          options={(['none', 'named', 'bind'] as Mode[]).map((m) => ({ value: m, label: t.volumes.modes[m] }))}
        />
      </div>
      <div className={`vol-stage mode-${mode}`}>
        <div className={`vol-ctr${ctr ? ' is-alive' : ' is-gone'}`} key={ctr ?? 'gone'}>
          {ctr ? (
            <>
              <div className="vol-head">
                <BoxIcon width={18} height={18} />
                <span>{t.volumes.container}</span>
                <code>{ctr}</code>
              </div>
              <div className="vol-path">/var/lib/postgresql/data</div>
              <div className={`vol-records${mounted ? ' is-mounted' : ''}`}>
                {visible.length === 0 && <span className="vol-empty">{t.volumes.empty}</span>}
                {visible.map((r) => (
                  <span key={r.id} className="vol-rec">
                    {r.text}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="vol-placeholder">{t.volumes.noContainer}</div>
          )}
        </div>
        <div className={`vol-link${mounted && ctr ? ' is-on' : ''}`} aria-hidden>
          <span />
        </div>
        <div className={`vol-store${mounted ? ' is-on' : ''}`}>
          <div className="vol-head">
            <VolIcon width={18} height={18} />
            <span>{mode === 'bind' ? t.volumes.host : t.volumes.volume}</span>
            <code>{mode === 'bind' ? './data' : mode === 'named' ? 'db-data' : '—'}</code>
          </div>
          <div className="vol-records">
            {!mounted && <span className="vol-empty">—</span>}
            {mounted && inVol.length === 0 && <span className="vol-empty">{t.volumes.empty}</span>}
            {mounted &&
              inVol.map((r) => (
                <span key={r.id} className="vol-rec">
                  {r.text}
                </span>
              ))}
          </div>
        </div>
      </div>
      <div className={`stage-msg${msg ? (msg.ok ? ' is-ok' : ' is-bad') : ''}`} aria-live="polite">
        {msg ? msg.text : t.volumes.hint}
      </div>
      <code className="cli-line">
        {highlight(FLAGS[mode], 'shell').map((tk, k) => (
          <span key={k} className={tk.c ? `tk-${tk.c}` : undefined}>
            {tk.s}
          </span>
        ))}
      </code>
      <div className="stage-controls">
        <Button variant="primary" icon={<PlusIcon />} onClick={write} disabled={!ctr}>
          {t.volumes.write}
        </Button>
        <Button variant="danger" icon={<TrashIcon />} onClick={remove} disabled={!ctr}>
          <span className="mono-label">{t.volumes.remove}</span>
        </Button>
        <Button variant="soft" icon={<PlayIcon />} onClick={recreate} disabled={!!ctr}>
          <span className="mono-label">{t.volumes.recreate}</span>
        </Button>
      </div>
    </DemoLayout>
  );
}
