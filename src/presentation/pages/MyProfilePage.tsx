import { useRef, useState, useEffect } from "react";
import { useAuth } from "@presentation/context/AuthContext";
import { API_BASE } from "@infrastructure/apiBase";
import { authHeaders } from "@infrastructure/authHeaders";


// ── Types ─────────────────────────────────────────────────────────────────────

interface AthleteProfile {
  id: string;
  name: string;
  nickname: string | null;
  position: string | null;
  preferred_foot: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  photo_url: string | null;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
}

interface Membership {
  id: string;
  team_id: string;
  membership_status: string | null;
  team_name?: string | null;
  team_sport_name?: string | null;
}

interface EditForm {
  nickname: string;
  position: string;
  preferred_foot: string;
  height_cm: string;
  weight_kg: string;
  phone: string;
}

interface LeagueOption { id: string; name: string; }
interface SportOption { id: string; name: string; }
interface TeamOption { id: string; name: string; league_id: string | null; sport_id: string; category: string | null; }

const CATEGORY_LABEL: Record<string, string> = {
  sub13: "Sub-13", sub15: "Sub-15", sub17: "Sub-17", sub20: "Sub-20",
  adulto: "Adulto", masters: "Masters",
};

const POSITIONS = [
  "Goleiro","Lateral Direito","Lateral Esquerdo","Zagueiro",
  "Volante","Meia","Ponta Direita","Ponta Esquerda","Centroavante",
];

const FOOT_OPTIONS = [
  { value: "Direito", label: "Direito" },
  { value: "Esquerdo", label: "Esquerdo" },
  { value: "Ambidestro", label: "Ambidestro" },
];

function maskPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.replace(/(\d{1,2})/, "($1");
  if (d.length <= 6) return d.replace(/(\d{2})(\d+)/, "($1) $2");
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d+)/, "($1) $2-$3");
  return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MyProfilePage() {
  const { user } = useAuth();

  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    nickname: "", position: "", preferred_foot: "", height_cm: "", weight_kg: "", phone: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  // Photo upload
  const heroFileRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Solicitar vínculo — cascade
  const [leagues, setLeagues] = useState<LeagueOption[]>([]);
  const [sports, setSports] = useState<SportOption[]>([]);
  const [allTeams, setAllTeams] = useState<TeamOption[]>([]);
  const [selectedLeague, setSelectedLeague] = useState("");
  const [selectedSport, setSelectedSport] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [membershipMsg, setMembershipMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [requestingMembership, setRequestingMembership] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/athletes/me`, { headers: authHeaders() }).then((r) => {
        if (!r.ok) throw new Error("Perfil não encontrado.");
        return r.json() as Promise<AthleteProfile>;
      }),
      fetch(`${API_BASE}/leagues?`).then((r) => r.json() as Promise<LeagueOption[]>).catch(() => []),
      fetch(`${API_BASE}/sports`).then((r) => r.json() as Promise<SportOption[]>).catch(() => []),
      fetch(`${API_BASE}/teams?limit=500`).then((r) => r.json() as Promise<TeamOption[]>).catch(() => []),
    ])
      .then(([p, lg, sp, t]) => {
        setProfile(p);
        setEditForm({
          nickname: p.nickname ?? "",
          position: p.position ?? "",
          preferred_foot: p.preferred_foot ?? "",
          height_cm: p.height_cm != null ? String(p.height_cm) : "",
          weight_kg: p.weight_kg != null ? String(p.weight_kg) : "",
          phone: p.phone ?? "",
        });
        setLeagues(lg.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
        setSports(sp.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
        setAllTeams(t);
        // Load memberships
        return fetch(`${API_BASE}/athletes/${p.id}/teams`, { headers: authHeaders() })
          .then((r) => r.ok ? r.json() as Promise<Membership[]> : [])
          .catch(() => []);
      })
      .then(setMemberships)
      .catch((e) => setPageError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  // ── Save edit ─────────────────────────────────────────────────────────────

  async function saveEdit() {
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const resp = await fetch(`${API_BASE}/athletes/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          nickname: editForm.nickname.trim() || null,
          position: editForm.position || null,
          preferred_foot: editForm.preferred_foot || null,
          height_cm: editForm.height_cm ? parseInt(editForm.height_cm, 10) : null,
          weight_kg: editForm.weight_kg ? parseFloat(editForm.weight_kg) : null,
          phone: editForm.phone.trim() || null,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { detail?: string };
        throw new Error(err.detail ?? "Erro ao salvar.");
      }
      const updated = await resp.json() as AthleteProfile;
      setProfile((prev) => prev ? { ...prev, ...updated } : updated);

      if (photoFile && profile) {
        const formData = new FormData();
        formData.append("file", photoFile);
        const uploadResp = await fetch(`${API_BASE}/athletes/${profile.id}/photo`, {
          method: "POST",
          headers: authHeaders(),
          body: formData,
        });
        if (uploadResp.ok) {
          const { photo_url } = await uploadResp.json() as { photo_url: string };
          setProfile((prev) => prev ? { ...prev, photo_url } : prev);
          setPhotoFile(null);
          setPhotoPreview(null);
        }
      }

      setSaveOk(true);
      setTimeout(() => { setEditOpen(false); setSaveOk(false); }, 1200);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // ── Request membership ────────────────────────────────────────────────────

  async function handleRequestMembership() {
    if (!selectedTeamId) return;
    setRequestingMembership(true);
    setMembershipMsg(null);
    try {
      const resp = await fetch(`${API_BASE}/memberships`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ team_id: selectedTeamId }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { detail?: string };
        throw new Error(err.detail ?? "Erro ao solicitar vínculo.");
      }
      const newMembership = await resp.json() as Membership;
      setMemberships((prev) => [newMembership, ...prev]);
      setMembershipMsg({ type: "ok", text: "Solicitação enviada! Aguarde aprovação do administrador." });
      setSelectedLeague(""); setSelectedSport(""); setSelectedCategory(""); setSelectedTeamId("");
    } catch (e) {
      setMembershipMsg({ type: "err", text: (e as Error).message });
    } finally {
      setRequestingMembership(false);
    }
  }

  // Cascade derivations
  const teamsByLeague = selectedLeague ? allTeams.filter((t) => t.league_id === selectedLeague) : allTeams;
  const teamsBySport = selectedSport ? teamsByLeague.filter((t) => t.sport_id === selectedSport) : teamsByLeague;
  const availableCategories = [...new Set(teamsBySport.map((t) => t.category).filter((c): c is string => !!c))].sort();
  const filteredTeams = teamsBySport
    .filter((t) => !selectedCategory || t.category === selectedCategory)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const hasPendingOrActive = memberships.some(
    (m) => m.membership_status === "pendente_aprovacao" || m.membership_status === "ativo"
  );

  if (loading) return <div className="page-container"><p style={{ color: "#ffffff", padding: 40 }}>Carregando…</p></div>;
  if (pageError) return <div className="page-container"><p style={{ color: "#f38ba8", padding: 40 }}>{pageError}</p></div>;
  if (!profile) return null;

  const initials = profile.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <>
      <div className="page-container">
        <div style={S.container}>

          {/* ── Hero ─────────────────────────────────────────────────────── */}
          <div className="hero">
            <div style={S.avatarWrap}>
              <div style={{ position: "relative", display: "inline-block" }}>
                {(photoPreview ?? profile.photo_url)
                  ? <img src={photoPreview ?? profile.photo_url!} alt="foto" style={S.avatar} />
                  : <div style={S.avatarPlaceholder}>{initials}</div>
                }
                <label
                  htmlFor="hero-photo-input"
                  style={S.photoPencil}
                  title="Alterar foto"
                >{photoUploading ? "…" : "✏"}</label>
                <input
                  id="hero-photo-input"
                  ref={heroFileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f || !profile) return;
                    setPhotoUploading(true);
                    setPhotoPreview(URL.createObjectURL(f));
                    try {
                      const formData = new FormData();
                      formData.append("file", f);
                      const resp = await fetch(`${API_BASE}/athletes/${profile.id}/photo`, {
                        method: "POST",
                        headers: authHeaders(),
                        body: formData,
                      });
                      if (resp.ok) {
                        const { photo_url } = await resp.json() as { photo_url: string };
                        setProfile((prev) => prev ? { ...prev, photo_url } : prev);
                        setPhotoPreview(null);
                      }
                    } finally {
                      setPhotoUploading(false);
                      if (heroFileRef.current) heroFileRef.current.value = "";
                    }
                  }}
                />
              </div>
            </div>
            <div style={S.heroInfo}>
              <h1 style={S.heroName}>{profile.name}</h1>
              {profile.nickname && <p style={S.heroNickname}>"{profile.nickname}"</p>}
              <p style={S.heroEmail}>{user?.email}</p>
            </div>
            <button style={S.btnEdit} onClick={() => setEditOpen(true)}>Editar perfil</button>
          </div>

          {/* ── Vínculo atual ─────────────────────────────────────────────── */}
          <div style={S.section}>
            <h2 style={S.sectionTitle}>Status do vínculo</h2>
            {memberships.length === 0 ? (
              <div style={S.membershipCard}>
                <span style={S.membershipTeam}>Nenhum vínculo com time</span>
                <StatusBadge status="sem_time" />
              </div>
            ) : (
              memberships.filter((m) => m.membership_status !== "rejeitado").map((m) => (
                <div key={m.id} style={S.membershipCard}>
                  <div>
                    <span style={S.membershipTeam}>{m.team_name ?? m.team_id}</span>
                    {m.team_sport_name && <span style={S.membershipSport}> · {m.team_sport_name}</span>}
                  </div>
                  <StatusBadge status={m.membership_status ?? "sem_time"} />
                </div>
              ))
            )}
          </div>

          {/* ── Informações pessoais ──────────────────────────────────────── */}
          <div style={S.section}>
            <h2 style={S.sectionTitle}>Informações pessoais</h2>
            <div style={S.infoGrid}>
              <InfoItem label="Posição" value={profile.position ?? "—"} />
              <InfoItem label="Pé dominante" value={profile.preferred_foot ?? "—"} />
              <InfoItem label="Altura" value={profile.height_cm ? `${profile.height_cm} cm` : "—"} />
              <InfoItem label="Peso" value={profile.weight_kg ? `${profile.weight_kg} kg` : "—"} />
              <InfoItem label="Data de nascimento" value={fmtDate(profile.birth_date)} />
              <InfoItem label="Telefone" value={profile.phone ?? "—"} />
            </div>
          </div>

          {/* ── Solicitar vínculo ─────────────────────────────────────────── */}
          {!hasPendingOrActive && (
            <div style={S.section}>
              <h2 style={S.sectionTitle}>Solicitar vínculo com time</h2>
              <p style={S.sectionSub}>Selecione o time e envie uma solicitação. O administrador irá aprovar.</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
                <div style={S.fieldGroup}>
                  <label style={S.label}>Liga</label>
                  <select style={S.input} value={selectedLeague} onChange={(e) => { setSelectedLeague(e.target.value); setSelectedSport(""); setSelectedCategory(""); setSelectedTeamId(""); }}>
                    <option value="">Todas as ligas</option>
                    {leagues.map((lg) => <option key={lg.id} value={lg.id}>{lg.name}</option>)}
                  </select>
                </div>
                <div style={S.fieldGroup}>
                  <label style={S.label}>Esporte</label>
                  <select style={S.input} value={selectedSport} onChange={(e) => { setSelectedSport(e.target.value); setSelectedCategory(""); setSelectedTeamId(""); }}>
                    <option value="">Todos os esportes</option>
                    {sports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div style={S.fieldGroup}>
                  <label style={S.label}>Categoria</label>
                  <select style={S.input} value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setSelectedTeamId(""); }} disabled={availableCategories.length === 0}>
                    <option value="">Todas as categorias</option>
                    {availableCategories.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c] ?? c}</option>)}
                  </select>
                </div>
                <div style={S.fieldGroup}>
                  <label style={S.label}>Time</label>
                  <select style={S.input} value={selectedTeamId} onChange={(e) => setSelectedTeamId(e.target.value)} disabled={filteredTeams.length === 0}>
                    <option value="">Selecione um time</option>
                    {filteredTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              {membershipMsg && (
                <p style={membershipMsg.type === "ok" ? S.ok : S.error}>{membershipMsg.text}</p>
              )}
              <button
                type="button"
                style={{ ...S.btnPrimary, marginTop: ".5rem", opacity: selectedTeamId ? 1 : 0.4 }}
                disabled={!selectedTeamId || requestingMembership}
                onClick={handleRequestMembership}
              >
                {requestingMembership ? "Enviando…" : "Solicitar vínculo"}
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      {editOpen && (
        <div style={S.overlay} onClick={() => { if (!saving) setEditOpen(false); }}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={S.modalTitle}>Editar perfil</h3>
            <p style={S.modalSub}>Suas informações pessoais de atleta</p>

            {saveError && <p className="error-text">{saveError}</p>}
            {saveOk && <p style={S.ok}>Salvo com sucesso!</p>}

            <div style={S.row2}>
              <div style={S.fieldGroup}>
                <label style={S.label}>Apelido / Nome de guerra</label>
                <input style={S.input} value={editForm.nickname} placeholder="Como te chamam em campo"
                  onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })} />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Posição</label>
                <select style={S.input} value={editForm.position}
                  onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}>
                  <option value="">Selecione...</option>
                  {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div style={S.row2}>
              <div style={S.fieldGroup}>
                <label style={S.label}>Pé dominante</label>
                <select style={S.input} value={editForm.preferred_foot}
                  onChange={(e) => setEditForm({ ...editForm, preferred_foot: e.target.value })}>
                  <option value="">Selecione...</option>
                  {FOOT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Telefone</label>
                <input style={S.input} type="tel" value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: maskPhone(e.target.value) })}
                  placeholder="(00) 00000-0000" maxLength={16} />
              </div>
            </div>

            <div style={S.row2}>
              <div style={S.fieldGroup}>
                <label style={S.label}>Altura (cm)</label>
                <input style={S.input} type="number" min={100} max={250} value={editForm.height_cm}
                  onChange={(e) => setEditForm({ ...editForm, height_cm: e.target.value })} />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Peso (kg)</label>
                <input style={S.input} type="number" min={30} max={200} step={0.1} value={editForm.weight_kg}
                  onChange={(e) => setEditForm({ ...editForm, weight_kg: e.target.value })} />
              </div>
            </div>

            <div style={S.fieldGroup}>
              <label style={S.label}>Foto de perfil</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {(photoPreview ?? editForm as unknown as Record<string,unknown>)  && (photoPreview
                  ? <img src={photoPreview} alt="preview" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid #45475a" }} />
                  : profile?.photo_url
                    ? <img src={profile.photo_url} alt="preview" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid #45475a" }} />
                    : null
                )}
                <label htmlFor="modal-photo-input" style={S.btnUpload}>
                  {photoPreview ? "Trocar foto" : "Escolher foto"}
                </label>
                <input
                  id="modal-photo-input"
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); }
                  }}
                />
                {photoFile && (
                  <span style={{ fontSize: ".75rem", color: "#ffffff", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {photoFile.name}
                  </span>
                )}
              </div>
            </div>

            <div style={S.modalActions}>
              <button style={S.btnCancel} onClick={() => setEditOpen(false)} disabled={saving}>Cancelar</button>
              <button style={S.btnSave} onClick={saveEdit} disabled={saving}>
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: ".75rem", fontWeight: 600, color: "#ffffff", textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</span>
      <span style={{ fontSize: ".95rem", color: "#cdd6f4" }}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pendente_aprovacao: { label: "⏳ Pendente de aprovação", color: "#f9e2af", bg: "rgba(249,226,175,.15)" },
    ativo: { label: "✓ Aprovado", color: "#a6e3a1", bg: "rgba(166,227,161,.15)" },
    rejeitado: { label: "✗ Rejeitado", color: "#f38ba8", bg: "rgba(243,139,168,.15)" },
    sem_time: { label: "Sem time", color: "#ffffff", bg: "rgba(108,112,134,.15)" },
  };
  const s = map[status] ?? { label: status, color: "#cdd6f4", bg: "transparent" };
  return (
    <span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 999, background: s.bg, color: s.color, fontSize: ".8rem", fontWeight: 700, border: `1px solid ${s.color}30` }}>
      {s.label}
    </span>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", backgroundColor: "#18265b", color: "#cdd6f4", padding: "32px 16px 80px" },
  container: { maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" },

  // Hero
  hero: {
    background: "#313244", borderRadius: 16, padding: "28px 24px",
    display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap",
  },
  avatarWrap: { flexShrink: 0 },
  avatar: { width: 88, height: 88, borderRadius: "50%", objectFit: "cover", border: "3px solid #cba6f7" },
  avatarPlaceholder: {
    width: 88, height: 88, borderRadius: "50%", border: "3px solid #cba6f7",
    background: "#45475a", color: "#cba6f7", fontSize: "2rem", fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center", userSelect: "none",
  },
  heroInfo: { flex: 1, minWidth: 0 },
  heroName: { margin: "0 0 2px", fontSize: "1.4rem", fontWeight: 800, color: "#cdd6f4" },
  heroNickname: { margin: "0 0 4px", color: "#89b4fa", fontSize: "1rem", fontStyle: "italic" },
  heroEmail: { margin: 0, fontSize: ".82rem", color: "#ffffff" },
  btnEdit: {
    padding: ".5rem 1.1rem", background: "transparent", color: "#cba6f7",
    border: "1px solid #cba6f7", borderRadius: 8, fontWeight: 600, cursor: "pointer",
    fontSize: ".875rem", whiteSpace: "nowrap", flexShrink: 0,
  },

  photoPencil: {
    position: "absolute", bottom: 2, right: 2,
    width: 26, height: 26, borderRadius: "50%",
    background: "#313244", border: "2px solid #cba6f7",
    color: "#cba6f7", fontSize: ".8rem",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", userSelect: "none",
  } as React.CSSProperties,
  btnUpload: {
    display: "inline-block", backgroundColor: "transparent",
    border: "1px solid #45475a", borderRadius: 6,
    color: "#89b4fa", fontSize: ".85rem", fontWeight: 500,
    padding: ".35rem .75rem", cursor: "pointer", whiteSpace: "nowrap",
  } as React.CSSProperties,
  // Sections
  section: { background: "#313244", borderRadius: 16, padding: "22px 24px", display: "flex", flexDirection: "column", gap: "0.875rem" },
  sectionTitle: { margin: 0, fontSize: "1rem", fontWeight: 700, color: "#ffffff" },
  sectionSub: { margin: 0, fontSize: ".82rem", color: "#ffffff" },

  // Membership
  membershipCard: {
    background: "#18265b", borderRadius: 10, padding: "12px 16px",
    display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
  },
  membershipTeam: { fontWeight: 700, color: "#89dceb" },
  membershipSport: { color: "#ffffff", fontSize: ".85rem" },

  // Info grid
  infoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },

  // Team search
  teamList: {
    display: "flex", flexDirection: "column", gap: 2,
    maxHeight: 200, overflowY: "auto",
    border: "1px solid #45475a", borderRadius: 8, background: "#18265b", padding: 4, marginTop: 4,
  },
  teamItem: { background: "none", border: "none", color: "#cdd6f4", padding: ".4rem .75rem", borderRadius: 6, cursor: "pointer", textAlign: "left", fontSize: ".9rem" },
  teamItemSelected: { background: "#313244", color: "#a6e3a1", fontWeight: 700 },
  btnPrimary: { padding: ".6rem 1.2rem", background: "#a6e3a1", color: "#18265b", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: ".9rem" },

  // Common
  input: { background: "#18265b", border: "1px solid #45475a", borderRadius: 8, color: "#cdd6f4", padding: ".5rem .75rem", fontSize: ".9rem", outline: "none", width: "100%", boxSizing: "border-box" },
  error: { color: "#f38ba8", background: "rgba(243,139,168,.1)", border: "1px solid rgba(243,139,168,.3)", borderRadius: 6, padding: ".5rem .75rem", fontSize: ".875rem" },
  ok: { color: "#a6e3a1", background: "rgba(166,227,161,.1)", border: "1px solid rgba(166,227,161,.3)", borderRadius: 6, padding: ".5rem .75rem", fontSize: ".875rem" },

  // Modal
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" },
  modal: { background: "#18265b", border: "1px solid #313244", borderRadius: 14, padding: "1.75rem", width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto" },
  modalTitle: { color: "#cba6f7", margin: "0 0 4px", fontSize: "1.15rem", fontWeight: 700 },
  modalSub: { color: "#ffffff", fontSize: ".85rem", margin: "0 0 1.25rem" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 4, marginBottom: "0.9rem" },
  label: { color: "#ffffff", fontSize: ".8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" },
  modalActions: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: "1.25rem" },
  btnCancel: { padding: ".5rem 1rem", background: "transparent", color: "#ffffff", border: "1px solid #45475a", borderRadius: 8, cursor: "pointer", fontSize: ".875rem" },
  btnSave: { padding: ".5rem 1.2rem", background: "#89b4fa", color: "#18265b", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: ".875rem" },
};
