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
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner">
          <Link to="/admin/locais" className="back-link">← Locais</Link>
          <h1 className="page-title">Novo Local</h1>
        </div>
      </header>

      <main className="page-container">
        <form onSubmit={handleSubmit} className="form-body" noValidate>

          {/* ── Obrigatórios ─────────────────────────────────── */}
          <fieldset className="form-fieldset">
            <legend className="form-legend">Informações básicas</legend>
            <div className="form-field-group--2">
              <Field label="Nome oficial *" htmlFor="name">
                <input
                  id="name"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Estádio Municipal de Uberaba"
                  required
                />
              </Field>
              <Field label="Cidade *" htmlFor="city">
                {citiesLoading ? (
                  <div className="form-input" style={{ color: "var(--c-text)" }}>Carregando cidades...</div>
                ) : (
                  <select
                    id="city"
                    className="form-select"
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
            <div className="form-field-group--2">
              <Field label="Apelido / Nome popular" htmlFor="nickname">
                <input
                  id="nickname"
                  className="form-input"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Ex: Uberabão"
                />
              </Field>
            </div>
          </fieldset>

          {/* ── Endereço ─────────────────────────────────────── */}
          <fieldset className="form-fieldset">
            <legend className="form-legend">Endereço <span className="form-legend">(opcional)</span></legend>
            <div className="form-field-group--3">
              <Field label="CEP" htmlFor="zip_code">
                <input
                  id="zip_code"
                  className="form-input"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                />
              </Field>
              <Field label="Bairro" htmlFor="neighborhood">
                <input
                  id="neighborhood"
                  className="form-input"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Ex: Centro"
                />
              </Field>
            </div>
            <div className="form-field-group--3">
              <Field label="Rua / Avenida" htmlFor="street" style={{ gridColumn: "1 / 3" }}>
                <input
                  id="street"
                  className="form-input"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Ex: Av. das Flores"
                />
              </Field>
              <Field label="Número" htmlFor="number">
                <input
                  id="number"
                  className="form-input"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="Ex: 1000 ou s/n"
                />
              </Field>
            </div>
            <div className="form-field-group--2">
              <Field label="Complemento" htmlFor="complement">
                <input
                  id="complement"
                  className="form-input"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  placeholder="Ex: Portão B"
                />
              </Field>
            </div>
          </fieldset>

          {/* ── Coordenadas ──────────────────────────────────── */}
          <fieldset className="form-fieldset">
            <legend className="form-legend">Coordenadas <span className="form-legend">(opcional)</span></legend>
            <div className="form-field-group--2">
              <Field label="Latitude" htmlFor="lat">
                <input
                  id="lat"
                  type="number"
                  step="any"
                  className="form-input"
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
                  className="form-input"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="Ex: -47.9319"
                />
              </Field>
            </div>
          </fieldset>

          {/* ── Feedback ─────────────────────────────────────── */}
          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">✔ Local cadastrado! Redirecionando para edição...</p>}

          {/* ── Ações ────────────────────────────────────────── */}
          <div className="form-actions">
            <Link to="/admin/locais" className="btn btn-secondary">Cancelar</Link>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
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
      <label htmlFor={htmlFor} className="form-label">{label}</label>
      {children}
    </div>
  );
}

