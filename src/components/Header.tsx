import { useEffect, useState } from 'react';
import { fmt, useI18n } from '../i18n';
import { useTheme } from '../theme';
import { Select } from './ui/Select';
import { ChevronDown, GitHubIcon, GlobeIcon, MoonIcon, SunIcon } from './ui/Icons';
import { Logo } from './Logo';

export const REPO_URL = 'https://github.com/aimerneige/learn-docker-website';
const SECTIONS = ['concepts', 'playground', 'cheatsheet'] as const;

export function Header() {
  const { t, locale, locales, setLocale } = useI18n();
  const { theme, toggle } = useTheme();
  const [active, setActive] = useState<string>('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    SECTIONS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    const hero = document.getElementById('top');
    if (hero) io.observe(hero);
    return () => {
      window.removeEventListener('scroll', onScroll);
      io.disconnect();
    };
  }, []);

  const nextMode = theme === 'dark' ? t.header.light : t.header.dark;

  return (
    <header className={`header${scrolled ? ' is-scrolled' : ''}`}>
      <a className="skip-link" href="#concepts">
        {t.header.skip}
      </a>
      <div className="header-inner">
        <a href="#top" className="brand" aria-label="Learn Docker">
          <Logo />
          <span className="brand-text">
            Learn <b>Docker</b>
          </span>
        </a>
        <nav className="nav" aria-label="Main">
          {SECTIONS.map((id) => (
            <a key={id} href={`#${id}`} className={`nav-link${active === id ? ' is-active' : ''}`}>
              {t.nav[id]}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <Select
            ariaLabel={t.header.language}
            value={locale.code}
            onChange={setLocale}
            align="end"
            minWidth={180}
            triggerClassName="icon-trigger"
            options={locales.map((l) => ({ value: l.code, label: l.name, text: l.name, icon: <span className="lang-badge">{l.short}</span> }))}
            renderTrigger={() => (
              <>
                <GlobeIcon />
                <span className="lang-current">{locale.name}</span>
                <ChevronDown className="select-chevron" width={14} height={14} />
              </>
            )}
          />
          <button
            type="button"
            className={`theme-toggle is-${theme}`}
            aria-label={fmt(t.header.toggleTheme, { mode: nextMode })}
            title={fmt(t.header.toggleTheme, { mode: nextMode })}
            onClick={(e) => toggle({ x: e.clientX, y: e.clientY })}
          >
            <span className="theme-icon sun">
              <SunIcon />
            </span>
            <span className="theme-icon moon">
              <MoonIcon />
            </span>
          </button>
          <a className="icon-link" href={REPO_URL} target="_blank" rel="noreferrer" aria-label={t.header.github} title={t.header.github}>
            <GitHubIcon width={20} height={20} />
          </a>
        </div>
      </div>
    </header>
  );
}
