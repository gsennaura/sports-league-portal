import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { CreateLeague } from "@application/use_cases/CreateLeague";
import { API_BASE } from "@infrastructure/apiBase";
import { authHeaders } from "@infrastructure/authHeaders";

interface City { id: string; name: string; }
interface LeagueOption { id: string; name: string; }

interface Props { createLeague: CreateLeague; }

export function AdminLeagueCreatePage({ createLeague }: Props) {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [cityId, setCityId] = useState("");
  const [isFederated, setIsFederated] = useState(false);
  const [address, setAddress] = useState("");
  const [president, setPresident] = useState("");
  const [website, setWebsite] = useState("");
  const [foundedYear, setFoundedYear] = useState("");
  const [parentLeagueId, setParentLeagueId] = useState("");

  const [cities, setCities] = useState<City[]>([]);
  const [leagues, setLeagues] = useState<LeagueOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [logoFile,    setLogoFile]    = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/cities`).then(r => r.json() as Promise<City[]>),
      fetch(`${API_BASE}/leagues?`).then(r => r.ok ? r.json() as Promise<LeagueOption[]> : Promise.resolve([])),
    ]).then(([cs, ls]) => {
      setCities([...cs].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setLeagues([...ls].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
    }).finally(() => setOptionsLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Nome é obrigatório."); return; }
    if (!shortName.trim()) { setError("Sigla é obrigatória."); return; }
    if (!cityId) { setError("Cidade é obrigatória."); return; }

    setSubmitting(true);
    try {
      const league = await createLeague.execute({
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
        const res = await fetch(`${API_BASE}/leagues/${league.id}/photo`, {
          method: "POST",
          headers: authHeaders(),
          body: fd,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({})) as { detail?: string };
          throw new Error(`Liga criada, mas erro no upload da logo: ${err.detail ?? res.status}`);
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

  return (
    <>
      <header style={S.hero}>
        <div style={S.heroAccent} />
        <div style={S.heroInner}>
          <Link to="/admin/ligas" style={S.back}>← Ligas</Link>
          <h1 style={S.title}>Nova Liga</h1>
        </div>
      </header>
      <main style={S.page}>
        <form onSubmit={handleSubmit} style={S.form} noValidate>
          <fieldset style={S.fieldset}>
            <legend style={S.legend}>Informações básicas</legend>
            <div style={S.grid2}>
              <Field label="Nome da liga *" htmlFor="name">
                <input
                  id="name"
                  style={S.input}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Liga Mineira de Futebol"
                  required
                />
              </Field>
              <Field label="Sigla *" htmlFor="short_name">
                <input
                  id="short_name"
                  style={S.input}
                  value={shortName}
                  onChange={e => setShortName(e.target.value)}
                  placeholder="Ex: LMF"
                  required
                />
              </Field>
            </div>
            <div style={S.grid2}>
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
              <Field label="É federada?" htmlFor="is_federated" style={{ justifyContent: "flex-end" }}>
                <label style={S.checkboxLabel}>
                  <input
                    id="is_federated"
                    type="checkbox"
                    checked={isFederated}
                    onChange={e => setIsFederated(e.target.checked)}
                    style={S.checkbox}
                  />
                  Liga federada
                </label>
              </Field>
            </div>
          </fieldset>

          <fieldset style={S.fieldset}>
            <legend style={S.legend}>Detalhes <span style={S.legendOpt}>(opcional)</span></legend>
            <div style={S.grid2}>
              <Field label="Presidente" htmlFor="president">
                <input
                  id="president"
                  style={S.input}
                  value={president}
                  onChange={e => setPresident(e.target.value)}
                  placeholder="Ex: João da Silva"
                />
              </Field>
              <Field label="Ano de fundação" htmlFor="founded_year">
                <input
                  id="founded_year"
                  type="number"
                  style={S.input}
                  value={foundedYear}
                  onChange={e => setFoundedYear(e.target.value)}
                  placeholder="Ex: 1982"
                  min={1800}
                  max={new Date().getFullYear()}
                />
              </Field>
            </div>
            <div style={S.grid2}>
              <Field label="Endereço" htmlFor="address">
                <input
                  id="address"
                  style={S.input}
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Ex: Rua das Ligas, 100"
                />
              </Field>
              <Field label="Website" htmlFor="website">
                <input
                  id="website"
                  type="url"
                  style={S.input}
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="Ex: https://liga.com.br"
                />
              </Field>
            </div>
            <div style={{ ...S.grid2, marginTop: "1rem" }}>
              <Field label="Liga pai" htmlFor="parent_league">
                {optionsLoading ? (
                  <div style={{ ...S.input, color: "#cdd6f4" }}>Carregando...</div>
                ) : (
                  <select
                    id="parent_league"
                    style={{ ...S.input, ...S.select }}
                    value={parentLeagueId}
                    onChange={e => setParentLeagueId(e.target.value)}
                  >
                    <option value="">Sem liga pai</option>
                    {leagues.map(lg => <option key={lg.id} value={lg.id}>{lg.name}</option>)}
                  </select>
                )}
              </Field>
              <Field label="Logo" htmlFor="league-logo">
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {logoPreview
                    ? <img src={logoPreview} alt="preview" style={S.photoThumb} />
                    : <div style={S.photoPlaceholder}>🏆</div>
                  }
                  <div>
                    <label htmlFor="league-logo" style={S.btnUpload}>
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

          {error && <p style={S.errorMsg}>{error}</p>}
          {success && <p style={S.successMsg}>✔ Liga cadastrada! Redirecionando...</p>}

          <div style={S.actions}>
            <Link to="/admin/ligas" style={S.btnCancel}>Cancelar</Link>
            <button type="submit" style={S.btnSubmit} disabled={submitting}>
              {submitting ? "Salvando..." : "Cadastrar liga"}
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
      <label htmlFor={htmlFor} style={S.label}>{label}</label>
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
