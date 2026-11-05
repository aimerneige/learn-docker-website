import { useI18n } from '../i18n';
import { Button } from './ui/Button';
import { ArrowRightIcon, PlayIcon } from './ui/Icons';

const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

export function Hero() {
  const { t } = useI18n();
  return (
    <section className="hero" id="top">
      <div className="hero-bg" aria-hidden>
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
        <span className="grid-lines" />
      </div>
      <div className="hero-inner">
        <div className="hero-copy">
          <span className="badge-pill">
            <span className="dot-live" />
            {t.hero.badge}
          </span>
          <h1>
            {t.hero.title}
            <br />
            <span className="grad-text">{t.hero.titleAccent}</span>
          </h1>
          <p className="hero-sub">{t.hero.subtitle}</p>
          <div className="hero-cta">
            <Button variant="primary" size="lg" icon={<PlayIcon />} onClick={() => go('concepts')}>
              {t.hero.start}
            </Button>
            <Button variant="outline" size="lg" iconRight={<ArrowRightIcon />} onClick={() => go('playground')}>
              {t.hero.playground}
            </Button>
          </div>
          <ul className="hero-features">
            {t.hero.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
        <WhaleScene />
      </div>
    </section>
  );
}

const BOXES = [
  { x: 118, y: 120, c: 'c1', d: 0 },
  { x: 166, y: 120, c: 'c2', d: 0.15 },
  { x: 214, y: 120, c: 'c3', d: 0.3 },
  { x: 262, y: 120, c: 'c4', d: 0.45 },
  { x: 142, y: 80, c: 'c5', d: 0.7 },
  { x: 190, y: 80, c: 'c1', d: 0.85 },
  { x: 238, y: 80, c: 'c3', d: 1.0 },
  { x: 190, y: 40, c: 'c2', d: 1.25 },
];

function WhaleScene() {
  const { t } = useI18n();
  return (
    <div className="whale-scene" aria-hidden>
      <svg viewBox="0 0 420 340" className="whale-svg">
        <defs>
          <linearGradient id="whale-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--whale-top)" />
            <stop offset="1" stopColor="var(--whale-bottom)" />
          </linearGradient>
          <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--sea-top)" />
            <stop offset="1" stopColor="var(--sea-bottom)" />
          </linearGradient>
          <clipPath id="scene-clip">
            <rect x="0" y="0" width="420" height="340" rx="28" />
          </clipPath>
        </defs>
        <g clipPath="url(#scene-clip)">
          <g className="spray" transform="translate(-246 4)">
            <path d="M330 150c-4-18 2-30 10-38" />
            <path d="M336 150c2-20 12-28 22-30" />
            <path d="M326 150c-10-14-10-26-6-36" />
          </g>
          <g className="whale">
            <g className="boxes">
              {BOXES.map((b, i) => (
                <g key={i} className="box-drop" style={{ animationDelay: `${b.d}s` }}>
                  <rect x={b.x} y={b.y} width="44" height="36" rx="5" className={`box ${b.c}`} />
                  <path d={`M${b.x + 11} ${b.y + 7}v22M${b.x + 22} ${b.y + 7}v22M${b.x + 33} ${b.y + 7}v22`} className="box-rib" />
                </g>
              ))}
            </g>
            <path
              className="whale-body"
              d="M60 160h290c8-12 22-18 34-16-6 30-28 44-44 46-24 52-90 82-160 82C110 272 66 222 60 160Z"
              fill="url(#whale-body)"
            />
            <path className="whale-belly" d="M90 214c40 30 120 36 190 10-30 26-74 40-118 38-34-2-58-20-72-48Z" />
            <circle cx="118" cy="190" r="7" className="whale-eye" />
            <circle cx="120" cy="188" r="2.4" fill="#fff" />
            <path className="whale-tail" d="M350 160c10-20 30-34 50-36-4 14-14 26-26 32 14 2 24 10 30 22-20 2-40-6-54-18Z" />
          </g>
          <g className="waves">
            <path className="wave w1" d="M-420 262q35-16 70 0t70 0 70 0 70 0 70 0 70 0 70 0 70 0 70 0 70 0 70 0 70 0V340H-420Z" />
            <path className="wave w2" d="M-420 278q35-12 70 0t70 0 70 0 70 0 70 0 70 0 70 0 70 0 70 0 70 0 70 0 70 0V340H-420Z" />
          </g>
          <g className="bubbles">
            <circle cx="70" cy="320" r="4" />
            <circle cx="180" cy="330" r="3" />
            <circle cx="300" cy="325" r="5" />
            <circle cx="370" cy="332" r="3" />
          </g>
        </g>
      </svg>
      <div className="float-card fc1">
        <code>$ docker run -d nginx</code>
      </div>
      <div className="float-card fc2">
        <span className="dot-ok" /> {t.hero.running}
      </div>
    </div>
  );
}
