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
  league_id: string | null;
  level: string | null;
  division: string | null;
};

type Edition = { id: string; year: number; status: string };
type TeamItem = { id: string; name: string };

const LEVEL_TO_SQUAD: Record<string, string> = { universitario: "universitaria" };
const LEVEL_LABEL: Record<string, string> = {
  amador: "Amador", junior: "Júnior", juvenil: "Juvenil", infantil: "Infantil",
  mirim: "Mirim", "pre-mirim": "Pré-Mirim", universitario: "Universitário",
  profissional: "Profissional", master: "Master", terrao: "Terrão",
  clube_social: "Clube Social", rural: "Rural", "inter-municipal": "Inter-municipal",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminNewEditionPage() {
  const { id: champId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [champ, setChamp] = useState<ChampInfo | null>(null);
  const [editions, setEditions] = useState<Edition[]>([]);
  const [prevEditionTeams, setPrevEditionTeams] = useState<TeamItem[]>([]);
  const [allTeams, setAllTeams] = useState<TeamItem[]>([]);
  const [leagueName, setLeagueName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Form state ────────────────────────────────────────────────────────────
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [extraTeamId, setExtraTeamId] = useState("");

  // ── Submit ────────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────
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
        const champData: ChampInfo = await champRes.json();
        setChamp(champData);

        const editionsData: Edition[] = editionsRes.ok ? await editionsRes.json() : [];
        const sortedEditions = [...editionsData].sort((a, b) => b.year - a.year);
        setEditions(sortedEditions);

        // Default year = latest edition year + 1, or current year
        if (sortedEditions.length > 0) {
          setYear(String(sortedEditions[0].year + 1));
        }

        // Load teams from the most recent edition
        if (sortedEditions.length > 0) {
          const prevEdId = sortedEditions[0].id;
          const prevTeamsRes = await fetch(`${API_BASE}/championships/${champId}/editions/${prevEdId}/teams`);
          if (prevTeamsRes.ok) {
            const prevTeams: TeamItem[] = await prevTeamsRes.json();
            const sorted = [...prevTeams].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
            setPrevEditionTeams(sorted);
            setSelectedTeamIds(new Set(sorted.map((t) => t.id)));
          }
        }

        // Load teams filtered by sport, category, and league
        if (teamsRes.ok) {
          type RawTeam = { id: string; name: string; sport_id: string; category: string | null; club_id: string | null };
          const rawTeams: RawTeam[] = await teamsRes.json();

          // Fetch league name and affiliated clubs
          let leagueClubIds: Set<string> | null = null;
          if (champData.league_id) {
            const [leagueRes, leagueClubsRes] = await Promise.all([
              fetch(`${API_BASE}/leagues/${champData.league_id}`),
              fetch(`${API_BASE}/leagues/${champData.league_id}/clubs`),
            ]);
            if (leagueRes.ok) {
              const leagueData = await leagueRes.json() as { name: string };
              setLeagueName(leagueData.name);
            }
            if (leagueClubsRes.ok) {
              const leagueClubs = await leagueClubsRes.json() as Array<{ club_id: string }>;
              leagueClubIds = new Set(leagueClubs.map(c => c.club_id));
            }
          }

          const filtered = rawTeams
            .filter((t) => {
              if (t.sport_id !== champData.sport_id) return false;
              if (champData.level && t.category) {
                const expected = LEVEL_TO_SQUAD[champData.level] ?? champData.level;
                if (t.category !== expected) return false;
              }
              if (leagueClubIds !== null && t.club_id !== null && !leagueClubIds.has(t.club_id)) return false;
              return true;
            })
            .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
          setAllTeams(filtered);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar.");
      } finally {
        setLoading(false);
      }
    })();
  }, [champId]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function toggleTeam(teamId: string) {
    setSelectedTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  }

  // Teams not already in the prev edition list
  const extraTeamOptions = allTeams.filter(
    (t) => !prevEditionTeams.some((p) => p.id === t.id)
  );

  // Extra teams added by the user (not from prev edition)
  const addedExtras = allTeams.filter(
    (t) => !prevEditionTeams.some((p) => p.id === t.id) && selectedTeamIds.has(t.id)
  );

  function addExtraTeam() {
    if (!extraTeamId) return;
    setSelectedTeamIds((prev) => new Set([...prev, extraTeamId]));
    setExtraTeamId("");
  }

  function removeExtra(teamId: string) {
    setSelectedTeamIds((prev) => {
      const next = new Set(prev);
      next.delete(teamId);
      return next;
    });
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      setSubmitError("Ano inválido.");
      return;
    }
    if (editions.some((ed) => ed.year === yearNum)) {
      setSubmitError(`Já existe uma edição para o ano ${yearNum}.`);
      return;
    }
    setSubmitting(true);
    try {
      // 1. Create edition
      const edRes = await fetch(`${API_BASE}/championships/${champId}/editions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ year: yearNum, status: "planned" }),
      });
      if (!edRes.ok) {
        const detail = await edRes.json().catch(() => ({})) as { detail?: string };
        throw new Error(detail.detail ?? `Erro ao criar edição: ${edRes.status}`);
      }
      const newEdition = await edRes.json() as { id: string };

      // 2. Create default phase (if there are teams to enroll)
      const teamsToEnroll = [...selectedTeamIds];
      if (teamsToEnroll.length > 0) {
        const phaseRes = await fetch(`${API_BASE}/championships/${champId}/editions/${newEdition.id}/phases`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ name: "Fase 1", order: 1, phase_type: "round_robin" }),
        });
        if (!phaseRes.ok) throw new Error(`Erro ao criar fase: ${phaseRes.status}`);
        const newPhase = await phaseRes.json() as { id: string };

        // 3. Create default group
        const groupRes = await fetch(`${API_BASE}/phases/${newPhase.id}/groups`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ name: "Grupo A" }),
        });
        if (!groupRes.ok) throw new Error(`Erro ao criar grupo: ${groupRes.status}`);
        const newGroup = await groupRes.json() as { id: string };

        // 4. Enroll selected teams
        await Promise.all(
          teamsToEnroll.map((teamId) =>
            fetch(`${API_BASE}/groups/${newGroup.id}/teams`, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...authHeaders() },
              body: JSON.stringify({ team_id: teamId }),
            })
          )
        );
      }

      navigate(`/admin/campeonatos/${champId}/gerenciar`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erro ao salvar.");
      setSubmitting(false);
    }
  }

  const prevYear = editions.length > 0 ? editions[0].year : null;
  const champLabel = champ ? (champ.nickname ?? champ.name) : "…";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <header style={S.hero}>
        <div style={S.heroAccent} />
        <div style={S.heroInner}>
          <Link to="/admin/campeonatos" style={S.back}>← Campeonatos</Link>
          <div style={S.heroRow}>
            <div>
              <h1 style={S.title}>Nova Edição</h1>
              {champ && (
                <p style={S.subtitle}>{champLabel}{champ.division ? ` · ${champ.division}` : ""}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main style={S.page}>
        {loading && <p style={S.hint}>Carregando…</p>}
        {error && <p style={S.errorText}>{error}</p>}

        {!loading && !error && champ && (
          <form onSubmit={handleSubmit} style={S.form} noValidate>

            {/* ─── Ano ─────────────────────────────────────────── */}
            <fieldset style={S.fieldset}>
              <legend style={S.legend}>Ano da edição *</legend>
              <div style={{ maxWidth: "180px" }}>
                <input
                  type="number"
                  style={S.input}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  min={2000}
                  max={2100}
                  required
                />
              </div>
              {prevYear && (
                <p style={S.hint}>Edição mais recente: {prevYear}</p>
              )}
            </fieldset>

            {/* ─── Times da edição anterior ────────────────────── */}
            <fieldset style={S.fieldset}>
              <legend style={S.legend}>
                Times{prevYear ? ` da edição ${prevYear}` : ""}
                <span style={S.legendSub}> — desmarque quem não participará</span>
              </legend>

              {prevEditionTeams.length === 0 ? (
                <p style={S.hint}>Nenhum time na edição anterior. Adicione abaixo.</p>
              ) : (
                <div style={S.teamGrid}>
                  {prevEditionTeams.map((t) => {
                    const checked = selectedTeamIds.has(t.id);
                    return (
                      <label key={t.id} style={{ ...S.teamRow, opacity: checked ? 1 : 0.45 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTeam(t.id)}
                          style={S.checkbox}
                        />
                        <span style={S.teamName}>{t.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </fieldset>

            {/* ─── Adicionar outros times ──────────────────────── */}
            <fieldset style={S.fieldset}>
              <legend style={S.legend}>Adicionar outros times</legend>
              {/* Filtros fixos: liga e categoria do campeonato */}
              <div style={S.filterRow}>
                <div style={S.filterItem}>
                  <span style={S.filterLabel}>Liga</span>
                  <span style={S.filterValue}>
                    {champ.league_id ? (leagueName ?? "Carregando…") : "Sem liga"}
                  </span>
                </div>
                <div style={S.filterItem}>
                  <span style={S.filterLabel}>Categoria</span>
                  <span style={S.filterValue}>
                    {champ.level ? (LEVEL_LABEL[champ.level] ?? champ.level) : "Sem categoria"}
                  </span>
                </div>
              </div>
              <div style={S.addRow}>
                <select
                  style={{ ...S.input, ...S.select, flex: 1, maxWidth: "360px" }}
                  value={extraTeamId}
                  onChange={(e) => setExtraTeamId(e.target.value)}
                >
                  <option value="">Selecione um time para adicionar…</option>
                  {extraTeamOptions
                    .filter((t) => !selectedTeamIds.has(t.id))
                    .map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={addExtraTeam}
                  disabled={!extraTeamId}
                  style={{ ...S.btnSecondary, opacity: extraTeamId ? 1 : 0.4 }}
                >
                  + Adicionar
                </button>
              </div>
              {addedExtras.length > 0 && (
                <div style={{ ...S.teamGrid, marginTop: "0.75rem" }}>
                  {addedExtras.map((t) => (
                    <div key={t.id} style={{ ...S.teamRow, justifyContent: "space-between" }}>
                      <span style={S.teamName}>{t.name}</span>
                      <button
                        type="button"
                        onClick={() => removeExtra(t.id)}
                        style={S.removeBtn}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </fieldset>

            {/* ─── Resumo e submit ─────────────────────────────── */}
            <div style={S.submitArea}>
              {submitError && <p style={S.errorText}>{submitError}</p>}
              <p style={S.summaryText}>
                {selectedTeamIds.size} time{selectedTeamIds.size !== 1 ? "s" : ""} selecionado{selectedTeamIds.size !== 1 ? "s" : ""} para a edição {year}.
                {selectedTeamIds.size > 0 && " Serão colocados em uma fase e grupo iniciais — reorganize depois no Gerenciar."}
              </p>
              <div style={S.submitRow}>
                <Link to="/admin/campeonatos" style={S.btnCancel}>Cancelar</Link>
                <button type="submit" disabled={submitting} style={S.btnSubmit}>
                  {submitting ? "Criando…" : `Criar Edição ${year}`}
                </button>
              </div>
            </div>

          </form>
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
  heroRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginTop: "0.5rem" },
  back: { color: "#89b4fa", textDecoration: "none", fontSize: "0.85rem" },
  title: { fontSize: "1.5rem", fontWeight: 700, color: "#cdd6f4", margin: 0 },
  subtitle: { margin: "0.25rem 0 0", fontSize: "0.9rem", color: "#6c7086" },

  page: { maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.5rem 4rem" },

  form: { display: "flex", flexDirection: "column" as const, gap: "1.75rem" },
  fieldset: {
    border: "1px solid #313244",
    borderRadius: "10px",
    padding: "1.25rem 1.5rem 1.5rem",
    margin: 0,
  },
  legend: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "#cdd6f4",
    padding: "0 0.5rem",
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
  },
  legendSub: {
    fontWeight: 400,
    textTransform: "none" as const,
    letterSpacing: 0,
    color: "#6c7086",
    fontSize: "0.82rem",
  },

  input: {
    display: "block",
    width: "100%",
    backgroundColor: "#1e1e2e",
    border: "1px solid #313244",
    borderRadius: "6px",
    color: "#cdd6f4",
    fontSize: "0.9rem",
    padding: "0.55rem 0.9rem",
    outline: "none",
    boxSizing: "border-box" as const,
    marginTop: "0.4rem",
  },
  select: { cursor: "pointer" },

  hint: { color: "#6c7086", fontSize: "0.82rem", margin: "0.5rem 0 0" },
  errorText: { color: "#f38ba8", fontSize: "0.875rem", margin: 0 },

  teamGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "0.5rem",
    marginTop: "0.9rem",
  },
  teamRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    backgroundColor: "#1e1e2e",
    border: "1px solid #313244",
    borderRadius: "8px",
    padding: "0.55rem 0.85rem",
    cursor: "pointer",
  },
  checkbox: { accentColor: "#cba6f7", width: "16px", height: "16px", cursor: "pointer" },
  teamName: { fontSize: "0.875rem", color: "#cdd6f4", flex: 1 },

  filterRow: { display: "flex", flexWrap: "wrap" as const, gap: "1.25rem", margin: "0.75rem 0 0" },
  filterItem: { display: "flex", flexDirection: "column" as const, gap: "0.25rem" },
  filterLabel: { fontSize: "0.72rem", fontWeight: 700, color: "#a6adc8", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  filterValue: { fontSize: "0.875rem", color: "#cdd6f4", backgroundColor: "#1e1e2e", border: "1px solid #313244", borderRadius: "6px", padding: "0.4rem 0.75rem" },
  addRow: { display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" as const, marginTop: "0.75rem" },
  btnSecondary: {
    backgroundColor: "#1e1e2e",
    border: "1px solid #cba6f7",
    borderRadius: "6px",
    color: "#cba6f7",
    fontSize: "0.875rem",
    fontWeight: 600,
    padding: "0.55rem 1rem",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  removeBtn: {
    background: "none",
    border: "none",
    color: "#f38ba8",
    cursor: "pointer",
    fontSize: "0.8rem",
    padding: "0 0.2rem",
    lineHeight: 1,
    flexShrink: 0,
  },

  submitArea: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.75rem",
    paddingTop: "0.5rem",
    borderTop: "1px solid #313244",
  },
  summaryText: { color: "#a6adc8", fontSize: "0.85rem", margin: 0 },
  submitRow: { display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" as const },
  btnSubmit: {
    backgroundColor: "#cba6f7",
    borderRadius: "8px",
    border: "none",
    color: "#11111b",
    fontSize: "0.95rem",
    fontWeight: 700,
    padding: "0.65rem 1.75rem",
    cursor: "pointer",
  },
  btnCancel: {
    color: "#6c7086",
    textDecoration: "none",
    fontSize: "0.875rem",
    padding: "0.65rem 0",
  },
};
