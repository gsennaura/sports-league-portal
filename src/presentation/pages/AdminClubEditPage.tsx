import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import type { UpdateClub } from "@application/use_cases/UpdateClub";
import type { Club } from "@domain/entities/Club";
import { API_BASE } from "@infrastructure/apiBase";
import { authHeaders } from "@infrastructure/authHeaders";

interface City { id: string; name: string; }
interface VenueOption { id: string; name: string; }

interface Props { updateClub: UpdateClub; }

export function AdminClubEditPage({ updateClub }: Props) {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const initialClub = (location.state as { club?: Club } | null)?.club ?? null;

  const [name, setName] = useState(initialClub?.name ?? "");
  const [cityId, setCityId] = useState(initialClub?.city_id ?? "");
  const [president, setPresident] = useState(initialClub?.president ?? "");
  const [venueId, setVenueId] = useState(initialClub?.venue_id ?? "");
  const [foundedAt, setFoundedAt] = useState(initialClub?.founded_at?.slice(0, 10) ?? "");
  const [nickname, setNickname] = useState(initialClub?.nickname ?? "");
  const [acronym, setAcronym] = useState(initialClub?.acronym ?? "");
  const [linkedInstitution, setLinkedInstitution] = useState(initialClub?.linked_institution ?? "");
  const [logoUrl, setLogoUrl] = useState(initialClub?.logo_url ?? "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [cities, setCities] = useState<City[]>([]);
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [loadingClub, setLoadingClub] = useState(!initialClub);
  const [submitting, setSubmitting] = useState(false);
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

  // Fallback: busca o clube da API se não veio pelo router state
  useEffect(() => {
    if (initialClub || !id) return;
    fetch(`${API_BASE}/clubs/${id}`)
      .then(r => {
        if (!r.ok) throw new Error("Clube não encontrado.");
        return r.json() as Promise<Club>;
      })
      .then(c => {
        setName(c.name);
        setCityId(c.city_id);
        setPresident(c.president ?? "");
        setVenueId(c.venue_id ?? "");
        setFoundedAt(c.founded_at?.slice(0, 10) ?? "");
        setNickname(c.nickname ?? "");
        setAcronym(c.acronym ?? "");
        setLinkedInstitution(c.linked_institution ?? "");
        setLogoUrl(c.logo_url ?? "");
      })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoadingClub(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Nome é obrigatório."); return; }
    if (!cityId) { setError("Cidade é obrigatória."); return; }
    if (!id) return;

    setSubmitting(true);
    try {
      let finalLogoUrl: string | undefined = logoUrl.trim() || undefined;
      if (logoFile) {
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
        finalLogoUrl = data.logo_url;
      }
      await updateClub.execute({
        id,
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

  if (loadingClub) {
    return <main style={{ padding: "2rem 1.5rem", color: "var(--c-text)" }}>Carregando...</main>;
  }

  return (
    <>
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner">
          <Link to="/admin/clubes" className="back-link">← Clubes</Link>
          <h1 className="page-title">Editar Clube</h1>
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
                />
              </Field>
              <Field label="Local principal" htmlFor="venue">
                <select
                  id="venue"
                  className="form-select"
                  value={venueId ?? ""}
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
                {(logoPreview || logoUrl) && (
                  <img
                    src={logoPreview || logoUrl}
                    alt="escudo atual"
                    style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 4, background: "var(--c-border)" }}
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
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
              {logoUrl && !logoFile && (
                <span style={{ fontSize: "0.72rem", color: "#ffffff", marginTop: "0.3rem", display: "block", wordBreak: "break-all" }}>{logoUrl}</span>
              )}
            </Field>
          </fieldset>

          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">✔ Clube atualizado! Redirecionando...</p>}

          <div className="form-actions">
            <Link to="/admin/clubes" className="btn btn-secondary">Cancelar</Link>
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

