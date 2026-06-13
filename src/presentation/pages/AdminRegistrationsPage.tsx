import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@presentation/context/AuthContext";
import type { ListTeams } from "@application/use_cases/ListTeams";
import type { ListLeagues } from "@application/use_cases/ListLeagues";
import type { ListChampionships } from "@application/use_cases/ListChampionships";
import type { GetTeamAthletes } from "@application/use_cases/AthleteTeam";
import type {
  CheckAthleteMatchEvents,
  ListEditionRegistrations,
  GetEligibleAthletes,
  RegisterAthleteChampionship,
  UpdateChampionshipRegistration,
} from "@application/use_cases/ChampionshipRegistration";
import type { League } from "@domain/entities/League";
import type { Team } from "@domain/entities/Team";
import type { Championship } from "@domain/entities/Championship";
import type { AthleteTeamHistory, AthleteChampionshipRegistration } from "@domain/entities/Athlete";
import { API_BASE } from "@infrastructure/apiBase";

interface Props {
  listTeams: ListTeams;
  listLeagues: ListLeagues;
  listChampionships: ListChampionships;
  getTeamAthletes: GetTeamAthletes;
  listEditionRegistrations: ListEditionRegistrations;
  getEligibleAthletes: GetEligibleAthletes;
  registerAthleteChampionship: RegisterAthleteChampionship;
  updateChampionshipRegistration: UpdateChampionshipRegistration;
  checkAthleteMatchEvents: CheckAthleteMatchEvents;
}

type RowStatus = "eligible" | "registered" | "ineligible" | "withdrawn";

interface AthleteRow {
  athleteId: string;
  name: string;
  position: string | null;
  jerseyNumber: number | null;
  status: RowStatus;
  registration: AthleteChampionshipRegistration | null;
}

type ResultEntry = { athleteId: string; name: string; action: "register" | "unregister" } & (
  | { ok: true }
  | { ok: false; error: string }
);

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#18265b", color: "#cdd6f4" },
  inner: { maxWidth: "1100px", margin: "0 auto", padding: "32px 24px" },
  title: { fontSize: "22px", fontWeight: 700, color: "#cdd6f4", margin: "0 0 4px" },
  subtitle: { fontSize: "14px", color: "#ffffff", margin: "0 0 24px" },
  card: { background: "#18265b", borderRadius: "10px", padding: "20px", marginBottom: "20px" },
  row: { display: "flex", gap: "20px", flexWrap: "wrap" as const, alignItems: "flex-end" },
  field: { display: "flex", flexDirection: "column" as const, flex: "1 1 240px", minWidth: "200px" },
  label: { fontSize: "13px", color: "#ffffff", marginBottom: "6px" },
  select: { padding: "8px 12px", background: "#313244", color: "#cdd6f4", border: "1px solid #45475a", borderRadius: "6px", fontSize: "14px" },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: "14px" },
  th: { textAlign: "left" as const, padding: "10px 12px", color: "#ffffff", borderBottom: "1px solid #313244", fontWeight: 600, fontSize: "12px", textTransform: "uppercase" as const },
  td: { padding: "10px 12px", borderBottom: "1px solid #313244", verticalAlign: "middle" as const },
  checkbox: { width: "16px", height: "16px", cursor: "pointer", accentColor: "#89b4fa" },
  btnPrimary: { padding: "10px 20px", background: "#89b4fa", color: "#18265b", border: "none", borderRadius: "6px", fontWeight: 700, fontSize: "14px", cursor: "pointer" },
  btnDisabled: { padding: "10px 20px", background: "#45475a", color: "#ffffff", border: "none", borderRadius: "6px", fontWeight: 700, fontSize: "14px", cursor: "not-allowed" },
  loader: { textAlign: "center" as const, color: "#ffffff", padding: "40px" },
  empty: { textAlign: "center" as const, color: "#ffffff", padding: "32px" },
  resultOk: { color: "#a6e3a1" },
  resultFail: { color: "#f38ba8" },
  mismatchBanner: { background: "#2e1e00", border: "1px solid #f9e2af", borderRadius: "6px", color: "#f9e2af", fontSize: "13px", padding: "10px 14px" },
};

