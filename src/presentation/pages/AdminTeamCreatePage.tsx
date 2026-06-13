import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import type { CreateTeam } from "@application/use_cases/CreateTeam";
import type { CreateTeamPayload } from "@domain/repositories/TeamRepository";
import { API_BASE } from "@infrastructure/apiBase";
import { authHeaders } from "@infrastructure/authHeaders";
import { useAuth } from "@presentation/context/AuthContext";

const CATEGORY_OPTIONS = [
  { value: "amador", label: "Amador" },
  { value: "profissional", label: "Profissional" },
  { value: "base", label: "Base / Formação" },
  { value: "junior", label: "Júnior" },
  { value: "juvenil", label: "Juvenil" },
  { value: "infantil", label: "Infantil" },
  { value: "mirim", label: "Mirim" },
  { value: "pre-mirim", label: "Pré-Mirim" },
  { value: "master", label: "Master" },
  { value: "universitaria", label: "Universitária" },
  { value: "clube_social", label: "Clube Social" },
];

type Option = { id: string; name: string; nickname?: string | null };
type LeagueClub = { club_id: string; club_name: string };

interface Props {
  createTeam: CreateTeam;
}

export function AdminTeamCreatePage({ createTeam }: Props) {
  const navigate = useNavigate();
  const { isAdmin, isLeagueAdmin, leagueAdminProfiles } = useAuth();

  // Form fields
  const [name, setName] = useState("");
  const [sportId, setSportId] = useState("");
  const [cityId, setCityId] = useState("");
  const [clubId, setClubId] = useState("");
  const [category, setCategory] = useState("");
  const [leagueId, setLeagueId] = useState("");
  const [useClubName, setUseClubName] = useState(false);

  // Options
  const [sports, setSports] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);
  const [allLeagues, setAllLeagues] = useState<Option[]>([]);
  const [leagueClubs, setLeagueClubs] = useState<Option[]>([]);
  const [leagueClubsLoading, setLeagueClubsLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Load base options ──────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/sports`).then((r) => r.ok ? r.json() as Promise<Option[]> : []),
      fetch(`${API_BASE}/cities`).then((r) => r.ok ? r.json() as Promise<Option[]> : []),
      fetch(`${API_BASE}/leagues?`).then((r) => r.ok ? r.json() as Promise<Option[]> : []),
    ])
      .then(([sportsData, citiesData, leaguesData]) => {
        setSports((sportsData as Option[]).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
        setCities((citiesData as Option[]).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
        setAllLeagues((leaguesData as Option[]).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      })
      .catch(() => {})
      .finally(() => setLoadingOptions(false));
  }, []);

  // ── Derive visible leagues (reactive to auth profiles) ─────────────────────
  const myLeagueIds = new Set(leagueAdminProfiles.filter(p => p.is_active).map(p => p.league_id));
  const visibleLeagues = (isLeagueAdmin && !isAdmin)
    ? allLeagues.filter(l => myLeagueIds.has(l.id))
    : allLeagues;

  // ── Auto-select league for league admin with single league ──────────────────
  useEffect(() => {
    if (visibleLeagues.length === 1 && !leagueId) {
      setLeagueId(visibleLeagues[0].id);
    }
  }, [visibleLeagues]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── When league changes, load its clubs ────────────────────────────────────
  useEffect(() => {
    if (!leagueId) {
      setLeagueClubs([]);
      setClubId("");
      return;
    }
    setLeagueClubsLoading(true);
    setClubId("");
    fetch(`${API_BASE}/leagues/${leagueId}/clubs`)
      .then((r) => r.ok ? r.json() as Promise<LeagueClub[]> : [])
      .then((data) => {
        const mapped: Option[] = (data as LeagueClub[]).map(c => ({ id: c.club_id, name: c.club_name }));
        setLeagueClubs(mapped.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      })
      .catch(() => setLeagueClubs([]))
      .finally(() => setLeagueClubsLoading(false));
  }, [leagueId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !sportId || !cityId) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: CreateTeamPayload = {
        name: name.trim(),
        sport_id: sportId,
        city_id: cityId,
        ...(clubId ? { club_id: clubId } : {}),
        ...(category ? { category } : {}),
      };
      await createTeam.execute(payload);
      // Se clube + liga selecionados, registra clube na liga (ignora se já existir)
      if (clubId && leagueId) {
        await fetch(`${API_BASE}/leagues/${leagueId}/clubs`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ club_id: clubId }),
        });
        navigate(`/admin/ligas/${leagueId}/clubes`);
      } else {
        navigate("/admin/times");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const leagueIsLocked = isLeagueAdmin && !isAdmin && visibleLeagues.length === 1;

  return (
    <>
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner">
          <Link to="/admin/times" className="back-link">← Times</Link>
          <h1 className="page-title">Novo time</h1>
          <p className="page-subtitle">Cadastrar nova equipe</p>
        </div>
      </header>

      <main className="page-container">
        <form onSubmit={handleSubmit} className="form-body" noValidate>

          {error && (
            <div className="form-error">
              <span>⚠ {error}</span>
              <button type="button" className="error-banner__close" onClick={() => setError(null)}>×</button>
            </div>
          )}

          {/* ── 1. Liga vinculada ─────────────────────────────── */}
          <fieldset className="form-fieldset">
            <legend className="form-legend">Liga vinculada</legend>
            <p className="muted">
              Selecione a liga para filtrar os clubes disponíveis. Ao salvar, o clube será registrado nesta liga.
            </p>
            <div className="form-field-group">
              <label className="form-label" htmlFor="league">Liga</label>
              <select
                id="league"
                style={{ ...S.input, ...S.select, maxWidth: "420px", ...(leagueIsLocked ? S.inputLocked : {}) }}
                value={leagueId}
                onChange={(e) => setLeagueId(e.target.value)}
                disabled={loadingOptions || leagueIsLocked}
              >
                {!leagueIsLocked && <option value="">{loadingOptions ? "Carregando…" : "— Sem liga (opcional) —"}</option>}
                {visibleLeagues.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              {leagueIsLocked && (
                <span className="muted">Liga pré-definida pela sua conta de administrador.</span>
              )}
            </div>
          </fieldset>

          {/* ── 2. Clube vinculado ─────────────────────────────── */}
          <fieldset className="form-fieldset">
            <legend className="form-legend">Clube vinculado</legend>
            <p className="muted">
              {leagueId
                ? "Mostrando clubes afiliados à liga selecionada."
                : "Selecione uma liga para filtrar os clubes. Ou deixe sem clube para um time independente."}
            </p>
            <div className="form-field-group">
              <label className="form-label" htmlFor="club">Clube</label>
              <select
                id="club"
                className="form-select" style={{ maxWidth: "420px" }}
                value={clubId}
                onChange={(e) => {
                  const newClubId = e.target.value;
                  setClubId(newClubId);
                  if (useClubName) {
                    if (newClubId) {
                      const club = leagueClubs.find((c) => c.id === newClubId);
                      setName(club?.nickname ?? club?.name ?? "");
                    } else {
                      setName("");
                      setUseClubName(false);
                    }
                  }
                }}
                disabled={leagueClubsLoading}
              >
                <option value="">{leagueClubsLoading ? "Carregando…" : "— Nenhum clube (time independente) —"}</option>
                {leagueClubs.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {clubId && (
                <>
                  <label className="form-checkbox-label">
                    <input
                      type="checkbox"
                      checked={useClubName}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUseClubName(checked);
                        if (checked) {
                          const club = leagueClubs.find((c) => c.id === clubId);
                          setName(club?.nickname ?? club?.name ?? "");
                        }
                      }}
                      style={{ accentColor: "var(--c-link)", marginRight: "0.4rem" }}
                    />
                    Usar o mesmo nome do clube
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { setClubId(""); setUseClubName(false); }}
                  >
                    Remover vínculo
                  </button>
                </>
              )}
            </div>
          </fieldset>

          {/* ── 3. Categoria, Cidade e Esporte ────────────────── */}
          <fieldset className="form-fieldset">
            <legend className="form-legend">Detalhes</legend>
            <div className="form-field-group--3">
              <div className="form-field-group">
                <label className="form-label" htmlFor="category">Categoria</label>
                <select
                  id="category"
                  className="form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Sem categoria</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-field-group">
                <label className="form-label" htmlFor="city">
                  Cidade <span style={{ color: "var(--c-negative)" }}>*</span>
                </label>
                <select
                  id="city"
                  className="form-select"
                  value={cityId}
                  onChange={(e) => setCityId(e.target.value)}
                  required
                  disabled={loadingOptions}
                >
                  <option value="">{loadingOptions ? "Carregando…" : "Selecionar cidade"}</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-field-group">
                <label className="form-label" htmlFor="sport">
                  Esporte <span style={{ color: "var(--c-negative)" }}>*</span>
                </label>
                <select
                  id="sport"
                  className="form-select"
                  value={sportId}
                  onChange={(e) => setSportId(e.target.value)}
                  required
                  disabled={loadingOptions}
                >
                  <option value="">{loadingOptions ? "Carregando…" : "Selecionar esporte"}</option>
                  {sports.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          {/* ── 4. Nome do time ───────────────────────────────── */}
          <fieldset className="form-fieldset">
            <legend className="form-legend">Nome do time</legend>
            <div className="form-field-group">
              <label className="form-label" htmlFor="name">
                Nome do time <span style={{ color: "var(--c-negative)" }}>*</span>
              </label>
              <input
                id="name"
                style={{ ...S.input, ...(useClubName ? S.inputLocked : {}), maxWidth: "420px" }}
                type="text"
                placeholder="Ex: Uberaba Sport Club Principal"
                value={name}
                onChange={(e) => { if (!useClubName) setName(e.target.value); }}
                readOnly={useClubName}
                required
              />
            </div>
          </fieldset>

          {/* ── Actions ────────────────────────────────────────── */}
          <div className="form-actions">
            <button
              type="submit"
              style={{ ...S.btnSave, ...(submitting ? S.btnDisabled : {}) }}
              disabled={submitting || !name.trim() || !sportId || !cityId}
            >
              {submitting ? "Salvando…" : "Salvar time"}
            </button>
            <Link to="/admin/times" className="btn btn-secondary">Cancelar</Link>
          </div>
        </form>
      </main>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: { backgroundColor: "#18265b", borderBottom: "1px solid #313244", position: "relative", overflow: "hidden" },
  heroAccent: { position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #89b4fa, #a6e3a1)" },
  heroInner: { maxWidth: "860px", margin: "0 auto", padding: "1.5rem 1.5rem 1.25rem" },
  back: { display: "inline-block", color: "#89b4fa", textDecoration: "none", fontSize: "0.85rem", marginBottom: "0.75rem" },
  title: { fontSize: "1.5rem", fontWeight: 700, color: "#cdd6f4", margin: "0 0 0.2rem" },
  subtitle: { color: "#ffffff", fontSize: "0.875rem", margin: 0 },

  page: { maxWidth: "860px", margin: "0 auto", padding: "2rem 1.5rem 4rem" },
  form: { display: "flex", flexDirection: "column", gap: "1.25rem" },

  errorBanner: { display: "flex", alignItems: "center", justifyContent: "space-between", color: "#f38ba8", backgroundColor: "#2a1a1f", border: "1px solid #5a2a30", borderRadius: "6px", padding: "0.75rem 1rem", fontSize: "0.875rem" },
  errClose: { background: "none", border: "none", color: "#f38ba8", cursor: "pointer", fontSize: "1.2rem", padding: "0 0.25rem", lineHeight: 1 },

  fieldset: { border: "1px solid #313244", borderRadius: "10px", padding: "1.25rem 1.5rem", margin: 0 },
  legend: { color: "#cba6f7", fontSize: "0.84rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", padding: "0 0.5rem" },
  fieldHint: { color: "#ffffff", fontSize: "0.82rem", margin: "0 0 0.9rem", fontStyle: "italic" },
  fieldNote: { color: "#ffffff", fontSize: "0.78rem", marginTop: "0.3rem" },

  grid3: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "0.35rem" },
  label: { color: "#cdd6f4", fontSize: "0.825rem", fontWeight: 500 },
  required: { color: "#f38ba8" },
  input: { backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "6px", color: "#cdd6f4", fontSize: "0.875rem", padding: "0.5rem 0.75rem", outline: "none", boxSizing: "border-box", width: "100%" },
  inputLocked: { backgroundColor: "#18265b", color: "#ffffff", cursor: "default", borderColor: "#45475a" },
  checkLabel: { display: "flex", alignItems: "center", fontSize: "0.8rem", color: "#89b4fa", marginTop: "0.4rem", cursor: "pointer", userSelect: "none" },
  select: { cursor: "pointer", appearance: "auto" },
  clearBtn: { marginTop: "0.4rem", background: "none", border: "1px solid #5a2a30", borderRadius: "5px", color: "#f38ba8", fontSize: "0.78rem", padding: "0.25rem 0.7rem", cursor: "pointer", width: "fit-content" },

  actions: { display: "flex", alignItems: "center", gap: "1rem", paddingTop: "0.5rem" },
  btnSave: { backgroundColor: "#a6e3a1", border: "none", borderRadius: "7px", color: "#11111b", fontSize: "0.9rem", fontWeight: 700, padding: "0.6rem 1.5rem", cursor: "pointer" },
  btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
  btnCancel: { color: "#cdd6f4", textDecoration: "none", fontSize: "0.875rem" },
};

