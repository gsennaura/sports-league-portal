import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { CreateVenue } from "@application/use_cases/CreateVenue";
import { API_BASE } from "@infrastructure/apiBase";

interface City {
  id: string;
  name: string;
  state_id: string;
  state_code?: string;
}

interface AdminVenueCreatePageProps {
  createVenue: CreateVenue;
}

export function AdminVenueCreatePage({ createVenue }: AdminVenueCreatePageProps) {
  const navigate = useNavigate();

  // Form fields
  const [name, setName] = useState("");
  const [cityId, setCityId] = useState("");
  const [nickname, setNickname] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/cities`)
      .then((r) => r.json())
      .then((data: City[]) => {
        const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        setCities(sorted);
        setCitiesLoading(false);
      })
      .catch(() => setCitiesLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Nome é obrigatório."); return; }
    if (!cityId) { setError("Cidade é obrigatória."); return; }

    setSubmitting(true);
    try {
      const created = await createVenue.execute({
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
      setTimeout(() => navigate(`/admin/locais/${created.id}/editar`, { state: { venue: created } }), 1200);
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
          <Link to="/admin/locais" style={S.back}>← Locais</Link>
          <h1 style={S.title}>Novo Local</h1>
        </div>
      </header>

      <main style={S.page}>
        <form onSubmit={handleSubmit} style={S.form} noValidate>

          {/* ── Obrigatórios ─────────────────────────────────── */}
          <fieldset style={S.fieldset}>
            <legend style={S.legend}>Informações básicas</legend>
            <div style={S.grid2}>
              <Field label="Nome oficial *" htmlFor="name">
                <input
                  id="name"
                  style={S.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Estádio Municipal de Uberaba"
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
                    onChange={(e) => setCityId(e.target.value)}
                    required
                  >
                    <option value="">Selecione a cidade</option>
                    {cities.map((c) => (
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
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Ex: Uberabão"
                />
              </Field>
            </div>
          </fieldset>

          {/* ── Endereço ─────────────────────────────────────── */}
          <fieldset style={S.fieldset}>
            <legend style={S.legend}>Endereço <span style={S.legendOpt}>(opcional)</span></legend>
            <div style={S.grid3}>
              <Field label="CEP" htmlFor="zip_code">
                <input
                  id="zip_code"
                  style={S.input}
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                />
              </Field>
              <Field label="Bairro" htmlFor="neighborhood">
                <input
                  id="neighborhood"
                  style={S.input}
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Ex: Centro"
                />
              </Field>
            </div>
            <div style={S.grid3}>
              <Field label="Rua / Avenida" htmlFor="street" style={{ gridColumn: "1 / 3" }}>
                <input
                  id="street"
                  style={S.input}
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Ex: Av. das Flores"
                />
              </Field>
              <Field label="Número" htmlFor="number">
                <input
                  id="number"
                  style={S.input}
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="Ex: 1000 ou s/n"
                />
              </Field>
            </div>
            <div style={S.grid2}>
              <Field label="Complemento" htmlFor="complement">
                <input
                  id="complement"
                  style={S.input}
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  placeholder="Ex: Portão B"
                />
              </Field>
            </div>
          </fieldset>

          {/* ── Coordenadas ──────────────────────────────────── */}
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
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="Ex: -19.7231"
                />
              </Field>
              <Field label="Longitude" htmlFor="lng">
                <input
                  id="lng"
                  type="number"
                  step="any"
                  style={S.input}
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="Ex: -47.9319"
                />
              </Field>
            </div>
          </fieldset>

          {/* ── Feedback ─────────────────────────────────────── */}
          {error && <p style={S.errorMsg}>{error}</p>}
          {success && <p style={S.successMsg}>✔ Local cadastrado! Redirecionando para edição...</p>}

          {/* ── Ações ────────────────────────────────────────── */}
          <div style={S.actions}>
            <Link to="/admin/locais" style={S.btnCancel}>Cancelar</Link>
            <button type="submit" style={S.btnSubmit} disabled={submitting}>
              {submitting ? "Salvando..." : "Cadastrar local"}
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
    flexDirection: "column" as const,
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
    textTransform: "uppercase" as const,
    letterSpacing: "0.07em",
    padding: "0 0.5rem",
  },
  legendOpt: {
    fontWeight: 400,
    color: "#cdd6f4",
    textTransform: "none" as const,
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
    textTransform: "uppercase" as const,
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
    appearance: "auto" as const,
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
