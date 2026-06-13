import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authHeaders } from "@infrastructure/authHeaders";
import { API_BASE } from "@infrastructure/apiBase";
import bgSports from "../../images/bg_sports.png";

const ROLES = [
  { value: "full_admin", label: "Administrador Geral" },
  { value: "league_admin", label: "Admin de Liga" },
  { value: "team_admin", label: "Admin de Time" },
  { value: "user", label: "Usuário" },
];

export function AdminUserCreatePage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("full_admin");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) { setError("Email é obrigatório."); return; }
    if (password.length < 6) { setError("Senha deve ter ao menos 6 caracteres."); return; }
    if (password !== confirmPassword) { setError("As senhas não coincidem."); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ email: email.trim(), password, role }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(detail.detail ?? "Erro ao criar usuário.");
      }
      setSuccess(true);
      setTimeout(() => navigate("/admin/usuarios"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar usuário.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", backgroundImage: `url(${bgSports})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}>
      <div style={{ minHeight: "100vh", background: "rgba(0,0,0,0.55)" }}>
      <header className="hero">
        <div className="hero__inner">
          <nav style={S.breadcrumb}>
            <Link to="/admin/usuarios" style={S.breadcrumbLink}>Usuários</Link>
            <span style={S.breadcrumbSep}>/</span>
            <span>Novo usuário</span>
          </nav>
          <h1 className="hero__title">Criar usuário</h1>
        </div>
      </header>

      <main style={S.main}>
        <div style={S.card}>
          {success && (
            <div style={S.successBanner}>Usuário criado com sucesso!</div>
          )}
          {error && (
            <div style={S.errorBanner}>{error}</div>
          )}

          <form onSubmit={handleSubmit} style={S.form} noValidate>
            <div style={S.fieldGroup}>
              <label className="form-label" htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={S.input}
                placeholder="usuario@exemplo.com"
                autoComplete="off"
                required
              />
            </div>

            <div style={S.fieldGroup}>
              <label className="form-label" htmlFor="role">Perfil</label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={S.input}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div style={S.fieldGroup}>
              <label className="form-label" htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={S.input}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                required
              />
            </div>

            <div style={S.fieldGroup}>
              <label className="form-label" htmlFor="confirmPassword">Confirmar senha</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={S.input}
                placeholder="Repita a senha"
                autoComplete="new-password"
                required
              />
            </div>

            <div style={S.passwordHint}>
              A senha será armazenada de forma segura com hash bcrypt —
              nunca salvamos a senha em texto puro.
            </div>

            <div style={S.actions}>
              <Link to="/admin/usuarios" style={S.cancelBtn}>Cancelar</Link>
              <button type="submit" disabled={submitting} style={submitting ? S.submitBtnDisabled : S.submitBtn}>
                {submitting ? "Salvando…" : "Criar usuário"}
              </button>
            </div>
          </form>
        </div>
      </main>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: {
    background: "rgba(15, 23, 42, 0.70)",
    padding: "2.5rem 1.5rem 2rem",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  heroInner: { maxWidth: 640, margin: "0 auto" },
  breadcrumb: {
    display: "flex", gap: "0.4rem", alignItems: "center",
    fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.75rem",
  },
  breadcrumbLink: { color: "#60a5fa", textDecoration: "none" },
  breadcrumbSep: { color: "#475569" },
  heroTitle: { color: "#f1f5f9", fontSize: "1.6rem", fontWeight: 700, margin: 0 },

  main: { maxWidth: 640, margin: "2rem auto", padding: "0 1.5rem 4rem" },
  card: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 12,
    padding: "2rem",
  },

  form: { display: "flex", flexDirection: "column", gap: "1.25rem" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "0.4rem" },
  label: { color: "#cbd5e1", fontSize: "0.875rem", fontWeight: 500 },
  input: {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 8,
    color: "#f1f5f9",
    fontSize: "0.95rem",
    padding: "0.6rem 0.9rem",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  passwordHint: {
    fontSize: "0.78rem",
    color: "#64748b",
    borderLeft: "3px solid #334155",
    paddingLeft: "0.75rem",
    lineHeight: 1.5,
  },

  actions: {
    display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem",
  },
  cancelBtn: {
    padding: "0.55rem 1.2rem",
    borderRadius: 8,
    background: "transparent",
    border: "1px solid #475569",
    color: "#94a3b8",
    textDecoration: "none",
    fontSize: "0.9rem",
    display: "inline-flex", alignItems: "center",
  },
  submitBtn: {
    padding: "0.55rem 1.4rem",
    borderRadius: 8,
    background: "#3b82f6",
    border: "none",
    color: "#fff",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  submitBtnDisabled: {
    padding: "0.55rem 1.4rem",
    borderRadius: 8,
    background: "#1d4ed8",
    border: "none",
    color: "#94a3b8",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "not-allowed",
    opacity: 0.6,
  },

  successBanner: {
    background: "#14532d",
    border: "1px solid #166534",
    color: "#bbf7d0",
    borderRadius: 8,
    padding: "0.75rem 1rem",
    marginBottom: "1rem",
    fontSize: "0.9rem",
  },
  errorBanner: {
    background: "#450a0a",
    border: "1px solid #7f1d1d",
    color: "#fca5a5",
    borderRadius: 8,
    padding: "0.75rem 1rem",
    marginBottom: "1rem",
    fontSize: "0.9rem",
  },
};
