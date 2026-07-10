import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@presentation/context/AuthContext";
import type { ListChampionships } from "@application/use_cases/ListChampionships";
import type { GetTeamAthletes } from "@application/use_cases/AthleteTeam";
import type { ListEditionRegistrations, GetEligibleAthletes, RegisterAthleteChampionship, UpdateChampionshipRegistration, CheckAthleteMatchEvents } from "@application/use_cases/ChampionshipRegistration";
import type { Championship } from "@domain/entities/Championship";
import type { AthleteTeamHistory, AthleteChampionshipRegistration } from "@domain/entities/Athlete";
import { API_BASE } from "@infrastructure/apiBase";

interface Props {
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
  page: { minHeight: "100vh", background: "#1e1e2e", color: "#cdd6f4" },
  inner: { maxWidth: "1100px", margin: "0 auto", padding: "32px 24px" },
  back: { color: "#89b4fa", textDecoration: "none", fontSize: "14px", display: "inline-block", marginBottom: "16px" },
  title: { fontSize: "22px", fontWeight: 700, color: "#cdd6f4", margin: "0 0 4px" },
  subtitle: { fontSize: "14px", color: "#a6adc8", margin: "0 0 24px" },
  card: { background: "#181825", borderRadius: "10px", padding: "20px", marginBottom: "20px" },
  label: { display: "block", fontSize: "13px", color: "#a6adc8", marginBottom: "6px" },
  select: { width: "100%", maxWidth: "480px", padding: "8px 12px", background: "#313244", color: "#cdd6f4", border: "1px solid #45475a", borderRadius: "6px", fontSize: "14px" },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: "14px" },
  th: { textAlign: "left" as const, padding: "10px 12px", color: "#a6adc8", borderBottom: "1px solid #313244", fontWeight: 600, fontSize: "12px", textTransform: "uppercase" as const },
  td: { padding: "10px 12px", borderBottom: "1px solid #313244", verticalAlign: "middle" as const },
  checkbox: { width: "16px", height: "16px", cursor: "pointer", accentColor: "#89b4fa" },
  btnPrimary: { padding: "10px 20px", background: "#89b4fa", color: "#1e1e2e", border: "none", borderRadius: "6px", fontWeight: 700, fontSize: "14px", cursor: "pointer" },
  btnDisabled: { padding: "10px 20px", background: "#45475a", color: "#6c7086", border: "none", borderRadius: "6px", fontWeight: 700, fontSize: "14px", cursor: "not-allowed" },
  loader: { textAlign: "center" as const, color: "#a6adc8", padding: "40px" },
  empty: { textAlign: "center" as const, color: "#6c7086", padding: "32px" },
  resultOk: { color: "#a6e3a1" },
  resultFail: { color: "#f38ba8" },
  selectAll: { fontSize: "12px", color: "#89b4fa", background: "none", border: "none", cursor: "pointer", padding: "4px 0" },
};

function badgeStyle(status: string): React.CSSProperties {
  if (status === "approved") return { display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, background: "#a6e3a1", color: "#1e1e2e" };
  if (status === "rejected") return { display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, background: "#f38ba8", color: "#1e1e2e" };
  if (status === "withdrawn") return { display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, background: "#45475a", color: "#cdd6f4" };
  return { display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, background: "#f9e2af", color: "#1e1e2e" };
}

