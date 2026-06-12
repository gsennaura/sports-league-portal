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
      <footer style={S.footerMobile}>
        <div style={S.mobileTop}>
          <span style={S.apoioLabel}>Apoio</span>
          <img src={seteNosEsportesLogo} alt="7 nos Esportes" style={S.apoioLogoMobile} />
          <div style={S.apoioDividerMobile} />
          <img src={seteColinasLogo} alt="7 Colinas" style={S.apoioLogoMobile} />
        </div>
        <div style={S.mobileBottom}>
          <div style={S.brand}>
            <img
              src={footerLogo}
              alt={footerName}
              style={S.brandLogoMobile}
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = NO_LEAGUE_PHOTO; }}
            />
            <span style={S.brandNameMobile}>{footerName}</span>
          </div>
          <span style={S.devNameMobile}>SENNA TECH LTDA © {year}</span>
        </div>
      </footer>
    );
  }

  return (
    <footer style={S.footer}>
      <div style={S.inner}>
        <div style={S.brand}>
          <img
            src={footerLogo}
            alt={footerName}
            style={S.brandLogo}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = NO_LEAGUE_PHOTO; }}
          />
          <span style={S.brandName}>{footerName}</span>
        </div>
        <div style={S.apoioBlock}>
          <span style={S.apoioLabel}>Apoio</span>
          <div style={S.apoioLogos}>
            <img src={seteNosEsportesLogo} alt="7 nos Esportes" style={S.apoioLogo} />
            <div style={S.apoioDivider} />
            <img src={seteColinasLogo} alt="7 Colinas" style={S.apoioLogo} />
          </div>
        </div>
        <div style={S.devBlock}>
          <span style={S.devBy}>Desenvolvido por</span>
          <span style={S.devName}>SENNA TECH LTDA</span>
          <span style={S.devYear}>© {year}</span>
        </div>
      </div>
    </footer>
  );
}

const S: Record<string, React.CSSProperties> = {
  // ─── Desktop ───────────────────────────────────────────────
  footer: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 200,
    height: "64px",
    backgroundColor: "rgba(13, 13, 23, 0.97)",
    borderTop: "1px solid #313244",
    backdropFilter: "blur(10px)",
  },
  inner: {
    maxWidth: "1200px",
    margin: "0 auto",
    height: "100%",
    padding: "0 2rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
  },

  // ─── Mobile ────────────────────────────────────────────────
  footerMobile: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 200,
    backgroundColor: "rgba(13, 13, 23, 0.97)",
    borderTop: "1px solid #313244",
    backdropFilter: "blur(10px)",
    display: "flex",
    flexDirection: "column" as const,
    padding: "0.35rem 1rem 0.45rem",
    gap: "0.25rem",
  },
  mobileTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
  },
  mobileBottom: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  apoioLogoMobile: {
    height: "20px",
    width: "auto",
    objectFit: "contain" as const,
    opacity: 0.85,
  },
  apoioDividerMobile: {
    width: "1px",
    height: "14px",
    backgroundColor: "#313244",
  },
  brandLogoMobile: {
    height: "20px",
    width: "auto",
    objectFit: "contain" as const,
    filter: "drop-shadow(0 1px 3px rgba(137,180,250,0.3))",
  },
  brandNameMobile: {
    color: "#89b4fa",
    fontWeight: 700,
    fontSize: "0.75rem",
    whiteSpace: "nowrap" as const,
  },
  devNameMobile: {
    color: "#ffffff",
    fontSize: "0.58rem",
    fontWeight: 600,
    letterSpacing: "0.03em",
  },

  // ─── Shared ────────────────────────────────────────────────
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
    flexShrink: 0,
  },
  brandLogo: {
    height: "36px",
    width: "auto",
    objectFit: "contain" as const,
    filter: "drop-shadow(0 1px 4px rgba(137,180,250,0.3))",
  },
  brandName: {
    color: "#89b4fa",
    fontWeight: 700,
    fontSize: "0.95rem",
    letterSpacing: "0.01em",
    whiteSpace: "nowrap" as const,
  },
  apoioBlock: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    flexShrink: 0,
  },
  apoioLabel: {
    color: "#ffffff",
    fontSize: "0.6rem",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
  },
  apoioLogos: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
  },
  apoioLogo: {
    height: "32px",
    width: "auto",
    objectFit: "contain" as const,
    opacity: 0.9,
    filter: "brightness(0.95)",
  },
  apoioDivider: {
    width: "1px",
    height: "24px",
    backgroundColor: "#313244",
  },
  devBlock: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "flex-end",
    gap: "0.1rem",
    flexShrink: 0,
  },
  devBy: {
    color: "#ffffff",
    fontSize: "0.62rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  },
  devName: {
    color: "#ffffff",
    fontSize: "0.78rem",
    fontWeight: 700,
    letterSpacing: "0.04em",
  },
  devYear: {
    color: "#45475a",
    fontSize: "0.58rem",
  },
};
