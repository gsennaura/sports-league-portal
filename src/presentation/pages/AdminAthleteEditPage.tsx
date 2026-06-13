import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import type { UpdateAthlete } from "@application/use_cases/UpdateAthlete";
import type { DeleteAthlete } from "@application/use_cases/DeleteAthlete";
import type { AthleteRepository } from "@domain/repositories/AthleteRepository";
import type { Athlete } from "@domain/entities/Athlete";
import { API_BASE } from "@infrastructure/apiBase";
import { PhotoUploadModal } from "@presentation/components/PhotoUploadModal";

interface Props {
  updateAthlete: UpdateAthlete;
  deleteAthlete: DeleteAthlete;
  athleteRepository: AthleteRepository;
}

const NO_PHOTO =
  "https://raw.githubusercontent.com/gsennaura/sports-manager-assets/main/athletes/no_athlete_photo.png";

const FOOT_OPTIONS = [
  { value: "direito", label: "Direito" },
  { value: "esquerdo", label: "Esquerdo" },
  { value: "ambidestro", label: "Ambidestro" },
];

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  const parts = label.split("*");
  const labelNode = parts.length > 1
    ? <>{parts[0]}<span style={{ color: "var(--c-negative)" }}>*</span>{parts.slice(1).join("*")}</>
    : label;
  return (
    <div className="form-field-group">
      <label htmlFor={htmlFor} className="form-label">{labelNode}</label>
      {children}
    </div>
  );
}

