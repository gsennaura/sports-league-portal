import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import type { CreateAthlete } from "@application/use_cases/CreateAthlete";
import { API_BASE } from "@infrastructure/apiBase";
import { authHeaders } from "@infrastructure/authHeaders";
import { useAuth } from "@presentation/context/AuthContext";

interface SportOption { id: string; name: string; }
interface LeagueOption { id: string; name: string; }
interface TeamOption { id: string; name: string; sport_id: string; category: string | null; league_id: string | null; }

interface Props {
  createAthlete: CreateAthlete;
}

const POSITION_OPTIONS = [
  "Goleiro", "Zagueiro", "Lateral Direito", "Lateral Esquerdo",
  "Volante", "Meia Central", "Meia Atacante", "Ponta Direita",
  "Ponta Esquerda", "Centroavante",
];

const FOOT_OPTIONS = [
  { value: "direito", label: "Direito" },
  { value: "esquerdo", label: "Esquerdo" },
  { value: "ambidestro", label: "Ambidestro" },
];

const CATEGORY_LABEL: Record<string, string> = {
  sub13: "Sub-13", sub15: "Sub-15", sub17: "Sub-17", sub20: "Sub-20",
  adulto: "Adulto", masters: "Masters",
};

function maskCpf(v: string): string {
  return v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim().replace(/-$/, "");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim().replace(/-$/, "");
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  const parts = label.split("*");
  const labelNode = parts.length > 1
    ? <>{parts[0]}<span style={{ color: "#f38ba8" }}>*</span>{parts.slice(1).join("*")}</>
    : label;
  return (
    <div style={S.fieldGroup}>
      <label htmlFor={htmlFor} style={S.label}>{labelNode}</label>
      {children}
    </div>
  );
}

