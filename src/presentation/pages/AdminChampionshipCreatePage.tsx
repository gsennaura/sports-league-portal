import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { CreateChampionship } from "@application/use_cases/CreateChampionship";
import { API_BASE } from "@infrastructure/apiBase";
import { useAuth } from "@presentation/context/AuthContext";

interface City { id: string; name: string; }
interface Sport { id: string; name: string; }
interface LeagueOption { id: string; name: string; }

const SCOPE_OPTIONS = [
  { value: "local",    label: "Local" },
  { value: "regional", label: "Regional" },
  { value: "state",    label: "Estadual" },
  { value: "national", label: "Nacional" },
];

const LEVEL_OPTIONS = [
  { value: "amador",        label: "Amador" },
  { value: "profissional",  label: "Profissional" },
  { value: "clube_social",  label: "Clube Social" },
  { value: "terrao",        label: "Terrão" },
  { value: "junior",        label: "Júnior" },
  { value: "juvenil",       label: "Juvenil" },
  { value: "infantil",      label: "Infantil" },
  { value: "mirim",         label: "Mirim" },
  { value: "pre-mirim",     label: "Pré-Mirim" },
  { value: "universitario", label: "Universitário" },
  { value: "master",        label: "Master" },
];

const DIVISION_OPTIONS = [
  { value: "1ª divisão", label: "1ª Divisão" },
  { value: "2ª divisão", label: "2ª Divisão" },
  { value: "3ª divisão", label: "3ª Divisão" },
  { value: "4ª divisão", label: "4ª Divisão" },
];

interface Props { createChampionship: CreateChampionship; }

