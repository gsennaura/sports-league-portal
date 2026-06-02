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
    return <main style={{ padding: "2rem 1.5rem", color: "#cdd6f4" }}>Carregando...</main>;
  }

  return (
    <>
      <header style={S.hero}>
        <div style={S.heroAccent} />
        <div style={S.heroInner}>
          <Link to="/admin/clubes" style={S.back}>← Clubes</Link>
          <h1 style={S.title}>Editar Clube</h1>
        </div>
      </header>
      <main style={S.page}>
        <form onSubmit={handleSubmit} style={S.form} noValidate>
          <fieldset style={S.fieldset}>
            <legend style={S.legend}>Informações básicas</legend>
            <div style={S.grid2}>
              <Field label="Nome do clube *" htmlFor="name">
                <input
                  id="name"
                  style={S.input}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </Field>
              <Field label="Cidade *" htmlFor="city">
                {citiesLoading ? (
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
            <div style={S.grid2}>
              <Field label="Presidente" htmlFor="president">
                <input
                  id="president"
                  style={S.input}
                  value={president}
                  onChange={e => setPresident(e.target.value)}
                />
              </Field>
              <Field label="Local principal" htmlFor="venue">
                <select
                  id="venue"
                  style={{ ...S.input, ...S.select }}
                  value={venueId ?? ""}
                  onChange={e => setVenueId(e.target.value)}
                >
                  <option value="">Sem local definido</option>
                  {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </Field>
            </div>
          </fieldset>

          <fieldset style={S.fieldset}>
            <legend style={S.legend}>Informações adicionais <span style={S.legendOpt}>(opcional)</span></legend>
            <div style={S.grid2}>
              <Field label="Data de fundação" htmlFor="founded_at">
                <input
                  id="founded_at"
                  type="date"
                  style={S.input}
                  value={foundedAt}
                  onChange={e => setFoundedAt(e.target.value)}
                />
              </Field>
              <Field label="Apelido" htmlFor="nickname">
                <input
                  id="nickname"
                  style={S.input}
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="Ex: Galo, Fluzão"
                />
              </Field>
            </div>
            <div style={S.grid2}>
              <Field label="Sigla" htmlFor="acronym">
                <input
                  id="acronym"
                  style={S.input}
                  value={acronym}
                  onChange={e => setAcronym(e.target.value)}
                  placeholder="Ex: CAM, FLA"
                  maxLength={20}
                />
              </Field>
              <Field label="Instituição vinculada" htmlFor="linked_institution">
                <input
                  id="linked_institution"
                  style={S.input}
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
                    style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 4, background: "#313244" }}
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <input
                  id="logo_file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ color: "#cdd6f4", fontSize: "0.85rem" }}
                  onChange={e => {
                    const f = e.target.files?.[0] ?? null;
                    setLogoFile(f);
                    setLogoPreview(f ? URL.createObjectURL(f) : null);
                  }}
                />
              </div>
              {logoUrl && !logoFile && (
                <span style={{ fontSize: "0.72rem", color: "#6c7086", marginTop: "0.3rem", display: "block", wordBreak: "break-all" }}>{logoUrl}</span>
              )}
            </Field>
          </fieldset>

          {error && <p style={S.errorMsg}>{error}</p>}
          {success && <p style={S.successMsg}>✔ Clube atualizado! Redirecionando...</p>}

          <div style={S.actions}>
            <Link to="/admin/clubes" style={S.btnCancel}>Cancelar</Link>
            <button type="submit" style={S.btnSubmit} disabled={submitting}>
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
      <label htmlFor={htmlFor} style={S.label}>{label}</label>
      {children}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: { backgroundColor: "#181825", borderBottom: "1px solid #313244", position: "relative", overflow: "hidden" },
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
  input: { backgroundColor: "#181825", border: "1px solid #313244", borderRadius: "6px", color: "#cdd6f4", fontSize: "0.9rem", padding: "0.55rem 0.75rem", outline: "none", width: "100%" },
  select: { cursor: "pointer", appearance: "auto" },
  errorMsg: { color: "#f38ba8", backgroundColor: "#2a1a1f", border: "1px solid #5a2a30", borderRadius: "6px", padding: "0.75rem 1rem", fontSize: "0.875rem" },
  successMsg: { color: "#a6e3a1", backgroundColor: "#1a2a1f", border: "1px solid #2a5a30", borderRadius: "6px", padding: "0.75rem 1rem", fontSize: "0.875rem" },
  actions: { display: "flex", justifyContent: "flex-end", gap: "0.75rem", paddingTop: "0.5rem" },
  btnCancel: { backgroundColor: "transparent", border: "1px solid #313244", borderRadius: "6px", color: "#cdd6f4", fontSize: "0.9rem", fontWeight: 500, padding: "0.6rem 1.25rem", textDecoration: "none", display: "inline-flex", alignItems: "center" },
  btnSubmit: { backgroundColor: "#cba6f7", border: "none", borderRadius: "6px", color: "#11111b", fontSize: "0.9rem", fontWeight: 700, padding: "0.6rem 1.5rem", cursor: "pointer" },
};
