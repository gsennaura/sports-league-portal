import { useEffect, useState } from "react";
import { useAuth } from "@presentation/context/AuthContext";
import { API_BASE } from "@infrastructure/apiBase";
import { authHeaders } from "@infrastructure/authHeaders";

interface PendingMembership {
  id: string;
  athlete_id: string;
  team_id: string;
  membership_status: string;
  requested_by: string;
  is_active: boolean;
}

interface RosterAthlete {
  history_id: string;
  athlete_id: string;
  athlete_name: string;
  nickname: string | null;
  position: string | null;
  jersey_number: number | null;
  membership_status: string;
}

interface SearchedAthlete {
  id: string;
  name: string;
  nickname: string | null;
  position: string | null;
}

type TabType = "solicitacoes" | "elenco";

interface TeamEntry {
  teamId: string;
  teamName: string | null;
  pendings: PendingMembership[];
  roster: RosterAthlete[];
  loadingPendings: boolean;
  loadingRoster: boolean;
  errorPendings: string | null;
  errorRoster: string | null;
}

export function DirigentePage() {
  const { dirigenteProfiles } = useAuth();
  const [teams, setTeams] = useState<TeamEntry[]>([]);
  const [actioning, setActioning] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ id: string; type: "ok" | "err"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("solicitacoes");

  // Elenco: athlete search
  const [athleteSearch, setAthleteSearch] = useState<Record<string, string>>({});
  const [athleteResults, setAthleteResults] = useState<Record<string, SearchedAthlete[]>>({});
  const [addingAthlete, setAddingAthlete] = useState<string | null>(null);
  const [rosterMsg, setRosterMsg] = useState<Record<string, { type: "ok" | "err"; text: string } | null>>({});

  useEffect(() => {
    const initial: TeamEntry[] = dirigenteProfiles
      .filter((p) => p.is_active && p.team_id)
      .map((p) => ({
        teamId: p.team_id,
        teamName: p.title ?? null,
        pendings: [],
        roster: [],
        loadingPendings: true,
        loadingRoster: true,
        errorPendings: null,
        errorRoster: null,
      }));
    setTeams(initial);

    initial.forEach((entry) => {
      // Load team name
      fetch(`${API_BASE}/teams/${entry.teamId}`)
        .then((r) => r.ok ? r.json() as Promise<{ id: string; name: string }> : null)
        .then((teamInfo) => {
          if (teamInfo) {
            setTeams((prev) => prev.map((t) => t.teamId === entry.teamId ? { ...t, teamName: teamInfo.name } : t));
          }
        })
        .catch(() => {});

      // Load pending memberships
      fetch(`${API_BASE}/dirigentes/my-team/${entry.teamId}/pending`, { headers: authHeaders() })
        .then((r) => r.ok ? r.json() as Promise<PendingMembership[]> : Promise.reject())
        .then((pendings) => setTeams((prev) => prev.map((t) => t.teamId === entry.teamId ? { ...t, pendings, loadingPendings: false } : t)))
        .catch(() => setTeams((prev) => prev.map((t) => t.teamId === entry.teamId ? { ...t, loadingPendings: false, errorPendings: "Erro ao carregar pendências." } : t)));

      // Load roster
      fetch(`${API_BASE}/dirigentes/my-team/${entry.teamId}/athletes`, { headers: authHeaders() })
        .then((r) => r.ok ? r.json() as Promise<RosterAthlete[]> : Promise.reject())
        .then((roster) => setTeams((prev) => prev.map((t) => t.teamId === entry.teamId ? { ...t, roster, loadingRoster: false } : t)))
        .catch(() => setTeams((prev) => prev.map((t) => t.teamId === entry.teamId ? { ...t, loadingRoster: false, errorRoster: "Erro ao carregar elenco." } : t)));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAction(teamId: string, membershipId: string, action: "approve" | "reject") {
    setActioning(membershipId);
    setActionMsg(null);
    try {
      const resp = await fetch(
        `${API_BASE}/dirigentes/my-team/${teamId}/memberships/${membershipId}/${action}`,
        { method: "POST", headers: authHeaders() }
      );
      if (!resp.ok) throw new Error(((await resp.json().catch(() => ({}))) as { detail?: string }).detail ?? "Erro.");
      setActionMsg({ id: membershipId, type: "ok", text: action === "approve" ? "Aprovado!" : "Recusado." });
      setTeams((prev) => prev.map((t) => t.teamId === teamId ? { ...t, pendings: t.pendings.filter((m) => m.id !== membershipId) } : t));
    } catch (e: unknown) {
      setActionMsg({ id: membershipId, type: "err", text: (e as Error).message });
    } finally {
      setActioning(null);
    }
  }

  async function searchAthletes(teamId: string, query: string) {
    setAthleteSearch((prev) => ({ ...prev, [teamId]: query }));
    if (query.length < 2) { setAthleteResults((prev) => ({ ...prev, [teamId]: [] })); return; }
    const resp = await fetch(`${API_BASE}/athletes?search=${encodeURIComponent(query)}&limit=10`);
    if (resp.ok) {
      const data = await resp.json() as SearchedAthlete[];
      setAthleteResults((prev) => ({ ...prev, [teamId]: data }));
    }
  }

  async function handleAddAthlete(teamId: string, athleteId: string) {
    setAddingAthlete(athleteId);
    setRosterMsg((prev) => ({ ...prev, [teamId]: null }));
    try {
      const resp = await fetch(`${API_BASE}/dirigentes/my-team/${teamId}/athletes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ athlete_id: athleteId }),
      });
      if (!resp.ok) throw new Error(((await resp.json().catch(() => ({}))) as { detail?: string }).detail ?? "Erro.");
      const newMember = await resp.json() as RosterAthlete;
      setTeams((prev) => prev.map((t) => t.teamId === teamId ? { ...t, roster: [...t.roster, newMember] } : t));
      setAthleteSearch((prev) => ({ ...prev, [teamId]: "" }));
      setAthleteResults((prev) => ({ ...prev, [teamId]: [] }));
      setRosterMsg((prev) => ({ ...prev, [teamId]: { type: "ok", text: "Atleta adicionado ao elenco!" } }));
    } catch (e: unknown) {
      setRosterMsg((prev) => ({ ...prev, [teamId]: { type: "err", text: (e as Error).message } }));
    } finally {
      setAddingAthlete(null);
    }
  }

  async function handleRemoveAthlete(teamId: string, athleteId: string) {
    setRosterMsg((prev) => ({ ...prev, [teamId]: null }));
    try {
      const resp = await fetch(`${API_BASE}/dirigentes/my-team/${teamId}/athletes/${athleteId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!resp.ok && resp.status !== 204) throw new Error("Erro ao remover atleta.");
      setTeams((prev) => prev.map((t) => t.teamId === teamId ? { ...t, roster: t.roster.filter((r) => r.athlete_id !== athleteId) } : t));
      setRosterMsg((prev) => ({ ...prev, [teamId]: { type: "ok", text: "Atleta removido do elenco." } }));
    } catch (e: unknown) {
      setRosterMsg((prev) => ({ ...prev, [teamId]: { type: "err", text: (e as Error).message } }));
    }
  }

  if (dirigenteProfiles.filter((p) => p.is_active).length === 0) {
    return (
      <div style={S.page}>
        <h1 style={S.title}>Meu Time</h1>
        <p style={S.empty}>Você não é dirigente de nenhum time. Aguarde aprovação do administrador.</p>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <h1 style={S.title}>Meu Time</h1>

      {/* Tabs */}
      <div style={S.tabs}>
        <button style={{ ...S.tab, ...(activeTab === "solicitacoes" ? S.tabActive : {}) }} onClick={() => setActiveTab("solicitacoes")}>
          Solicitações
        </button>
        <button style={{ ...S.tab, ...(activeTab === "elenco" ? S.tabActive : {}) }} onClick={() => setActiveTab("elenco")}>
          Elenco
        </button>
      </div>

      {teams.map((team) => (
        <div key={team.teamId} style={S.card}>
          <h2 style={S.teamName}>{team.teamName ?? team.teamId}</h2>

          {/* ── Solicitações Tab ── */}
          {activeTab === "solicitacoes" && (
            <>
              <h3 style={S.sectionTitle}>Solicitações de vínculo pendentes</h3>
              {team.loadingPendings && <p style={S.hint}>Carregando...</p>}
              {team.errorPendings && <p style={S.errorText}>{team.errorPendings}</p>}
              {!team.loadingPendings && !team.errorPendings && team.pendings.length === 0 && (
                <p style={S.empty}>Nenhuma solicitação pendente.</p>
              )}
              {team.pendings.map((m) => (
                <div key={m.id} style={S.memberRow}>
                  <div style={S.memberInfo}>
                    <span style={S.memberName}>{m.athlete_id}</span>
                    <span style={S.memberDate}>via {m.requested_by}</span>
                  </div>
                  <div style={S.actions}>
                    <button style={S.approveBtn} disabled={actioning === m.id} onClick={() => handleAction(team.teamId, m.id, "approve")}>Aprovar</button>
                    <button style={S.rejectBtn} disabled={actioning === m.id} onClick={() => handleAction(team.teamId, m.id, "reject")}>Recusar</button>
                  </div>
                  {actionMsg?.id === m.id && <p style={actionMsg.type === "ok" ? S.successText : S.errorText}>{actionMsg.text}</p>}
                </div>
              ))}
            </>
          )}

          {/* ── Elenco Tab ── */}
          {activeTab === "elenco" && (
            <>
              <h3 style={S.sectionTitle}>Elenco ativo</h3>
              {team.loadingRoster && <p style={S.hint}>Carregando...</p>}
              {team.errorRoster && <p style={S.errorText}>{team.errorRoster}</p>}
              {!team.loadingRoster && team.roster.length === 0 && <p style={S.empty}>Nenhum atleta no elenco.</p>}
              {team.roster.map((r) => (
                <div key={r.history_id} style={S.memberRow}>
                  <div style={S.memberInfo}>
                    <span style={S.memberName}>{r.athlete_name}{r.nickname ? ` (${r.nickname})` : ""}</span>
                    <span style={S.memberDate}>{r.position ?? "—"}{r.jersey_number ? ` · #${r.jersey_number}` : ""}</span>
                  </div>
                  <button style={S.rejectBtn} onClick={() => handleRemoveAthlete(team.teamId, r.athlete_id)}>Remover</button>
                </div>
              ))}

              {rosterMsg[team.teamId] && (
                <p style={rosterMsg[team.teamId]?.type === "ok" ? S.successText : S.errorText}>{rosterMsg[team.teamId]?.text}</p>
              )}

              {/* Add athlete */}
              <h3 style={{ ...S.sectionTitle, marginTop: 16 }}>Adicionar atleta</h3>
              <input
                style={S.input}
                value={athleteSearch[team.teamId] ?? ""}
                onChange={(e) => searchAthletes(team.teamId, e.target.value)}
                placeholder="Buscar atleta por nome…"
              />
              {(athleteResults[team.teamId] ?? []).map((a) => (
                <div key={a.id} style={S.memberRow}>
                  <span style={S.memberName}>{a.name}{a.nickname ? ` (${a.nickname})` : ""} <span style={{ color: "#ffffff", fontSize: ".8rem" }}>{a.position ?? ""}</span></span>
                  <button
                    style={S.approveBtn}
                    disabled={addingAthlete === a.id}
                    onClick={() => handleAddAthlete(team.teamId, a.id)}
                  >
                    Adicionar
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 720, margin: "32px auto", padding: "0 16px", fontFamily: "sans-serif", color: "#cdd6f4" },
  title: { fontSize: 28, fontWeight: 700, marginBottom: 16, color: "#cba6f7" },
  tabs: { display: "flex", gap: 8, marginBottom: 20 },
  tab: { padding: "8px 20px", borderRadius: 8, border: "none", background: "#313244", color: "#ffffff", fontWeight: 600, cursor: "pointer", fontSize: "1rem" },
  tabActive: { background: "#cba6f7", color: "#18265b" },
  card: { backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: 12, padding: 24, marginBottom: 24 },
  teamName: { fontSize: 20, fontWeight: 700, color: "#89b4fa", marginTop: 0, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: "#ffffff", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 12 },
  hint: { color: "#ffffff", fontSize: 14 },
  empty: { color: "#ffffff", fontSize: 14 },
  memberRow: { display: "flex", flexWrap: "wrap" as const, alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 0", borderBottom: "1px solid #313244" },
  memberInfo: { display: "flex", flexDirection: "column" as const, gap: 2 },
  memberName: { fontWeight: 600, color: "#cdd6f4" },
  memberDate: { fontSize: 12, color: "#ffffff" },
  actions: { display: "flex", gap: 8 },
  approveBtn: { background: "#a6e3a1", color: "#18265b", border: "none", borderRadius: 6, padding: "6px 14px", fontWeight: 700, cursor: "pointer" },
  rejectBtn: { background: "#f38ba8", color: "#18265b", border: "none", borderRadius: 6, padding: "6px 14px", fontWeight: 700, cursor: "pointer" },
  successText: { color: "#a6e3a1", fontSize: 13, width: "100%" },
  errorText: { color: "#f38ba8", fontSize: 13, width: "100%" },
  input: { width: "100%", padding: ".5rem .85rem", borderRadius: 8, border: "1px solid #45475a", background: "#313244", color: "#cdd6f4", fontSize: ".95rem", boxSizing: "border-box" as const, marginBottom: 8 },
};
