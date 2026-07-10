import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@presentation/context/AuthContext";

type QuickLink = { label: string; href: string };

type SectionCard = {
  title: string;
  icon: string;
  color: string;
  links: QuickLink[];
  primaryHref: string;
};

const SECTIONS: SectionCard[] = [
  {
    title: "Campeonatos",
    icon: "🏆",
    color: "#f9e2af",
    primaryHref: "/admin/campeonatos",
    links: [
      { label: "Ver todos", href: "/admin/campeonatos" },
      { label: "Novo campeonato", href: "/admin/campeonatos/novo" },
    ],
  },
  {
    title: "Partidas",
    icon: "⚽",
    color: "#a6e3a1",
    primaryHref: "/admin/partidas",
    links: [
      { label: "Ver partidas", href: "/admin/partidas" },
    ],
  },
  {
    title: "Atletas",
    icon: "🏃",
    color: "#89dceb",
    primaryHref: "/admin/atletas",
    links: [
      { label: "Ver todos", href: "/admin/atletas" },
      { label: "Novo atleta", href: "/admin/atletas/novo" },
      { label: "Importar em bulk", href: "/admin/atletas/importar" },
    ],
  },
  {
    title: "Inscrições",
    icon: "📋",
    color: "#cba6f7",
    primaryHref: "/admin/inscricoes",
    links: [
      { label: "Gerenciar inscrições", href: "/admin/inscricoes" },
      { label: "Pendências de vínculo", href: "/admin/pendencias-vinculo" },
    ],
  },
  {
    title: "Clubes",
    icon: "🏅",
    color: "#fab387",
    primaryHref: "/admin/clubes",
    links: [
      { label: "Ver todos", href: "/admin/clubes" },
      { label: "Novo clube", href: "/admin/clubes/novo" },
      { label: "Importar em bulk", href: "/admin/clubes/importar" },
    ],
  },
  {
    title: "Times",
    icon: "👕",
    color: "#89b4fa",
    primaryHref: "/admin/times",
    links: [
      { label: "Ver todos", href: "/admin/times" },
      { label: "Novo time", href: "/admin/times/novo" },
    ],
  },
  {
    title: "Árbitros",
    icon: "⚖️",
    color: "#f38ba8",
    primaryHref: "/admin/arbitros",
    links: [
      { label: "Ver todos", href: "/admin/arbitros" },
      { label: "Novo árbitro", href: "/admin/arbitros/novo" },
    ],
  },
  {
    title: "Locais",
    icon: "🏟️",
    color: "#94e2d5",
    primaryHref: "/admin/locais",
    links: [
      { label: "Ver todos", href: "/admin/locais" },
      { label: "Novo local", href: "/admin/locais/novo" },
      { label: "Importar em bulk", href: "/admin/locais/importar" },
    ],
  },
  {
    title: "Ligas",
    icon: "🏛️",
    color: "#a6e3a1",
    primaryHref: "/admin/ligas",
    links: [
      { label: "Ver todas", href: "/admin/ligas" },
      { label: "Nova liga", href: "/admin/ligas/novo" },
    ],
  },
  {
    title: "Importações",
    icon: "📥",
    color: "#cdd6f4",
    primaryHref: "/admin/importar",
    links: [
      { label: "Central de importações", href: "/admin/importar" },
      { label: "Histórico", href: "/admin/importar/historico" },
    ],
  },
  {
    title: "Portal",
    icon: "📰",
    color: "#f5c2e7",
    primaryHref: "/admin/noticias",
    links: [
      { label: "Notícias", href: "/admin/noticias" },
      { label: "Parceiros", href: "/admin/parceiros" },
      { label: "Documentos / TJDU", href: "/admin/documentos" },
      { label: "Emendas", href: "/admin/emendas" },
    ],
  },
  {
    title: "Usuários & Admins",
    icon: "👤",
    color: "#eba0ac",
    primaryHref: "/admin/usuarios",
    links: [
      { label: "Usuários", href: "/admin/usuarios" },
      { label: "Admins de Liga", href: "/admin/league-admins" },
      { label: "Dirigentes", href: "/admin/dirigentes" },
      { label: "Cidades", href: "/admin/cidades" },
    ],
  },
];

