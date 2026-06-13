import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@presentation/context/AuthContext";
import bgSports from "../../images/bg_sports.png";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) { setError("Preencha email e senha."); return; }
    setSubmitting(true);
    try {
      const me = await login(email.trim(), password);
      if (me.role === "athlete") {
        navigate("/meu-perfil");
      } else if (me.role === "full_admin" || me.role === "league_admin") {
        navigate("/admin/pendencias-vinculo");
      } else {
        // user (torcedor) ou qualquer outro role sem dashboard admin
        navigate("/meu-perfil");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="login-page"
      style={{ backgroundImage: `url(${bgSports})` }}
    >
      <div className="login-page__overlay" />
      <div className="card login-page__card">
        <h2 className="page-title">Entrar</h2>
        {error && <p className="error-text">{error}</p>}
        <form onSubmit={handleSubmit} className="form-body">
          <label className="form-label">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="form-input"
            />
          </label>
          <label className="form-label">
            Senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="form-input"
            />
          </label>
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? "Entrando…" : "Entrar"}
          </button>
          <p className="muted" style={{ textAlign: "center" }}>
            Não tem conta?{" "}
            <Link to="/cadastro" className="row-link">Cadastre-se</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

