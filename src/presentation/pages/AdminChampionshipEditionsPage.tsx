import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "@infrastructure/apiBase";
import { authHeaders } from "@infrastructure/authHeaders";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChampInfo = {
  id: string;
  name: string;
  nickname: string | null;
  sport_id: string;
  division: string | null;
  level: string | null;
};

type Edition = {
  id: string;
  year: number;
  edition_name: string | null;
  status: "planned" | "ongoing" | "finished";
  champion_team_id: string | null;
  runner_up_team_id: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  planned: "Planejado",
  ongoing: "Em andamento",
  finished: "Encerrado",
};

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  planned:  { color: "#a6adc8", backgroundColor: "#1e1e2e", border: "1px solid #45475a" },
  ongoing:  { color: "#a6e3a1", backgroundColor: "#1a2e1f", border: "1px solid #2a4a2f" },
  finished: { color: "#89b4fa", backgroundColor: "#1a1f3a", border: "1px solid #2a3a6a" },
};

const LEVEL_LABEL: Record<string, string> = {
  amador: "Amador", junior: "Júnior", juvenil: "Juvenil", infantil: "Infantil",
  mirim: "Mirim", "pre-mirim": "Pré-Mirim", universitario: "Universitário",
  profissional: "Profissional", master: "Master", terrao: "Terrão",
  clube_social: "Clube Social", rural: "Rural", "inter-municipal": "Inter-municipal",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminChampionshipEditionsPage() {
  const { id: champId } = useParams<{ id: string }>();

  const [champ, setChamp] = useState<ChampInfo | null>(null);
  const [editions, setEditions] = useState<Edition[]>([]);
  const [teamNames, setTeamNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!champId) return;
    (async () => {
      try {
        const [champRes, editionsRes, teamsRes] = await Promise.all([
          fetch(`${API_BASE}/championships/${champId}`),
          fetch(`${API_BASE}/championships/${champId}/editions`),
          fetch(`${API_BASE}/teams`),
        ]);
        if (!champRes.ok) throw new Error("Campeonato não encontrado.");
        setChamp(await champRes.json());

        const editionsData: Edition[] = editionsRes.ok ? await editionsRes.json() : [];
        setEditions([...editionsData].sort((a, b) => b.year - a.year));

        if (teamsRes.ok) {
          const teams = await teamsRes.json() as Array<{ id: string; name: string }>;
          const map = new Map<string, string>();
          for (const t of teams) map.set(t.id, t.name);
          setTeamNames(map);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar.");
      } finally {
        setLoading(false);
      }
    })();
  }, [champId]);

  async function handleDeleteChampionship() {
    if (!champId || !window.confirm("Excluir este campeonato? Esta ação é irreversível.")) return;
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch(`${API_BASE}/championships/${champId}`, { method: "DELETE", headers: authHeaders() });
    if (res.ok) {
      navigate("/admin/campeonatos");
    } else {
      const d = await res.json().catch(() => ({})) as { detail?: string };
      setDeleteError(d.detail ?? "Erro ao excluir campeonato.");
      setDeleting(false);
    }
  }

  const champLabel = champ ? (champ.nickname ?? champ.name) : "…";
  const champSub = [
    champ?.level ? (LEVEL_LABEL[champ.level] ?? champ.level) : null,
    champ?.division ?? null,
  ].filter(Boolean).join(" · ");

  return (
    <>
      <header style={S.hero}>
        <div style={S.heroAccent} />
        <div style={S.heroInner}>
          <Link to="/admin/campeonatos" style={S.back}>← Campeonatos</Link>
          <div style={S.heroRow}>
            <div>
              <h1 style={S.title}>{champLabel}</h1>
              {champSub && <p style={S.subtitle}>{champSub}</p>}
            </div>
            <Link to={`/admin/campeonatos/${champId}/nova-edicao`} style={S.btnNew}>
              + Nova Edição
            </Link>
          </div>
        </div>
      </header>

      <main style={S.page}>
        {loading && <p style={S.hint}>Carregando edições…</p>}
        {error && <p style={S.errorText}>{error}</p>}

        {deleteError && (
          <p style={{ color: "#f38ba8", fontSize: "0.875rem", marginBottom: "1rem" }}>⚠ {deleteError}</p>
        )}

        {!loading && !error && editions.length === 0 && (
          <div style={S.emptyState}>
            <p style={S.emptyText}>Nenhuma edição cadastrada.</p>
            <Link to={`/admin/campeonatos/${champId}/nova-edicao`} style={S.btnNewLarge}>
              + Criar primeira edição
            </Link>
            <button
              type="button"
              onClick={handleDeleteChampionship}
              disabled={deleting}
              style={S.btnDeleteChamp}
            >
              {deleting ? "Excluindo…" : "🗑 Excluir campeonato"}
            </button>
          </div>
        )}

        {!loading && !error && editions.length > 0 && (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Ano</th>
                  <th style={S.th}>Nome</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Campeão</th>
                  <th style={S.th}>Vice</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {editions.map((ed) => (
                  <tr key={ed.id} style={S.trRow}>
                    <td style={S.tdYear}>{ed.year}</td>
                    <td style={S.td}>{ed.edition_name ?? `Edição ${ed.year}`}</td>
                    <td style={S.td}>
                      <span style={{ ...S.statusBadge, ...(STATUS_STYLE[ed.status] ?? STATUS_STYLE.planned) }}>
                        {STATUS_LABEL[ed.status] ?? ed.status}
                      </span>
                    </td>
                    <td style={S.tdMuted}>
                      {ed.champion_team_id ? (teamNames.get(ed.champion_team_id) ?? "—") : "—"}
                    </td>
                    <td style={S.tdMuted}>
                      {ed.runner_up_team_id ? (teamNames.get(ed.runner_up_team_id) ?? "—") : "—"}
                    </td>
                    <td style={S.tdAction}>
                      <Link
                        to={`/admin/campeonatos/${champId}/gerenciar?edicao=${ed.id}`}
                        style={S.manageLink}
                      >
                        Gerenciar →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    background: "linear-gradient(90deg, #cba6f7, #89b4fa)",
  },
  heroInner: { maxWidth: "1100px", margin: "0 auto", padding: "1.5rem 1.5rem 1.25rem" },
  heroRow: {
    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
    gap: "1rem", flexWrap: "wrap" as const, marginTop: "0.5rem",
  },
  back: { color: "#89b4fa", textDecoration: "none", fontSize: "0.85rem" },
  title: { fontSize: "1.5rem", fontWeight: 700, color: "#cdd6f4", margin: 0 },
  subtitle: { margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#6c7086" },
  btnDeleteChamp: {
    marginTop: "0.75rem",
    background: "none",
    border: "1px solid #5a2a30",
    borderRadius: "6px",
    color: "#f38ba8",
    fontSize: "0.85rem",
    padding: "0.4rem 1rem",
    cursor: "pointer",
  },
  btnNew: {
    alignSelf: "flex-start" as const,
    backgroundColor: "#a6e3a1",
    borderRadius: "6px",
    color: "#11111b",
    fontSize: "0.875rem",
    fontWeight: 700,
    padding: "0.5rem 1.1rem",
    textDecoration: "none",
    whiteSpace: "nowrap" as const,
  },

  page: { maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.5rem" },
  hint: { color: "#6c7086", fontSize: "0.9rem" },
  errorText: { color: "#f38ba8", fontSize: "0.9rem" },

  emptyState: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "1.25rem", paddingTop: "3rem" },
  emptyText: { color: "#6c7086", fontSize: "0.95rem", margin: 0 },
  btnNewLarge: {
    backgroundColor: "#a6e3a1",
    borderRadius: "8px",
    color: "#11111b",
    fontSize: "0.95rem",
    fontWeight: 700,
    padding: "0.65rem 1.5rem",
    textDecoration: "none",
  },

  tableWrap: { overflowX: "auto" as const, borderRadius: "8px", border: "1px solid #313244" },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: "0.9rem" },
  th: {
    backgroundColor: "#181825",
    color: "#cdd6f4",
    fontWeight: 600,
    fontSize: "0.84rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    padding: "0.7rem 1rem",
    textAlign: "left" as const,
    borderBottom: "1px solid #313244",
    whiteSpace: "nowrap" as const,
  },
  trRow: { borderBottom: "1px solid #1e1e2e" },
  td: { padding: "0.75rem 1rem", color: "#cdd6f4" },
  tdMuted: { padding: "0.75rem 1rem", color: "#a6adc8", fontSize: "0.875rem" },
  tdYear: { padding: "0.75rem 1rem", color: "#cba6f7", fontFamily: "monospace", fontWeight: 700, fontSize: "1rem" },
  tdAction: { padding: "0.75rem 1rem", textAlign: "right" as const },
  statusBadge: {
    display: "inline-block",
    borderRadius: "4px",
    padding: "0.15rem 0.55rem",
    fontSize: "0.78rem",
    fontWeight: 600,
    whiteSpace: "nowrap" as const,
  },
  manageLink: { color: "#89b4fa", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600, whiteSpace: "nowrap" as const },
};
