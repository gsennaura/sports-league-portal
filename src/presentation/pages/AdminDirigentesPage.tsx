import React, { useEffect, useState, useCallback } from "react";
import { API_BASE } from "@infrastructure/apiBase";
import { authHeaders } from "@infrastructure/authHeaders";

interface Team {
  id: string;
  name: string;
}

interface UserItem {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface DirigenteAssignment {
  id: string;
  user_id: string;
  team_id: string;
  role: string;
  title: string | null;
  is_active: boolean;
  created_at: string;
}

export function AdminDirigentesPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);

  // Form — user search combobox
  const [userSearch, setUserSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Form — team + title
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [title, setTitle] = useState("");

  // Create
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // List
  const [assignments, setAssignments] = useState<DirigenteAssignment[]>([]);
  const [filterTeamId, setFilterTeamId] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  // Pending requests
  const [pending, setPending] = useState<DirigenteAssignment[]>([]);
  const [processingPending, setProcessingPending] = useState<string | null>(null);
  const [pendingMsg, setPendingMsg] = useState<{ id: string; type: "ok" | "err"; text: string } | null>(null);

  const filteredUsers = userSearch.trim().length < 1
    ? []
    : users
        .filter((u) => {
          const q = userSearch.toLowerCase();
          return (u.name ?? "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
        })
        .sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email))
        .slice(0, 8);

  const loadBase = useCallback(async () => {
    const [teamsData, usersData, pendingData] = await Promise.allSettled([
      fetch(`${API_BASE}/teams?limit=500`).then((r) => r.json() as Promise<Team[]>),
      fetch(`${API_BASE}/auth/users`, { headers: authHeaders() }).then((r) => r.ok ? r.json() as Promise<UserItem[]> : Promise.reject()),
      fetch(`${API_BASE}/dirigentes/pendentes`, { headers: authHeaders() }).then((r) => r.ok ? r.json() as Promise<DirigenteAssignment[]> : Promise.reject()),
    ]);
    if (teamsData.status === "fulfilled")
      setTeams(teamsData.value.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
    if (usersData.status === "fulfilled") setUsers(usersData.value);
    if (pendingData.status === "fulfilled") setPending(pendingData.value);
  }, []);

  useEffect(() => { void loadBase(); }, [loadBase]);

  useEffect(() => {
    if (!filterTeamId) { setAssignments([]); return; }
    fetch(`${API_BASE}/dirigentes?team_id=${filterTeamId}`, { headers: authHeaders() })
      .then((r) => r.ok ? r.json() as Promise<DirigenteAssignment[]> : Promise.reject())
      .then(setAssignments)
      .catch(() => setAssignments([]));
  }, [filterTeamId]);

  function clearForm() {
    setSelectedUser(null);
    setUserSearch("");
    setSelectedTeamId("");
    setTitle("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser || !selectedTeamId) return;
    setCreating(true);
    setCreateMsg(null);
    try {
      const resp = await fetch(`${API_BASE}/dirigentes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ user_id: selectedUser.id, team_id: selectedTeamId, title: title || null }),
      });
      if (!resp.ok) throw new Error(((await resp.json().catch(() => ({}))) as { detail?: string }).detail ?? "Erro ao criar vínculo.");
      setCreateMsg({ type: "ok", text: "Dirigente vinculado com sucesso!" });
      clearForm();
      if (filterTeamId === selectedTeamId) {
        fetch(`${API_BASE}/dirigentes?team_id=${filterTeamId}`, { headers: authHeaders() })
          .then((r) => r.json() as Promise<DirigenteAssignment[]>)
          .then(setAssignments)
          .catch(() => {});
      }
    } catch (e: unknown) {
      setCreateMsg({ type: "err", text: (e as Error).message });
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await fetch(`${API_BASE}/dirigentes/${id}`, { method: "DELETE", headers: authHeaders() });
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    } catch { /* ignore */ } finally {
      setDeleting(null);
    }
  }

  async function handlePendingAction(assignmentId: string, action: "aprovar" | "rejeitar") {
    setProcessingPending(assignmentId);
    setPendingMsg(null);
    try {
      const resp = await fetch(`${API_BASE}/dirigentes/${assignmentId}/${action}`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!resp.ok && resp.status !== 204) throw new Error(((await resp.json().catch(() => ({}))) as { detail?: string }).detail ?? "Erro.");
      setPendingMsg({ id: assignmentId, type: "ok", text: action === "aprovar" ? "Aprovado!" : "Rejeitado." });
      setPending((prev) => prev.filter((p) => p.id !== assignmentId));
    } catch (e: unknown) {
      setPendingMsg({ id: assignmentId, type: "err", text: (e as Error).message });
    } finally {
      setProcessingPending(null);
    }
  }

  return (
    <>
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner">
          <h1 className="page-title">Gerenciar Dirigentes</h1>
          <p className="page-subtitle">Vincule usuários como dirigentes de times</p>
        </div>
      </header>

      <main className="page-container">

        {/* ── Solicitações Pendentes ──────────────────────────── */}
        {pending.length > 0 && (
          <section style={{ ...S.card, borderColor: "#f9e2af" }}>
            <h2 style={{ ...S.sectionTitle, color: "#f9e2af" }}>
              Solicitações Pendentes ({pending.length})
            </h2>
            {pending.map((p) => {
              const u = users.find((x) => x.id === p.user_id);
              const t = teams.find((x) => x.id === p.team_id);
              return (
                <div key={p.id} style={S.row}>
                  <div style={S.rowInfo}>
                    <span style={S.rowMain}>{u?.name ?? u?.email ?? p.user_id}</span>
                    {u?.name && <span style={S.rowSub}>{u.email}</span>}
                    <span style={S.rowSub}>Time: {t?.name ?? p.team_id}</span>
                    {p.title && <span style={S.rowSub}>Cargo: {p.title}</span>}
                    {pendingMsg?.id === p.id && (
                      <span style={{ color: pendingMsg.type === "ok" ? "#a6e3a1" : "#f38ba8", fontSize: "0.8rem" }}>
                        {pendingMsg.text}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      style={{ ...S.btnAction, background: "#a6e3a1", color: "#18265b" }}
                      disabled={processingPending === p.id}
                      onClick={() => void handlePendingAction(p.id, "aprovar")}
                    >Aprovar</button>
                    <button
                      style={S.btnAction}
                      disabled={processingPending === p.id}
                      onClick={() => void handlePendingAction(p.id, "rejeitar")}
                    >Rejeitar</button>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* ── Vincular Dirigente ──────────────────────────────── */}
        <section style={S.card}>
          <h2 style={S.sectionTitle}>Vincular Dirigente</h2>
          <form onSubmit={(e) => void handleCreate(e)} style={S.form}>

            {/* User search combobox */}
            <div style={S.fieldGroup}>
              <label className="form-label">Usuário <span className="form-label">*</span></label>
              <div style={S.comboWrap}>
                {selectedUser ? (
                  <div style={S.selectedChip}>
                    <span style={S.chipText}>
                      {selectedUser.name
                        ? <><strong>{selectedUser.name}</strong> <span style={S.chipEmail}>({selectedUser.email})</span></>
                        : selectedUser.email}
                    </span>
                    <button
                      type="button"
                      style={S.chipClear}
                      onClick={() => { setSelectedUser(null); setUserSearch(""); }}
                      aria-label="Limpar usuário"
                    >×</button>
                  </div>
                ) : (
                  <input
                    type="text"
                    style={S.searchInput}
                    placeholder="Buscar por nome ou e-mail…"
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
            </div>

            {/* Team dropdown */}
            <div style={S.fieldGroup}>
              <label className="form-label">Time <span className="form-label">*</span></label>
              <select
                style={S.select}
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                required
              >
                <option value="">Selecionar time…</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div style={S.fieldGroup}>
              <label className="form-label">Cargo / Título <span style={S.optional}>(opcional)</span></label>
              <input
                type="text"
                style={S.select}
                placeholder="Ex: Presidente, Técnico, Diretor…"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {createMsg && (
              <p style={{ color: createMsg.type === "ok" ? "#a6e3a1" : "#f38ba8", fontSize: "0.875rem", margin: 0 }}>
                {createMsg.type === "ok" ? "✓" : "⚠"} {createMsg.text}
              </p>
            )}

            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <button
                type="submit"
                style={{ ...S.btnSave, ...(!selectedUser || !selectedTeamId || creating ? S.btnDisabled : {}) }}
                disabled={creating || !selectedUser || !selectedTeamId}
              >
                {creating ? "Vinculando…" : "Vincular"}
              </button>
              {(selectedUser || selectedTeamId || title) && (
                <button type="button" style={S.btnCancelLink} onClick={clearForm}>Limpar</button>
              )}
            </div>
          </form>
        </section>

        {/* ── Dirigentes por time ─────────────────────────────── */}
        <section style={S.card}>
          <h2 style={S.sectionTitle}>Dirigentes por time</h2>
          <select
            style={{ ...S.select, marginBottom: "1rem" }}
            value={filterTeamId}
            onChange={(e) => setFilterTeamId(e.target.value)}
          >
            <option value="">Selecione um time…</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          {filterTeamId && assignments.length === 0 && (
            <p style={{ color: "#ffffff", fontSize: "0.875rem" }}>Nenhum dirigente vinculado a este time.</p>
          )}

          {assignments.map((a) => {
            const u = users.find((x) => x.id === a.user_id);
            return (
              <div key={a.id} style={S.row}>
                <div style={S.rowInfo}>
                  <span style={S.rowMain}>{u?.name ?? u?.email ?? a.user_id}</span>
                  {u?.name && <span style={S.rowSub}>{u.email}</span>}
                  {a.title && <span style={S.rowSub}>{a.title}</span>}
                  <span style={{ ...S.rowSub, color: a.is_active ? "#a6e3a1" : "#f38ba8" }}>
                    {a.is_active ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <button
                  style={S.btnRemove}
                  disabled={deleting === a.id}
                  onClick={() => void handleDelete(a.id)}
                >
                  {deleting === a.id ? "…" : "Remover"}
                </button>
              </div>
            );
          })}
        </section>
      </main>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: { backgroundColor: "#18265b", borderBottom: "1px solid #313244", position: "relative", overflow: "hidden" },
  heroAccent: { position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #cba6f7, #89b4fa)" },
  heroInner: { maxWidth: "860px", margin: "0 auto", padding: "1.5rem 1.5rem 1.25rem" },
  title: { fontSize: "1.5rem", fontWeight: 700, color: "#cdd6f4", margin: 0 },
  subtitle: { color: "#ffffff", fontSize: "0.875rem", margin: "0.25rem 0 0" },

  page: { maxWidth: "860px", margin: "0 auto", padding: "2rem 1.5rem 4rem" },

  card: { backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" },
  sectionTitle: { fontSize: "1rem", fontWeight: 700, color: "#89b4fa", margin: "0 0 1.25rem" },

  form: { display: "flex", flexDirection: "column" as const, gap: "1rem" },
  fieldGroup: { display: "flex", flexDirection: "column" as const, gap: "0.35rem" },
  label: { color: "#cdd6f4", fontSize: "0.825rem", fontWeight: 500 },
  required: { color: "#f38ba8" },
  optional: { color: "#ffffff", fontWeight: 400 },

  comboWrap: { position: "relative" as const },
  searchInput: { width: "100%", backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "7px", color: "#cdd6f4", fontSize: "0.875rem", padding: "0.55rem 0.85rem", outline: "none", boxSizing: "border-box" as const },
  selectedChip: { display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#313244", border: "1px solid #45475a", borderRadius: "7px", padding: "0.45rem 0.85rem", fontSize: "0.875rem", color: "#cdd6f4" },
  chipText: { flex: 1 },
  chipEmail: { color: "#ffffff", fontWeight: 400 },
  chipClear: { background: "none", border: "none", color: "#ffffff", fontSize: "1.1rem", cursor: "pointer", padding: "0 0 0 0.5rem", lineHeight: 1, flexShrink: 0 },
  dropdown: { position: "absolute" as const, top: "calc(100% + 4px)", left: 0, right: 0, backgroundColor: "#18265b", border: "1px solid #45475a", borderRadius: "8px", boxShadow: "0 4px 24px rgba(0,0,0,0.35)", zIndex: 10, overflow: "hidden" as const },
  dropdownItem: { width: "100%", background: "none", border: "none", borderBottom: "1px solid #313244", padding: "0.55rem 0.85rem", cursor: "pointer", textAlign: "left" as const, display: "flex", flexDirection: "column" as const, gap: "1px" },
  dropdownEmpty: { position: "absolute" as const, top: "calc(100% + 4px)", left: 0, right: 0, backgroundColor: "#18265b", border: "1px solid #45475a", borderRadius: "8px", padding: "0.65rem 0.85rem", color: "#ffffff", fontSize: "0.85rem", zIndex: 10 },
  dropName: { color: "#cdd6f4", fontWeight: 600, fontSize: "0.875rem" },
  dropEmail: { color: "#ffffff", fontSize: "0.78rem" },

  select: { backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "7px", color: "#cdd6f4", fontSize: "0.875rem", padding: "0.55rem 0.85rem", outline: "none", width: "100%", boxSizing: "border-box" as const, cursor: "pointer", appearance: "auto" as const },

  btnSave: { backgroundColor: "#89b4fa", border: "none", borderRadius: "7px", color: "#11111b", fontSize: "0.9rem", fontWeight: 700, padding: "0.55rem 1.5rem", cursor: "pointer" },
  btnDisabled: { opacity: 0.5, cursor: "not-allowed" },
  btnCancelLink: { background: "none", border: "none", color: "#ffffff", fontSize: "0.85rem", cursor: "pointer", textDecoration: "underline" },

  row: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.65rem 0", borderBottom: "1px solid #313244", gap: "0.75rem" },
  rowInfo: { display: "flex", flexDirection: "column" as const, gap: "2px" },
  rowMain: { fontWeight: 600, color: "#cdd6f4", fontSize: "0.9rem" },
  rowSub: { fontSize: "0.78rem", color: "#ffffff" },

  btnAction: { background: "#f38ba8", color: "#18265b", border: "none", borderRadius: "6px", padding: "5px 12px", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" },
  btnRemove: { background: "none", border: "1px solid #5a2a30", borderRadius: "6px", color: "#f38ba8", fontSize: "0.8rem", padding: "4px 12px", cursor: "pointer" },
};
