import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ListPartners } from "@application/use_cases/ListPartners";
import type { DeletePartner } from "@application/use_cases/DeletePartner";
import type { Partner } from "@domain/entities/Partner";

interface Props {
  listPartners: ListPartners;
  deletePartner: DeletePartner;
}

const NO_LOGO =
  "https://raw.githubusercontent.com/gsennaura/sports-manager-assets/refs/heads/main/partners/geral/no_partner_logo.png";

export function AdminPartnersPage({ listPartners, deletePartner }: Props) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPartners
      .execute(undefined, false)
      .then(setPartners)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, [listPartners]);

  const filtered = partners.filter((p) =>
    p.name.toLowerCase().includes(filter.toLowerCase())
  );

  async function handleDelete(p: Partner) {
    if (!confirm(`Excluir "${p.name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await deletePartner.execute(p.id);
      setPartners((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao excluir parceiro.");
    }
  }

  return (
    <>
      <header style={S.hero}>
        <div style={S.heroAccent} />
        <div style={S.heroInner}>
          <h1 style={S.title}>Parceiros</h1>
          <Link to="/admin/parceiros/novo" style={S.btnNew}>+ Novo parceiro</Link>
        </div>
      </header>

      <main style={S.page}>
        <input
          type="text"
          placeholder="Filtrar por nome..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={S.searchInput}
        />

        {loading && <p style={S.muted}>Carregando...</p>}
        {error && <p style={S.error}>{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <p style={S.muted}>Nenhum parceiro encontrado.</p>
        )}

        <div style={S.grid}>
          {filtered.map((p) => (
            <div key={p.id} style={{ ...S.card, opacity: p.is_active ? 1 : 0.55 }}>
              <img
                src={p.logo_url ?? NO_LOGO}
                alt={p.name}
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = NO_LOGO; }}
                style={S.logo}
              />
              <div style={S.cardBody}>
                <span style={S.cardName}>{p.name}</span>
                <span style={S.cardMeta}>
                  Prioridade {p.priority} · {p.league_ids.length === 0 ? "Global" : `${p.league_ids.length} liga(s)`}
                  {!p.is_active && <span style={S.inactiveBadge}> · Inativo</span>}
                </span>
                {p.external_url && (
                  <a href={p.external_url} target="_blank" rel="noopener noreferrer" style={S.cardLink}>
                    {p.external_url}
                  </a>
                )}
              </div>
              <div style={S.cardActions}>
                <Link to={`/admin/parceiros/${p.id}/editar`} style={S.btnEdit}>Editar</Link>
                <button style={S.btnDelete} onClick={() => handleDelete(p)}>Excluir</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: { background: "#1e1e2e", borderBottom: "1px solid #313244", marginBottom: 0 },
  heroAccent: { height: "4px", background: "linear-gradient(90deg,#cba6f7,#89b4fa)" },
  heroInner: { maxWidth: 1100, margin: "0 auto", padding: "1.5rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" },
  title: { margin: 0, fontSize: "1.6rem", fontWeight: 900, color: "#cdd6f4" },
  btnNew: { padding: "0.55rem 1.2rem", borderRadius: "8px", background: "#cba6f7", color: "#1e1e2e", fontWeight: 700, textDecoration: "none", fontSize: "0.85rem" },
  page: { maxWidth: 1100, margin: "0 auto", padding: "2rem" },
  searchInput: { width: "100%", padding: "0.65rem 1rem", borderRadius: "8px", border: "1px solid #45475a", background: "#1e1e2e", color: "#cdd6f4", fontSize: "0.9rem", marginBottom: "1.5rem", boxSizing: "border-box" },
  muted: { color: "#6c7086", fontSize: "0.9rem" },
  error: { color: "#f38ba8", fontSize: "0.9rem" },
  grid: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  card: { display: "flex", alignItems: "center", gap: "1rem", background: "#1e1e2e", border: "1px solid #313244", borderRadius: "10px", padding: "1rem 1.25rem" },
  logo: { width: 52, height: 52, objectFit: "contain", borderRadius: 6, flexShrink: 0, background: "#181825" },
  cardBody: { flex: 1, display: "flex", flexDirection: "column", gap: "0.2rem", minWidth: 0 },
  cardName: { fontWeight: 700, color: "#cdd6f4", fontSize: "0.95rem" },
  cardMeta: { fontSize: "0.75rem", color: "#6c7086" },
  inactiveBadge: { color: "#f38ba8" },
  cardLink: { fontSize: "0.72rem", color: "#89b4fa", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  cardActions: { display: "flex", gap: "0.5rem", flexShrink: 0 },
  btnEdit: { padding: "0.4rem 0.9rem", borderRadius: "6px", background: "#313244", color: "#cdd6f4", textDecoration: "none", fontSize: "0.78rem", fontWeight: 600 },
  btnDelete: { padding: "0.4rem 0.9rem", borderRadius: "6px", background: "transparent", border: "1px solid #f38ba8", color: "#f38ba8", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 },
};
