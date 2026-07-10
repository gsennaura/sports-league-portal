import React from "react";
import { Link } from "react-router-dom";

type ImportCard = {
  title: string;
  description: string;
  href: string;
  color: string;
  icon: string;
  status: "available" | "coming_soon";
};

const CARDS: ImportCard[] = [
  {
    title: "Locais em Bulk",
    description: "Importe múltiplos locais (estádios, poliesportivos) via CSV. Revise e edite cada linha antes de salvar.",
    href: "/admin/locais/importar",
    color: "#fab387",
    icon: "🏟️",
    status: "available",
  },
  {
    title: "Clubes em Bulk",
    description: "Importe múltiplos clubes via CSV com resolução automática de cidades e locais.",
    href: "/admin/clubes/importar",
    color: "#cba6f7",
    icon: "🏅",
    status: "available",
  },
  {
    title: "Atletas em Bulk",
    description: "Importe múltiplos atletas de uma vez via arquivo CSV. Campos suportados: nome, CPF, data de nascimento, posição e mais.",
    href: "/admin/atletas/importar",
    color: "#a6e3a1",
    icon: "👤",
    status: "available",
  },
  {
    title: "Partidas por Rodada",
    description: "Crie todas as partidas de uma rodada de uma só vez. Disponível na aba \"Rodadas\" dentro da tela de gerenciar campeonato.",
    href: "/admin/campeonatos",
    color: "#89b4fa",
    icon: "⚽",
    status: "available",
  },
  {
    title: "Resultados em Bulk",
    description: "Atualize placares de múltiplas partidas de uma vez. Em breve.",
    href: "#",
    color: "#6c7086",
    icon: "📊",
    status: "coming_soon",
  },
];

export function AdminImportHubPage() {
  return (
    <>
      <header style={S.hero}>
        <div style={S.heroAccent} />
        <div style={S.heroInner}>
          <Link to="/admin" style={S.back}>← Admin</Link>
          <h1 style={S.title}>Central de Importações</h1>
          <p style={S.subtitle}>Todas as operações de importação em lote em um só lugar.</p>
        </div>
      </header>

      <main style={S.page}>
        <section>
          <div style={S.grid}>
            {CARDS.map((card) => (
              <div key={card.title} style={{ ...S.card, opacity: card.status === "coming_soon" ? 0.55 : 1 }}>
                <div style={{ ...S.cardAccent, backgroundColor: card.color }} />
                <div style={S.cardBody}>
                  <span style={S.cardIcon}>{card.icon}</span>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                      <h2 style={S.cardTitle}>{card.title}</h2>
                      {card.status === "coming_soon" && (
                        <span style={S.badgeSoon}>Em breve</span>
                      )}
                    </div>
                    <p style={S.cardDesc}>{card.description}</p>
                  </div>
                </div>
                {card.status === "available" ? (
                  <Link to={card.href} style={{ ...S.cardBtn, borderColor: card.color, color: card.color }}>
                    Acessar →
                  </Link>
                ) : (
                  <span style={S.cardBtnDisabled}>Indisponível</span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: "2.5rem" }}>
          <div style={S.sectionHeader}>
            <h2 style={S.sectionTitle}>Histórico de Importações</h2>
            <Link to="/admin/importar/historico" style={S.linkBtn}>Ver histórico →</Link>
          </div>
          <p style={S.hint}>
            Registro de todas as operações de importação em lote: quem importou, quando, quantos registros e erros.
          </p>
        </section>
      </main>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: { backgroundColor: "#181825", borderBottom: "1px solid #313244", position: "relative", overflow: "hidden" },
  heroAccent: { position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #cba6f7, #a6e3a1)" },
  heroInner: { maxWidth: "900px", margin: "0 auto", padding: "1.5rem 1.5rem 1.25rem" },
  back: { display: "inline-block", color: "#89b4fa", textDecoration: "none", fontSize: "0.85rem", marginBottom: "0.75rem" },
  title: { fontSize: "1.5rem", fontWeight: 700, color: "#cdd6f4", margin: "0 0 0.2rem" },
  subtitle: { color: "#cdd6f4", fontSize: "0.875rem", margin: 0 },

  page: { maxWidth: "900px", margin: "0 auto", padding: "2rem 1.5rem 4rem" },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1.25rem" },

  card: { backgroundColor: "#1e1e2e", border: "1px solid #313244", borderRadius: "10px", overflow: "hidden", display: "flex", flexDirection: "column" },
  cardAccent: { height: "3px" },
  cardBody: { display: "flex", gap: "0.85rem", padding: "1.25rem 1.25rem 0.75rem", flex: 1 },
  cardIcon: { fontSize: "1.75rem", lineHeight: 1, flexShrink: 0 },
  cardTitle: { color: "#cdd6f4", fontWeight: 700, fontSize: "1rem", margin: 0 },
  cardDesc: { color: "#a6adc8", fontSize: "0.82rem", lineHeight: 1.5, margin: 0 },
  cardBtn: { display: "block", margin: "0 1.25rem 1.25rem", padding: "0.45rem 0", textAlign: "center" as const, border: "1px solid", borderRadius: "6px", fontWeight: 600, fontSize: "0.875rem", textDecoration: "none", cursor: "pointer" },
  cardBtnDisabled: { display: "block", margin: "0 1.25rem 1.25rem", padding: "0.45rem 0", textAlign: "center" as const, border: "1px solid #45475a", borderRadius: "6px", fontSize: "0.875rem", color: "#6c7086", cursor: "default" },
  badgeSoon: { backgroundColor: "#2a2a3e", border: "1px solid #45475a", borderRadius: "4px", color: "#6c7086", fontSize: "0.7rem", padding: "0.1rem 0.4rem", fontWeight: 600 },

  sectionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" },
  sectionTitle: { color: "#cdd6f4", fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", margin: 0 },
  linkBtn: { color: "#89b4fa", fontSize: "0.875rem", textDecoration: "none" },
  hint: { color: "#a6adc8", fontSize: "0.875rem", margin: 0 },
};
