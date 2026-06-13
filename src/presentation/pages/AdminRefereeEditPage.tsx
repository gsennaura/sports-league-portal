import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { UpdateReferee } from "@application/use_cases/UpdateReferee";
import type { DeleteReferee } from "@application/use_cases/DeleteReferee";
import type { RefereeRepository } from "@domain/repositories/RefereeRepository";
import type { Referee } from "@domain/entities/Referee";
import { PhotoUploadModal } from "@presentation/components/PhotoUploadModal";

interface Props {
  updateReferee: UpdateReferee;
  deleteReferee: DeleteReferee;
  refereeRepository: RefereeRepository;
}

const NO_PHOTO =
  "https://raw.githubusercontent.com/gsennaura/sports-manager-assets/refs/heads/main/referees/no_referee_photo.png";

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="form-field-group">
      <label htmlFor={htmlFor} className="form-label">{label}</label>
      {children}
    </div>
  );
}

export function AdminRefereeEditPage({ updateReferee, deleteReferee, refereeRepository }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [_referee, setReferee] = useState<Referee | null>(null);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [cpf, setCpf] = useState("");
  const [nationality, setNationality] = useState("Brasileiro");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    refereeRepository
      .getById(id)
      .then((r) => {
        setReferee(r);
        setName(r.name);
        setNickname(r.nickname ?? "");
        setBirthDate(r.birth_date?.slice(0, 10) ?? "");
        setCpf(r.cpf ?? "");
        setNationality(r.nationality ?? "Brasileiro");
        setPhone(r.phone ?? "");
        setEmail(r.email ?? "");
        setNotes(r.notes ?? "");
        setPhotoUrl(r.photo_url ?? "");
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !id) { setError("Nome é obrigatório."); return; }
    setSubmitting(true);
    setError(null);
    try {
      let finalPhotoUrl = photoUrl;
      if (photoFile) {
        const result = await refereeRepository.uploadPhoto(id, photoFile);
        finalPhotoUrl = result.photo_url;
      }
      await updateReferee.execute({
        id,
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        birth_date: birthDate || undefined,
        cpf: cpf.trim() || undefined,
        nationality: nationality.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        photo_url: finalPhotoUrl || undefined,
        notes: notes.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => navigate("/admin/arbitros"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    if (!confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteReferee.execute(id);
      navigate("/admin/arbitros");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir árbitro.");
      setDeleting(false);
    }
  }

  if (loading) return <main style={{ padding: "2rem 1.5rem", color: "var(--c-text)" }}>Carregando…</main>;

  return (
    <>
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner">
          <Link to="/admin/arbitros" className="back-link">← Árbitros</Link>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
            <h1 className="page-title">Editar Árbitro</h1>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Link to={`/arbitros/${id}`} className="row-link">Ver Perfil Público</Link>
            </div>
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

          <fieldset style={{ ...S.fieldset, marginTop: "1.25rem" }}>
            <legend className="form-legend">Identificação</legend>
            <div className="form-field-group--2">
              <Field label="Nome completo *" htmlFor="name">
                <input id="name" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label="Apelido / Vulgo" htmlFor="nickname">
                <input id="nickname" className="form-input" value={nickname} onChange={(e) => setNickname(e.target.value)} />
              </Field>
            </div>
            <div className="form-field-group--2">
              <Field label="Data de nascimento" htmlFor="birth_date">
                <input id="birth_date" type="date" className="form-input" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              </Field>
              <Field label="CPF" htmlFor="cpf">
                <input id="cpf" className="form-input" value={cpf} onChange={(e) => setCpf(e.target.value)} />
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

          <fieldset style={{ ...S.fieldset, marginTop: "1.25rem" }}>
            <legend className="form-legend">Observações</legend>
            <Field label="Observações" htmlFor="notes">
              <textarea id="notes" className="form-input" style={{ minHeight: "80px", resize: "vertical" }} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </fieldset>

          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">✓ Árbitro salvo! Redirecionando…</p>}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Excluindo…" : "Excluir árbitro"}
            </button>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate("/admin/arbitros")}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </form>
      </main>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: {
    background: "linear-gradient(135deg, #18265b 0%, #313244 100%)",
    borderBottom: "1px solid #45475a",
    position: "relative", overflow: "hidden",
  },
  heroAccent: {
    position: "absolute", inset: 0,
    background: "linear-gradient(90deg, rgba(203,166,247,0.08) 0%, transparent 60%)",
    pointerEvents: "none",
  },
  heroInner: {
    maxWidth: "720px", margin: "0 auto",
    padding: "1.5rem 1.5rem 1.25rem",
  },
  back: { color: "#89b4fa", textDecoration: "none", fontSize: "0.85rem", display: "block", marginBottom: "0.5rem" },
  title: { margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#cdd6f4", letterSpacing: "-0.02em" },
  subLink: {
    padding: "0.35rem 0.75rem", borderRadius: "6px", fontSize: "0.82rem",
    background: "#313244", color: "#cdd6f4", textDecoration: "none",
  },
  page: { maxWidth: "720px", margin: "2rem auto", padding: "0 1.5rem 4rem" },
  form: { background: "#18265b", border: "1px solid #313244", borderRadius: "12px", padding: "1.5rem" },
  fieldset: { border: "none", margin: 0, padding: 0 },
  legend: {
    color: "#cba6f7", fontSize: "0.78rem", fontWeight: 600,
    letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1rem", display: "block",
  },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "0.4rem" },
  label: { color: "#cdd6f4", fontSize: "0.82rem", fontWeight: 500 },
  input: {
    background: "#18265b", border: "1px solid #45475a", borderRadius: "8px",
    padding: "0.6rem 0.75rem", color: "#cdd6f4", fontSize: "0.95rem",
    width: "100%", outline: "none", boxSizing: "border-box",
  },
  photoPreview: {
    width: 72, height: 72, borderRadius: "50%",
    objectFit: "cover", border: "2px solid #313244", backgroundColor: "#18265b",
  },
  photoPencil: { position: "absolute", bottom: "-4px", right: "-4px", width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#cba6f7", border: "2px solid #18265b", color: "#11111b", fontSize: "0.7rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 },
  errorMsg: { color: "#f38ba8", fontSize: "0.85rem", marginTop: "1rem", marginBottom: 0 },
  successMsg: { color: "#a6e3a1", fontSize: "0.85rem", marginTop: "1rem", marginBottom: 0 },
  actions: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginTop: "1.5rem", flexWrap: "wrap", gap: "0.75rem",
  },
  btnDelete: {
    background: "none", border: "1px solid #f38ba844", borderRadius: "8px",
    padding: "0.6rem 1.1rem", color: "#f38ba8", fontSize: "0.875rem", cursor: "pointer",
  },
  btnCancel: {
    background: "none", border: "1px solid #45475a", borderRadius: "8px",
    padding: "0.6rem 1.25rem", color: "#cdd6f4", fontSize: "0.875rem", cursor: "pointer",
  },
  btnSave: {
    background: "#cba6f7", border: "none", borderRadius: "8px",
    padding: "0.6rem 1.5rem", color: "#18265b", fontSize: "0.875rem",
    fontWeight: 700, cursor: "pointer",
  },
};
