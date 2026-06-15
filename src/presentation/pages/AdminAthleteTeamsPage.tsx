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
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner">
          <Link to="/admin/atletas" className="back-link">← Atletas</Link>
          <div className="hero__row">
            <h1 className="page-title">Histórico de Times</h1>
            <button className="btn btn-success" onClick={() => { setShowAdd(true); setAddError(null); }}>+ Adicionar ao time</button>
          </div>
        </div>
      </header>

      <main className="page-container">
        {loading && <p className="muted">Carregando…</p>}
        {error && <p className="error-text">{error}</p>}

        {!loading && !error && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th >Status</th>
                  <th >Time</th>
                  <th >Entrada</th>
                  <th >Saída</th>
                  <th >Camisa</th>
                  <th >Ações</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={6} className="muted">Nenhum vínculo encontrado.</td></tr>
                ) : (
                  history.map((h) => (
                    <tr key={h.id} >
                      <td ><div style={activeDotStyle(h.is_active)} /></td>
                      <td >{teamName(h.team_id)}</td>
                      <td className="td-muted">{fmtDate(h.start_date)}</td>
                      <td className="td-muted">
                        {h.is_active ? <span className="badge badge--success">Ativo</span> : fmtDate(h.end_date)}
                      </td>
                      <td className="td-muted">{h.jersey_number ?? "—"}</td>
                      <td >
                        {h.is_active && (
                          <button
                            className="btn btn-secondary"
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
        <div className="modal-overlay">
          <div className="modal-card">
            <h2 className="modal-title">Adicionar ao Time</h2>
            <form onSubmit={handleAdd} className="modal-body">
              <div className="form-field-group">
                <label className="form-label">Time *</label>
                <select className="form-select" value={addTeamId} onChange={(e) => setAddTeamId(e.target.value)} required>
                  <option value="">Selecionar time…</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="form-field-group--2">
                <div className="form-field-group">
                  <label className="form-label">Data entrada *</label>
                  <input type="date" className="form-input" value={addStart} onChange={(e) => setAddStart(e.target.value)} required />
                </div>
                <div className="form-field-group">
                  <label className="form-label">Data saída</label>
                  <input type="date" className="form-input" value={addEnd} onChange={(e) => setAddEnd(e.target.value)} />
                </div>
              </div>
              <div className="form-field-group--2">
                <div className="form-field-group">
                  <label className="form-label">Nº camisa</label>
                  <input type="number" className="form-input" value={addJersey} onChange={(e) => setAddJersey(e.target.value)} min={1} max={99} />
                </div>
                <div className="form-field-group">
                  <label className="form-label">Observação</label>
                  <input className="form-input" value={addNotes} onChange={(e) => setAddNotes(e.target.value)} placeholder="Ex: emprestado" />
                </div>
              </div>
              {addError && <p className="error-text">{addError}</p>}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancelar</button>
                <button type="submit" className="btn btn-success" disabled={addLoading}>{addLoading ? "Salvando…" : "Adicionar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Remove Modal ──────────────────────────────────────── */}
      {showRemove && removeEntry && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2 className="modal-title">Registrar Saída</h2>
            <p className="muted">Time: <strong style={{ color: "var(--c-text)" }}>{teamName(removeEntry.team_id)}</strong></p>
            <form onSubmit={handleRemove} className="modal-body">
              <div className="form-field-group">
                <label className="form-label">Data de saída *</label>
                <input type="date" className="form-input" value={removeDate} onChange={(e) => setRemoveDate(e.target.value)} required />
              </div>
              {removeError && <p className="error-text">{removeError}</p>}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRemove(false)}>Cancelar</button>
                <button type="submit" className="btn btn-success" disabled={removeLoading}>{removeLoading ? "Salvando…" : "Confirmar saída"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

