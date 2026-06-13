import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@presentation/context/AuthContext";

type NavChildLink = { label: string; href: string };
type NavChildSep  = { sep: true; label: string };
type NavChild     = NavChildLink | NavChildSep;
type NavItem =
  | { label: string; href: string; exact?: boolean; children?: undefined }
  | { label: string; href?: undefined; exact?: undefined; children: NavChild[] };

const BASE_NAV_ITEMS: NavItem[] = [
  { label: "Notícias",   href: "/noticias" },
  { label: "Documentos", href: "/documentos" },
  { label: "Emendas",    href: "/emendas" },
  { label: "Ao Vivo",    href: "/ao-vivo" },
  {
    label: "Competições",
    children: [
      { label: "Ligas", href: "/ligas" },
      { label: "Campeonatos", href: "/campeonatos" },
    ],
  },
  {
    label: "Explorar",
    children: [
      { label: "Clubes",   href: "/clubes" },
      { label: "Atletas",  href: "/atletas" },
      { label: "Árbitros", href: "/arbitros" },
      { label: "Locais",   href: "/locais" },
    ],
  },
];

const ADMIN_NAV_ITEM: NavItem = {
  label: "Admin",
  children: [
    { sep: true, label: "Cadastros" },
    { label: "Cidades",     href: "/admin/cidades" },
    { label: "Locais",      href: "/admin/locais" },
    { label: "Clubes",      href: "/admin/clubes" },
    { label: "Times",       href: "/admin/times" },
    { label: "Ligas",       href: "/admin/ligas" },
    { label: "Campeonatos", href: "/admin/campeonatos" },
    { sep: true, label: "Pessoas" },
    { label: "Atletas",        href: "/admin/atletas" },
    { label: "Árbitros",       href: "/admin/arbitros" },
    { label: "Dirigentes",     href: "/admin/dirigentes" },
    { label: "Admins de Liga", href: "/admin/league-admins" },
    { label: "Usuários",       href: "/admin/usuarios" },
    { sep: true, label: "Operações" },
    { label: "Inscrições",          href: "/admin/inscricoes" },
    { label: "Importações",         href: "/admin/importar" },
    { label: "⏳ Pendências Vínculo", href: "/admin/pendencias-vinculo" },
  ],
};

