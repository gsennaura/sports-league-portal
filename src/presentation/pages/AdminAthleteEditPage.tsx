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
    ? <>{parts[0]}<span style={{ color: "#f38ba8" }}>*</span>{parts.slice(1).join("*")}</>
    : label;
  return (
    <div style={S.fieldGroup}>
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
    return <main style={{ padding: "2rem 1.5rem", color: "#cdd6f4" }}>Carregando…</main>;
  }

  return (
    <>
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner">
          <Link to="/admin/atletas" className="back-link">← Atletas</Link>
          <h1 className="page-title">Editar Atleta</h1>
          <div style={S.subNav}>
            <Link to={`/admin/atletas/${id}/times`} style={S.subLink}>Gerenciar Times</Link>
            <Link to={`/admin/atletas/${id}/ligas`} style={S.subLink}>Gerenciar Ligas</Link>
            <Link to={`/atletas/${id}`} style={S.subLink}>Ver Perfil Público</Link>
          </div>
        </div>
      </header>

      <main className="page-container">
        <form onSubmit={handleSubmit} style={S.form} noValidate>

          {/* Photo */}
          <fieldset style={S.fieldset}>
            <legend style={S.legend}>Foto</legend>
            <div style={{ marginTop: "0.5rem", display: "inline-block", position: "relative" }}>
              <img
                src={photoPreview ?? photoUrl ?? NO_PHOTO}
                alt="foto"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = NO_PHOTO; }}
                style={S.photoPreview}
              />
              <button
                type="button"
                title="Alterar foto"
                onClick={() => setShowPhotoModal(true)}
                style={S.photoPencil}
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
          <fieldset style={S.fieldset}>
            <legend style={S.legend}>Identificação</legend>
            <div style={S.grid2}>
              <Field label="Nome completo *" htmlFor="name">
                <input id="name" style={S.input} value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label="Data de nascimento" htmlFor="birth_date">
                <input id="birth_date" type="date" style={S.input} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              </Field>
            </div>
            <div style={S.grid2}>
              <Field label="CPF" htmlFor="cpf">
                <input id="cpf" style={S.input} value={cpf} onChange={(e) => setCpf(e.target.value)} />
              </Field>
              <Field label="RG" htmlFor="rg">
                <input id="rg" style={S.input} value={rg} onChange={(e) => setRg(e.target.value)} />
              </Field>
            </div>
            <div style={S.grid2}>
              <Field label="Nacionalidade" htmlFor="nationality">
                <input id="nationality" style={S.input} value={nationality} onChange={(e) => setNationality(e.target.value)} />
              </Field>
              <Field label="Telefone" htmlFor="phone">
                <input id="phone" style={S.input} value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
            </div>
            <Field label="E-mail" htmlFor="email">
              <input id="email" type="email" style={{ ...S.input, maxWidth: "360px" }} value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
          </fieldset>

          {/* Sport data */}
          <fieldset style={S.fieldset}>
            <legend style={S.legend}>Dados Esportivos</legend>
            <div style={S.grid3}>
              <Field label="Posição" htmlFor="position">
                <input id="position" style={S.input} value={position} onChange={(e) => setPosition(e.target.value)} />
              </Field>
              <Field label="Apelido" htmlFor="nickname">
                <input id="nickname" style={S.input} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Ex: Nenê, Tigrão" />
              </Field>
              <Field label="Pé dominante" htmlFor="foot">
                <select id="foot" style={{ ...S.input, ...S.select }} value={preferredFoot} onChange={(e) => setPreferredFoot(e.target.value)}>
                  <option value="">Não informado</option>
                  {FOOT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
            </div>
            <div style={S.grid3}>
              <Field label="Altura (cm)" htmlFor="height">
                <input id="height" type="number" style={S.input} value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
              </Field>
              <Field label="Peso (kg)" htmlFor="weight">
                <input id="weight" type="number" step="0.1" style={S.input} value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
              </Field>
            </div>
          </fieldset>

          <fieldset style={S.fieldset}>
            <legend style={S.legend}>Observações</legend>
            <textarea style={S.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </fieldset>

          {error && <p style={S.errorMsg}>{error}</p>}
          {success && <p style={S.successMsg}>✔ Atleta atualizado! Redirecionando…</p>}

          <p style={{ fontSize: "0.8rem", color: "#ffffff", margin: 0 }}>
            Campos marcados com <span style={{ color: "#f38ba8", fontWeight: 700 }}>*</span> são obrigatórios.
          </p>

          <div style={S.actions}>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || submitting}
              style={S.btnDelete}
            >
              {deleting ? "Excluindo…" : "🗑 Excluir atleta"}
            </button>
            <div style={{ flex: 1 }} />
            <Link to="/admin/atletas" style={S.btnCancel}>Cancelar</Link>
            <button type="submit" style={S.btnSubmit} disabled={submitting || deleting}>
              {submitting ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: { backgroundColor: "#18265b", borderBottom: "1px solid #313244", position: "relative", overflow: "hidden" },
  heroAccent: { position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #a6e3a1, #89b4fa)" },
  heroInner: { maxWidth: "900px", margin: "0 auto", padding: "1.5rem 1.5rem 1.25rem" },
  back: { display: "inline-block", color: "#89b4fa", textDecoration: "none", fontSize: "0.85rem", marginBottom: "0.75rem" },
  title: { fontSize: "1.5rem", fontWeight: 700, color: "#cdd6f4", margin: 0 },
  subNav: { display: "flex", gap: "1rem", marginTop: "0.75rem", flexWrap: "wrap" },
  subLink: { color: "#89b4fa", textDecoration: "none", fontSize: "0.85rem", borderBottom: "1px solid transparent" },
  page: { maxWidth: "900px", margin: "0 auto", padding: "2rem 1.5rem 4rem" },
  form: { display: "flex", flexDirection: "column", gap: "1.5rem" },
  fieldset: { border: "1px solid #313244", borderRadius: "8px", padding: "1.25rem 1.5rem", margin: 0 },
  legend: { fontSize: "0.84rem", fontWeight: 700, color: "#cdd6f4", textTransform: "uppercase", letterSpacing: "0.07em", padding: "0 0.5rem" },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "1rem" },
  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginTop: "1rem" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "0.3rem" },
  label: { fontSize: "0.83rem", fontWeight: 600, color: "#cdd6f4", textTransform: "uppercase", letterSpacing: "0.06em" },
  input: { backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "6px", color: "#cdd6f4", fontSize: "0.9rem", padding: "0.55rem 0.75rem", outline: "none", width: "100%", boxSizing: "border-box" },
  select: { cursor: "pointer", appearance: "auto" },
  textarea: { backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "6px", color: "#cdd6f4", fontSize: "0.9rem", padding: "0.55rem 0.75rem", outline: "none", width: "100%", resize: "vertical", boxSizing: "border-box", marginTop: "0.5rem" },
  photoPreview: { width: 80, height: 80, borderRadius: "8px", objectFit: "cover", border: "2px solid #313244", backgroundColor: "#18265b", flexShrink: 0 },
  photoPencil: { position: "absolute", bottom: "-6px", right: "-6px", width: "26px", height: "26px", borderRadius: "50%", backgroundColor: "#cba6f7", border: "2px solid #18265b", color: "#11111b", fontSize: "0.75rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 },
  errorMsg: { color: "#f38ba8", backgroundColor: "#2a1a1f", border: "1px solid #5a2a30", borderRadius: "6px", padding: "0.75rem 1rem", fontSize: "0.875rem" },
  successMsg: { color: "#a6e3a1", backgroundColor: "#1a2a1f", border: "1px solid #2a5a30", borderRadius: "6px", padding: "0.75rem 1rem", fontSize: "0.875rem" },
  actions: { display: "flex", justifyContent: "flex-end", gap: "0.75rem", paddingTop: "0.5rem", alignItems: "center" },
  btnCancel: { backgroundColor: "transparent", border: "1px solid #313244", borderRadius: "6px", color: "#cdd6f4", fontSize: "0.9rem", fontWeight: 500, padding: "0.6rem 1.25rem", textDecoration: "none", display: "inline-flex", alignItems: "center" },
  btnSubmit: { backgroundColor: "#cba6f7", border: "none", borderRadius: "6px", color: "#11111b", fontSize: "0.9rem", fontWeight: 700, padding: "0.6rem 1.5rem", cursor: "pointer" },
  btnDelete: { backgroundColor: "transparent", border: "1px solid #f38ba8", borderRadius: "6px", color: "#f38ba8", fontSize: "0.85rem", fontWeight: 600, padding: "0.55rem 1rem", cursor: "pointer" },
};