export function AdminTeamBulkRegistrationPage({
  listChampionships,
  getTeamAthletes,
  listEditionRegistrations,
  getEligibleAthletes,
  registerAthleteChampionship,
  updateChampionshipRegistration,
  checkAthleteMatchEvents,
}: Props) {
  const { id: teamId } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();

  const [teamName, setTeamName] = useState<string>("");
  const [teamCategory, setTeamCategory] = useState<string | null>(null);
  const [teamLoading, setTeamLoading] = useState(true);

  const [leagues, setLeagues] = useState<{ id: string; name: string }[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState("");

  const [championships, setChampionships] = useState<Championship[]>([]);
  const [champsLoading, setChampsLoading] = useState(true);

  const [selectedEditionId, setSelectedEditionId] = useState("");
  const [editionLoading, setEditionLoading] = useState(false);

  const [athletes, setAthletes] = useState<AthleteTeamHistory[]>([]);
  const [rows, setRows] = useState<AthleteRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<ResultEntry[] | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Load team name and athletes and championships in parallel
  useEffect(() => {
    if (!teamId) return;

    const loadTeam = fetch(`${API_BASE}/teams/${teamId}`)
      .then((r) => r.json())
      .then((data: { name?: string; category?: string | null }) => {
        setTeamName(data.name ?? "");
        setTeamCategory(data.category ?? null);
      })
      .catch(() => {})
      .finally(() => setTeamLoading(false));

    const loadLeagues = fetch(`${API_BASE}/leagues?`)
      .then(r => r.json() as Promise<{ id: string; name: string }[]>)
      .then(data => setLeagues(data.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))))
      .catch(() => setLeagues([]));

    const loadAthletes = getTeamAthletes
      .execute(teamId, false)
      .then((data) => {
        setAthletes(data.filter((a) => a.is_active));
      })
      .catch(() => setAthletes([]));

    const loadChamps = listChampionships
      .execute()
      .then((data) => {
        setChampionships(data.filter((c) => c.edition_id));
      })
      .catch(() => setChampionships([]))
      .finally(() => setChampsLoading(false));

    void Promise.all([loadTeam, loadLeagues, loadAthletes, loadChamps]);
  }, [teamId, getTeamAthletes, listChampionships]);

  // Championships for the selected league that match the team's category
  const filteredChampionships = selectedLeagueId
    ? championships.filter(
        (c) => c.league_id === selectedLeagueId &&
               (teamCategory == null || c.level == null || c.level === teamCategory),
      )
    : [];

  const loadEditionData = useCallback(
    async (editionId: string) => {
      if (!teamId || !editionId) return;
      setEditionLoading(true);
      setRows([]);
      setSelected(new Set());
      setResults(null);
      try {
        const [eligibleIds, registrations] = await Promise.all([
          getEligibleAthletes.execute(editionId, teamId),
          listEditionRegistrations.execute(editionId, teamId),
        ]);

        const eligibleSet = new Set(eligibleIds.map((id) => String(id)));
        // Separate active from withdrawn registrations
        const activeRegMap = new Map<string, AthleteChampionshipRegistration>();
        const withdrawnRegMap = new Map<string, AthleteChampionshipRegistration>();
        for (const r of registrations) {
          if (r.status === "withdrawn") withdrawnRegMap.set(r.athlete_id, r);
          else activeRegMap.set(r.athlete_id, r);
        }

        const newRows: AthleteRow[] = athletes.map((a) => {
          const activeReg = activeRegMap.get(a.athlete_id) ?? null;
          const withdrawnReg = withdrawnRegMap.get(a.athlete_id) ?? null;
          let status: RowStatus;
          if (activeReg) {
            status = "registered";
          } else if (withdrawnReg) {
            status = "withdrawn";
          } else if (eligibleSet.has(a.athlete_id)) {
            status = "eligible";
          } else {
            status = "ineligible";
          }
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
        // Pre-select all currently active registered athletes (checked by default)
        setSelected(new Set(newRows.filter((r) => r.status === "registered").map((r) => r.athleteId)));
      } catch {
        setRows([]);
      } finally {
        setEditionLoading(false);
      }
    },
    [teamId, athletes, getEligibleAthletes, listEditionRegistrations],
  );

  useEffect(() => {
    if (selectedEditionId) {
      void loadEditionData(selectedEditionId);
    }
  }, [selectedEditionId, loadEditionData]);

  function toggleAthlete(athleteId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(athleteId)) {
        next.delete(athleteId);
      } else {
        next.add(athleteId);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    const actionable = rows.filter((r) => r.status !== "ineligible");
    const allInDesiredState = actionable.every((r) => {
      // "registered" rows should be checked; "eligible"/"withdrawn" rows default unchecked
      const defaultChecked = r.status === "registered";
      return selected.has(r.athleteId) === defaultChecked;
    });
    if (allInDesiredState) {
      // Select all actionable (check registered + eligible + withdrawn)
      setSelected(new Set(actionable.map((r) => r.athleteId)));
    } else {
      // Reset to default state (only registered checked)
      setSelected(new Set(rows.filter((r) => r.status === "registered").map((r) => r.athleteId)));
    }
  }

  async function handleSubmit() {
    if (!selectedEditionId) return;
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
            team_id: teamId!,
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
    void loadEditionData(selectedEditionId);
  }

  if (!isAdmin) {
    return (
      <div style={S.page}><div style={S.inner}>
        <p style={{ color: "#f38ba8" }}>Acesso restrito a administradores.</p>
      </div></div>
    );
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
  const hasEditionData = selectedEditionId && !editionLoading;

  return (
    <>
    <div style={S.page}>
      <div style={S.inner}>
      <Link to={`/admin/times/${teamId}/editar`} style={S.back}>
        ← Voltar para o time
      </Link>

      {teamLoading ? (
        <div style={S.loader}>Carregando...</div>
      ) : (
        <>
          <h1 style={S.title}>Inscrição em Lote — {teamName}</h1>
          <p style={S.subtitle}>Inscreva ou desinscreva atletas do elenco em uma edição de campeonato.</p>
        </>
      )}

      {/* Championship Selection — Liga → Campeonato */}
      <div style={S.card}>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          {/* Liga */}
          <div style={{ flex: "1 1 220px" }}>
            <label style={S.label}>Liga</label>
            <select
              style={S.select}
              value={selectedLeagueId}
              onChange={(e) => {
                setSelectedLeagueId(e.target.value);
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
          <div style={{ flex: "1 1 280px" }}>
            <label style={S.label}>
              Campeonato
              {teamCategory && (
                <span style={{ color: "#6c7086", fontWeight: 400, marginLeft: "6px" }}>
                  (categoria: <strong style={{ color: "#a6adc8" }}>{teamCategory}</strong>)
                </span>
              )}
            </label>
            {champsLoading ? (
              <p style={{ color: "#a6adc8", fontSize: "14px", margin: 0 }}>Carregando campeonatos...</p>
            ) : (
              <select
                style={{ ...S.select, opacity: !selectedLeagueId ? 0.5 : 1 }}
                value={selectedEditionId}
                onChange={(e) => setSelectedEditionId(e.target.value)}
                disabled={!selectedLeagueId}
              >
                <option value="">— Selecione um campeonato —</option>
                {filteredChampionships.map((c) => (
                  <option key={c.edition_id} value={c.edition_id!}>
                    {c.nickname ?? c.name} {c.year}{c.division ? ` · ${c.division}` : ""}
                  </option>
                ))}
                {selectedLeagueId && filteredChampionships.length === 0 && (
                  <option disabled>Nenhum campeonato compatível com a categoria do time</option>
                )}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Athletes Table */}
      {selectedEditionId && (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "15px", fontWeight: 600, color: "#cdd6f4" }}>
              Atletas do Elenco
            </span>
            {rows.filter((r) => r.status !== "ineligible").length > 0 && (
              <button style={S.selectAll} onClick={toggleSelectAll}>
                Selecionar/Restaurar padrão
              </button>
            )}
          </div>

          {editionLoading ? (
            <div style={S.loader}>Carregando dados da edição...</div>
          ) : rows.length === 0 ? (
            <div style={S.empty}>
              Nenhum atleta ativo encontrado neste time ou o time não participa desta edição.
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
                      <td style={{ ...S.td, color: "#a6adc8" }}>{row.position ?? "—"}</td>
                      <td style={{ ...S.td, color: "#a6adc8" }}>{row.jerseyNumber ?? "—"}</td>
                      <td style={{ ...S.td, color: "#a6adc8", fontFamily: "monospace", fontSize: "12px" }}>
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
                          <span
                            style={{ color: "#6c7086", fontSize: "12px" }}
                            title="Atleta não elegível: clube pode não estar filiado à liga ou o time não participa desta edição."
                          >
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

          {hasEditionData && hasChanges && (
            <div style={{ marginTop: "20px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                style={submitting ? S.btnDisabled : S.btnPrimary}
                disabled={submitting}
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
                <span style={{ fontSize: "13px", color: "#a6adc8" }}>
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
          <p style={{ fontSize: "15px", fontWeight: 600, color: "#cdd6f4", margin: "0 0 12px" }}>
            Resultado
          </p>
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
          style={{ background: "#1e1e2e", border: "1px solid #313244", borderRadius: "12px", padding: "1.75rem", width: "100%", maxWidth: "460px" }}
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
              style={{ padding: "0.45rem 1.1rem", borderRadius: "6px", border: "none", background: "#89b4fa", color: "#1e1e2e", fontWeight: 700, cursor: "pointer" }}
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
