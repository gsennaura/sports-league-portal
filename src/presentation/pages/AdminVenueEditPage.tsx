import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import type { UpdateVenue } from "@application/use_cases/UpdateVenue";
import type { Venue } from "@domain/entities/Venue";
import { API_BASE } from "@infrastructure/apiBase";
import { authHeaders } from "@infrastructure/authHeaders";

interface City {
  id: string;
  name: string;
  state_id: string;
}

interface Props {
  updateVenue: UpdateVenue;
}

export function AdminVenueEditPage({ updateVenue }: Props) {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const initialVenue = (location.state as { venue?: Venue } | null)?.venue ?? null;

  const [name, setName] = useState(initialVenue?.name ?? "");
  const [cityId, setCityId] = useState(initialVenue?.city_id ?? "");
  const [nickname, setNickname] = useState(initialVenue?.nickname ?? "");
  const [neighborhood, setNeighborhood] = useState(initialVenue?.neighborhood ?? "");
  const [street, setStreet] = useState(initialVenue?.street ?? "");
  const [number, setNumber] = useState(initialVenue?.number ?? "");
  const [complement, setComplement] = useState(initialVenue?.complement ?? "");
  const [zipCode, setZipCode] = useState(initialVenue?.zip_code ?? "");
  const [latitude, setLatitude] = useState(initialVenue?.latitude?.toString() ?? "");
  const [longitude, setLongitude] = useState(initialVenue?.longitude?.toString() ?? "");

  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [loadingVenue, setLoadingVenue] = useState(!initialVenue);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(initialVenue?.photo_url ?? null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Load cities
  useEffect(() => {
    fetch(`${API_BASE}/cities`)
      .then(r => r.json())
      .then((data: City[]) => {
        setCities([...data].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      })
      .finally(() => setCitiesLoading(false));
  }, []);

  // Fallback: load venue from API if not passed via router state
  useEffect(() => {
    if (initialVenue || !id) return;
    fetch(`${API_BASE}/venues/${id}`)
      .then(r => {
        if (!r.ok) throw new Error("Local não encontrado.");
        return r.json() as Promise<Venue>;
      })
      .then(v => {
        setName(v.name);
        setCityId(v.city_id);
        setNickname(v.nickname ?? "");
        setNeighborhood(v.neighborhood ?? "");
        setStreet(v.street ?? "");
        setNumber(v.number ?? "");
        setComplement(v.complement ?? "");
        setZipCode(v.zip_code ?? "");
        setLatitude(v.latitude?.toString() ?? "");
        setLongitude(v.longitude?.toString() ?? "");
        setCurrentPhotoUrl(v.photo_url ?? null);
      })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoadingVenue(false));
  }, [id]);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setPhotoUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE}/venues/${id}/photo`, {
        method: "POST",
        headers: authHeaders(),
        body: form,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(d.detail ?? `Erro ${res.status}`);
      }
      const data = await res.json() as { photo_url: string };
      setCurrentPhotoUrl(data.photo_url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Nome é obrigatório."); return; }
    if (!cityId) { setError("Cidade é obrigatória."); return; }
    if (!id) return;

    setSubmitting(true);
    try {
      await updateVenue.execute({
        id,
        name: name.trim(),
        city_id: cityId,
        nickname: nickname.trim() || undefined,
        neighborhood: neighborhood.trim() || undefined,
        street: street.trim() || undefined,
        number: number.trim() || undefined,
        complement: complement.trim() || undefined,
        zip_code: zipCode.trim() || undefined,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
      });
      setSuccess(true);
      setTimeout(() => navigate("/admin/locais"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingVenue) {
    return (
      <main style={{ padding: "2rem 1.5rem", color: "#cdd6f4" }}>Carregando...</main>
    );
  }

  return (
    <>
      <header style={S.hero}>
        <div style={S.heroAccent} />
        <div style={S.heroInner}>
          <Link to="/admin/locais" style={S.back}>← Locais</Link>
          <h1 style={S.title}>Editar Local</h1>
        </div>
      </header>

      <main style={S.page}>
        <form onSubmit={handleSubmit} style={S.form} noValidate>

          <fieldset style={S.fieldset}>
            <legend style={S.legend}>Informações básicas</legend>
            <div style={S.grid2}>
              <Field label="Nome oficial *" htmlFor="name">
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
                  <div style={{ ...S.input, color: "#cdd6f4" }}>Carregando cidades...</div>
                ) : (
                  <select
                    id="city"
                    style={{ ...S.input, ...S.select }}
                    value={cityId}
                    onChange={e => setCityId(e.target.value)}
                    required
                  >
                    <option value="">Selecione a cidade</option>
                    {cities.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
            <div style={S.grid2}>
              <Field label="Apelido / Nome popular" htmlFor="nickname">
                <input
                  id="nickname"
                  style={S.input}
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                />
              </Field>
            </div>
          </fieldset>

          <fieldset style={S.fieldset}>
            <legend style={S.legend}>Endereço <span style={S.legendOpt}>(opcional)</span></legend>
            <div style={S.grid3}>
              <Field label="CEP" htmlFor="zip_code">
                <input
                  id="zip_code"
                  style={S.input}
                  value={zipCode}
                  onChange={e => setZipCode(e.target.value)}
                  maxLength={9}
                />
              </Field>
              <Field label="Bairro" htmlFor="neighborhood">
                <input
                  id="neighborhood"
                  style={S.input}
                  value={neighborhood}
                  onChange={e => setNeighborhood(e.target.value)}
                />
              </Field>
            </div>
            <div style={S.grid3}>
              <Field label="Rua / Avenida" htmlFor="street" style={{ gridColumn: "1 / 3" }}>
                <input
                  id="street"
                  style={S.input}
                  value={street}
                  onChange={e => setStreet(e.target.value)}
                />
              </Field>
              <Field label="Número" htmlFor="number">
                <input
                  id="number"
                  style={S.input}
                  value={number}
                  onChange={e => setNumber(e.target.value)}
                />
              </Field>
            </div>
            <div style={S.grid2}>
              <Field label="Complemento" htmlFor="complement">
                <input
                  id="complement"
                  style={S.input}
                  value={complement}
                  onChange={e => setComplement(e.target.value)}
                />
              </Field>
            </div>
          </fieldset>

          <fieldset style={S.fieldset}>
            <legend style={S.legend}>Coordenadas <span style={S.legendOpt}>(opcional)</span></legend>
            <div style={S.grid2}>
              <Field label="Latitude" htmlFor="lat">
                <input
                  id="lat"
                  type="number"
                  step="any"
                  style={S.input}
                  value={latitude}
                  onChange={e => setLatitude(e.target.value)}
                />
              </Field>
              <Field label="Longitude" htmlFor="lng">
                <input
                  id="lng"
                  type="number"
                  step="any"
                  style={S.input}
                  value={longitude}
                  onChange={e => setLongitude(e.target.value)}
                />
              </Field>
            </div>
          </fieldset>

          {error && <p style={S.errorMsg}>{error}</p>}
          {success && <p style={S.successMsg}>✔ Local atualizado! Redirecionando...</p>}

          {/* ── Foto do local ─────────────────────────────────── */}
          <fieldset style={S.fieldset}>
            <legend style={S.legend}>Foto do local <span style={S.legendOpt}>(opcional)</span></legend>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1.25rem", marginTop: "1rem", flexWrap: "wrap" }}>
              {currentPhotoUrl ? (
                <img
                  src={currentPhotoUrl}
                  alt="Foto do local"
                  style={{ width: 160, height: 107, objectFit: "cover", borderRadius: 8, border: "1px solid #313244", flexShrink: 0 }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div style={{ width: 160, height: 107, background: "#1e1e2e", borderRadius: 8, border: "1px solid #313244", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "#45475a", fontSize: "0.8rem" }}>Sem foto</span>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", justifyContent: "center" }}>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: "none" }}
                  onChange={handlePhotoChange}
                />
                <button
                  type="button"
                  style={{ ...S.btnSubmit, opacity: photoUploading ? 0.6 : 1, cursor: photoUploading ? "not-allowed" : "pointer", fontSize: "0.85rem", padding: "0.5rem 1rem" }}
                  disabled={photoUploading}
                  onClick={() => photoInputRef.current?.click()}
                >
                  {photoUploading ? "Enviando…" : currentPhotoUrl ? "✏️ Alterar foto" : "📷 Adicionar foto"}
                </button>
                <span style={{ color: "#6c7086", fontSize: "0.78rem" }}>PNG, JPEG ou WEBP</span>
              </div>
            </div>
          </fieldset>

          <div style={S.actions}>
            <Link to="/admin/locais" style={S.btnCancel}>Cancelar</Link>
            <button type="submit" style={S.btnSubmit} disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}

function Field({
  label,
  htmlFor,
  children,
  style,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", ...style }}>
      <label htmlFor={htmlFor} style={S.label}>{label}</label>
      {children}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: {
    backgroundColor: "#181825",
    borderBottom: "1px solid #313244",
    position: "relative",
    overflow: "hidden",
  },
  heroAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "3px",
    background: "linear-gradient(90deg, #cba6f7, #89b4fa)",
  },
  heroInner: {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "1.5rem 1.5rem 1.25rem",
  },
  back: {
    display: "inline-block",
    color: "#89b4fa",
    textDecoration: "none",
    fontSize: "0.85rem",
    marginBottom: "0.75rem",
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "#cdd6f4",
    margin: 0,
  },
  page: {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "2rem 1.5rem 4rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  fieldset: {
    border: "1px solid #313244",
    borderRadius: "8px",
    padding: "1.25rem 1.5rem",
    margin: 0,
  },
  legend: {
    fontSize: "0.84rem",
    fontWeight: 700,
    color: "#cdd6f4",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    padding: "0 0.5rem",
  },
  legendOpt: {
    fontWeight: 400,
    color: "#cdd6f4",
    textTransform: "none",
    letterSpacing: "normal",
    fontSize: "0.8rem",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1rem",
    marginTop: "1rem",
  },
  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "1rem",
    marginTop: "1rem",
  },
  label: {
    fontSize: "0.83rem",
    fontWeight: 600,
    color: "#cdd6f4",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  input: {
    backgroundColor: "#181825",
    border: "1px solid #313244",
    borderRadius: "6px",
    color: "#cdd6f4",
    fontSize: "0.9rem",
    padding: "0.55rem 0.75rem",
    outline: "none",
    width: "100%",
  },
  select: {
    cursor: "pointer",
    appearance: "auto",
  },
  errorMsg: {
    color: "#f38ba8",
    backgroundColor: "#2a1a1f",
    border: "1px solid #5a2a30",
    borderRadius: "6px",
    padding: "0.75rem 1rem",
    fontSize: "0.875rem",
  },
  successMsg: {
    color: "#a6e3a1",
    backgroundColor: "#1a2a1f",
    border: "1px solid #2a5a30",
    borderRadius: "6px",
    padding: "0.75rem 1rem",
    fontSize: "0.875rem",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.75rem",
    paddingTop: "0.5rem",
  },
  btnCancel: {
    backgroundColor: "transparent",
    border: "1px solid #313244",
    borderRadius: "6px",
    color: "#cdd6f4",
    fontSize: "0.9rem",
    fontWeight: 500,
    padding: "0.6rem 1.25rem",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
  },
  btnSubmit: {
    backgroundColor: "#cba6f7",
    border: "none",
    borderRadius: "6px",
    color: "#11111b",
    fontSize: "0.9rem",
    fontWeight: 700,
    padding: "0.6rem 1.5rem",
    cursor: "pointer",
  },
};
