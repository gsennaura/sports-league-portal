import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import type { CreateCity } from "@application/use_cases/CreateCity";
import type { ListCities } from "@application/use_cases/ListCities";
import type { ListStates } from "@application/use_cases/ListStates";
import type { City } from "@domain/entities/City";
import type { State } from "@domain/entities/State";

interface Props {
  createCity: CreateCity;
  listCities: ListCities;
  listStates: ListStates;
}

export function AdminCitiesPage({ createCity, listCities, listStates }: Props) {
  const [cities, setCities] = useState<City[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [filterStateId, setFilterStateId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStateId, setNewStateId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [fetchedStates, fetchedCities] = await Promise.all([
        listStates.execute(),
        listCities.execute(),
      ]);
      const sortedStates = [...fetchedStates].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR")
      );
      const sortedCities = [...fetchedCities].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR")
      );
      setStates(sortedStates);
      setCities(sortedCities);
    } catch {
      setLoadError("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, [listCities, listStates]);

  useEffect(() => { void loadData(); }, [loadData]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);
    if (!newName.trim()) { setFormError("Nome é obrigatório."); return; }
    if (!newStateId) { setFormError("Estado é obrigatório."); return; }

    setSubmitting(true);
    try {
      const created = await createCity.execute({
        name: newName.trim(),
        state_id: newStateId,
      });
      setCities(prev =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
      );
      setSuccessMsg(`Cidade "${created.name}" criada com sucesso.`);
      setNewName("");
      setNewStateId("");
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao criar cidade.");
    } finally {
      setSubmitting(false);
    }
  }

  const stateMap = Object.fromEntries(states.map(s => [s.id, s]));
  const displayed = filterStateId
    ? cities.filter(c => c.state_id === filterStateId)
    : cities;

  return (
    <>
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner">
          <Link to="/admin" className="back-link">← Admin</Link>
          <div className="hero__row">
            <h1 className="page-title">Cidades</h1>
            <button
              style={{ ...S.btnPrimary, ...(showForm ? S.btnActive : {}) }}
              onClick={() => { setShowForm(f => !f); setFormError(null); setSuccessMsg(null); }}
            >
              {showForm ? "✕ Cancelar" : "+ Nova cidade"}
            </button>
          </div>
          <p className="page-subtitle">{cities.length} cidade{cities.length !== 1 ? "s" : ""} cadastrada{cities.length !== 1 ? "s" : ""}</p>
        </div>
      </header>

      <main className="page-container">

        {/* ── FORMULÁRIO INLINE ── */}
        {showForm && (
          <section className="card">
            <h2 className="section-heading">Nova cidade</h2>
            <form onSubmit={e => void handleCreate(e)} className="form-body">
              <div className="form-field-group">
                <label className="form-label">Nome *</label>
                <input
                  className="form-input"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ex: Uberlândia"
                  autoFocus
                />
              </div>
              <div className="form-field-group">
                <label className="form-label">Estado *</label>
                <select
                  className="form-select"
                  value={newStateId}
                  onChange={e => setNewStateId(e.target.value)}
                >
                  <option value="">Selecione o estado</option>
                  {states.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>
              {formError && <p className="error-text">{formError}</p>}
              <div className="form-actions">
                <button
                  type="submit"
                  style={{ ...S.btnPrimary, opacity: submitting ? 0.6 : 1 }}
                  disabled={submitting}
                >
                  {submitting ? "Salvando…" : "Salvar"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setShowForm(false); setFormError(null); }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </section>
        )}

        {successMsg && (
          <div className="form-success">✅ {successMsg}</div>
        )}

        {/* ── FILTRO ── */}
        <div className="filter-bar">
          <label className="form-label">Filtrar por estado</label>
          <select
            className="form-select" style={{ width: "220px" }}
            value={filterStateId}
            onChange={e => setFilterStateId(e.target.value)}
          >
            <option value="">Todos os estados</option>
            {states.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>
          {filterStateId && (
            <span className="page-info">{displayed.length} resultado{displayed.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        {/* ── LISTA ── */}
        {loading ? (
          <p className="status-chip">Carregando…</p>
        ) : loadError ? (
          <p className="error-text">{loadError}</p>
        ) : displayed.length === 0 ? (
          <div className="muted">
            <p className="muted">Nenhuma cidade encontrada.</p>
            {!filterStateId && (
              <p className="muted">Clique em "Nova cidade" para começar.</p>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th >Nome</th>
                  <th >Estado</th>
                  <th >UF</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((city, i) => {
                  const state = stateMap[city.state_id];
                  return (
                    <tr key={city.id} style={{ backgroundColor: i % 2 === 0 ? "var(--c-brand)" : "#18265b" }}>
                      <td >{city.name}</td>
                      <td style={{ color: "#ffffff" }}>{state?.name ?? "—"}</td>
                      <td >
                        {state ? (
                          <span className="badge">{state.code}</span>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: { backgroundColor: "#18265b", borderBottom: "1px solid #313244", position: "relative", overflow: "hidden" },
  heroAccent: { position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #cba6f7, #89b4fa)" },
  heroInner: { maxWidth: "900px", margin: "0 auto", padding: "1.5rem 1.5rem 1.25rem" },
  back: { display: "inline-block", color: "#89b4fa", textDecoration: "none", fontSize: "0.85rem", marginBottom: "0.75rem" },
  heroRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" },
  title: { fontSize: "1.5rem", fontWeight: 700, color: "#cdd6f4", margin: 0 },
  subtitle: { color: "#ffffff", fontSize: "0.875rem", margin: "0.25rem 0 0" },
  page: { maxWidth: "900px", margin: "0 auto", padding: "2rem 1.5rem 4rem" },

  formCard: {
    backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "10px",
    padding: "1.5rem", marginBottom: "1.5rem",
  },
  formTitle: { color: "#cdd6f4", fontSize: "1rem", fontWeight: 600, margin: "0 0 1rem" },
  form: { display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "0.35rem", flex: "1 1 200px" },
  label: { color: "#ffffff", fontSize: "0.8rem", fontWeight: 600 },
  input: {
    backgroundColor: "#313244", border: "1px solid #45475a", color: "#cdd6f4",
    borderRadius: "6px", padding: "0.5rem 0.75rem", fontSize: "0.9rem", outline: "none",
  },
  select: {
    backgroundColor: "#313244", border: "1px solid #45475a", color: "#cdd6f4",
    borderRadius: "6px", padding: "0.5rem 0.75rem", fontSize: "0.9rem", outline: "none",
  },
  formActions: { display: "flex", gap: "0.75rem", alignItems: "center", paddingTop: "1rem", width: "100%" },
  errorText: { color: "#f38ba8", fontSize: "0.85rem", margin: "0.25rem 0 0", width: "100%" },

  successBanner: {
    backgroundColor: "#1a3a2a", border: "1px solid #a6e3a1", color: "#a6e3a1",
    borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1.25rem", fontSize: "0.875rem",
  },

  filterBar: { display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1rem" },
  filterLabel: { color: "#ffffff", fontSize: "0.85rem" },
  filterCount: { color: "#ffffff", fontSize: "0.8rem" },

  tableWrap: { borderRadius: "8px", border: "1px solid #313244", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" },
  th: {
    padding: "0.65rem 0.9rem", textAlign: "left", color: "#ffffff", fontWeight: 600,
    backgroundColor: "#18265b", borderBottom: "1px solid #313244", whiteSpace: "nowrap",
  },
  td: { padding: "0.55rem 0.9rem", color: "#cdd6f4", verticalAlign: "middle" },
  badge: {
    backgroundColor: "#313244", color: "#cba6f7", fontSize: "0.75rem", fontWeight: 700,
    padding: "0.15rem 0.5rem", borderRadius: "4px",
  },

  statusText: { color: "#ffffff", padding: "2rem 0" },
  emptyState: { textAlign: "center", padding: "3rem 0" },
  emptyTitle: { color: "#ffffff", margin: "0 0 0.5rem" },
  emptyHint: { color: "#ffffff", fontSize: "0.85rem", margin: 0 },

  btnPrimary: {
    backgroundColor: "#cba6f7", color: "#18265b", border: "none",
    padding: "0.55rem 1.25rem", borderRadius: "8px", fontWeight: 700,
    cursor: "pointer", fontSize: "0.875rem",
  },
  btnActive: { backgroundColor: "#45475a", color: "#cdd6f4" },
  btnSecondary: {
    background: "none", border: "1px solid #45475a", color: "#cdd6f4",
    padding: "0.5rem 1rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.875rem",
  },
};