export function AdminAthleteEditPage({ updateAthlete, deleteAthlete, athleteRepository }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const initialAthlete = (location.state as { athlete?: Athlete } | null)?.athlete ?? null;

  const [name, setName] = useState(initialAthlete?.name ?? "");
  const [birthDate, setBirthDate] = useState(initialAthlete?.birth_date?.slice(0, 10) ?? "");
  const [cpf, setCpf] = useState(initialAthlete?.cpf ?? "");
  const [rg, setRg] = useState(initialAthlete?.rg ?? "");
  const [nationality, setNationality] = useState(initialAthlete?.nationality ?? "Brasileiro");
  const [position, setPosition] = useState(initialAthlete?.position ?? "");
  const [nickname, setNickname] = useState(initialAthlete?.nickname ?? "");
  const [preferredFoot, setPreferredFoot] = useState(initialAthlete?.preferred_foot ?? "");
  const [heightCm, setHeightCm] = useState(initialAthlete?.height_cm?.toString() ?? "");
  const [weightKg, setWeightKg] = useState(initialAthlete?.weight_kg?.toString() ?? "");
  const [phone, setPhone] = useState(initialAthlete?.phone ?? "");
  const [email, setEmail] = useState(initialAthlete?.email ?? "");
  const [notes, setNotes] = useState(initialAthlete?.notes ?? "");
  const [photoUrl, setPhotoUrl] = useState(initialAthlete?.photo_url ?? "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const [loadingAthlete, setLoadingAthlete] = useState(!initialAthlete);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleDelete() {
    if (!id) return;
    if (!confirm(`Tem certeza que deseja excluir este atleta? Esta ação não pode ser desfeita.`)) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteAthlete.execute(id);
      navigate("/admin/atletas");
    } catch (e) {
      setError((e as Error).message);
      setDeleting(false);
    }
  }

  useEffect(() => {
    if (initialAthlete || !id) return;
    fetch(`${API_BASE}/athletes/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Atleta não encontrado.");
        return r.json() as Promise<{ athlete: Athlete }>;
      })
      .then(({ athlete: a }) => {
        setName(a.name);
        setBirthDate(a.birth_date?.slice(0, 10) ?? "");
        setCpf(a.cpf ?? "");
        setRg(a.rg ?? "");
        setNationality(a.nationality ?? "Brasileiro");
        setPosition(a.position ?? "");
        setNickname(a.nickname ?? "");
        setPreferredFoot(a.preferred_foot ?? "");
        setHeightCm(a.height_cm?.toString() ?? "");
        setWeightKg(a.weight_kg?.toString() ?? "");
        setPhone(a.phone ?? "");
        setEmail(a.email ?? "");
        setNotes(a.notes ?? "");
        setPhotoUrl(a.photo_url ?? "");
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoadingAthlete(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !id) { setError("Nome é obrigatório."); return; }
    setSubmitting(true);
    setError(null);
    try {
      let finalPhotoUrl: string | undefined = photoUrl || undefined;
      if (photoFile) {
        const result = await athleteRepository.uploadPhoto(id, photoFile);
        finalPhotoUrl = result.photo_url;
      }
      await updateAthlete.execute({
        id,
        name: name.trim(),
        birth_date: birthDate || undefined,
        cpf: cpf.trim() || undefined,
        rg: rg.trim() || undefined,
        nationality: nationality.trim() || undefined,
        position: position.trim() || undefined,
        nickname: nickname.trim() || undefined,
        preferred_foot: preferredFoot || undefined,
        height_cm: heightCm ? parseInt(heightCm) : undefined,
        weight_kg: weightKg ? parseFloat(weightKg) : undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
        photo_url: finalPhotoUrl,
      });
      setSuccess(true);
      setTimeout(() => navigate("/admin/atletas"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingAthlete) {
    return <main style={{ padding: "2rem 1.5rem", color: "var(--c-text)" }}>Carregando…</main>;
  }

  return (
    <>
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner">
          <Link to="/admin/atletas" className="back-link">← Atletas</Link>
          <h1 className="page-title">Editar Atleta</h1>
          <div className="tab-bar">
            <Link to={`/admin/atletas/${id}/times`} className="row-link">Gerenciar Times</Link>
            <Link to={`/admin/atletas/${id}/ligas`} className="row-link">Gerenciar Ligas</Link>
            <Link to={`/atletas/${id}`} className="row-link">Ver Perfil Público</Link>
          </div>
        </div>
      </header>

      <main className="page-container">
        <form onSubmit={handleSubmit} className="form-body" noValidate>

          {/* Photo */}
          <fieldset className="form-fieldset">
            <legend className="form-legend">Foto</legend>
            <div style={{ marginTop: "0.5rem", display: "inline-block", position: "relative" }}>
              <img
                src={photoPreview ?? photoUrl ?? NO_PHOTO}
                alt="foto"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = NO_PHOTO; }}
                className="avatar avatar--lg"
              />
              <button
                type="button"
                title="Alterar foto"
                onClick={() => setShowPhotoModal(true)}
                
              >
                ✏
              </button>
            </div>
          </fieldset>

          {showPhotoModal && (
            <PhotoUploadModal
              currentPhotoUrl={photoPreview ?? photoUrl ?? NO_PHOTO}
              fallbackUrl={NO_PHOTO}
              uploading={false}
              onClose={() => setShowPhotoModal(false)}
              onConfirm={(file) => {
                setPhotoFile(file);
                setPhotoPreview(URL.createObjectURL(file));
                setShowPhotoModal(false);
              }}
            />
          )}

          {/* Identification */}
          <fieldset className="form-fieldset">
            <legend className="form-legend">Identificação</legend>
            <div className="form-field-group--2">
              <Field label="Nome completo *" htmlFor="name">
                <input id="name" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label="Data de nascimento" htmlFor="birth_date">
                <input id="birth_date" type="date" className="form-input" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              </Field>
            </div>
            <div className="form-field-group--2">
              <Field label="CPF" htmlFor="cpf">
                <input id="cpf" className="form-input" value={cpf} onChange={(e) => setCpf(e.target.value)} />
              </Field>
              <Field label="RG" htmlFor="rg">
                <input id="rg" className="form-input" value={rg} onChange={(e) => setRg(e.target.value)} />
              </Field>
            </div>
            <div className="form-field-group--2">
              <Field label="Nacionalidade" htmlFor="nationality">
                <input id="nationality" className="form-input" value={nationality} onChange={(e) => setNationality(e.target.value)} />
              </Field>
              <Field label="Telefone" htmlFor="phone">
                <input id="phone" className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
            </div>
            <Field label="E-mail" htmlFor="email">
              <input id="email" type="email" className="form-input" style={{ maxWidth: "360px" }} value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
          </fieldset>

          {/* Sport data */}
          <fieldset className="form-fieldset">
            <legend className="form-legend">Dados Esportivos</legend>
            <div className="form-field-group--3">
              <Field label="Posição" htmlFor="position">
                <input id="position" className="form-input" value={position} onChange={(e) => setPosition(e.target.value)} />
              </Field>
              <Field label="Apelido" htmlFor="nickname">
                <input id="nickname" className="form-input" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Ex: Nenê, Tigrão" />
              </Field>
              <Field label="Pé dominante" htmlFor="foot">
                <select id="foot" className="form-select" value={preferredFoot} onChange={(e) => setPreferredFoot(e.target.value)}>
                  <option value="">Não informado</option>
                  {FOOT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
            </div>
            <div className="form-field-group--3">
              <Field label="Altura (cm)" htmlFor="height">
                <input id="height" type="number" className="form-input" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
              </Field>
              <Field label="Peso (kg)" htmlFor="weight">
                <input id="weight" type="number" step="0.1" className="form-input" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
              </Field>
            </div>
          </fieldset>

          <fieldset className="form-fieldset">
            <legend className="form-legend">Observações</legend>
            <textarea className="form-input" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </fieldset>

          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">✔ Atleta atualizado! Redirecionando…</p>}

          <p style={{ fontSize: "0.8rem", color: "#ffffff", margin: 0 }}>
            Campos marcados com <span style={{ color: "var(--c-negative)", fontWeight: 700 }}>*</span> são obrigatórios.
          </p>

          <div className="form-actions">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || submitting}
              className="btn btn-danger"
            >
              {deleting ? "Excluindo…" : "🗑 Excluir atleta"}
            </button>
            <div style={{ flex: 1 }} />
            <Link to="/admin/atletas" className="btn btn-secondary">Cancelar</Link>
            <button type="submit" className="btn btn-primary" disabled={submitting || deleting}>
              {submitting ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}

