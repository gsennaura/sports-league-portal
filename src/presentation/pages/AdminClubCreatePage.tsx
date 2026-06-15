import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { CreateClub } from "@application/use_cases/CreateClub";
import { API_BASE } from "@infrastructure/apiBase";
import { authHeaders } from "@infrastructure/authHeaders";

interface City { id: string; name: string; }
interface VenueOption { id: string; name: string; }

interface Props { createClub: CreateClub; }

export function AdminClubCreatePage({ createClub }: Props) {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [cityId, setCityId] = useState("");
  const [president, setPresident] = useState("");
  const [venueId, setVenueId] = useState("");
  const [foundedAt, setFoundedAt] = useState("");
  const [nickname, setNickname] = useState("");
  const [acronym, setAcronym] = useState("");
  const [linkedInstitution, setLinkedInstitution] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [cities, setCities] = useState<City[]>([]);
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/cities`).then(r => r.json() as Promise<City[]>),
      fetch(`${API_BASE}/venues`).then(r => r.json() as Promise<VenueOption[]>),
    ]).then(([cs, vs]) => {
      setCities([...cs].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setVenues([...vs].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
    }).finally(() => setCitiesLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Nome é obrigatório."); return; }
    if (!cityId) { setError("Cidade é obrigatória."); return; }

    setSubmitting(true);
    try {
      let finalLogoUrl: string | undefined = undefined;
      if (logoFile) {
        setLogoLoading(true);
        try {
          const fd = new FormData();
          fd.append("file", logoFile);
          fd.append("city_id", cityId);
          fd.append("nickname", nickname.trim() || name.trim());
          const res = await fetch(`${API_BASE}/upload/club-logo`, { method: "POST", headers: authHeaders(), body: fd });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error((err as { detail?: string }).detail || "Erro ao enviar o escudo.");
          }
          const data = await res.json() as { logo_url: string };
          finalLogoUrl = `${data.logo_url}?t=${Date.now()}`;
        } finally {
          setLogoLoading(false);
        }
      }
      await createClub.execute({
        name: name.trim(),
        city_id: cityId,
        president: president.trim() || undefined,
        venue_id: venueId || undefined,
        founded_at: foundedAt || undefined,
        nickname: nickname.trim() || undefined,
        acronym: acronym.trim() || undefined,
        linked_institution: linkedInstitution.trim() || undefined,
        logo_url: finalLogoUrl,
      });
      setSuccess(true);
      setTimeout(() => navigate("/admin/clubes"), 1200);
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
          <Link to="/admin/clubes" className="back-link">← Clubes</Link>
          <h1 className="page-title">Novo Clube</h1>
        </div>
      </header>
      <main className="page-container">
        <form onSubmit={handleSubmit} className="form-body" noValidate>
          <fieldset className="form-fieldset">
            <legend className="form-legend">Informações básicas</legend>
            <div className="form-field-group--2">
              <Field label="Nome do clube *" htmlFor="name">
                <input
                  id="name"
                  className="form-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Atlético Mineiro"
                  required
                />
              </Field>
              <Field label="Cidade *" htmlFor="city">
                {citiesLoading ? (
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
            </div>
            <div className="form-field-group--2">
              <Field label="Presidente" htmlFor="president">
                <input
                  id="president"
                  className="form-input"
                  value={president}
                  onChange={e => setPresident(e.target.value)}
                  placeholder="Ex: João da Silva"
                />
              </Field>
              <Field label="Local principal" htmlFor="venue">
                <select
                  id="venue"
                  className="form-select"
                  value={venueId}
                  onChange={e => setVenueId(e.target.value)}
                >
                  <option value="">Sem local definido</option>
                  {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </Field>
            </div>
          </fieldset>

          <fieldset className="form-fieldset">
            <legend className="form-legend">Informações adicionais <span className="form-legend">(opcional)</span></legend>
            <div className="form-field-group--2">
              <Field label="Data de fundação" htmlFor="founded_at">
                <input
                  id="founded_at"
                  type="date"
                  className="form-input"
                  value={foundedAt}
                  onChange={e => setFoundedAt(e.target.value)}
                />
              </Field>
              <Field label="Apelido" htmlFor="nickname">
                <input
                  id="nickname"
                  className="form-input"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="Ex: Galo, Fluzão"
                />
              </Field>
            </div>
            <div className="form-field-group--2">
              <Field label="Sigla" htmlFor="acronym">
                <input
                  id="acronym"
                  className="form-input"
                  value={acronym}
                  onChange={e => setAcronym(e.target.value)}
                  placeholder="Ex: CAM, FLA"
                  maxLength={20}
                />
              </Field>
              <Field label="Instituição vinculada" htmlFor="linked_institution">
                <input
                  id="linked_institution"
                  className="form-input"
                  value={linkedInstitution}
                  onChange={e => setLinkedInstitution(e.target.value)}
                  placeholder="Ex: Prefeitura de Uberaba"
                />
              </Field>
            </div>
            <Field label="Escudo do clube" htmlFor="logo_file" style={{ marginTop: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                {logoPreview && (
                  <img
                    src={logoPreview}
                    alt="preview"
                    style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 4, background: "var(--c-border)" }}
                  />
                )}
                <input
                  id="logo_file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ color: "var(--c-text)", fontSize: "0.85rem" }}
                  onChange={e => {
                    const f = e.target.files?.[0] ?? null;
                    setLogoFile(f);
                    setLogoPreview(f ? URL.createObjectURL(f) : null);
                  }}
                />
              </div>
            </Field>
          </fieldset>

          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">✔ Clube cadastrado! Redirecionando...</p>}

          <div className="form-actions">
            <Link to="/admin/clubes" className="btn btn-secondary">Cancelar</Link>
            <button type="submit" className="btn btn-primary" disabled={submitting || logoLoading}>
              {logoLoading ? "Enviando escudo…" : submitting ? "Salvando…" : "Cadastrar clube"}
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