export function AdminDashboardPage() {
  const { user } = useAuth();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  return (
    <>
      <header style={S.hero}>
        <div style={S.heroAccent} />
        <div style={S.heroInner}>
          <p style={S.greeting}>{greeting}{user?.name ? `, ${user.name.split(" ")[0]}` : ""}.</p>
          <h1 style={S.title}>Painel de Administração</h1>
          <p style={S.subtitle}>
            Gerencie campeonatos, atletas, inscrições e todo o conteúdo do portal.
          </p>
        </div>
      </header>

      <main style={S.page}>
        {/* Atalhos rápidos */}
        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={S.sectionLabel}>Atalhos rápidos</h2>
          <div style={S.quickRow}>
            <Link to="/admin/pendencias-vinculo" style={{ ...S.quickBtn, borderColor: "#cba6f7", color: "#cba6f7" }}>
              ⏳ Pendências de Vínculo
            </Link>
            <Link to="/admin/campeonatos" style={{ ...S.quickBtn, borderColor: "#f9e2af", color: "#f9e2af" }}>
              🏆 Campeonatos
            </Link>
            <Link to="/admin/inscricoes" style={{ ...S.quickBtn, borderColor: "#a6e3a1", color: "#a6e3a1" }}>
              📋 Inscrições
            </Link>
            <Link to="/admin/atletas" style={{ ...S.quickBtn, borderColor: "#89dceb", color: "#89dceb" }}>
              🏃 Atletas
            </Link>
            <Link to="/admin/importar" style={{ ...S.quickBtn, borderColor: "#cdd6f4", color: "#cdd6f4" }}>
              📥 Importar
            </Link>
          </div>
        </section>

        {/* Grid de seções */}
        <section>
          <h2 style={S.sectionLabel}>Todas as áreas</h2>
          <div style={S.grid}>
            {SECTIONS.map((sec) => (
              <div key={sec.title} style={S.card}>
                <div style={{ ...S.cardTop, borderColor: sec.color }}>
                  <span style={S.cardIcon}>{sec.icon}</span>
                  <h3 style={{ ...S.cardTitle, color: sec.color }}>{sec.title}</h3>
                </div>
                <ul style={S.linkList}>
                  {sec.links.map((lk) => (
                    <li key={lk.href}>
                      <Link to={lk.href} style={S.innerLink}>
                        {lk.label} →
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: {
    backgroundColor: "#181825",
    borderBottom: "1px solid #313244",
    position: "relative",
    overflow: "hidden",
  },
  heroAccent: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: "3px",
    background: "linear-gradient(90deg, #cba6f7, #f9e2af, #a6e3a1)",
  },
  heroInner: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "1.75rem 1.5rem 1.5rem",
  },
  greeting: {
    color: "#a6adc8",
    fontSize: "0.85rem",
    margin: "0 0 0.2rem",
  },
  title: {
    fontSize: "1.6rem",
    fontWeight: 800,
    color: "#cdd6f4",
    margin: "0 0 0.35rem",
  },
  subtitle: {
    color: "#a6adc8",
    fontSize: "0.875rem",
    margin: 0,
  },

  page: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "2rem 1.5rem 4rem",
  },

  sectionLabel: {
    color: "#6c7086",
    fontSize: "0.72rem",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.09em",
    margin: "0 0 0.85rem",
  },

  quickRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.6rem",
  },
  quickBtn: {
    display: "inline-block",
    padding: "0.45rem 0.9rem",
    border: "1px solid",
    borderRadius: "6px",
    fontSize: "0.82rem",
    fontWeight: 600,
    textDecoration: "none",
    backgroundColor: "transparent",
    transition: "opacity 0.15s",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
    gap: "1rem",
  },

  card: {
    backgroundColor: "#1e1e2e",
    border: "1px solid #313244",
    borderRadius: "10px",
    overflow: "hidden",
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    padding: "0.85rem 1rem 0.7rem",
    borderBottom: "1px solid",
  },
  cardIcon: {
    fontSize: "1.15rem",
    lineHeight: 1,
  },
  cardTitle: {
    fontWeight: 700,
    fontSize: "0.92rem",
    margin: 0,
  },
  linkList: {
    listStyle: "none",
    margin: 0,
    padding: "0.5rem 0 0.6rem",
  },
  innerLink: {
    display: "block",
    padding: "0.3rem 1rem",
    color: "#a6adc8",
    textDecoration: "none",
    fontSize: "0.82rem",
    transition: "color 0.15s",
  },
};