export function AdminAthleteCreatePage({ createAthlete }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, isLeagueAdmin, leagueAdminProfiles } = useAuth();

  // ── Conta de usuário
  const [email, setEmail] = useState("");

  // ── Dados do atleta
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [preferredFoot, setPreferredFoot] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  // ── Vínculo com time (cascata)
  const [rawLeagues, setRawLeagues] = useState<LeagueOption[]>([]); // all leagues, unfiltered
  const [sports, setSports] = useState<SportOption[]>([]);
  const [allTeams, setAllTeams] = useState<TeamOption[]>([]);
  const [selectedLeague, setSelectedLeague] = useState("");
  const [selectedSport, setSelectedSport] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [teamsLoading, setTeamsLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar ligas, esportes e times na montagem
  useEffect(() => {
    setTeamsLoading(true);
    Promise.all([
      fetch(`${API_BASE}/leagues?`, { headers: authHeaders() }).then((r) => r.json() as Promise<LeagueOption[]>),
      fetch(`${API_BASE}/sports`).then((r) => r.json() as Promise<SportOption[]>),
      fetch(`${API_BASE}/teams?limit=500`).then((r) => r.json() as Promise<TeamOption[]>),
    ]).then(([lg, s, t]) => {
      setRawLeagues((lg as LeagueOption[]).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setSports(s.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setAllTeams(t);
    }).catch(() => {}).finally(() => setTeamsLoading(false));
  }, []);

  // Pre-fill team cascade from navigation state (e.g. from AdminTeamEditPage "Criar novo atleta")
  useEffect(() => {
    const prefilledTeamId = (location.state as { prefilledTeamId?: string } | null)?.prefilledTeamId;
    if (!prefilledTeamId || allTeams.length === 0) return;
    const team = allTeams.find((t) => t.id === prefilledTeamId);
    if (!team) return;
    if (team.league_id) setSelectedLeague(team.league_id);
    setSelectedSport(team.sport_id);
    if (team.category) setSelectedCategory(team.category);
    setSelectedTeam(team.id);
  }, [allTeams, location.state]);

  // ── Reactive: derive visible leagues from auth (handles async profile load)
  const myLeagueIds = new Set(leagueAdminProfiles.filter(p => p.is_active).map(p => p.league_id));
  const visibleLeagues = (isLeagueAdmin && !isAdmin)
    ? rawLeagues.filter(l => myLeagueIds.has(l.id))
    : rawLeagues;

  // ── Auto-select when only one league is visible
  useEffect(() => {
    if (visibleLeagues.length === 1 && !selectedLeague) {
      setSelectedLeague(visibleLeagues[0].id);
    }
  }, [visibleLeagues]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cascata: liga → esporte → categoria → time
  const teamsByLeague = selectedLeague
    ? allTeams.filter((t) => t.league_id === selectedLeague)
    : allTeams;

  const teamsBySport = selectedSport
    ? teamsByLeague.filter((t) => t.sport_id === selectedSport)
    : teamsByLeague;

  const availableCategories = [...new Set(
    teamsBySport.map((t) => t.category).filter((c): c is string => !!c)
  )].sort();

  const filteredTeams = teamsBySport
    .filter((t) => !selectedCategory || t.category === selectedCategory)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  function handleLeagueChange(v: string) {
    setSelectedLeague(v);
    setSelectedSport("");
    setSelectedCategory("");
    setSelectedTeam("");
  }

  function handleSportChange(v: string) {
    setSelectedSport(v);
    setSelectedCategory("");
    setSelectedTeam("");
  }

  function handleCategoryChange(v: string) {
    setSelectedCategory(v);
    setSelectedTeam("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Nome é obrigatório."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const athlete = await createAthlete.execute({
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        birth_date: birthDate || undefined,
        cpf: cpf.replace(/\D/g, "") || undefined,
        rg: rg.trim() || undefined,
        phone: phone.replace(/\D/g, "") || undefined,
        position: position || undefined,
        preferred_foot: preferredFoot || undefined,
        height_cm: heightCm ? parseInt(heightCm) : undefined,
        weight_kg: weightKg ? parseFloat(weightKg) : undefined,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (photoFile) {
        const formData = new FormData();
        formData.append("file", photoFile);
        await fetch(`${API_BASE}/athletes/${athlete.id}/photo`, {
          method: "POST",
          headers: authHeaders(),
          body: formData,
        });
      }

      if (selectedTeam) {
        const resp = await fetch(`${API_BASE}/memberships/admin`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ athlete_id: athlete.id, team_id: selectedTeam }),
        });
        if (!resp.ok) {
          const err = await resp.json() as { detail?: string };
          throw new Error(err.detail ?? "Erro ao criar vínculo pendente.");
        }
        navigate("/admin/pendencias-vinculo");
      } else {
        navigate("/admin/atletas");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <header style={S.hero}>
        <div style={S.heroAccent} />
        <div style={S.heroInner}>
          <Link to="/admin/atletas" style={S.back}>← Atletas</Link>
          <h1 style={S.title}>Novo Atleta</h1>
        </div>
      </header>

      <main style={S.page}>
        <form onSubmit={handleSubmit} style={S.form} noValidate>

          {/* ── Informações do usuário ────────────── */}
          <fieldset style={S.fieldset}>
            <legend style={S.legend}>Informações do Usuário</legend>

            <div style={S.grid2}>
              <Field label="Nome completo *" htmlFor="name">
                <input id="name" style={S.input} value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label="Data de nascimento" htmlFor="birth_date">
                <input id="birth_date" type="date" style={S.input} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              </Field>
            </div>

            <div style={S.grid3}>
              <Field label="CPF" htmlFor="cpf">
                <input id="cpf" style={S.input} value={cpf}
                  onChange={(e) => setCpf(maskCpf(e.target.value))}
                  placeholder="000.000.000-00" inputMode="numeric" />
              </Field>
              <Field label="RG" htmlFor="rg">
                <input id="rg" style={S.input} value={rg} onChange={(e) => setRg(e.target.value)} />
              </Field>
              <Field label="Telefone" htmlFor="phone">
                <input id="phone" style={S.input} value={phone}
                  onChange={(e) => setPhone(maskPhone(e.target.value))}
                  placeholder="(11) 99999-9999" inputMode="tel" />
              </Field>
            </div>

            <div style={S.grid2}>
              <Field label="E-mail" htmlFor="email">
                <input
                  id="email"
                  type="email"
                  style={S.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="atleta@email.com"
                />
              </Field>
              <Field label="Foto" htmlFor="photo-upload">
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {photoPreview
                    ? <img src={photoPreview} alt="preview" style={S.photoThumb} />
                    : <div style={S.photoPlaceholder}>?</div>
                  }
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    <label htmlFor="photo-upload" style={S.btnUpload}>
                      {photoPreview ? "Trocar foto" : "Escolher foto"}
                    </label>
                    {photoFile && (
                      <span style={{ fontSize: "0.78rem", color: "#ffffff", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {photoFile.name}
                      </span>
                    )}
                  </div>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); }
                    }}
                  />
                </div>
              </Field>
            </div>

            <div style={{ marginTop: "0.85rem" }}>
              <p style={S.hintBox}>
                Ao informar o e-mail, uma conta de atleta será criada automaticamente com a senha padrão{" "}
                <code style={{ color: "#a6e3a1" }}>AtletaML@2026</code>.
                O atleta pode alterar a senha após o primeiro acesso.
              </p>
            </div>
          </fieldset>

          {/* ── Dados esportivos ──────────────────── */}
          <fieldset style={S.fieldset}>
            <legend style={S.legend}>Dados Esportivos</legend>

            <div style={S.grid3}>
              <Field label="Apelido" htmlFor="nickname">
                <input id="nickname" style={S.input} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Ex: Nenê, Tigrão" />
              </Field>
              <Field label="Posição" htmlFor="position">
                <select id="position" style={{ ...S.input, ...S.select }} value={position} onChange={(e) => setPosition(e.target.value)}>
                  <option value="">Não informado</option>
                  {POSITION_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Pé dominante" htmlFor="foot">
                <select id="foot" style={{ ...S.input, ...S.select }} value={preferredFoot} onChange={(e) => setPreferredFoot(e.target.value)}>
                  <option value="">Não informado</option>
                  {FOOT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
            </div>

            <div style={{ ...S.grid2, maxWidth: "420px" }}>
              <Field label="Altura (cm)" htmlFor="height">
                <input id="height" type="number" style={S.input} value={heightCm} onChange={(e) => setHeightCm(e.target.value)} min={100} max={250} />
              </Field>
              <Field label="Peso (kg)" htmlFor="weight">
                <input id="weight" type="number" step="0.1" style={S.input} value={weightKg} onChange={(e) => setWeightKg(e.target.value)} min={30} max={200} />
              </Field>
            </div>

            <div style={{ marginTop: "1rem" }}>
              <Field label="Observações" htmlFor="notes">
                <textarea id="notes" style={S.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Observações livres sobre o atleta…" />
              </Field>
            </div>
          </fieldset>

          {/* ── Vínculo com time ──────────────────── */}
          <fieldset style={S.fieldset}>
            <legend style={S.legend}>Vínculo com Time <span style={S.opt}>(opcional — vai para aprovação)</span></legend>

            {teamsLoading && <p style={{ color: "#ffffff", fontSize: "0.85rem", marginTop: "0.5rem" }}>Carregando esportes e times…</p>}

            {!teamsLoading && (
              <>
                <div style={S.grid2}>
                  <Field label="Liga" htmlFor="league">
                    <select id="league" style={{ ...S.input, ...S.select }} value={selectedLeague} onChange={(e) => handleLeagueChange(e.target.value)}>
                      <option value="">Todas as ligas</option>
                      {visibleLeagues.map((lg) => <option key={lg.id} value={lg.id}>{lg.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Esporte" htmlFor="sport">
                    <select id="sport" style={{ ...S.input, ...S.select }} value={selectedSport} onChange={(e) => handleSportChange(e.target.value)}>
                      <option value="">Todos os esportes</option>
                      {sports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </Field>
                </div>
                <div style={S.grid2}>
                  <Field label="Categoria" htmlFor="category">
                    <select id="category" style={{ ...S.input, ...S.select }} value={selectedCategory} onChange={(e) => handleCategoryChange(e.target.value)} disabled={availableCategories.length === 0}>
                      <option value="">Todas as categorias</option>
                      {availableCategories.map((c) => (
                        <option key={c} value={c}>{CATEGORY_LABEL[c] ?? c}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Time" htmlFor="team">
                    <select id="team" style={{ ...S.input, ...S.select }} value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} disabled={!selectedLeague || !selectedSport || !selectedCategory || filteredTeams.length === 0}>
                      <option value="">Nenhum time</option>
                      {filteredTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </Field>
                </div>
                {selectedTeam && (
                  <p style={S.pendingNotice}>
                    ✓ O atleta será cadastrado com status <strong>pendente de aprovação</strong>. O vínculo aparecerá na fila de aprovações.
                  </p>
                )}
              </>
            )}
          </fieldset>

          {error && <p style={S.errorMsg}>{error}</p>}

          <p style={{ fontSize: "0.8rem", color: "#ffffff", margin: 0 }}>
            Campos marcados com <span style={{ color: "#f38ba8", fontWeight: 700 }}>*</span> são obrigatórios.
          </p>

          <div style={S.actions}>
            <Link to="/admin/atletas" style={S.btnCancel}>Cancelar</Link>
            <button type="submit" style={S.btnSubmit} disabled={submitting}>
              {submitting ? "Salvando…" : "Criar Atleta"}
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
  page: { maxWidth: "900px", margin: "0 auto", padding: "2rem 1.5rem 4rem" },
  form: { display: "flex", flexDirection: "column", gap: "1.5rem" },
  fieldset: { border: "1px solid #313244", borderRadius: "8px", padding: "1.25rem 1.5rem", margin: 0 },
  legend: { fontSize: "0.84rem", fontWeight: 700, color: "#cdd6f4", textTransform: "uppercase", letterSpacing: "0.07em", padding: "0 0.5rem" },
  opt: { fontWeight: 400, textTransform: "none", letterSpacing: "normal", color: "#ffffff", fontSize: "0.78rem" },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "1rem" },
  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginTop: "1rem" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "0.3rem" },
  label: { fontSize: "0.83rem", fontWeight: 600, color: "#cdd6f4", textTransform: "uppercase", letterSpacing: "0.06em" },
  input: { backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "6px", color: "#cdd6f4", fontSize: "0.9rem", padding: "0.55rem 0.75rem", outline: "none", width: "100%", boxSizing: "border-box" },
  select: { cursor: "pointer", appearance: "auto" as const },
  textarea: { backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "6px", color: "#cdd6f4", fontSize: "0.9rem", padding: "0.55rem 0.75rem", outline: "none", width: "100%", resize: "vertical", boxSizing: "border-box", marginTop: "0.3rem" },
  hintBox: { fontSize: "0.82rem", color: "#ffffff", backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "6px", padding: "0.65rem 0.85rem", lineHeight: 1.5, margin: 0 },
  pendingNotice: { fontSize: "0.83rem", color: "#a6e3a1", backgroundColor: "#1a2a1a", border: "1px solid #2a4a2a", borderRadius: "6px", padding: "0.6rem 0.85rem", marginTop: "0.85rem", marginBottom: 0 },
  errorMsg: { color: "#f38ba8", backgroundColor: "#2a1a1f", border: "1px solid #5a2a30", borderRadius: "6px", padding: "0.75rem 1rem", fontSize: "0.875rem" },
  actions: { display: "flex", justifyContent: "flex-end", gap: "0.75rem", paddingTop: "0.5rem" },
  btnCancel: { backgroundColor: "transparent", border: "1px solid #313244", borderRadius: "6px", color: "#cdd6f4", fontSize: "0.9rem", fontWeight: 500, padding: "0.6rem 1.25rem", textDecoration: "none", display: "inline-flex", alignItems: "center" },
  btnSubmit: { backgroundColor: "#a6e3a1", border: "none", borderRadius: "6px", color: "#11111b", fontSize: "0.9rem", fontWeight: 700, padding: "0.6rem 1.5rem", cursor: "pointer" },
  btnUpload: { display: "inline-block", backgroundColor: "transparent", border: "1px solid #45475a", borderRadius: "6px", color: "#89b4fa", fontSize: "0.85rem", fontWeight: 500, padding: "0.4rem 0.85rem", cursor: "pointer" },
  photoThumb: { width: 52, height: 52, borderRadius: "50%", objectFit: "cover" as const, border: "2px solid #45475a", flexShrink: 0 },
  photoPlaceholder: { width: 52, height: 52, borderRadius: "50%", backgroundColor: "#313244", border: "2px solid #45475a", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontSize: "1.25rem", flexShrink: 0 },
};
