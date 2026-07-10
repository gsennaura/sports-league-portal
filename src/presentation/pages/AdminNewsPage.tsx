import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ListNews } from "@application/use_cases/ListNews";
import type { DeleteNews } from "@application/use_cases/DeleteNews";
import type { NewsListItem } from "@domain/entities/News";

interface Props {
  listNews: ListNews;
  deleteNews: DeleteNews;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function AdminNewsPage({ listNews, deleteNews }: Props) {
  const [items, setItems] = useState<NewsListItem[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listNews.execute(undefined, true)
      .then(setItems)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, [listNews]);

  const filtered = items.filter((n) =>
    n.title.toLowerCase().includes(filter.toLowerCase())
  );

  async function handleDelete(n: NewsListItem) {
    if (!confirm(`Excluir "${n.title}"?`)) return;
    try {
      await deleteNews.execute(n.id);
      setItems((prev) => prev.filter((x) => x.id !== n.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao excluir.");
    }
  }

  return (
    <>
      <header style={S.hero}>
        <div style={S.heroAccent} />
        <div style={S.heroInner}>
          <h1 style={S.title}>Notícias</h1>
          <Link to="/admin/noticias/nova" style={S.btnNew}>+ Nova notícia</Link>
        </div>
      </header>
      <main style={S.page}>
        <input
          type="text"
          placeholder="Filtrar por título..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={S.searchInput}
        />

        {loading && <p style={S.muted}>Carregando...</p>}
        {error && <p style={S.error}>{error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <p style={S.muted}>Nenhuma notícia encontrada.</p>
        )}

        <div style={S.list}>
          {filtered.map((n) => (
            <div key={n.id} style={{ ...S.row, opacity: n.is_published ? 1 : 0.6 }}>
              {n.image_url && (
                <img src={n.image_url} alt={n.title} style={S.thumb} />
              )}
              <div style={S.rowBody}>
                <span style={S.rowTitle}>{n.title}</span>
                <span style={S.rowMeta}>
                  {n.is_published ? (
                    <span style={S.badgePublished}>Publicada</span>
                  ) : (
                    <span style={S.badgeDraft}>Rascunho</span>
                  )}
                  {n.league_id ? " · Liga específica" : " · Geral"}
                  {" · "}{formatDate(n.published_at ?? n.created_at)}
                </span>
                {n.summary && <span style={S.rowSummary}>{n.summary}</span>}
              </div>
              <div style={S.rowActions}>
                <Link to={`/admin/noticias/${n.id}/editar`} style={S.btnEdit}>Editar</Link>
                <button style={S.btnDelete} onClick={() => handleDelete(n)}>Excluir</button>
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
  muted: { color: "#6c7086", fontSize: "0.9rem" },
  error: { color: "#f38ba8", fontSize: "0.9rem" },
  list: { display: "flex", flexDirection: "column", gap: "0.6rem" },
  row: { display: "flex", alignItems: "flex-start", gap: "1rem", background: "#1e1e2e", border: "1px solid #313244", borderRadius: "10px", padding: "1rem 1.25rem" },
  thumb: { width: 72, height: 52, objectFit: "cover", borderRadius: 6, flexShrink: 0, background: "#181825" },
  rowBody: { flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: 0 },
  rowTitle: { fontWeight: 700, color: "#cdd6f4", fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  rowMeta: { fontSize: "0.74rem", color: "#6c7086" },
  rowSummary: { fontSize: "0.78rem", color: "#a6adc8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  badgePublished: { background: "#1a3a1f", color: "#a6e3a1", border: "1px solid #2a5a2f", borderRadius: 4, padding: "0 0.35rem", fontSize: "0.68rem", fontWeight: 700 },
  badgeDraft: { background: "#2a2a1a", color: "#f9e2af", border: "1px solid #4a3a1a", borderRadius: 4, padding: "0 0.35rem", fontSize: "0.68rem", fontWeight: 700 },
  rowActions: { display: "flex", gap: "0.5rem", flexShrink: 0 },
  btnEdit: { padding: "0.4rem 0.9rem", borderRadius: "6px", background: "#313244", color: "#cdd6f4", textDecoration: "none", fontSize: "0.78rem", fontWeight: 600 },
  btnDelete: { padding: "0.4rem 0.9rem", borderRadius: "6px", background: "transparent", border: "1px solid #f38ba8", color: "#f38ba8", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 },
};
