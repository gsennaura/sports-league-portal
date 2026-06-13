import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { CreateReferee } from "@application/use_cases/CreateReferee";

interface Props {
  createReferee: CreateReferee;
}

function Field({ label, htmlFor, required, children }: { label: string; htmlFor: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={S.fieldGroup}>
      <label htmlFor={htmlFor} className="form-label">
        {label}{required && <span style={{ color: "#f38ba8" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

export function AdminRefereeCreatePage({ createReferee }: Props) {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [cpf, setCpf] = useState("");
  const [nationality, setNationality] = useState("Brasileiro");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Nome é obrigatório."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const referee = await createReferee.execute({
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        birth_date: birthDate || undefined,
        cpf: cpf.trim() || undefined,
        nationality: nationality.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        photo_url: photoUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => navigate(`/admin/arbitros/${referee.id}/editar`), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar árbitro.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner">
          <Link to="/admin/arbitros" className="back-link">← Árbitros</Link>
          <h1 className="page-title">Novo Árbitro</h1>
        </div>
      </header>

      <main className="page-container">
        <form onSubmit={handleSubmit} style={S.form} noValidate>

          <fieldset style={S.fieldset}>
            <legend style={S.legend}>Identificação</legend>
            <div style={S.grid2}>
              <Field label="Nome completo" htmlFor="name" required>
                <input id="name" style={S.input} value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label="Apelido / Vulgo" htmlFor="nickname">
                <input id="nickname" style={S.input} value={nickname} onChange={(e) => setNickname(e.target.value)} />
              </Field>
            </div>
            <div style={S.grid2}>
              <Field label="Data de nascimento" htmlFor="birth_date">
                <input id="birth_date" type="date" style={S.input} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              </Field>
              <Field label="CPF" htmlFor="cpf">
                <input id="cpf" style={S.input} value={cpf} onChange={(e) => setCpf(e.target.value)} />
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

          <fieldset style={{ ...S.fieldset, marginTop: "1.25rem" }}>
            <legend style={S.legend}>Extra</legend>
            <Field label="URL da foto" htmlFor="photo_url">
              <input id="photo_url" style={S.input} value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://..." />
            </Field>
            <Field label="Observações" htmlFor="notes">
              <textarea id="notes" style={{ ...S.input, minHeight: "80px", resize: "vertical" }} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </fieldset>

          {error && <p style={S.errorMsg}>{error}</p>}
          {success && <p style={S.successMsg}>✓ Árbitro criado! Redirecionando…</p>}

          <div style={S.actions}>
            <button type="button" style={S.btnCancel} onClick={() => navigate("/admin/arbitros")}>
              Cancelar
            </button>
            <button type="submit" style={S.btnSave} disabled={submitting}>
              {submitting ? "Salvando…" : "Criar árbitro"}
            </button>
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
  errorMsg: { color: "#f38ba8", fontSize: "0.85rem", marginTop: "1rem", marginBottom: 0 },
  successMsg: { color: "#a6e3a1", fontSize: "0.85rem", marginTop: "1rem", marginBottom: 0 },
  actions: { display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.5rem" },
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
