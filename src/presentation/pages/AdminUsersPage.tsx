import { useState, useEffect } from "react";
import { API_BASE } from "@infrastructure/apiBase";
import { authHeaders } from "@infrastructure/authHeaders";

interface UserItem {
  id: string;
  email: string;
  role: string;
  name: string | null;
  is_active: boolean;
}

const ROLE_LABEL: Record<string, string> = {
  full_admin: "Administrador",
  league_admin: "Admin de Liga",
  team_admin: "Admin de Time",
  athlete: "Atleta",
  user: "Torcedor",
  dirigente: "Dirigente",
};

const ROLE_COLOR: Record<string, string> = {
  full_admin: "#cba6f7",
  league_admin: "#89b4fa",
  team_admin: "#74c7ec",
  athlete: "#a6e3a1",
  user: "#fab387",
  dirigente: "#f9e2af",
};

export function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/auth/users`, { headers: authHeaders() })
      .then((r) => {
        if (!r.ok) throw new Error(`Erro ${r.status}`);
        return r.json() as Promise<UserItem[]>;
      })
      .then(setUsers)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch =
      u.email.toLowerCase().includes(q) ||
      (u.name ?? "").toLowerCase().includes(q);
    const matchesRole = roleFilter ? u.role === roleFilter : true;
    return matchesSearch && matchesRole;
  });

  const roles = [...new Set(users.map((u) => u.role))].sort();

  return (
    <>
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner">
          <h1 className="page-title">Usuários</h1>
          <p className="page-subtitle">{users.length} usuário{users.length !== 1 ? "s" : ""} cadastrado{users.length !== 1 ? "s" : ""}</p>
        </div>
      </header>

      <main className="page-container">
        <div style={S.toolbar}>
          <input
            style={S.search}
            type="search"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            style={S.select}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">Todos os perfis</option>
            {roles.map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>
            ))}
          </select>
        </div>

        {loading && <p style={S.hint}>Carregando...</p>}
        {error && <p style={S.errorText}>{error}</p>}

        {!loading && !error && (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={S.th}>Nome</th>
                    <th style={S.th}>E-mail</th>
                    <th style={S.th}>Perfil</th>
                    <th style={S.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={S.empty}>
                        {search || roleFilter
                          ? "Nenhum usuário encontrado para este filtro."
                          : "Nenhum usuário cadastrado."}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((u) => (
                      <tr key={u.id} style={S.trRow}>
                        <td style={S.td}>{u.name ?? <span className="muted">—</span>}</td>
                        <td style={S.td}>{u.email}</td>
                        <td style={S.td}>
                          <span
                            style={{
                              ...S.badge,
                              color: ROLE_COLOR[u.role] ?? "#cdd6f4",
                              borderColor: ROLE_COLOR[u.role] ?? "#45475a",
                            }}
                          >
                            {ROLE_LABEL[u.role] ?? u.role}
                          </span>
                        </td>
                        <td style={S.td}>
                          <span style={u.is_active ? S.active : S.inactive}>
                            {u.is_active ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p style={S.count}>
              {filtered.length} usuário{filtered.length !== 1 ? "s" : ""}
              {(search || roleFilter) && ` encontrado${filtered.length !== 1 ? "s" : ""}`}
            </p>
          </>
        )}
      </main>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: {
    backgroundColor: "#18265b",
    borderBottom: "1px solid #313244",
    position: "relative",
    overflow: "hidden",
  },
  heroAccent: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: "3px",
    background: "linear-gradient(90deg, #cba6f7, #89b4fa)",
  },
  heroInner: { maxWidth: "1100px", margin: "0 auto", padding: "1.5rem 1.5rem 1.25rem" },
  title: { fontSize: "1.5rem", fontWeight: 700, color: "#cdd6f4", margin: 0 },
  subtitle: { fontSize: "0.85rem", color: "#ffffff", margin: "4px 0 0" },

  page: { maxWidth: "1100px", margin: "0 auto", padding: "1.5rem 1.5rem 4rem" },

  toolbar: { display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" },
  search: {
    flex: 1,
    minWidth: 200,
    background: "#18265b",
    border: "1px solid #313244",
    borderRadius: 8,
    color: "#cdd6f4",
    padding: "0.5rem 0.75rem",
    fontSize: "0.9rem",
    outline: "none",
  },
  select: {
    background: "#18265b",
    border: "1px solid #313244",
    borderRadius: 8,
    color: "#cdd6f4",
    padding: "0.5rem 0.75rem",
    fontSize: "0.9rem",
    outline: "none",
    cursor: "pointer",
  },

  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: "0.6rem 0.75rem",
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: "1px solid #313244",
  },
  trRow: {
    borderBottom: "1px solid #18265b",
    transition: "background 0.1s",
  },
  td: { padding: "0.7rem 0.75rem", fontSize: "0.9rem", color: "#cdd6f4", verticalAlign: "middle" },
  empty: { padding: "2rem", textAlign: "center", color: "#ffffff", fontSize: "0.9rem" },
  muted: { color: "#45475a" },

  badge: {
    display: "inline-block",
    padding: "0.2rem 0.6rem",
    borderRadius: 20,
    border: "1px solid",
    fontSize: "0.78rem",
    fontWeight: 600,
  },

  active: { color: "#a6e3a1", fontSize: "0.85rem", fontWeight: 500 },
  inactive: { color: "#f38ba8", fontSize: "0.85rem", fontWeight: 500 },

  hint: { color: "#ffffff", textAlign: "center", marginTop: "2rem" },
  errorText: { color: "#f38ba8", background: "rgba(243,139,168,.1)", border: "1px solid rgba(243,139,168,.3)", borderRadius: 6, padding: "0.5rem 0.75rem" },
  count: { color: "#ffffff", fontSize: "0.82rem", marginTop: "0.75rem" },
};
