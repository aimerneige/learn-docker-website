import { useI18n } from '../i18n';
import { REPO_URL } from './Header';
import { Logo } from './Logo';
import { Button } from './ui/Button';
import { ArrowUpIcon, GitHubIcon } from './ui/Icons';

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Logo size={28} />
          <div>
            <strong>Learn Docker</strong>
            <p>{t.footer.tagline}</p>
          </div>
        </div>
        <div className="footer-links">
          <a className="footer-gh" href={REPO_URL} target="_blank" rel="noreferrer">
            <GitHubIcon width={18} height={18} />
            {t.footer.source}
          </a>
          <Button size="sm" variant="ghost" icon={<ArrowUpIcon />} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            {t.footer.backToTop}
          </Button>
        </div>
      </div>
      <p className="footer-note">{t.footer.note}</p>
    </footer>
  );
}
