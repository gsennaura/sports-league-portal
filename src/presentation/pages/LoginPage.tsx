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
    <div style={S.page}>
      <div style={S.overlay} />
      <div style={S.card}>
        <h2 style={S.title}>Entrar</h2>
        {error && <p style={S.error}>{error}</p>}
        <form onSubmit={handleSubmit} style={S.form}>
          <label style={S.label}>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={S.input}
            />
          </label>
          <label style={S.label}>
            Senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={S.input}
            />
          </label>
          <button type="submit" disabled={submitting} style={S.btn}>
            {submitting ? "Entrando…" : "Entrar"}
          </button>
          <p style={S.register}>
            Não tem conta?{" "}
            <Link to="/cadastro" style={S.registerLink}>Cadastre-se</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundImage: `url(${bgSports})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    position: "relative",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0, 0, 0, 0.60)",
  },
  card: {
    position: "relative",
    zIndex: 1,
    background: "rgba(15, 23, 42, 0.88)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    boxShadow: "0 8px 32px rgba(0,0,0,.5)",
    padding: "2.5rem 2rem",
    width: "100%",
    maxWidth: 380,
  },
  title: {
    margin: "0 0 1.4rem",
    fontSize: "1.6rem",
    fontWeight: 700,
    textAlign: "center",
    color: "#cdd6f4",
    letterSpacing: "0.02em",
  },
  error: {
    color: "#f38ba8",
    marginBottom: "1rem",
    fontSize: ".875rem",
    background: "rgba(243,139,168,0.1)",
    border: "1px solid rgba(243,139,168,0.3)",
    borderRadius: 6,
    padding: "0.5rem 0.75rem",
  },
  form: { display: "flex", flexDirection: "column", gap: "1.1rem" },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: ".35rem",
    fontSize: ".875rem",
    fontWeight: 500,
    color: "#cdd6f4",
  },
  input: {
    padding: ".55rem .85rem",
    borderRadius: 8,
    border: "1px solid #313244",
    background: "#18265b",
    color: "#cdd6f4",
    fontSize: "1rem",
    outline: "none",
  },
  btn: {
    marginTop: ".5rem",
    padding: ".7rem",
    background: "#89b4fa",
    color: "#18265b",
    border: "none",
    borderRadius: 8,
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.01em",
  },
  register: {
    textAlign: "center" as const,
    margin: ".25rem 0 0",
    fontSize: ".85rem",
    color: "#ffffff",
  },
  registerLink: {
    color: "#89b4fa",
    textDecoration: "none",
    fontWeight: 600,
  },
};
