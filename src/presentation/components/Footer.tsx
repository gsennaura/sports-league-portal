import { useState, useEffect } from "react";
import { useActiveLeague } from "@presentation/context/ActiveLeagueContext";
import minhaLigaLogo from "../../images/minha_liga.png";
import seteNosEsportesLogo from "../../images/sete_nos_esportes.png";
import seteColinasLogo from "../../images/sete_colinas.png";

const _RAW_BASE = "https://raw.githubusercontent.com/gsennaura/sports-manager-assets/refs/heads/main";
const NO_LEAGUE_PHOTO = `${_RAW_BASE}/leagues/no_league_photo.png`;

function useMobile(breakpoint = 600) {
  const [mobile, setMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return mobile;
}

export function Footer() {
  const year = new Date().getFullYear();
  const isMobile = useMobile();
  const { league } = useActiveLeague();
  const footerLogo = league?.logo_url ?? minhaLigaLogo;
  const footerName = league?.name ?? "Portal";

  if (isMobile) {
    return (
      <footer className="site-footer__mobile">
        <div className="site-footer__mobile-top">
          <span className="site-footer__apoio-label">Apoio</span>
          <img src={seteNosEsportesLogo} alt="7 nos Esportes" className="site-footer__apoio-logo--mobile" />
          <div className="site-footer__apoio-divider--mobile" />
          <img src={seteColinasLogo} alt="7 Colinas" className="site-footer__apoio-logo--mobile" />
        </div>
        <div className="site-footer__mobile-bottom">
          <div className="site-footer__brand">
            <img
              src={footerLogo}
              alt={footerName}
              className="site-footer__brand-logo--mobile"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = NO_LEAGUE_PHOTO; }}
            />
            <span className="site-footer__brand-name--mobile">{footerName}</span>
          </div>
          <span className="site-footer__dev-name--mobile">SENNA TECH LTDA © {year}</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <img
            src={footerLogo}
            alt={footerName}
            className="site-footer__brand-logo"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = NO_LEAGUE_PHOTO; }}
          />
          <span className="site-footer__brand-name">{footerName}</span>
        </div>
        <div className="site-footer__apoio">
          <span className="site-footer__apoio-label">Apoio</span>
          <div className="site-footer__apoio-logos">
            <img src={seteNosEsportesLogo} alt="7 nos Esportes" className="site-footer__apoio-logo" />
            <div className="site-footer__apoio-divider" />
            <img src={seteColinasLogo} alt="7 Colinas" className="site-footer__apoio-logo" />
          </div>
        </div>
        <div className="site-footer__dev">
          <span className="site-footer__dev-by">Desenvolvido por</span>
          <span className="site-footer__dev-name">SENNA TECH LTDA</span>
          <span className="site-footer__dev-year">© {year}</span>
        </div>
      </div>
    </footer>
  );
}
