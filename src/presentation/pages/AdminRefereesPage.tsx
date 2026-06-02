import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { ListReferees } from "@application/use_cases/ListReferees";
import type { DeleteReferee } from "@application/use_cases/DeleteReferee";
import type { Referee } from "@domain/entities/Referee";

interface Props {
  listReferees: ListReferees;
  deleteReferee: DeleteReferee;
}

const NO_PHOTO =
  "https://raw.githubusercontent.com/gsennaura/sports-manager-assets/refs/heads/main/referees/no_referee_photo.png";

export function AdminRefereesPage({ listReferees, deleteReferee }: Props) {
  const [referees, setReferees] = useState<Referee[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listReferees
      .execute()
      .then(setReferees)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = referees.filter((r) =>
    `${r.name} ${r.nickname ?? ""}`.toLowerCase().includes(filter.toLowerCase())
  );

  async function handleDelete(r: Referee) {
    if (!confirm(`Excluir "${r.name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteReferee.execute(r.id);
      setReferees((prev) => prev.filter((x) => x.id !== r.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao excluir árbitro.");
    }
  }

  return (
    <>
      <header style={S.hero}>
        <div style={S.heroAccent} />
        <div style={S.heroInner}>
          <h1 style={S.title}>Árbitros</h1>
          <Link to="/admin/arbitros/novo" style={S.btnNew}>+ Novo árbitro</Link>
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
        {error && <p style={S.errorText}>{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <p style={S.muted}>Nenhum árbitro encontrado.</p>
        )}

        <div style={S.table}>
          {filtered.map((r) => (
            <div key={r.id} style={S.row}>
              <img
                src={r.photo_url ?? NO_PHOTO}
                alt={r.name}
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = NO_PHOTO; }}
                style={S.photo}
              />
              <div style={S.info}>
                <span style={S.name}>{r.name}</span>
                {r.nickname && <span style={S.nickname}>"{r.nickname}"</span>}
              </div>
              <div style={S.actions}>
                <Link to={`/arbitros/${r.id}`} style={S.btnView}>Ver</Link>
                <Link to={`/admin/arbitros/${r.id}/editar`} style={S.btnEdit}>Editar</Link>
                <button style={S.btnDelete} onClick={() => handleDelete(r)}>Excluir</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: {
    background: "linear-gradient(135deg, #1e1e2e 0%, #313244 100%)",
    borderBottom: "1px solid #45475a",
    position: "relative",
    overflow: "hidden",
  },
  heroAccent: {
    position: "absolute", inset: 0,
    background: "linear-gradient(90deg, rgba(203,166,247,0.08) 0%, transparent 60%)",
    pointerEvents: "none",
  },
  heroInner: {
    maxWidth: "900px", margin: "0 auto",
    padding: "1.5rem 1.5rem 1.25rem",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: "0.75rem",
  },
  title: {
    margin: 0, fontSize: "1.5rem", fontWeight: 700,
    color: "#cdd6f4", letterSpacing: "-0.02em",
  },
  btnNew: {
    background: "#cba6f7", color: "#1e1e2e", fontWeight: 700,
    padding: "0.45rem 1.1rem", borderRadius: "8px",
    textDecoration: "none", fontSize: "0.875rem", whiteSpace: "nowrap",
  },
  page: { maxWidth: "900px", margin: "2rem auto", padding: "0 1.5rem 4rem" },
  searchInput: {
    width: "100%", background: "#1e1e2e", border: "1px solid #45475a",
    borderRadius: "8px", padding: "0.6rem 0.75rem", color: "#cdd6f4",
    fontSize: "0.95rem", outline: "none", marginBottom: "1.25rem",
    boxSizing: "border-box",
  },
  table: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  row: {
    display: "flex", alignItems: "center", gap: "0.875rem",
    background: "#181825", border: "1px solid #313244", borderRadius: "8px",
    padding: "0.625rem 0.875rem",
  },
  photo: {
    width: 40, height: 40, borderRadius: "50%",
    objectFit: "cover", flexShrink: 0, backgroundColor: "#313244",
  },
  info: { flex: 1, display: "flex", flexDirection: "column", gap: "0.1rem", minWidth: 0 },
  name: { color: "#cdd6f4", fontWeight: 600, fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  nickname: { color: "#cba6f7", fontSize: "0.8rem", fontStyle: "italic" },
  actions: { display: "flex", gap: "0.4rem", flexShrink: 0 },
  btnView: {
    padding: "0.3rem 0.65rem", borderRadius: "6px", fontSize: "0.78rem",
    background: "#313244", color: "#cdd6f4", textDecoration: "none", fontWeight: 500,
  },
  btnEdit: {
    padding: "0.3rem 0.65rem", borderRadius: "6px", fontSize: "0.78rem",
    background: "#89b4fa22", color: "#89b4fa", textDecoration: "none", fontWeight: 500,
  },
  btnDelete: {
    padding: "0.3rem 0.65rem", borderRadius: "6px", fontSize: "0.78rem",
    background: "none", border: "1px solid #f38ba844", color: "#f38ba8",
    cursor: "pointer", fontWeight: 500,
  },
  muted: { color: "#7f849c", fontSize: "0.95rem" },
  errorText: { color: "#f38ba8", fontSize: "0.9rem" },
};