export function TopNav() {
  const { user, isAdmin, isAthlete, isDirigente, isLeagueAdmin, leagueAdminProfiles, logout } = useAuth();

  const initials = user
    ? (user.name
        ? user.name.split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase()
        : user.email.slice(0, 2).toUpperCase())
    : "";
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);

  // Build "Minha Conta" menu dynamically — stacks items based on active roles
  const userMenuChildren: { label: string; href: string }[] = [
    ...(isAthlete ? [
      { label: "Meu Perfil",        href: "/meu-perfil" },
      { label: "Solicitar Vínculo", href: "/solicitar-vinculo" },
    ] : []),
    ...(isDirigente ? [
      { label: "Meu Time", href: "/meu-time" },
    ] : []),
    ...(isLeagueAdmin ? [
      { label: "⏳ Pendências Vínculo", href: "/admin/pendencias-vinculo" },
      ...leagueAdminProfiles
        .filter(p => p.is_active)
        .map(p => ({
          label: leagueAdminProfiles.filter(x => x.is_active).length === 1 ? "Clubes Filiados" : `Clubes (Liga ${p.league_id.slice(-4)})`,
          href: `/admin/ligas/${p.league_id}/clubes`,
        })),
      { label: "Campeonatos",           href: "/admin/campeonatos" },
      { label: "Times",                 href: "/admin/times" },
      { label: "Atletas",               href: "/admin/atletas" },
      { label: "Inscrições",            href: "/admin/inscricoes" },
      { label: "Partidas",              href: "/admin/partidas" },
    ] : []),
  ];
  const userMenuItem: NavItem | null =
    userMenuChildren.length > 0
      ? { label: "Minha Conta", children: userMenuChildren }
      : null;

  const isLoggedIn = isAdmin || isAthlete || isDirigente || isLeagueAdmin;

  const navItems = isAdmin
    ? [...BASE_NAV_ITEMS, ADMIN_NAV_ITEM]
    : [
        ...BASE_NAV_ITEMS,
        ...(userMenuItem ? [userMenuItem] : []),
      ];

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (!e.matches) { setMenuOpen(false); setOpenDropdown(null); }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  function toggleDropdown(label: string) {
    setOpenDropdown((prev) => (prev === label ? null : label));
  }

  function closeAll() {
    setMenuOpen(false);
    setOpenDropdown(null);
  }

  return (
    <nav style={S.nav}>
      <div style={S.inner}>


        {/* Desktop links */}
        {!isMobile && (
        <div style={S.desktopLinks}>
          {navItems.map((item) =>
            item.children ? (
              <div key={item.label} style={S.dropdownWrapper}>
                <button
                  style={S.dropBtn}
                  onClick={() => toggleDropdown(item.label)}
                  onBlur={() => setTimeout(() => setOpenDropdown(null), 150)}
                >
                  {item.label} <span style={S.caret}>▾</span>
                </button>
                {openDropdown === item.label && (
                  <div style={{ ...S.dropdown, ...(item.label === "Admin" || item.label === "Minha Conta" ? S.dropdownRight : {}) }}>
                    {item.children.map((child) =>
                      "sep" in child ? (
                        <div key={child.label} style={S.dropSepLabel}>{child.label}</div>
                      ) : (
                        <NavLink
                          key={child.href}
                          to={child.href}
                          style={({ isActive }) => ({
                            ...S.dropItem,
                            ...(isActive ? S.dropItemActive : {}),
                          })}
                          onClick={closeAll}
                        >
                          {child.label}
                        </NavLink>
                      )
                    )}
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                key={item.href}
                to={item.href!}
                end={item.exact}
                style={({ isActive }) => ({
                  ...S.link,
                  ...(isActive ? S.linkActive : {}),
                })}
                onClick={closeAll}
              >
                {item.label}
              </NavLink>
            )
          )}
          </div>
        )}

        {/* Auth button — desktop */}
        {!isMobile && (
          isLoggedIn
            ? <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "0.5rem" }}>
                <div style={S.avatar} title={user?.name ?? user?.email}>{initials}</div>
                <button style={S.authBtn} onClick={() => { logout(); navigate("/"); }}>Sair</button>
              </div>
            : <div style={{ display: "flex", gap: 8 }}>
                <NavLink to="/login" style={S.authBtn} onClick={closeAll}>Entrar</NavLink>
              </div>
        )}

        {/* Hamburger */}
        {isMobile && (
        <button
          style={S.hamburger}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
        >
          <span style={{ ...S.bar, ...(menuOpen ? S.barTopOpen : {}) }} />
          <span style={{ ...S.bar, ...(menuOpen ? S.barMidOpen : {}) }} />
          <span style={{ ...S.bar, ...(menuOpen ? S.barBotOpen : {}) }} />
        </button>
        )}
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={S.mobileMenu}>
          {/* User identity strip */}
          {isLoggedIn && user && (
            <div style={S.mobileUserStrip}>
              <div style={S.avatarSm}>{initials}</div>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: "1px" }}>
                {user.name && <span style={S.mobileUserName}>{user.name}</span>}
                <span style={S.mobileUserEmail}>{user.email}</span>
              </div>
            </div>
          )}

          {navItems.map((item) =>
            item.children ? (
              <div key={item.label}>
                <div style={S.mobileGroup}>{item.label}</div>
                {item.children.map((child) =>
                  "sep" in child ? (
                    <div key={child.label} style={S.mobileSepLabel}>{child.label}</div>
                  ) : (
                    <NavLink
                      key={child.href}
                      to={child.href}
                      style={({ isActive }) => ({
                        ...S.mobileLink,
                        ...S.mobileSub,
                        ...(isActive ? S.mobileLinkActive : {}),
                      })}
                      onClick={closeAll}
                    >
                      {child.label}
                    </NavLink>
                  )
                )}
              </div>
            ) : (
              <NavLink
                key={item.href}
                to={item.href!}
                end={item.exact}
                style={({ isActive }) => ({
                  ...S.mobileLink,
                  ...(isActive ? S.mobileLinkActive : {}),
                })}
                onClick={closeAll}
              >
                {item.label}
              </NavLink>
            )
          )}
          {/* Auth button — mobile */}
          {isLoggedIn
            ? <button style={{ ...S.mobileLink, background: "none", border: "none", cursor: "pointer", textAlign: "left" as const }} onClick={() => { logout(); navigate("/"); closeAll(); }}>Sair</button>
            : <NavLink to="/login" style={S.mobileLink} onClick={closeAll}>Entrar</NavLink>
          }
        </div>
      )}
    </nav>
  );
}

