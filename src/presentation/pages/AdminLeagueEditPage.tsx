import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import type { UpdateLeague } from "@application/use_cases/UpdateLeague";
import type { League } from "@domain/entities/League";
import { API_BASE } from "@infrastructure/apiBase";
import { authHeaders } from "@infrastructure/authHeaders";

interface City { id: string; name: string; }
interface LeagueOption { id: string; name: string; }

interface Props { updateLeague: UpdateLeague; }

export function AdminLeagueEditPage({ updateLeague }: Props) {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const initialLeague = (location.state as { league?: League } | null)?.league ?? null;

  const [name, setName] = useState(initialLeague?.name ?? "");
  const [shortName, setShortName] = useState(initialLeague?.short_name ?? "");
  const [cityId, setCityId] = useState(initialLeague?.city_id ?? "");
  const [isFederated, setIsFederated] = useState(initialLeague?.is_federated ?? false);
  const [address, setAddress] = useState(initialLeague?.address ?? "");
  const [president, setPresident] = useState(initialLeague?.president ?? "");
  const [website, setWebsite] = useState(initialLeague?.website ?? "");
  const [foundedYear, setFoundedYear] = useState(initialLeague?.founded_year?.toString() ?? "");
  const [parentLeagueId, setParentLeagueId] = useState(initialLeague?.parent_league_id ?? "");

  const [cities, setCities] = useState<City[]>([]);
  const [leagues, setLeagues] = useState<LeagueOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [loadingLeague, setLoadingLeague] = useState(!initialLeague);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [logoFile,    setLogoFile]    = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(initialLeague?.logo_url ?? null);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/cities`).then(r => r.json() as Promise<City[]>),
      fetch(`${API_BASE}/leagues?`).then(r => r.ok ? r.json() as Promise<LeagueOption[]> : Promise.resolve([])),
    ]).then(([cs, ls]) => {
      setCities([...cs].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setLeagues([...ls].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
    }).finally(() => setOptionsLoading(false));
  }, []);

  // Fallback: busca a liga da API se não veio pelo router state
  useEffect(() => {
    if (initialLeague || !id) return;
    fetch(`${API_BASE}/leagues/${id}`)
      .then(r => {
        if (!r.ok) throw new Error("Liga não encontrada.");
        return r.json() as Promise<League>;
      })
      .then(lg => {
        setName(lg.name);
        setShortName(lg.short_name);
        setCityId(lg.city_id);
        setIsFederated(lg.is_federated);
        setAddress(lg.address ?? "");
        setPresident(lg.president ?? "");
        setWebsite(lg.website ?? "");
        setFoundedYear(lg.founded_year?.toString() ?? "");
        setParentLeagueId(lg.parent_league_id ?? "");
        setLogoPreview(lg.logo_url ?? null);
      })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoadingLeague(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Nome é obrigatório."); return; }
    if (!shortName.trim()) { setError("Sigla é obrigatória."); return; }
    if (!cityId) { setError("Cidade é obrigatória."); return; }
    if (!id) return;

    setSubmitting(true);
    try {
      await updateLeague.execute({
        id,
        name: name.trim(),
        short_name: shortName.trim(),
        city_id: cityId,
        is_federated: isFederated,
        address: address.trim() || undefined,
        president: president.trim() || undefined,
        website: website.trim() || undefined,
        founded_year: foundedYear ? parseInt(foundedYear, 10) : undefined,
        parent_league_id: parentLeagueId || undefined,
      });
      if (logoFile) {
        const fd = new FormData();
        fd.append("file", logoFile);
        const res = await fetch(`${API_BASE}/leagues/${id}/photo`, {
          method: "POST",
          headers: authHeaders(),
          body: fd,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({})) as { detail?: string };
          throw new Error(`Liga atualizada, mas erro no upload da logo: ${err.detail ?? res.status}`);
        }
      }
      setSuccess(true);
      setTimeout(() => navigate("/admin/ligas"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingLeague) {
    return <main style={{ padding: "2rem 1.5rem", color: "var(--c-text)" }}>Carregando...</main>;
  }

  return (
    <>
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner">
          <Link to="/admin/ligas" className="back-link">← Ligas</Link>
          <h1 className="page-title">Editar Liga</h1>
        </div>
      </header>
      <main className="page-container">
        <form onSubmit={handleSubmit} className="form-body" noValidate>
          <fieldset className="form-fieldset">
            <legend className="form-legend">Informações básicas</legend>
            <div className="form-field-group--2">
              <Field label="Nome da liga *" htmlFor="name">
                <input
                  id="name"
                  className="form-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </Field>
              <Field label="Sigla *" htmlFor="short_name">
                <input
                  id="short_name"
                  className="form-input"
                  value={shortName}
                  onChange={e => setShortName(e.target.value)}
                  required
                />
              </Field>
            </div>
            <div className="form-field-group--2">
              <Field label="Cidade *" htmlFor="city">
                {optionsLoading ? (
                  <div className="form-input" style={{ color: "var(--c-text)" }}>Carregando...</div>
                ) : (
                  <select
                    id="city"
                    className="form-select"
                    value={cityId}
                    onChange={e => setCityId(e.target.value)}
                    required
                  >
                    <option value="">Selecione a cidade</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </Field>
              <Field label="É federada?" htmlFor="is_federated" style={{ justifyContent: "flex-end" }}>
                <label className="form-checkbox-label">
                  <input
                    id="is_federated"
                    type="checkbox"
                    checked={isFederated}
                    onChange={e => setIsFederated(e.target.checked)}
                    className="form-checkbox"
                  />
                  Liga federada
                </label>
              </Field>
            </div>
          </fieldset>

          <fieldset className="form-fieldset">
            <legend className="form-legend">Detalhes <span className="form-legend">(opcional)</span></legend>
            <div className="form-field-group--2">
              <Field label="Presidente" htmlFor="president">
                <input
                  id="president"
                  className="form-input"
                  value={president}
                  onChange={e => setPresident(e.target.value)}
                />
              </Field>
              <Field label="Ano de fundação" htmlFor="founded_year">
                <input
                  id="founded_year"
                  type="number"
                  className="form-input"
                  value={foundedYear}
                  onChange={e => setFoundedYear(e.target.value)}
                  min={1800}
                  max={new Date().getFullYear()}
                />
              </Field>
            </div>
            <div className="form-field-group--2">
              <Field label="Endereço" htmlFor="address">
                <input
                  id="address"
                  className="form-input"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </Field>
              <Field label="Website" htmlFor="website">
                <input
                  id="website"
                  type="url"
                  className="form-input"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="https://"
                />
              </Field>
            </div>
            <div style={{ ...S.grid2, marginTop: "1rem" }}>
              <Field label="Liga pai" htmlFor="parent_league">
                {optionsLoading ? (
                  <div className="form-input" style={{ color: "var(--c-text)" }}>Carregando...</div>
                ) : (
                  <select
                    id="parent_league"
                    className="form-select"
                    value={parentLeagueId}
                    onChange={e => setParentLeagueId(e.target.value)}
                  >
                    <option value="">Sem liga pai</option>
                    {leagues
                      .filter(lg => lg.id !== id)
                      .map(lg => <option key={lg.id} value={lg.id}>{lg.name}</option>)}
                  </select>
                )}
              </Field>
              <Field label="Logo" htmlFor="league-logo">
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {logoPreview
                    ? <img src={logoPreview} alt="preview" className="avatar" />
                    : <div className="avatar-placeholder">🏆</div>
                  }
                  <div>
                    <label htmlFor="league-logo" className="btn btn-secondary">
                      {logoPreview ? "Trocar logo" : "Escolher logo"}
                    </label>
                    {logoFile && (
                      <p style={{ margin: "0.3rem 0 0", fontSize: "0.78rem", color: "#ffffff" }}>{logoFile.name}</p>
                    )}
                  </div>
                  <input
                    id="league-logo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    style={{ display: "none" }}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); }
                    }}
                  />
                </div>
              </Field>
            </div>
          </fieldset>

          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">✔ Liga atualizada! Redirecionando...</p>}

          <div className="form-actions">
            <Link to="/admin/ligas" className="btn btn-secondary">Cancelar</Link>
            <Link to={`/admin/ligas/${id}/clubes`} style={{ ...S.btnCancel, background: "var(--c-border)", color: "var(--c-link)", borderColor: "#89b4fa" }}>
              Clubes Filiados
            </Link>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar alterações"}
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
  heroInner: { maxWidth: "800px", margin: "0 auto", padding: "1.5rem 1.5rem 1.25rem" },
  back: { display: "inline-block", color: "#89b4fa", textDecoration: "none", fontSize: "0.85rem", marginBottom: "0.75rem" },
  title: { fontSize: "1.5rem", fontWeight: 700, color: "#cdd6f4", margin: 0 },
  page: { maxWidth: "800px", margin: "0 auto", padding: "2rem 1.5rem 4rem" },
  form: { display: "flex", flexDirection: "column", gap: "1.5rem" },
  fieldset: { border: "1px solid #313244", borderRadius: "8px", padding: "1.25rem 1.5rem", margin: 0 },
  legend: { fontSize: "0.84rem", fontWeight: 700, color: "#cdd6f4", textTransform: "uppercase", letterSpacing: "0.07em", padding: "0 0.5rem" },
  legendOpt: { fontWeight: 400, color: "#cdd6f4", textTransform: "none", letterSpacing: "normal", fontSize: "0.8rem" },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginTop: "1rem" },
  label: { fontSize: "0.83rem", fontWeight: 600, color: "#cdd6f4", textTransform: "uppercase", letterSpacing: "0.06em" },
  input: { backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "6px", color: "#cdd6f4", fontSize: "0.9rem", padding: "0.55rem 0.75rem", outline: "none", width: "100%", boxSizing: "border-box" },
  select: { cursor: "pointer", appearance: "auto" },
  checkboxLabel: { display: "flex", alignItems: "center", gap: "0.5rem", color: "#cdd6f4", fontSize: "0.9rem", cursor: "pointer", paddingTop: "0.25rem" },
  checkbox: { width: "1rem", height: "1rem", cursor: "pointer", accentColor: "#cba6f7" },
  errorMsg: { color: "#f38ba8", backgroundColor: "#2a1a1f", border: "1px solid #5a2a30", borderRadius: "6px", padding: "0.75rem 1rem", fontSize: "0.875rem" },
  successMsg: { color: "#a6e3a1", backgroundColor: "#1a2a1f", border: "1px solid #2a5a30", borderRadius: "6px", padding: "0.75rem 1rem", fontSize: "0.875rem" },
  actions: { display: "flex", justifyContent: "flex-end", gap: "0.75rem", paddingTop: "0.5rem" },
  btnCancel: { backgroundColor: "transparent", border: "1px solid #313244", borderRadius: "6px", color: "#cdd6f4", fontSize: "0.9rem", fontWeight: 500, padding: "0.6rem 1.25rem", textDecoration: "none", display: "inline-flex", alignItems: "center" },
  btnSubmit: { backgroundColor: "#cba6f7", border: "none", borderRadius: "6px", color: "#11111b", fontSize: "0.9rem", fontWeight: 700, padding: "0.6rem 1.5rem", cursor: "pointer" },
  btnUpload: { backgroundColor: "#313244", border: "1px solid #45475a", borderRadius: "6px", color: "#cdd6f4", fontSize: "0.82rem", fontWeight: 600, padding: "0.4rem 0.85rem", cursor: "pointer", display: "inline-block", userSelect: "none" as const },
  photoThumb: { width: 52, height: 52, borderRadius: "8px", objectFit: "cover" as const, border: "2px solid #45475a", flexShrink: 0 },
  photoPlaceholder: { width: 52, height: 52, borderRadius: "8px", backgroundColor: "#313244", border: "2px solid #45475a", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontSize: "1.5rem", flexShrink: 0 },
};
