import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "@infrastructure/apiBase";
import { authHeaders } from "@infrastructure/authHeaders";
import { ApiAuthRepository, type LeagueAdminAssignment } from "@infrastructure/repositories/ApiAuthRepository";

const authRepo = new ApiAuthRepository();

interface UserItem {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface LeagueItem {
  id: string;
  name: string;
}

interface AssignmentEnriched extends LeagueAdminAssignment {
  userName: string | null;
  userEmail: string;
  leagueName: string;
}

export function AdminLeagueAdminsPage() {
  const [assignments, setAssignments] = useState<AssignmentEnriched[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [leagues, setLeagues] = useState<LeagueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedLeagueId, setSelectedLeagueId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const filteredUsers = userSearch.trim().length < 1
    ? []
    : users
        .filter((u) => u.role !== "full_admin")
        .filter((u) => {
          const q = userSearch.toLowerCase();
          return (
            (u.name ?? "").toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q)
          );
        })
        .sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email))
        .slice(0, 8);

  const token = localStorage.getItem("auth_token") ?? "";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rawAssignments, rawUsers, rawLeagues] = await Promise.all([
        authRepo.listLeagueAdminAssignments(token),
        fetch(`${API_BASE}/auth/users`, { headers: authHeaders() }).then((r) => r.json() as Promise<UserItem[]>),
        fetch(`${API_BASE}/leagues?`, { headers: authHeaders() }).then((r) => r.json() as Promise<LeagueItem[]>),
      ]);
      setUsers(rawUsers);
      setLeagues(rawLeagues);

      const userMap = new Map(rawUsers.map((u) => [u.id, u]));
      const leagueMap = new Map(rawLeagues.map((l) => [l.id, l]));

      const enriched: AssignmentEnriched[] = rawAssignments.map((a) => ({
        ...a,
        userName: userMap.get(a.user_id)?.name ?? null,
        userEmail: userMap.get(a.user_id)?.email ?? a.user_id,
        leagueName: leagueMap.get(a.league_id)?.name ?? a.league_id,
      }));
      setAssignments(enriched);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId || !selectedLeagueId) return;
    setAssigning(true);
    setAssignError(null);
    try {
      await authRepo.assignLeagueAdmin(token, selectedUserId, selectedLeagueId);
      setSelectedUserId("");
      setSelectedUser(null);
      setUserSearch("");
      setSelectedLeagueId("");
      await load();
    } catch (e) {
      setAssignError((e as Error).message);
    } finally {
      setAssigning(false);
    }
  }

  async function handleRevoke(assignmentId: string) {
    if (!confirm("Revogar este admin de liga?")) return;
    try {
      await authRepo.revokeLeagueAdmin(token, assignmentId);
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <>
      <header style={S.hero}>
        <div style={S.heroAccent} />
        <div style={S.heroInner}>
          <h1 style={S.title}>Admins de Liga</h1>
          <p style={S.subtitle}>{assignments.length} atribuiç{assignments.length !== 1 ? "ões" : "ão"} ativa{assignments.length !== 1 ? "s" : ""}</p>
        </div>
      </header>

      <main style={S.page}>
        {/* Assign form */}
        <section style={S.card}>
          <h2 style={S.sectionTitle}>Atribuir Admin de Liga</h2>
          <form onSubmit={(e) => void handleAssign(e)} style={S.form}>
            {/* User search combobox */}
            <div style={S.comboWrap}>
              {selectedUser ? (
                <div style={S.selectedChip}>
                  <span style={S.chipText}>
                    {selectedUser.name
                      ? <><strong>{selectedUser.name}</strong> <span style={S.chipEmail}>({selectedUser.email})</span></>
                      : selectedUser.email
                    }
                  </span>
                  <button
                    type="button"
                    style={S.chipClear}
                    onClick={() => {
                      setSelectedUser(null);
                      setSelectedUserId("");
                      setUserSearch("");
                    }}
                    aria-label="Limpar usuário"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  style={S.searchInput}
                  placeholder="Buscar usuário por nome ou e-mail…"
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setSearchOpen(true); }}
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                  autoComplete="off"
                />
              )}
              {searchOpen && filteredUsers.length > 0 && !selectedUser && (
                <div style={S.dropdown}>
                  {filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      style={S.dropdownItem}
                      onMouseDown={() => {
                        setSelectedUser(u);
                        setSelectedUserId(u.id);
                        setUserSearch("");
                        setSearchOpen(false);
                      }}
                    >
                      <span style={S.dropName}>{u.name ?? <em style={{ color: "#ffffff" }}>sem nome</em>}</span>
                      <span style={S.dropEmail}>{u.email}</span>
                    </button>
                  ))}
                </div>
              )}
              {searchOpen && userSearch.trim().length >= 1 && filteredUsers.length === 0 && !selectedUser && (
                <div style={S.dropdownEmpty}>Nenhum usuário encontrado.</div>
              )}
            </div>
            <select
              style={S.select}
              value={selectedLeagueId}
              onChange={(e) => setSelectedLeagueId(e.target.value)}
              required
            >
              <option value="">Selecionar liga...</option>
              {leagues
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
            </select>
            <button type="submit" style={S.btnPrimary} disabled={assigning || !selectedUserId || !selectedLeagueId}>
              {assigning ? "Atribuindo..." : "Atribuir"}
            </button>
          </form>
          {assignError && <p style={S.errorText}>{assignError}</p>}
        </section>

        {/* Assignments list */}
        {loading && <p style={S.hint}>Carregando...</p>}
        {error && <p style={S.errorText}>{error}</p>}

        {!loading && !error && (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Usuário</th>
                  <th style={S.th}>E-mail</th>
                  <th style={S.th}>Liga</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Desde</th>
                  <th style={S.th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={S.empty}>Nenhum admin de liga atribuído.</td>
                  </tr>
                ) : (
                  assignments.map((a) => (
                    <tr key={a.id} style={S.trRow}>
                      <td style={S.td}>{a.userName ?? <span style={S.muted}>—</span>}</td>
                      <td style={S.td}>{a.userEmail}</td>
                      <td style={S.td}>
                        <span style={S.leagueBadge}>{a.leagueName}</span>
                      </td>
                      <td style={S.td}>
                        <span style={a.is_active ? S.active : S.inactive}>
                          {a.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td style={S.td}>{a.created_at}</td>
                      <td style={S.td}>
                        <button
                          style={S.btnDanger}
                          onClick={() => void handleRevoke(a.id)}
                        >
                          Revogar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
    background: "linear-gradient(90deg, #89b4fa, #cba6f7)",
  },
  heroInner: { maxWidth: "1100px", margin: "0 auto", padding: "1.5rem 1.5rem 1.25rem" },
  title: { fontSize: "1.5rem", fontWeight: 700, color: "#cdd6f4", margin: 0 },
  subtitle: { fontSize: "0.85rem", color: "#ffffff", margin: "4px 0 0" },

  page: { maxWidth: "1100px", margin: "0 auto", padding: "1.5rem 1.5rem 4rem" },

  card: {
    background: "#18265b",
    border: "1px solid #313244",
    borderRadius: 12,
    padding: "1.25rem",
    marginBottom: "1.5rem",
  },
  sectionTitle: { color: "#cba6f7", fontSize: "1rem", fontWeight: 600, margin: "0 0 1rem" },

  form: { display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" },
  select: {
    flex: 1,
    minWidth: 200,
    background: "#18265b",
    border: "1px solid #313244",
    borderRadius: 8,
    color: "#cdd6f4",
    padding: "0.5rem 0.75rem",
    fontSize: "0.9rem",
    outline: "none",
    cursor: "pointer",
  },

  btnPrimary: {
    background: "#cba6f7",
    color: "#18265b",
    border: "none",
    borderRadius: 8,
    padding: "0.5rem 1.25rem",
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  btnDanger: {
    background: "transparent",
    color: "#f38ba8",
    border: "1px solid #f38ba8",
    borderRadius: 6,
    padding: "0.25rem 0.75rem",
    fontSize: "0.8rem",
    cursor: "pointer",
  },

  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: "0.6rem 0.75rem",
    color: "#ffffff",
    fontSize: "0.8rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: "1px solid #313244",
  },
  td: { padding: "0.75rem", color: "#cdd6f4", fontSize: "0.9rem", borderBottom: "1px solid #18265b" },
  trRow: { transition: "background 0.15s" },
  empty: { padding: "2rem", textAlign: "center", color: "#ffffff", fontSize: "0.9rem" },

  leagueBadge: {
    display: "inline-block",
    padding: "0.2rem 0.6rem",
    borderRadius: 6,
    border: "1px solid #89b4fa",
    color: "#89b4fa",
    fontSize: "0.8rem",
  },
  active: {
    display: "inline-block",
    padding: "0.2rem 0.6rem",
    borderRadius: 6,
    background: "rgba(166, 227, 161, 0.15)",
    color: "#a6e3a1",
    fontSize: "0.8rem",
  },
  inactive: {
    display: "inline-block",
    padding: "0.2rem 0.6rem",
    borderRadius: 6,
    background: "rgba(243, 139, 168, 0.15)",
    color: "#f38ba8",
    fontSize: "0.8rem",
  },
  muted: { color: "#45475a" },
  hint: { color: "#ffffff", fontSize: "0.9rem" },
  errorText: { color: "#f38ba8", fontSize: "0.9rem" },

  // Combobox
  comboWrap: { flex: 1, minWidth: 240, position: "relative" },
  searchInput: {
    width: "100%",
    background: "#18265b",
    border: "1px solid #313244",
    borderRadius: 8,
    color: "#cdd6f4",
    padding: "0.5rem 0.75rem",
    fontSize: "0.9rem",
    outline: "none",
    boxSizing: "border-box",
  },
  selectedChip: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    background: "#18265b",
    border: "1px solid #89b4fa",
    borderRadius: 8,
    padding: "0.45rem 0.75rem",
    color: "#cdd6f4",
    fontSize: "0.9rem",
  },
  chipText: { flex: 1 },
  chipEmail: { color: "#ffffff", fontSize: "0.82rem" },
  chipClear: {
    background: "none",
    border: "none",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "1.1rem",
    lineHeight: 1,
    padding: "0 2px",
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    background: "#18265b",
    border: "1px solid #313244",
    borderRadius: 8,
    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
    zIndex: 100,
    maxHeight: 260,
    overflowY: "auto",
  },
  dropdownItem: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "flex-start",
    width: "100%",
    background: "none",
    border: "none",
    padding: "0.6rem 0.85rem",
    cursor: "pointer",
    gap: "2px",
    borderBottom: "1px solid #313244",
    color: "#cdd6f4",
  },
  dropdownEmpty: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    background: "#18265b",
    border: "1px solid #313244",
    borderRadius: 8,
    padding: "0.75rem 1rem",
    color: "#ffffff",
    fontSize: "0.85rem",
    zIndex: 100,
  },
  dropName: { color: "#cdd6f4", fontSize: "0.9rem" },
  dropEmail: { color: "#ffffff", fontSize: "0.8rem" },
};
