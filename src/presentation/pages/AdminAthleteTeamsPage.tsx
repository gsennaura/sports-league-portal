import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import type { GetAthleteTeamHistory, AddAthleteToTeam, RemoveAthleteFromTeam } from "@application/use_cases/AthleteTeam";
import type { AthleteTeamHistory } from "@domain/entities/Athlete";
import { API_BASE } from "@infrastructure/apiBase";

interface OptionItem { id: string; name: string; }

interface Props {
  getAthleteTeamHistory: GetAthleteTeamHistory;
  addAthleteToTeam: AddAthleteToTeam;
  removeAthleteFromTeam: RemoveAthleteFromTeam;
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
}

function activeDotStyle(active: boolean): React.CSSProperties {
  return {
    width: 8, height: 8, borderRadius: "50%",
    backgroundColor: active ? "#a6e3a1" : "#45475a",
    flexShrink: 0,
  };
}

export function AdminAthleteTeamsPage({ getAthleteTeamHistory, addAthleteToTeam, removeAthleteFromTeam }: Props) {
  const { id: athleteId } = useParams<{ id: string }>();

  const [history, setHistory] = useState<AthleteTeamHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<OptionItem[]>([]);

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [addTeamId, setAddTeamId] = useState("");
  const [addStart, setAddStart] = useState("");
  const [addEnd, setAddEnd] = useState("");
  const [addJersey, setAddJersey] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Remove modal
  const [showRemove, setShowRemove] = useState(false);
  const [removeEntry, setRemoveEntry] = useState<AthleteTeamHistory | null>(null);
  const [removeDate, setRemoveDate] = useState("");
  const [removeLoading, setRemoveLoading] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  useEffect(() => {
    if (!athleteId) return;
    Promise.all([
      getAthleteTeamHistory.execute(athleteId),
      fetch(`${API_BASE}/teams`).then((r) => r.json() as Promise<OptionItem[]>),
    ])
      .then(([hist, ts]) => {
        setHistory(hist.sort((a, b) => b.start_date.localeCompare(a.start_date)));
        setTeams(ts.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [athleteId]);

  const teamName = (tid: string) => teams.find((t) => t.id === tid)?.name ?? tid.slice(0, 8) + "…";

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addTeamId || !addStart || !athleteId) { setAddError("Time e data de entrada são obrigatórios."); return; }
    setAddLoading(true);
    setAddError(null);
    try {
      const entry = await addAthleteToTeam.execute(athleteId, {
        team_id: addTeamId,
        start_date: addStart,
        end_date: addEnd || undefined,
        jersey_number: addJersey ? parseInt(addJersey) : undefined,
        notes: addNotes || undefined,
      });
      setHistory((prev) => [entry, ...prev].sort((a, b) => b.start_date.localeCompare(a.start_date)));
      setShowAdd(false);
      setAddTeamId(""); setAddStart(""); setAddEnd(""); setAddJersey(""); setAddNotes("");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Erro ao adicionar.");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleRemove(e: React.FormEvent) {
    e.preventDefault();
    if (!removeEntry || !removeDate || !athleteId) { setRemoveError("Data de saída é obrigatória."); return; }
    setRemoveLoading(true);
    setRemoveError(null);
    try {
      const updated = await removeAthleteFromTeam.execute(athleteId, removeEntry.id, removeDate);
      setHistory((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
      setShowRemove(false);
      setRemoveEntry(null);
      setRemoveDate("");
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "Erro ao registrar saída.");
    } finally {
      setRemoveLoading(false);
    }
  }

  return (
    <>
      <header style={S.hero}>
        <div style={S.heroAccent} />
        <div style={S.heroInner}>
          <Link to="/admin/atletas" style={S.back}>← Atletas</Link>
          <div style={S.heroRow}>
            <h1 style={S.title}>Histórico de Times</h1>
            <button style={S.btnAdd} onClick={() => { setShowAdd(true); setAddError(null); }}>+ Adicionar ao time</button>
          </div>
        </div>
      </header>

      <main style={S.page}>
        {loading && <p style={S.hint}>Carregando…</p>}
        {error && <p style={S.errorTxt}>{error}</p>}

        {!loading && !error && (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Time</th>
                  <th style={S.th}>Entrada</th>
                  <th style={S.th}>Saída</th>
                  <th style={S.th}>Camisa</th>
                  <th style={S.th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={6} style={S.empty}>Nenhum vínculo encontrado.</td></tr>
                ) : (
                  history.map((h) => (
                    <tr key={h.id} style={S.trRow}>
                      <td style={S.td}><div style={activeDotStyle(h.is_active)} /></td>
                      <td style={S.td}>{teamName(h.team_id)}</td>
                      <td style={S.tdMuted}>{fmtDate(h.start_date)}</td>
                      <td style={S.tdMuted}>
                        {h.is_active ? <span style={S.activeBadge}>Ativo</span> : fmtDate(h.end_date)}
                      </td>
                      <td style={S.tdMuted}>{h.jersey_number ?? "—"}</td>
                      <td style={S.td}>
                        {h.is_active && (
                          <button
                            style={S.btnExit}
                            onClick={() => { setRemoveEntry(h); setRemoveDate(""); setRemoveError(null); setShowRemove(true); }}
                          >
                            Registrar saída
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* ── Add Modal ─────────────────────────────────────────── */}
      {showAdd && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <h2 style={S.modalTitle}>Adicionar ao Time</h2>
            <form onSubmit={handleAdd} style={S.modalForm}>
              <div style={S.fGroup}>
                <label style={S.fLabel}>Time *</label>
                <select style={{ ...S.input, ...S.select }} value={addTeamId} onChange={(e) => setAddTeamId(e.target.value)} required>
                  <option value="">Selecionar time…</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div style={S.grid2m}>
                <div style={S.fGroup}>
                  <label style={S.fLabel}>Data entrada *</label>
                  <input type="date" style={S.input} value={addStart} onChange={(e) => setAddStart(e.target.value)} required />
                </div>
                <div style={S.fGroup}>
                  <label style={S.fLabel}>Data saída</label>
                  <input type="date" style={S.input} value={addEnd} onChange={(e) => setAddEnd(e.target.value)} />
                </div>
              </div>
              <div style={S.grid2m}>
                <div style={S.fGroup}>
                  <label style={S.fLabel}>Nº camisa</label>
                  <input type="number" style={S.input} value={addJersey} onChange={(e) => setAddJersey(e.target.value)} min={1} max={99} />
                </div>
                <div style={S.fGroup}>
                  <label style={S.fLabel}>Observação</label>
                  <input style={S.input} value={addNotes} onChange={(e) => setAddNotes(e.target.value)} placeholder="Ex: emprestado" />
                </div>
              </div>
              {addError && <p style={S.mError}>{addError}</p>}
              <div style={S.modalActions}>
                <button type="button" style={S.btnMCancel} onClick={() => setShowAdd(false)}>Cancelar</button>
                <button type="submit" style={S.btnMConfirm} disabled={addLoading}>{addLoading ? "Salvando…" : "Adicionar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Remove Modal ──────────────────────────────────────── */}
      {showRemove && removeEntry && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <h2 style={S.modalTitle}>Registrar Saída</h2>
            <p style={S.modalSub}>Time: <strong style={{ color: "#cdd6f4" }}>{teamName(removeEntry.team_id)}</strong></p>
            <form onSubmit={handleRemove} style={S.modalForm}>
              <div style={S.fGroup}>
                <label style={S.fLabel}>Data de saída *</label>
                <input type="date" style={S.input} value={removeDate} onChange={(e) => setRemoveDate(e.target.value)} required />
              </div>
              {removeError && <p style={S.mError}>{removeError}</p>}
              <div style={S.modalActions}>
                <button type="button" style={S.btnMCancel} onClick={() => setShowRemove(false)}>Cancelar</button>
                <button type="submit" style={S.btnMConfirm} disabled={removeLoading}>{removeLoading ? "Salvando…" : "Confirmar saída"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: { backgroundColor: "#181825", borderBottom: "1px solid #313244", position: "relative", overflow: "hidden" },
  heroAccent: { position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #a6e3a1, #89b4fa)" },
  heroInner: { maxWidth: "1000px", margin: "0 auto", padding: "1.5rem 1.5rem 1.25rem" },
  heroRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" },
  back: { display: "inline-block", color: "#89b4fa", textDecoration: "none", fontSize: "0.85rem", marginBottom: "0.75rem" },
  title: { fontSize: "1.5rem", fontWeight: 700, color: "#cdd6f4", margin: 0 },
  btnAdd: { backgroundColor: "#a6e3a1", border: "none", borderRadius: "6px", color: "#11111b", fontWeight: 700, fontSize: "0.875rem", padding: "0.5rem 1.1rem", cursor: "pointer", whiteSpace: "nowrap" },
  page: { maxWidth: "1000px", margin: "0 auto", padding: "2rem 1.5rem 4rem" },
  hint: { color: "#6c7086" },
  errorTxt: { color: "#f38ba8" },
  tableWrap: { overflowX: "auto", borderRadius: "8px", border: "1px solid #313244" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" },
  th: { backgroundColor: "#181825", color: "#cdd6f4", fontWeight: 600, fontSize: "0.84rem", textAlign: "left", padding: "0.75rem 1rem", borderBottom: "1px solid #313244" },
  trRow: { borderBottom: "1px solid #1e1e2e" },
  td: { padding: "0.65rem 1rem", color: "#cdd6f4", verticalAlign: "middle" },
  tdMuted: { padding: "0.65rem 1rem", color: "#6c7086", fontSize: "0.85rem", verticalAlign: "middle" },
  activeBadge: { fontSize: "0.72rem", fontWeight: 700, backgroundColor: "#a6e3a1", color: "#1e1e2e", borderRadius: "4px", padding: "0.1rem 0.45rem" },
  btnExit: { fontSize: "0.78rem", backgroundColor: "#45475a", border: "none", borderRadius: "5px", color: "#cdd6f4", padding: "0.2rem 0.7rem", cursor: "pointer" },
  empty: { padding: "1.5rem", color: "#6c7086", textAlign: "center" },
  // Modal
  overlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 },
  modal: { backgroundColor: "#1e1e2e", border: "1px solid #313244", borderRadius: "10px", padding: "1.75rem 2rem", width: "100%", maxWidth: "440px", boxSizing: "border-box" },
  modalTitle: { fontSize: "1.1rem", fontWeight: 700, color: "#cdd6f4", margin: "0 0 1rem" },
  modalSub: { fontSize: "0.875rem", color: "#6c7086", margin: "0 0 1rem" },
  modalForm: { display: "flex", flexDirection: "column", gap: "1rem" },
  fGroup: { display: "flex", flexDirection: "column", gap: "0.3rem" },
  fLabel: { fontSize: "0.83rem", fontWeight: 600, color: "#cdd6f4", textTransform: "uppercase", letterSpacing: "0.06em" },
  input: { backgroundColor: "#181825", border: "1px solid #313244", borderRadius: "6px", color: "#cdd6f4", fontSize: "0.9rem", padding: "0.55rem 0.75rem", outline: "none", width: "100%", boxSizing: "border-box" },
  select: { cursor: "pointer", appearance: "auto" },
  grid2m: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" },
  mError: { color: "#f38ba8", fontSize: "0.85rem", margin: 0 },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: "0.6rem", paddingTop: "0.25rem" },
  btnMCancel: { backgroundColor: "transparent", border: "1px solid #313244", borderRadius: "6px", color: "#cdd6f4", fontSize: "0.875rem", padding: "0.5rem 1rem", cursor: "pointer" },
  btnMConfirm: { backgroundColor: "#89b4fa", border: "none", borderRadius: "6px", color: "#11111b", fontWeight: 700, fontSize: "0.875rem", padding: "0.5rem 1.1rem", cursor: "pointer" },
};
