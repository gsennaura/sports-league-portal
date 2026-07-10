import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ListEmendas } from "@application/use_cases/ListEmendas";
import type { DeleteEmenda } from "@application/use_cases/DeleteEmenda";
import type { Emenda } from "@domain/entities/Emenda";
import { EMENDA_REF_TYPE_LABELS } from "@domain/entities/Emenda";

interface Props {
  listEmendas: ListEmendas;
  deleteEmenda: DeleteEmenda;
}

const REF_COLORS: Record<string, string> = {
  LINK_EXTERNO: "#89b4fa",
  DOCUMENTO_ANEXADO: "#a6e3a1",
};

export function AdminEmendasPage({ listEmendas, deleteEmenda }: Props) {
  const [items, setItems] = useState<Emenda[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listEmendas.execute(undefined, undefined, true)
      .then(setItems)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, [listEmendas]);

  const filtered = items.filter((e) =>
    e.title.toLowerCase().includes(filter.toLowerCase())
  );

  async function handleDelete(e: Emenda) {
    if (!confirm(`Excluir "${e.title}"?`)) return;
    try {
      await deleteEmenda.execute(e.id);
      setItems((prev) => prev.filter((x) => x.id !== e.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  return (
    <>
      <header style={S.hero}>
        <div style={S.heroAccent} />
        <div style={S.heroInner}>
          <h1 style={S.title}>Emendas / Regulamento</h1>
          <Link to="/admin/emendas/nova" style={S.btnNew}>+ Nova emenda</Link>
        </div>
      </header>
      <main style={S.page}>
        <input
          type="text"
          placeholder="Filtrar por título..."
          value={filter}
          onChange={(ev) => setFilter(ev.target.value)}
          style={S.searchInput}
        />
        {loading && <p style={S.muted}>Carregando...</p>}
        {error && <p style={S.error}>{error}</p>}
        {!loading && !error && filtered.length === 0 && <p style={S.muted}>Nenhuma emenda encontrada.</p>}

        <div style={S.list}>
          {filtered.map((e) => (
            <div key={e.id} style={{ ...S.row, opacity: e.is_published ? 1 : 0.6 }}>
              <div style={S.rowBody}>
                <div style={S.rowTop}>
                  <span style={{ ...S.badge, color: REF_COLORS[e.ref_type] ?? "#cdd6f4" }}>
                    {EMENDA_REF_TYPE_LABELS[e.ref_type]}
                  </span>
                  <span style={S.yearBadge}>{e.year}</span>
                  {e.is_published
                    ? <span style={S.badgePublished}>Publicada</span>
                    : <span style={S.badgeDraft}>Rascunho</span>
                  }
                </div>
                <span style={S.rowTitle}>{e.title}</span>
                {e.description && <span style={S.rowDesc}>{e.description}</span>}
                <div style={S.rowLinks}>
                  {e.file_url && <a href={e.file_url} target="_blank" rel="noopener noreferrer" style={S.link}>📄 Arquivo</a>}
                  {e.external_url && <a href={e.external_url} target="_blank" rel="noopener noreferrer" style={S.link}>🔗 Link</a>}
                </div>
              </div>
              <div style={S.rowActions}>
                <Link to={`/admin/emendas/${e.id}/editar`} style={S.btnEdit}>Editar</Link>
                <button style={S.btnDelete} onClick={() => handleDelete(e)}>Excluir</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: { background: "#1e1e2e", borderBottom: "1px solid #313244" },
  heroAccent: { height: "4px", background: "linear-gradient(90deg,#89dceb,#89b4fa)" },
  heroInner: { maxWidth: 1100, margin: "0 auto", padding: "1.5rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" },
  title: { margin: 0, fontSize: "1.6rem", fontWeight: 900, color: "#cdd6f4" },
  btnNew: { padding: "0.55rem 1.2rem", borderRadius: "8px", background: "#89b4fa", color: "#1e1e2e", fontWeight: 700, textDecoration: "none", fontSize: "0.85rem" },
  page: { maxWidth: 1100, margin: "0 auto", padding: "2rem" },
  searchInput: { width: "100%", padding: "0.65rem 1rem", borderRadius: "8px", border: "1px solid #45475a", background: "#1e1e2e", color: "#cdd6f4", fontSize: "0.9rem", marginBottom: "1.5rem", boxSizing: "border-box" },
  muted: { color: "#6c7086" },
  error: { color: "#f38ba8" },
  list: { display: "flex", flexDirection: "column", gap: "0.6rem" },
  row: { display: "flex", alignItems: "flex-start", gap: "1rem", background: "#1e1e2e", border: "1px solid #313244", borderRadius: "10px", padding: "1rem 1.25rem" },
  rowBody: { flex: 1, display: "flex", flexDirection: "column", gap: "0.3rem", minWidth: 0 },
  rowTop: { display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" },
  badge: { fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" },
  yearBadge: { background: "#313244", color: "#cba6f7", borderRadius: 4, padding: "0 0.4rem", fontSize: "0.72rem", fontWeight: 700 },
  badgePublished: { background: "#1a3a1f", color: "#a6e3a1", border: "1px solid #2a5a2f", borderRadius: 4, padding: "0 0.35rem", fontSize: "0.68rem", fontWeight: 700 },
  badgeDraft: { background: "#2a2a1a", color: "#f9e2af", border: "1px solid #4a3a1a", borderRadius: 4, padding: "0 0.35rem", fontSize: "0.68rem", fontWeight: 700 },
  rowTitle: { fontWeight: 700, color: "#cdd6f4", fontSize: "0.95rem" },
  rowDesc: { fontSize: "0.78rem", color: "#a6adc8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  rowLinks: { display: "flex", gap: "0.75rem" },
  link: { fontSize: "0.75rem", color: "#89b4fa", textDecoration: "none" },
  rowActions: { display: "flex", gap: "0.5rem", flexShrink: 0 },
  btnEdit: { padding: "0.4rem 0.9rem", borderRadius: "6px", background: "#313244", color: "#cdd6f4", textDecoration: "none", fontSize: "0.78rem", fontWeight: 600 },
  btnDelete: { padding: "0.4rem 0.9rem", borderRadius: "6px", background: "transparent", border: "1px solid #f38ba8", color: "#f38ba8", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 },
};