function badgeStyle(status: string): React.CSSProperties {
  if (status === "approved") return { display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, background: "#a6e3a1", color: "#18265b" };
  if (status === "rejected") return { display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, background: "#f38ba8", color: "#18265b" };
  if (status === "withdrawn") return { display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, background: "#45475a", color: "#cdd6f4" };
  return { display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, background: "#f9e2af", color: "#18265b" };
}

export function AdminRegistrationsPage({
  listTeams,
  listLeagues,
  listChampionships,
  getTeamAthletes,
  listEditionRegistrations,
  getEligibleAthletes,
  registerAthleteChampionship,
  updateChampionshipRegistration,
  checkAthleteMatchEvents,
}: Props) {
  const { isAdmin, isLeagueAdmin, leagueAdminProfiles } = useAuth();
  const myLeagueIds = leagueAdminProfiles.filter(p => p.is_active).map(p => p.league_id);

  const [teams, setTeams] = useState<Team[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Cascade: Liga → Campeonato → Time
  const [selectedLeagueId, setSelectedLeagueId] = useState("");
  const [selectedChampId, setSelectedChampId] = useState("");  // edition_id
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedEditionId, setSelectedEditionId] = useState("");

  // Teams in the selected edition (fetched dynamically)
  type EditionTeamOpt = { id: string; name: string };
  const [editionTeams, setEditionTeams] = useState<EditionTeamOpt[]>([]);
  const [editionTeamsLoading, setEditionTeamsLoading] = useState(false);

  const CATEGORY_LABEL: Record<string, string> = {
    amador: "Amador", terrao: "Terrão", clube_social: "Clube Social",
    profissional: "Profissional", base: "Base", junior: "Júnior",
    juvenil: "Juvenil", infantil: "Infantil", mirim: "Mirim",
    "pre-mirim": "Pré-Mirim", master: "Master", universitaria: "Universitária",
    rural: "Rural", "inter-municipal": "Inter-municipal",
  };

  const [athletes, setAthletes] = useState<AthleteTeamHistory[]>([]);
  const [rows, setRows] = useState<AthleteRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [tableLoading, setTableLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<ResultEntry[] | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Derived: championships for the selected league
  const leagueChampionships = selectedLeagueId
    ? championships.filter(c => c.league_id === selectedLeagueId)
    : championships;

  // The selected championship object (found by edition_id since selectedChampId now tracks edition)
  const selectedChampionship = championships.find(c => c.edition_id === selectedChampId) ?? null;

  // Category mismatch check
  const selectedTeam = teams.find(t => t.id === selectedTeamId) ?? null;
  const categoryMismatch = !!(selectedTeam && selectedChampionship?.level &&
    selectedTeam.category && selectedTeam.category !== selectedChampionship.level);

  // Load teams + leagues + championships on mount
  useEffect(() => {
    Promise.all([
      listTeams.execute().then(setTeams).catch(() => setTeams([])),
      listLeagues.execute().then(l => {
        const sorted = l.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        const visible = isLeagueAdmin ? sorted.filter(x => myLeagueIds.includes(x.id)) : sorted;
        setLeagues(visible);
        if (isLeagueAdmin && myLeagueIds.length === 1) {
          setSelectedLeagueId(myLeagueIds[0]);
        }
      }).catch(() => setLeagues([])),
      listChampionships
        .execute()
        .then((data) => setChampionships(data.filter((c) => c.edition_id)))
        .catch(() => setChampionships([])),
    ]).finally(() => setLoadingOptions(false));
  }, [listTeams, listLeagues, listChampionships]);

  // Fetch teams in the selected championship edition
  useEffect(() => {
    if (!selectedChampId) { setEditionTeams([]); return; }
    const champ = championships.find(c => c.edition_id === selectedChampId);
    if (!champ) { setEditionTeams([]); return; }
    setEditionTeamsLoading(true);
    fetch(`${API_BASE}/championships/${champ.id}/editions/${selectedChampId}/teams`)
      .then(r => r.json() as Promise<EditionTeamOpt[]>)
      .then(data => setEditionTeams(data.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))))
      .catch(() => setEditionTeams([]))
      .finally(() => setEditionTeamsLoading(false));
  }, [selectedChampId, championships]);

  // Load athletes when team changes
  useEffect(() => {
    if (!selectedTeamId) {
      setAthletes([]);
      setRows([]);
      setSelected(new Set());
      return;
    }
    getTeamAthletes
      .execute(selectedTeamId, false)
      .then((data) => setAthletes(data.filter((a) => a.is_active)))
      .catch(() => setAthletes([]));
  }, [selectedTeamId, getTeamAthletes]);

  const loadEditionData = useCallback(
    async (editionId: string, teamId: string, currentAthletes: AthleteTeamHistory[]) => {
      if (!teamId || !editionId || currentAthletes.length === 0) return;
      setTableLoading(true);
      setRows([]);
      setSelected(new Set());
      setResults(null);
      try {
        const [eligibleIds, registrations] = await Promise.all([
          getEligibleAthletes.execute(editionId, teamId),
          listEditionRegistrations.execute(editionId, teamId),
        ]);

        const eligibleSet = new Set(eligibleIds.map((id) => String(id)));
        const activeRegMap = new Map<string, AthleteChampionshipRegistration>();
        const withdrawnRegMap = new Map<string, AthleteChampionshipRegistration>();
        for (const r of registrations) {
          if (r.status === "withdrawn") withdrawnRegMap.set(r.athlete_id, r);
          else activeRegMap.set(r.athlete_id, r);
        }

        const newRows: AthleteRow[] = currentAthletes.map((a) => {
          const activeReg = activeRegMap.get(a.athlete_id) ?? null;
          const withdrawnReg = withdrawnRegMap.get(a.athlete_id) ?? null;
          let status: RowStatus;
          if (activeReg) status = "registered";
          else if (withdrawnReg) status = "withdrawn";
          else if (eligibleSet.has(a.athlete_id)) status = "eligible";
          else status = "ineligible";
          return {
            athleteId: a.athlete_id,
            name: a.athlete_name ?? a.athlete_id,
            position: a.athlete_position,
            jerseyNumber: a.jersey_number,
            status,
            registration: activeReg ?? withdrawnReg,
          };
        });

        const order: Record<RowStatus, number> = { registered: 0, eligible: 1, withdrawn: 2, ineligible: 3 };
        newRows.sort((a, b) => order[a.status] - order[b.status]);
        setRows(newRows);
        setSelected(new Set(newRows.filter((r) => r.status === "registered").map((r) => r.athleteId)));
      } catch {
        setRows([]);
      } finally {
        setTableLoading(false);
      }
    },
    [getEligibleAthletes, listEditionRegistrations],
  );

  // Reload table when either selection changes
  useEffect(() => {
    if (selectedTeamId && selectedEditionId && athletes.length > 0) {
      void loadEditionData(selectedEditionId, selectedTeamId, athletes);
    } else {
      setRows([]);
      setSelected(new Set());
    }
  }, [selectedTeamId, selectedEditionId, athletes, loadEditionData]);

  function toggleAthlete(athleteId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(athleteId)) next.delete(athleteId);
      else next.add(athleteId);
      return next;
    });
  }

  async function handleSubmit() {
    if (!selectedEditionId || !selectedTeamId) return;
    setSubmitting(true);
    setResults(null);

    const toRegister = rows.filter(
      (r) => (r.status === "eligible" || r.status === "withdrawn") && selected.has(r.athleteId),
    );
    const toUnregister = rows.filter(
      (r) => r.status === "registered" && !selected.has(r.athleteId),
    );

    if (toRegister.length === 0 && toUnregister.length === 0) {
      setSubmitting(false);
      return;
    }

    // Check match events for athletes about to be unregistered
    const eventsChecks = await Promise.allSettled(
      toUnregister.map((r) =>
        checkAthleteMatchEvents.execute(selectedEditionId, r.athleteId),
      ),
    );

    const canUnregister: typeof toUnregister = [];
    const blockedEntries: ResultEntry[] = [];
    eventsChecks.forEach((result, i) => {
      const row = toUnregister[i];
      if (result.status === "fulfilled" && result.value.has_events) {
        blockedEntries.push({
          athleteId: row.athleteId,
          name: row.name,
          action: "unregister",
          ok: false,
          error: `Não é possível desinscrever: atleta possui ${result.value.event_count} evento(s) em partidas desta competição.`,
        });
      } else {
        canUnregister.push(row);
      }
    });

    const [registerSettled, unregisterSettled] = await Promise.all([
      Promise.allSettled(
        toRegister.map((r) =>
          registerAthleteChampionship.execute(selectedEditionId, {
            athlete_id: r.athleteId,
            team_id: selectedTeamId,
          }),
        ),
      ),
      Promise.allSettled(
        canUnregister.map((r) =>
          updateChampionshipRegistration.execute(selectedEditionId, r.registration!.id, {
            status: "withdrawn",
          }),
        ),
      ),
    ]);

    const entries: ResultEntry[] = [
      ...blockedEntries,
      ...registerSettled.map((result, i) => {
        const row = toRegister[i];
        if (result.status === "fulfilled") return { athleteId: row.athleteId, name: row.name, action: "register" as const, ok: true as const };
        const err = result.reason instanceof Error ? result.reason.message : "Erro desconhecido";
        return { athleteId: row.athleteId, name: row.name, action: "register" as const, ok: false as const, error: err };
      }),
      ...unregisterSettled.map((result, i) => {
        const row = canUnregister[i];
        if (result.status === "fulfilled") return { athleteId: row.athleteId, name: row.name, action: "unregister" as const, ok: true as const };
        const err = result.reason instanceof Error ? result.reason.message : "Erro desconhecido";
        return { athleteId: row.athleteId, name: row.name, action: "unregister" as const, ok: false as const, error: err };
      }),
    ];

    setResults(entries);
    setSubmitting(false);
    void loadEditionData(selectedEditionId, selectedTeamId, athletes);
  }

  if (!isAdmin && !isLeagueAdmin) {
    return <div style={S.page}><div style={S.inner}><p style={{ color: "#f38ba8" }}>Acesso restrito a administradores.</p></div></div>;
  }

  const toRegisterRows = rows.filter(
    (r) => (r.status === "eligible" || r.status === "withdrawn") && selected.has(r.athleteId),
  );
  const toUnregisterRows = rows.filter(
    (r) => r.status === "registered" && !selected.has(r.athleteId),
  );
  const toRegisterCount = toRegisterRows.length;
  const toUnregisterCount = toUnregisterRows.length;
  const hasChanges = toRegisterCount > 0 || toUnregisterCount > 0;
  const hasTable = selectedTeamId && selectedEditionId;

  // Summary counts
  const registeredCount = rows.filter((r) => r.status === "registered").length;
  const eligibleCount = rows.filter((r) => r.status === "eligible").length;
  const withdrawnCount = rows.filter((r) => r.status === "withdrawn").length;

  return (
    <>
    <div style={S.page}>
      <div style={S.inner}>
      <h1 style={S.title}>Inscrições em Campeonatos</h1>
      <p style={S.subtitle}>Selecione a liga, o campeonato e o time para gerenciar inscrições.</p>

      {/* Selectors */}
      <div style={S.card}>
        {loadingOptions ? (
          <p style={{ color: "#ffffff", fontSize: "14px" }}>Carregando opções...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={S.row}>
              {/* Liga */}
              <div style={S.field}>
                <label style={S.label}>Liga</label>
                <select
                  style={{ ...S.select, ...(isLeagueAdmin ? { opacity: 0.7, cursor: "not-allowed" } : {}) }}
                  value={selectedLeagueId}
                  disabled={isLeagueAdmin}
                  onChange={(e) => {
                    setSelectedLeagueId(e.target.value);
                    setSelectedChampId("");
                    setSelectedTeamId("");
                    setSelectedEditionId("");
                  }}
                >
                  <option value="">— Selecione uma liga —</option>
                  {leagues.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              {/* Campeonato */}
              <div style={S.field}>
                <label style={S.label}>Campeonato</label>
                <select
                  style={{ ...S.select, opacity: !selectedLeagueId ? 0.5 : 1 }}
                  value={selectedChampId}
                  onChange={(e) => {
                    const editionId = e.target.value;
                    setSelectedChampId(editionId);
                    setSelectedEditionId(editionId);
                    setSelectedTeamId("");
                  }}
                  disabled={!selectedLeagueId}
                >
                  <option value="">— Selecione um campeonato —</option>
                  {leagueChampionships.map((c) => (
                    <option key={c.edition_id ?? c.id} value={c.edition_id ?? c.id}>
                      {c.nickname ?? c.name} {c.year}{c.division ? ` · ${c.division}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={S.row}>
              {/* Time */}
              <div style={S.field}>
                <label style={S.label}>Time</label>
                <select
                  style={{ ...S.select, opacity: !selectedChampId ? 0.5 : 1 }}
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  disabled={!selectedChampId}
                >
                  <option value="">— Selecione um time —</option>
                  {editionTeamsLoading
                    ? <option disabled>Carregando...</option>
                    : editionTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)
                  }
                </select>
              </div>
            </div>

            {/* Category mismatch warning */}
            {categoryMismatch && (
              <div style={S.mismatchBanner}>
                ⚠ Inconsistência: o time é da categoria <strong>{CATEGORY_LABEL[selectedTeam?.category ?? ""] ?? selectedTeam?.category}</strong>,
                mas o campeonato é de <strong>{CATEGORY_LABEL[selectedChampionship?.level ?? ""] ?? selectedChampionship?.level}</strong>.
                Corrija a seleção antes de inscrever.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      {hasTable && (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "15px", fontWeight: 600, color: "#cdd6f4" }}>
              Atletas
              {rows.length > 0 && (
                <span style={{ fontSize: "13px", fontWeight: 400, color: "#ffffff", marginLeft: "10px" }}>
                  {registeredCount > 0 && `${registeredCount} inscritos`}
                  {eligibleCount > 0 && `${registeredCount > 0 ? "  ·  " : ""}${eligibleCount} elegíveis`}
                  {withdrawnCount > 0 && `  ·  ${withdrawnCount} desativados`}
                </span>
              )}
            </span>
          </div>

          {tableLoading ? (
            <div style={S.loader}>Carregando dados...</div>
          ) : rows.length === 0 ? (
            <div style={S.empty}>
              {athletes.length === 0
                ? "Nenhum atleta ativo neste time."
                : "Nenhum atleta encontrado para esta combinação."}
            </div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={{ ...S.th, width: "40px" }}></th>
                  <th style={S.th}>Atleta</th>
                  <th style={S.th}>Posição</th>
                  <th style={{ ...S.th, width: "60px" }}>#</th>
                  <th style={S.th}>Nº Reg.</th>
                  <th style={S.th}>Situação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isIneligible = row.status === "ineligible";
                  const isChecked = selected.has(row.athleteId);
                  const pendingUnregister = row.status === "registered" && !isChecked;
                  const pendingRegister = (row.status === "eligible" || row.status === "withdrawn") && isChecked;
                  return (
                    <tr
                      key={row.athleteId}
                      style={{
                        opacity: isIneligible ? 0.45 : 1,
                        cursor: isIneligible ? "default" : "pointer",
                        background: pendingUnregister ? "rgba(243,139,168,0.06)" : pendingRegister ? "rgba(166,227,161,0.05)" : "transparent",
                      }}
                      onClick={() => !isIneligible && toggleAthlete(row.athleteId)}
                    >
                      <td style={S.td}>
                        <input
                          type="checkbox"
                          style={S.checkbox}
                          checked={isChecked}
                          disabled={isIneligible}
                          onChange={() => !isIneligible && toggleAthlete(row.athleteId)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td style={{ ...S.td, fontWeight: 500 }}>{row.name}</td>
                      <td style={{ ...S.td, color: "#ffffff" }}>{row.position ?? "—"}</td>
                      <td style={{ ...S.td, color: "#ffffff" }}>{row.jerseyNumber ?? "—"}</td>
                      <td style={{ ...S.td, color: "#ffffff", fontFamily: "monospace", fontSize: "12px" }}>
                        {row.registration?.registration_number ?? "—"}
                      </td>
                      <td style={S.td}>
                        {row.status === "registered" && row.registration ? (
                          <span style={badgeStyle(pendingUnregister ? "withdrawn" : row.registration.status)}>
                            {pendingUnregister
                              ? "Será desativado"
                              : row.registration.status === "approved"
                                ? "Inscrito ✓"
                                : row.registration.status === "rejected"
                                  ? "Rejeitado"
                                  : "Pendente"}
                          </span>
                        ) : row.status === "withdrawn" ? (
                          <span style={badgeStyle("withdrawn")}>
                            {isChecked ? "Será reativado ↑" : "Desativado"}
                          </span>
                        ) : row.status === "ineligible" ? (
                          <span style={{ color: "#ffffff", fontSize: "12px" }} title="Clube pode não estar filiado à liga ou o time não participa desta edição.">
                            Não elegível
                          </span>
                        ) : (
                          <span style={{ color: "#a6e3a1", fontSize: "12px" }}>
                            {isChecked ? "Será inscrito →" : "Elegível"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {!tableLoading && hasChanges && (
            <div style={{ marginTop: "20px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                style={submitting || categoryMismatch ? S.btnDisabled : S.btnPrimary}
                disabled={submitting || categoryMismatch}
                onClick={() => setConfirmOpen(true)}
              >
                {submitting
                  ? "Processando..."
                  : [
                      toRegisterCount > 0 && `Inscrever ${toRegisterCount}`,
                      toUnregisterCount > 0 && `Desinscrever ${toUnregisterCount}`,
                    ].filter(Boolean).join(" · ")}
              </button>
              {!submitting && (
                <span style={{ fontSize: "13px", color: "#ffffff" }}>
                  {[
                    toRegisterCount > 0 && `${toRegisterCount} para inscrever`,
                    toUnregisterCount > 0 && `${toUnregisterCount} para desinscrever`,
                  ].filter(Boolean).join(", ")}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {results && (
        <div style={S.card}>
          <p style={{ fontSize: "15px", fontWeight: 600, color: "#cdd6f4", margin: "0 0 12px" }}>Resultado</p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {results.map((r) => (
              <li
                key={`${r.athleteId}-${r.action}`}
                style={{ padding: "6px 0", borderBottom: "1px solid #313244", fontSize: "14px" }}
              >
                {r.ok ? (
                  <span style={S.resultOk}>
                    ✓ {r.name} — {r.action === "register" ? "inscrito com sucesso" : "desinscrito com sucesso"}
                  </span>
                ) : (
                  <span style={S.resultFail}>✗ {r.name} — {r.error}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      </div>
    </div>

        {confirmOpen && (
      <div
        style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
        onClick={() => setConfirmOpen(false)}
      >
        <div
          style={{ background: "#18265b", border: "1px solid #313244", borderRadius: "12px", padding: "1.75rem", width: "100%", maxWidth: "460px" }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{ margin: "0 0 1rem", color: "#cdd6f4", fontSize: "1.1rem" }}>Confirmar alterações</h3>

          {toRegisterRows.length > 0 && (
            <div style={{ marginBottom: "0.875rem" }}>
              <p style={{ margin: "0 0 0.4rem", color: "#a6e3a1", fontWeight: 600, fontSize: "0.9rem" }}>
                ✓ {toRegisterRows.length} atleta(s) serão inscritos:
              </p>
              <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "#cdd6f4", fontSize: "0.88rem" }}>
                {toRegisterRows.map((r) => <li key={r.athleteId}>{r.name}</li>)}
              </ul>
            </div>
          )}

          {toUnregisterRows.length > 0 && (
            <div style={{ marginBottom: "0.875rem" }}>
              <p style={{ margin: "0 0 0.4rem", color: "#f38ba8", fontWeight: 600, fontSize: "0.9rem" }}>
                ✗ {toUnregisterRows.length} atleta(s) serão desinscritos:
              </p>
              <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "#cdd6f4", fontSize: "0.88rem" }}>
                {toUnregisterRows.map((r) => <li key={r.athleteId}>{r.name}</li>)}
              </ul>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.25rem" }}>
            <button
              style={{ padding: "0.45rem 1rem", borderRadius: "6px", border: "1px solid #45475a", background: "none", color: "#cdd6f4", cursor: "pointer" }}
              onClick={() => setConfirmOpen(false)}
            >
              Cancelar
            </button>
            <button
              style={{ padding: "0.45rem 1.1rem", borderRadius: "6px", border: "none", background: "#89b4fa", color: "#18265b", fontWeight: 700, cursor: "pointer" }}
              onClick={() => { setConfirmOpen(false); void handleSubmit(); }}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