const S: Record<string, React.CSSProperties> = {
  nav: {
    backgroundColor: "#18265b",
    borderBottom: "1px solid #313244",
  },
  inner: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "0 1.25rem",
    height: "52px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
    fontWeight: 700,
    fontSize: "1rem",
    color: "#cdd6f4",
    textDecoration: "none",
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
  },
  brandLogo: {
    height: "28px",
    width: "auto",
    objectFit: "contain",
    filter: "drop-shadow(0 1px 4px rgba(137,180,250,0.3))",
  },
  desktopLinks: {
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
  },
  link: {
    color: "#cdd6f4",
    textDecoration: "none",
    fontSize: "0.9rem",
    fontWeight: 500,
    padding: "0.35rem 0.75rem",
    borderRadius: "6px",
    whiteSpace: "nowrap" as const,
  },
  linkActive: {
    color: "#cdd6f4",
    backgroundColor: "#313244",
  },
  dropdownWrapper: {
    position: "relative",
  },
  dropBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#cdd6f4",
    fontSize: "0.9rem",
    fontWeight: 500,
    padding: "0.35rem 0.75rem",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    gap: "0.3rem",
    whiteSpace: "nowrap" as const,
  },
  caret: {
    fontSize: "0.7rem",
    opacity: 0.7,
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    backgroundColor: "#18265b",
    border: "1px solid #313244",
    borderRadius: "8px",
    padding: "0.375rem",
    minWidth: "150px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "2px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    zIndex: 200,
  },
  dropItem: {
    color: "#cdd6f4",
    textDecoration: "none",
    fontSize: "0.875rem",
    fontWeight: 500,
    padding: "0.45rem 0.75rem",
    borderRadius: "5px",
    whiteSpace: "nowrap" as const,
  },
  dropItemActive: {
    color: "#cdd6f4",
    backgroundColor: "#313244",
  },
  hamburger: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "5px",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
  },
  bar: {
    display: "block",
    width: "22px",
    height: "2px",
    backgroundColor: "#ffffff",
    borderRadius: "2px",
    transition: "transform 0.2s, opacity 0.2s",
  },
  barTopOpen: { transform: "translateY(7px) rotate(45deg)" },
  barMidOpen: { opacity: 0 },
  barBotOpen: { transform: "translateY(-7px) rotate(-45deg)" },
  authBtn: {
    background: "none",
    border: "1px solid #45475a",
    cursor: "pointer",
    color: "#cdd6f4",
    fontSize: "0.85rem",
    fontWeight: 500,
    padding: "0.3rem 0.75rem",
    borderRadius: "6px",
    textDecoration: "none",
    whiteSpace: "nowrap" as const,
    marginLeft: "0.5rem",
  },
  mobileMenu: {
    borderTop: "1px solid #313244",
    padding: "0.5rem 1.25rem 1rem",
    display: "flex",
    flexDirection: "column" as const,
    gap: "2px",
  },
  mobileGroup: {
    fontSize: "0.65rem",
    fontWeight: 700,
    color: "#cdd6f4",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    padding: "0.75rem 0.5rem 0.25rem",
  },
  mobileLink: {
    color: "#cdd6f4",
    textDecoration: "none",
    fontSize: "0.95rem",
    fontWeight: 500,
    padding: "0.55rem 0.75rem",
    borderRadius: "6px",
    display: "block",
  },
  mobileSub: {
    paddingLeft: "1.25rem",
  },
  mobileLinkActive: {
    color: "#cdd6f4",
    backgroundColor: "#313244",
  },

  // ── Dropdown separator labels ─────────────────────────────
  dropSepLabel: {
    fontSize: "0.6rem",
    fontWeight: 700,
    color: "#ffffff",
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    padding: "0.55rem 0.75rem 0.2rem",
    pointerEvents: "none" as const,
  },
  dropdownRight: {
    left: "auto",
    right: 0,
  },
  mobileSepLabel: {
    fontSize: "0.58rem",
    fontWeight: 700,
    color: "#ffffff",
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    padding: "0.6rem 1.25rem 0.1rem",
    pointerEvents: "none" as const,
  },

  // ── Avatar ────────────────────────────────────────────────
  avatar: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    backgroundColor: "#313244",
    border: "1px solid #cba6f7",
    color: "#cba6f7",
    fontSize: "0.7rem",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    letterSpacing: "0.03em",
    flexShrink: 0,
    userSelect: "none" as const,
  },
  avatarSm: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    backgroundColor: "#313244",
    border: "1px solid #cba6f7",
    color: "#cba6f7",
    fontSize: "0.75rem",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    userSelect: "none" as const,
  },
  mobileUserStrip: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.75rem 0.5rem 0.5rem",
    borderBottom: "1px solid #313244",
    marginBottom: "0.25rem",
  },
  mobileUserName: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#cdd6f4",
  },
  mobileUserEmail: {
    fontSize: "0.75rem",
    color: "#ffffff",
  },
};
