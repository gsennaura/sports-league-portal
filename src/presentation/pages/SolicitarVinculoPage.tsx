import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "@infrastructure/apiBase";
import { authHeaders } from "@infrastructure/authHeaders";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Membership {
  id: string;
  team_id: string;
  membership_status: string | null;
  team_name?: string | null;
  team_sport_name?: string | null;
}

interface LeagueOption { id: string; name: string; }
interface SportOption  { id: string; name: string; }
interface TeamOption   { id: string; name: string; league_id: string | null; sport_id: string; category: string | null; }

const CATEGORY_LABEL: Record<string, string> = {
  sub13: "Sub-13", sub15: "Sub-15", sub17: "Sub-17", sub20: "Sub-20",
  adulto: "Adulto", masters: "Masters",
};

const STATUS_LABEL: Record<string, string> = {
  ativo:               "Ativo",
  pendente_aprovacao:  "Aguardando aprovação",
  inativo:             "Inativo",
  suspenso:            "Suspenso",
  rejeitado:           "Rejeitado",
  sem_time:            "Sem time",
};

const STATUS_COLOR: Record<string, string> = {
  ativo:              "#a6e3a1",
  pendente_aprovacao: "#f9e2af",
  inativo:            "#ffffff",
  suspenso:           "#fab387",
  rejeitado:          "#f38ba8",
  sem_time:           "#ffffff",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function SolicitarVinculoPage() {
  // ── Data ──────────────────────────────────────────────────────────────────
  const [memberships,  setMemberships]  = useState<Membership[]>([]);
  const [leagues,      setLeagues]      = useState<LeagueOption[]>([]);
  const [sports,       setSports]       = useState<SportOption[]>([]);
  const [allTeams,     setAllTeams]     = useState<TeamOption[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [pageError,    setPageError]    = useState<string | null>(null);

  // ── Form ──────────────────────────────────────────────────────────────────
  const [selectedLeague,   setSelectedLeague]   = useState("");
  const [selectedSport,    setSelectedSport]    = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTeamId,   setSelectedTeamId]   = useState("");
  const [submitting,       setSubmitting]        = useState(false);
  const [msg,              setMsg]               = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/athletes/me`, { headers: authHeaders() })
        .then((r) => r.ok ? r.json() as Promise<{ id: string }> : Promise.reject(new Error("Perfil não encontrado")))
        .then((p) =>
          fetch(`${API_BASE}/athletes/${p.id}/teams`, { headers: authHeaders() })
            .then((r) => r.ok ? r.json() as Promise<Membership[]> : [])
            .catch(() => [])
        ),
      fetch(`${API_BASE}/leagues?`).then((r) => r.json() as Promise<LeagueOption[]>).catch(() => []),
      fetch(`${API_BASE}/sports`).then((r) => r.json() as Promise<SportOption[]>).catch(() => []),
      fetch(`${API_BASE}/teams?limit=500`).then((r) => r.json() as Promise<TeamOption[]>).catch(() => []),
    ])
      .then(([m, lg, sp, t]) => {
        setMemberships(m);
        setLeagues(lg.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
        setSports(sp.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
        setAllTeams(t);
      })
      .catch((e: Error) => setPageError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTeamId) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch(`${API_BASE}/memberships`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ team_id: selectedTeamId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(err.detail ?? "Erro ao solicitar vínculo.");
      }
      const newMembership = await res.json() as Membership;
      // O POST não retorna team_name — enriquecemos com os dados locais já carregados
      const teamData = allTeams.find((t) => t.id === selectedTeamId);
      const enriched: Membership = {
        ...newMembership,
        team_name: teamData?.name ?? null,
        team_sport_name: teamData ? (sports.find((s) => s.id === teamData.sport_id)?.name ?? null) : null,
      };
      setMemberships((prev) => [enriched, ...prev]);
      setMsg({ type: "ok", text: "Solicitação enviada! Aguarde a aprovação do administrador." });
      setSelectedLeague(""); setSelectedSport(""); setSelectedCategory(""); setSelectedTeamId("");
    } catch (e) {
      setMsg({ type: "err", text: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Cascade derivations ───────────────────────────────────────────────────
  const byLeague    = selectedLeague   ? allTeams.filter((t) => t.league_id  === selectedLeague)   : allTeams;
  const bySport     = selectedSport    ? byLeague.filter((t)  => t.sport_id  === selectedSport)    : byLeague;
  const categories  = [...new Set(bySport.map((t) => t.category).filter((c): c is string => !!c))].sort();
  const teamOptions = bySport
    .filter((t) => !selectedCategory || t.category === selectedCategory)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const activeMemberships = memberships.filter(
    (m) => m.membership_status !== "rejeitado" && m.membership_status !== "inativo"
  );

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return <main className="page-container"><p style={{ color: "#ffffff", padding: "2rem" }}>Carregando…</p></main>;
  }

  if (pageError) {
    return (
      <main className="page-container">
        <p style={{ color: "#f38ba8" }}>{pageError}</p>
        <Link to="/meu-perfil" style={{ color: "#89b4fa", fontSize: "0.875rem" }}>← Voltar ao perfil</Link>
      </main>
    );
  }

  return (
    <main className="page-container">
      <div style={S.container}>

        {/* ── Back link ──────────────────────────────────────────────────── */}
        <Link to="/meu-perfil" className="back-link">← Meu Perfil</Link>

        {/* ── Title ──────────────────────────────────────────────────────── */}
        <div style={S.titleRow}>
          <div>
            <h1 className="page-title">Solicitar Vínculo</h1>
            <p className="page-subtitle">Envie uma solicitação para ser vinculado a um time. O administrador irá aprovar.</p>
          </div>
        </div>

        {/* ── Vínculos atuais ────────────────────────────────────────────── */}
        {activeMemberships.length > 0 && (
          <div style={S.card}>
            <h2 style={S.cardTitle}>Seus vínculos atuais</h2>
            <div style={S.membershipList}>
              {activeMemberships.map((m) => {
                const status = m.membership_status ?? "sem_time";
                return (
                  <div key={m.id} style={S.membershipRow}>
                    <div>
                      <span style={S.teamName}>{m.team_name ?? m.team_id}</span>
                      {m.team_sport_name && (
                        <span style={S.sportLabel}> · {m.team_sport_name}</span>
                      )}
                    </div>
                    <span style={{ ...S.badge, color: STATUS_COLOR[status] ?? "#ffffff" }}>
                      {STATUS_LABEL[status] ?? status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Form card ──────────────────────────────────────────────────── */}
        <div style={S.card}>
          <h2 style={S.cardTitle}>Selecionar time</h2>

          {msg && (
            <div style={msg.type === "ok" ? S.msgOk : S.msgErr}>
              {msg.type === "ok" ? "✓" : "⚠"} {msg.text}
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)}>
            <div style={S.grid}>
              {/* Liga */}
              <div style={S.field}>
                <label style={S.label}>Liga</label>
                <select
                  style={S.select}
                  value={selectedLeague}
                  onChange={(e) => {
                    setSelectedLeague(e.target.value);
                    setSelectedSport(""); setSelectedCategory(""); setSelectedTeamId("");
                  }}
                >
                  <option value="">Todas as ligas</option>
                  {leagues.map((lg) => (
                    <option key={lg.id} value={lg.id}>{lg.name}</option>
                  ))}
                </select>
              </div>

              {/* Esporte */}
              <div style={S.field}>
                <label style={S.label}>Esporte</label>
                <select
                  style={S.select}
                  value={selectedSport}
                  onChange={(e) => {
                    setSelectedSport(e.target.value);
                    setSelectedCategory(""); setSelectedTeamId("");
                  }}
                >
                  <option value="">Todos os esportes</option>
                  {sports.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Categoria */}
              <div style={S.field}>
                <label style={S.label}>Categoria</label>
                <select
                  style={S.select}
                  value={selectedCategory}
                  onChange={(e) => { setSelectedCategory(e.target.value); setSelectedTeamId(""); }}
                  disabled={categories.length === 0}
                >
                  <option value="">Todas as categorias</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABEL[c] ?? c}</option>
                  ))}
                </select>
              </div>

              {/* Time */}
              <div style={S.field}>
                <label style={S.label}>Time *</label>
                <select
                  style={{
                    ...S.select,
                    borderColor: selectedTeamId ? "#89b4fa" : "#45475a",
                  }}
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  disabled={teamOptions.length === 0}
                  required
                >
                  <option value="">
                    {teamOptions.length === 0 ? "Nenhum time encontrado" : "Selecione um time"}
                  </option>
                  {teamOptions.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {teamOptions.length > 0 && !selectedTeamId && (
                  <span style={S.hint}>{teamOptions.length} time{teamOptions.length !== 1 ? "s" : ""} disponível{teamOptions.length !== 1 ? "is" : ""}</span>
                )}
              </div>
            </div>

            <div style={S.actions}>
              <button
                type="submit"
                style={{
                  ...S.btnPrimary,
                  opacity: selectedTeamId && !submitting ? 1 : 0.45,
                  cursor: selectedTeamId && !submitting ? "pointer" : "default",
                }}
                disabled={!selectedTeamId || submitting}
              >
                {submitting ? "Enviando…" : "Solicitar vínculo"}
              </button>
              <Link to="/meu-perfil" style={S.btnSecondary}>
                Cancelar
              </Link>
            </div>
          </form>
        </div>

      </div>
    </main>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "80vh", backgroundColor: "#18265b" },
  container: { maxWidth: "680px", margin: "0 auto", padding: "2rem 1.5rem 5rem" },

  backLink: { display: "inline-block", color: "#89b4fa", textDecoration: "none", fontSize: "0.85rem", marginBottom: "1.5rem" },

  titleRow: { marginBottom: "2rem" },
  title: { margin: "0 0 0.3rem", fontSize: "1.6rem", fontWeight: 700, color: "#cdd6f4" },
  subtitle: { margin: 0, fontSize: "0.9rem", color: "#ffffff" },

  card: {
    backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "12px",
    padding: "1.5rem", marginBottom: "1.25rem",
  },
  cardTitle: { margin: "0 0 1.1rem", fontSize: "0.95rem", fontWeight: 700, color: "#cba6f7", textTransform: "uppercase", letterSpacing: "0.06em" },

  membershipList: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  membershipRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "8px",
    padding: "0.7rem 1rem", gap: "1rem",
  },
  teamName: { fontSize: "0.9rem", fontWeight: 600, color: "#cdd6f4" },
  sportLabel: { fontSize: "0.82rem", color: "#ffffff" },
  badge: { fontSize: "0.75rem", fontWeight: 600, whiteSpace: "nowrap" as const },

  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" },
  field: { display: "flex", flexDirection: "column", gap: "5px" },
  label: { fontSize: "0.75rem", fontWeight: 700, color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.05em" },
  select: {
    backgroundColor: "#18265b", border: "1px solid #45475a", borderRadius: "7px",
    color: "#cdd6f4", fontSize: "0.875rem", padding: "0.55rem 0.75rem",
    outline: "none", width: "100%", cursor: "pointer",
  },
  hint: { fontSize: "0.72rem", color: "#ffffff", marginTop: "2px" },

  actions: { display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" as const },
  btnPrimary: {
    backgroundColor: "#cba6f7", border: "none", borderRadius: "7px",
    color: "#11111b", fontSize: "0.9rem", fontWeight: 700,
    padding: "0.6rem 1.5rem", cursor: "pointer", whiteSpace: "nowrap" as const,
    transition: "opacity 0.15s",
  },
  btnSecondary: {
    display: "inline-block", textDecoration: "none",
    border: "1px solid #45475a", borderRadius: "7px",
    color: "#ffffff", fontSize: "0.875rem", fontWeight: 500,
    padding: "0.55rem 1.1rem", whiteSpace: "nowrap" as const,
  },

  msgOk: {
    backgroundColor: "rgba(166,227,161,.12)", border: "1px solid rgba(166,227,161,.35)",
    borderRadius: "7px", color: "#a6e3a1", fontSize: "0.875rem",
    padding: "0.7rem 1rem", marginBottom: "1.25rem",
  },
  msgErr: {
    backgroundColor: "rgba(243,139,168,.1)", border: "1px solid rgba(243,139,168,.35)",
    borderRadius: "7px", color: "#f38ba8", fontSize: "0.875rem",
    padding: "0.7rem 1rem", marginBottom: "1.25rem",
  },
};