export function AdminChampionshipCreatePage({ createChampionship }: Props) {
  const navigate = useNavigate();
  const { isLeagueAdmin, leagueAdminProfiles } = useAuth();
  const myLeagueIds = leagueAdminProfiles.filter(p => p.is_active).map(p => p.league_id);

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [cityId, setCityId] = useState("");
  const [sportId, setSportId] = useState("");
  const [scope, setScope] = useState("local");
  const [level, setLevel] = useState("");
  const [leagueId, setLeagueId] = useState("");
  const [division, setDivision] = useState("");

  const [cities, setCities] = useState<City[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [leagues, setLeagues] = useState<LeagueOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/cities`).then(r => r.json() as Promise<City[]>),
      fetch(`${API_BASE}/sports`).then(r => r.ok ? r.json() as Promise<Sport[]> : Promise.resolve([])),
      fetch(`${API_BASE}/leagues?`).then(r => r.ok ? r.json() as Promise<LeagueOption[]> : Promise.resolve([])),
    ]).then(([cs, ss, ls]) => {
      setCities([...cs].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setSports([...ss].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      const allLeagues = [...ls].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      const visibleLeagues = isLeagueAdmin
        ? allLeagues.filter(l => myLeagueIds.includes(l.id))
        : allLeagues;
      setLeagues(visibleLeagues);
      if (isLeagueAdmin && myLeagueIds.length === 1) {
        setLeagueId(myLeagueIds[0]);
      }
    }).finally(() => setOptionsLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!leagueId) { setError("Liga é obrigatória."); return; }
    if (!name.trim()) { setError("Nome é obrigatório."); return; }
    if (!cityId) { setError("Cidade é obrigatória."); return; }
    if (!sportId) { setError("Esporte é obrigatório."); return; }

    setSubmitting(true);
    try {
      const championship = await createChampionship.execute({
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        city_id: cityId,
        sport_id: sportId,
        scope: scope || undefined,
        level: level || undefined,
        league_id: leagueId || undefined,
        division: division || undefined,
      });

      setSuccess(true);
      setTimeout(() => navigate(`/admin/campeonatos/${championship.id}/edicoes`), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner">
          <Link to="/admin/campeonatos" className="back-link">← Campeonatos</Link>
          <h1 className="page-title">Novo Campeonato</h1>
        </div>
      </header>
      <main className="page-container">
        <form onSubmit={handleSubmit} style={S.form} noValidate>

          {/* Liga vinculada — primeiro campo */}
          <fieldset style={S.fieldset}>
            <legend style={S.legend}>Liga *</legend>
            <div style={{ maxWidth: "420px" }}>
              <Field label="Liga" htmlFor="league">
                {optionsLoading ? (
                  <div style={{ ...S.input, color: "#cdd6f4" }}>Carregando...</div>
                ) : (
                  <select
                    id="league"
                    style={{ ...S.input, ...S.select, ...(isLeagueAdmin ? { opacity: 0.7, cursor: "not-allowed" } : {}) }}
                    value={leagueId}
                    onChange={e => !isLeagueAdmin && setLeagueId(e.target.value)}
                    disabled={isLeagueAdmin}
                    required
                  >
                    <option value="">Selecione a liga</option>
                    {leagues.map(lg => <option key={lg.id} value={lg.id}>{lg.name}</option>)}
                  </select>
                )}
              </Field>
            </div>
          </fieldset>

          {/* Identificação */}
          <fieldset style={S.fieldset}>
            <legend style={S.legend}>Identificação</legend>
            <div style={S.grid2}>
              <Field label="Nome do campeonato *" htmlFor="name">
                <input
                  id="name"
                  style={S.input}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Campeonato Amador 1ª Divisão"
                  required
                />
              </Field>
              <Field label="Apelido / nome curto" htmlFor="nickname">
                <input
                  id="nickname"
                  style={S.input}
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="Ex: Amador 2025"
                />
              </Field>
            </div>
          </fieldset>

          {/* Classificação */}
          <fieldset style={S.fieldset}>
            <legend style={S.legend}>Classificação</legend>
            <div style={S.grid3}>
              <Field label="Esporte *" htmlFor="sport">
                {optionsLoading ? (
                  <div style={{ ...S.input, color: "#cdd6f4" }}>Carregando...</div>
                ) : (
                  <select
                    id="sport"
                    style={{ ...S.input, ...S.select }}
                    value={sportId}
                    onChange={e => setSportId(e.target.value)}
                    required
                  >
                    <option value="">Selecione o esporte</option>
                    {sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
              </Field>
              <Field label="Nível" htmlFor="level">
                <select
                  id="level"
                  style={{ ...S.input, ...S.select }}
                  value={level}
                  onChange={e => setLevel(e.target.value)}
                >
                  <option value="">Sem nível definido</option>
                  {LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Divisão" htmlFor="division">
                <select
                  id="division"
                  style={{ ...S.input, ...S.select }}
                  value={division}
                  onChange={e => setDivision(e.target.value)}
                >
                  <option value="">Sem divisão definida</option>
                  {DIVISION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Abrangência" htmlFor="scope">
                <select
                  id="scope"
                  style={{ ...S.input, ...S.select }}
                  value={scope}
                  onChange={e => setScope(e.target.value)}
                >
                  {SCOPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
            </div>
          </fieldset>

          {/* Localização */}
          <fieldset style={S.fieldset}>
            <legend style={S.legend}>Localização</legend>
            <div style={{ maxWidth: "420px", marginTop: "1rem" }}>
              <Field label="Cidade *" htmlFor="city">
                {optionsLoading ? (
                  <div style={{ ...S.input, color: "#cdd6f4" }}>Carregando...</div>
                ) : (
                  <select
                    id="city"
                    style={{ ...S.input, ...S.select }}
                    value={cityId}
                    onChange={e => setCityId(e.target.value)}
                    required
                  >
                    <option value="">Selecione a cidade</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </Field>
            </div>
          </fieldset>

          {error && <p style={S.errorMsg}>{error}</p>}
          {success && <p style={S.successMsg}>✔ Campeonato criado! Redirecionando para edições...</p>}

          <div style={S.actions}>
            <Link to="/admin/campeonatos" style={S.btnCancel}>Cancelar</Link>
            <button type="submit" style={S.btnSubmit} disabled={submitting}>
              {submitting ? "Salvando..." : "Cadastrar campeonato"}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}

function Field({ label, htmlFor, children, style }: {
  label: string; htmlFor: string; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", ...style }}>
      <label htmlFor={htmlFor} className="form-label">{label}</label>
      {children}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: { backgroundColor: "#18265b", borderBottom: "1px solid #313244", position: "relative", overflow: "hidden" },
  heroAccent: { position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #cba6f7, #89b4fa)" },
  heroInner: { maxWidth: "900px", margin: "0 auto", padding: "1.5rem 1.5rem 1.25rem" },
  back: { display: "inline-block", color: "#89b4fa", textDecoration: "none", fontSize: "0.85rem", marginBottom: "0.75rem" },
  title: { fontSize: "1.5rem", fontWeight: 700, color: "#cdd6f4", margin: 0 },
  page: { maxWidth: "900px", margin: "0 auto", padding: "2rem 1.5rem 4rem" },
  form: { display: "flex", flexDirection: "column", gap: "1.5rem" },
  fieldset: { border: "1px solid #313244", borderRadius: "8px", padding: "1.25rem 1.5rem", margin: 0 },
  legend: { fontSize: "0.75rem", fontWeight: 700, color: "#cdd6f4", textTransform: "uppercase", letterSpacing: "0.07em", padding: "0 0.5rem" },
  legendOpt: { fontWeight: 400, color: "#cdd6f4", textTransform: "none", letterSpacing: "normal", fontSize: "0.7rem" },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginTop: "1rem" },
  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginTop: "1rem" },
  label: { fontSize: "0.83rem", fontWeight: 600, color: "#cdd6f4", textTransform: "uppercase", letterSpacing: "0.06em" },
  input: { backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "6px", color: "#cdd6f4", fontSize: "0.9rem", padding: "0.55rem 0.75rem", outline: "none", width: "100%", boxSizing: "border-box" },
  select: { cursor: "pointer", appearance: "auto" },
  errorMsg: { color: "#f38ba8", backgroundColor: "#2a1a1f", border: "1px solid #5a2a30", borderRadius: "6px", padding: "0.75rem 1rem", fontSize: "0.875rem" },
  successMsg: { color: "#a6e3a1", backgroundColor: "#1a2a1f", border: "1px solid #2a5a30", borderRadius: "6px", padding: "0.75rem 1rem", fontSize: "0.875rem" },
  actions: { display: "flex", justifyContent: "flex-end", gap: "0.75rem", paddingTop: "0.5rem" },
  btnCancel: { backgroundColor: "transparent", border: "1px solid #313244", borderRadius: "6px", color: "#cdd6f4", fontSize: "0.9rem", fontWeight: 500, padding: "0.6rem 1.25rem", textDecoration: "none", display: "inline-flex", alignItems: "center" },
  btnSubmit: { backgroundColor: "#cba6f7", border: "none", borderRadius: "6px", color: "#11111b", fontSize: "0.9rem", fontWeight: 700, padding: "0.6rem 1.5rem", cursor: "pointer" },
};
