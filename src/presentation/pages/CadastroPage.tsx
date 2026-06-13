import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE } from "@infrastructure/apiBase";

// ── Types ────────────────────────────────────────────────────────────────────

type UserType = "athlete" | "dirigente" | "torcedor" | null;
type Step = 1 | 2 | 3 | 4;

interface LeagueOption { id: string; name: string; }
interface CategoryOption { value: string; label: string; }
interface TeamOptionItem { id: string; name: string; }
interface SelectedTeam {
  teamId: string;
  teamName: string;
  leagueName: string;
  jerseyNumber: string;
}

// ── Input masks ─────────────────────────────────────────────────────────────

function maskCpf(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3}\.\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3}\.\d{3}\.\d{3})(\d)/, "$1-$2");
}

function maskPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.replace(/(\d{1,2})/, "($1");
  if (d.length <= 6) return d.replace(/(\d{2})(\d+)/, "($1) $2");
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d+)/, "($1) $2-$3");
  return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
}

// ── Main Component ────────────────────────────────────────────────────────────

export function CadastroPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — Conta
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 2 — Tipo
  const [userType, setUserType] = useState<UserType>(null);

  // Step 3 — Dados pessoais
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [nickname, setNickname] = useState("");
  const [position, setPosition] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredFoot, setPreferredFoot] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");

  // Step 4 — Cascata de times
  const [leagues, setLeagues] = useState<LeagueOption[]>([]);
  const [sports, setSports] = useState<string[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [teamOptions, setTeamOptions] = useState<TeamOptionItem[]>([]);
  const [selLeagueId, setSelLeagueId] = useState("");
  const [selSport, setSelSport] = useState("");
  const [selCategory, setSelCategory] = useState("");
  const [selTeamId, setSelTeamId] = useState("");
  const [selJersey, setSelJersey] = useState("");

  const [selectedTeams, setSelectedTeams] = useState<SelectedTeam[]>([]);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (step !== 4) return;
    fetch(`${API_BASE}/public/leagues`)
      .then(r => r.json())
      .then((data: LeagueOption[]) =>
        setLeagues(data.map(l => ({ id: String(l.id), name: l.name })))
      )
      .catch(() => {});
  }, [step]);

  useEffect(() => {
    if (!selLeagueId) { setSports([]); setSelSport(""); return; }
    fetch(`${API_BASE}/public/sports?league_id=${selLeagueId}`)
      .then(r => r.json())
      .then((data: string[]) => setSports(data))
      .catch(() => {});
    setSelSport("");
    setSelCategory("");
    setSelTeamId("");
  }, [selLeagueId]);

  useEffect(() => {
    if (!selLeagueId || !selSport) { setCategories([]); setSelCategory(""); return; }
    fetch(
      `${API_BASE}/public/categories?sport=${encodeURIComponent(selSport)}&league_id=${selLeagueId}`
    )
      .then(r => r.json())
      .then((data: CategoryOption[]) => setCategories(data))
      .catch(() => {});
    setSelCategory("");
    setSelTeamId("");
  }, [selSport]);

  useEffect(() => {
    if (!selLeagueId || !selSport || !selCategory) { setTeamOptions([]); setSelTeamId(""); return; }
    fetch(
      `${API_BASE}/public/teams?sport=${encodeURIComponent(selSport)}&category=${encodeURIComponent(selCategory)}&league_id=${selLeagueId}`
    )
      .then(r => r.json())
      .then((data: TeamOptionItem[]) => setTeamOptions(data))
      .catch(() => {});
    setSelTeamId("");
  }, [selCategory]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  async function handleStep1Next(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Nome é obrigatório."); return; }
    if (!cpf.trim()) { setError("CPF é obrigatório."); return; }
    if (!phone.trim()) { setError("Telefone é obrigatório."); return; }
    if (!birthDate) { setError("Data de nascimento é obrigatória."); return; }
    if (!email.trim() || !email.includes("@")) { setError("Informe um e-mail válido."); return; }
    if (password.length < 8) { setError("Senha deve ter no mínimo 8 caracteres."); return; }
    if (password !== confirmPassword) { setError("As senhas não coincidem."); return; }
    setLoading(true);
    try {
      const emailRes = await fetch(`${API_BASE}/auth/check-email?email=${encodeURIComponent(email.trim())}`);
      const emailBody = await emailRes.json() as { exists: boolean };
      if (emailBody.exists) { setError("Este e-mail já está cadastrado. Faça login."); return; }
      const cpfRaw = cpf.replace(/\D/g, "");
      const cpfRes = await fetch(`${API_BASE}/auth/check-cpf?cpf=${encodeURIComponent(cpfRaw)}`);
      const cpfBody = await cpfRes.json() as { exists: boolean };
      if (cpfBody.exists) { setError("Este CPF já está cadastrado."); return; }
      setStep(2);
    } catch {
      setError("Não foi possível verificar seus dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStep3Next(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (userType === "athlete") {
      if (!preferredFoot) { setError("Pé dominante é obrigatório."); return; }
      if (!heightCm.trim()) { setError("Altura é obrigatória."); return; }
      if (!weightKg.trim()) { setError("Peso é obrigatório."); return; }
      await doRegisterAthlete();
    } else {
      await doRegisterUser();
    }
  }

  async function doRegisterUser(type: UserType = userType) {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE}/auth/register/user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim() || undefined,
          cpf: cpf.replace(/\D/g, ""),
          phone: phone.trim() || undefined,
          birth_date: birthDate || undefined,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { detail?: string };
        throw new Error(err.detail ?? "Erro ao criar conta.");
      }
      const token = await loginAndGetToken();
      if (token) setAuthToken(token);
      if (type === "torcedor") {
        navigate("/meu-perfil");
      } else {
        setStep(4);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  async function doRegisterAthlete() {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE}/auth/register/athlete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim(),
          cpf: cpf.replace(/\D/g, "") || undefined,
          nickname: nickname.trim() || undefined,
          position: position || undefined,
          preferred_foot: preferredFoot || undefined,
          height_cm: heightCm ? parseInt(heightCm, 10) : undefined,
          weight_kg: weightKg ? parseFloat(weightKg) : undefined,
          birth_date: birthDate || undefined,
          phone: phone.trim(),
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { detail?: string };
        throw new Error(err.detail ?? "Erro ao criar conta.");
      }
      const token = await loginAndGetToken();
      if (token) setAuthToken(token);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  async function loginAndGetToken(): Promise<string | null> {
    try {
      const r = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!r.ok) return null;
      const { access_token } = await r.json() as { access_token: string };
      localStorage.setItem("auth_token", access_token);
      return access_token;
    } catch {
      return null;
    }
  }

  function addTeam() {
    if (!selTeamId) return;
    const leagueObj = leagues.find(l => l.id === selLeagueId);
    const teamObj = teamOptions.find(t => t.id === selTeamId);
    if (!teamObj || !leagueObj) return;
    if (selectedTeams.some(t => t.teamId === selTeamId)) return;
    setSelectedTeams(prev => [...prev, {
      teamId: selTeamId,
      teamName: teamObj.name,
      leagueName: leagueObj.name,
      jerseyNumber: selJersey,
    }]);
    setSelTeamId("");
    setSelJersey("");
  }

  function removeTeam(teamId: string) {
    setSelectedTeams(prev => prev.filter(t => t.teamId !== teamId));
  }

  async function handleStep4Submit() {
    const token = authToken ?? localStorage.getItem("auth_token");
    setLoading(true);
    setError(null);
    try {
      for (const st of selectedTeams) {
        if (userType === "athlete") {
          await fetch(`${API_BASE}/memberships`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              team_id: st.teamId,
              jersey_number: st.jerseyNumber ? parseInt(st.jerseyNumber, 10) : null,
            }),
          });
        } else if (userType === "dirigente") {
          await fetch(`${API_BASE}/dirigentes/solicitar`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ team_id: st.teamId }),
          });
        }
      }
    } catch {
      // non-fatal — user still redirected
    } finally {
      setLoading(false);
    }
    setCompleted(true);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (completed) {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
            <h2 style={{ color: "#a6e3a1", margin: "0 0 .5rem", fontSize: "1.3rem" }}>Conta criada com sucesso!</h2>
            {selectedTeams.length > 0 ? (
              <>
                <p style={{ color: "#ffffff", fontSize: ".9rem", margin: "0 0 1rem" }}>
                  {userType === "dirigente"
                    ? "Sua solicitação de dirigente foi enviada e aguarda aprovação do administrador."
                    : "Suas solicitações de vínculo foram enviadas e aguardam aprovação."}
                </p>
                <div style={{ marginBottom: "1.25rem" }}>
                  {selectedTeams.map(st => (
                    <div key={st.teamId} style={{ background: "#313244", borderRadius: 8, padding: ".5rem .9rem", marginBottom: 6, textAlign: "left" }}>
                      <span style={{ color: "#cdd6f4", fontSize: ".9rem" }}>{st.teamName}</span>
                      <span style={{ color: "#ffffff", fontSize: ".75rem", marginLeft: 8 }}>{st.leagueName}</span>
                      <span style={{ marginLeft: 8, fontSize: ".75rem", color: "#f9e2af" }}>⏳ aguardando aprovação</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ color: "#ffffff", fontSize: ".9rem", margin: "0 0 1.25rem" }}>
                Você pode solicitar vínculo com times no seu perfil a qualquer momento.
              </p>
            )}
            <button
              style={{ ...S.input, background: "#89b4fa", color: "#18265b", fontWeight: 700, cursor: "pointer", border: "none", borderRadius: 8, padding: ".75rem", width: "100%" }}
              onClick={() => navigate("/meu-perfil")}
            >
              Ir para meu perfil →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.header}>
          <h1 style={S.title}>Criar conta</h1>
          <StepIndicator step={step} userType={userType} />
        </div>

        {error && <p style={S.error}>{error}</p>}

        {/* ── Step 1: Conta ── */}
        {step === 1 && (
          <form onSubmit={handleStep1Next} style={S.form}>
            <Label>Nome completo *</Label>
            <input style={S.input} autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome completo" required />
            <Label>CPF *</Label>
            <input style={S.input} value={cpf} onChange={e => setCpf(maskCpf(e.target.value))} placeholder="000.000.000-00" maxLength={14} required />
            <Label>Telefone / WhatsApp *</Label>
            <input style={S.input} type="tel" value={phone} onChange={e => setPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={16} required />
            <Label>Data de nascimento *</Label>
            <input style={S.input} type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} required />
            <Label>E-mail *</Label>
            <input style={S.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seuemail@exemplo.com" required />
            <Label>Senha *</Label>
            <input style={S.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
            <Label>Confirmar senha *</Label>
            <input style={S.input} type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repita a senha" />
            <Btn type="submit" disabled={loading}>{loading ? "Verificando..." : "Próximo →"}</Btn>
            <p style={S.loginLink}>Já tem conta? <Link to="/login" style={S.link}>Entrar</Link></p>
          </form>
        )}

        {/* ── Step 2: Tipo ── */}
        {step === 2 && (
          <div style={S.form}>
            <p style={S.question}>Como você quer se cadastrar?</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <button style={S.typeBtn} onClick={() => { setUserType("athlete"); setError(null); setStep(3); }}>
                <span style={S.typeIcon}>⚽</span>
                <span>Sou atleta</span>
              </button>
              <button style={S.typeBtn} onClick={() => { setUserType("dirigente"); setError(null); setStep(3); }}>
                <span style={S.typeIcon}>🏆</span>
                <span>Sou dirigente</span>
              </button>
              <button style={S.typeBtn} disabled={loading} onClick={() => { setUserType("torcedor"); setError(null); doRegisterUser("torcedor"); }}>
                <span style={S.typeIcon}>📣</span>
                <span>{loading ? "Criando..." : "Sou torcedor"}</span>
              </button>
            </div>
            <button style={S.backBtn} onClick={() => { setError(null); setStep(1); }}>← Voltar</button>
          </div>
        )}

        {/* ── Step 3: Atleta ── */}
        {step === 3 && userType === "athlete" && (
          <form onSubmit={handleStep3Next} style={S.form}>
            <Label>Apelido</Label>
            <input style={S.input} autoFocus value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Como te chamam no campo" />
            <Label>Posição</Label>
            <select style={S.input} value={position} onChange={e => setPosition(e.target.value)}>
              <option value="">Selecione sua posição</option>
              {["Goleiro","Lateral Direito","Lateral Esquerdo","Zagueiro","Volante","Meio-Campo","Meia Atacante","Ponta Direita","Ponta Esquerda","Centroavante"].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <Label>Pé dominante *</Label>
            <select style={S.input} value={preferredFoot} onChange={e => setPreferredFoot(e.target.value)} required>
              <option value="">Selecione</option>
              <option value="Direito">Direito</option>
              <option value="Esquerdo">Esquerdo</option>
              <option value="Ambidestro">Ambidestro</option>
            </select>
            <Label>Altura (cm) *</Label>
            <input style={S.input} type="number" min={100} max={250} value={heightCm} onChange={e => setHeightCm(e.target.value)} placeholder="Ex: 175" required />
            <Label>Peso (kg) *</Label>
            <input style={S.input} type="number" min={30} max={200} step={0.1} value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="Ex: 70.5" required />
            <Btn type="submit" disabled={loading}>{loading ? "Criando conta..." : "Próximo →"}</Btn>
            <button style={S.backBtn} onClick={() => { setError(null); setStep(2); }}>← Voltar</button>
          </form>
        )}

        {/* ── Step 3: Dirigente ── */}
        {step === 3 && userType === "dirigente" && (
          <form onSubmit={handleStep3Next} style={S.form}>
            <p style={{ color: "#ffffff", fontSize: ".9rem", lineHeight: 1.5, margin: "0 0 12px" }}>
              Olá, <strong style={{ color: "#cdd6f4" }}>{name}</strong>! Você vai criar uma conta de dirigente.
              Um administrador precisará aprovar seu acesso a cada time.
            </p>
            <Btn type="submit" disabled={loading}>{loading ? "Criando conta..." : "Criar conta e selecionar time →"}</Btn>
            <button style={S.backBtn} onClick={() => { setError(null); setStep(2); }}>← Voltar</button>
          </form>
        )}

        {/* ── Step 4: Seleção de times ── */}
        {step === 4 && (
          <div style={S.form}>
            <p style={S.question}>
              {userType === "athlete" ? "Em qual(is) time(s) você joga?" : "Para qual time você quer ser dirigente?"}
              <span style={{ color: "#ffffff", fontWeight: 400, fontSize: ".85rem" }}> (opcional)</span>
            </p>

            <Label>Liga</Label>
            <select style={S.input} value={selLeagueId} onChange={e => setSelLeagueId(e.target.value)}>
              <option value="">Selecione uma liga</option>
              {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>

            {selLeagueId && (
              <>
                <Label>Esporte</Label>
                <select style={S.input} value={selSport} onChange={e => setSelSport(e.target.value)}>
                  <option value="">Selecione um esporte</option>
                  {sports.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </>
            )}

            {selSport && (
              <>
                <Label>Categoria</Label>
                <select style={S.input} value={selCategory} onChange={e => setSelCategory(e.target.value)}>
                  <option value="">Selecione uma categoria</option>
                  {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </>
            )}

            {selCategory && (
              <>
                <Label>Time</Label>
                <select style={S.input} value={selTeamId} onChange={e => setSelTeamId(e.target.value)}>
                  <option value="">Selecione um time</option>
                  {teamOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </>
            )}

            {selTeamId && userType === "athlete" && (
              <>
                <Label>Número da camisa <span style={{ color: "#ffffff", fontWeight: 400, textTransform: "none" as const }}>(opcional)</span></Label>
                <input style={S.input} type="number" min={1} max={99} value={selJersey} onChange={e => setSelJersey(e.target.value)} placeholder="Ex: 10" />
              </>
            )}

            {selTeamId && (
              <button
                type="button"
                style={{ ...S.typeBtn, padding: ".5rem", fontSize: ".9rem", borderColor: "#a6e3a1", color: "#a6e3a1" }}
                onClick={addTeam}
              >
                + Adicionar este time
              </button>
            )}

            {selectedTeams.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <p style={{ color: "#ffffff", fontSize: ".8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", margin: "0 0 6px" }}>
                  Times selecionados
                </p>
                {selectedTeams.map(st => (
                  <div key={st.teamId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#18265b", borderRadius: 6, padding: ".4rem .7rem", marginBottom: 4 }}>
                    <div>
                      <span style={{ color: "#cdd6f4", fontSize: ".9rem" }}>{st.teamName}</span>
                      <span style={{ color: "#ffffff", fontSize: ".75rem", marginLeft: 8 }}>
                        {st.leagueName}{st.jerseyNumber ? ` · #${st.jerseyNumber}` : ""}
                      </span>
                    </div>
                    <button onClick={() => removeTeam(st.teamId)} style={{ background: "none", border: "none", color: "#f38ba8", cursor: "pointer", fontSize: ".85rem" }}>✕</button>
                  </div>
                ))}
                <p style={{ color: "#a6e3a1", fontSize: ".8rem", margin: "4px 0" }}>
                  ✓ Sua solicitação ficará pendente até aprovação do administrador ou dirigente do time.
                </p>
              </div>
            )}

            <Btn onClick={handleStep4Submit} disabled={loading}>
              {loading ? "Enviando..." : selectedTeams.length > 0 ? "Solicitar vínculos →" : "Pular — ir para meu perfil →"}
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function StepIndicator({ step, userType }: { step: Step; userType: UserType }) {
  const labels = userType === "torcedor"
    ? ["Conta", "Tipo"]
    : ["Conta", "Tipo", "Perfil", "Times"]; // athlete, dirigente, or null
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", margin: "12px 0 4px" }}>
      {labels.map((l, i) => (
        <div key={l} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: ".8rem", fontWeight: 700,
            background: i + 1 === step ? "#cba6f7" : i + 1 < step ? "#a6e3a1" : "#313244",
            color: i + 1 <= step ? "#18265b" : "#ffffff",
          }}>
            {i + 1 < step ? "✓" : i + 1}
          </div>
          <span style={{ fontSize: ".65rem", color: i + 1 === step ? "#cba6f7" : "#ffffff" }}>{l}</span>
        </div>
      ))}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ fontSize: ".8rem", fontWeight: 600, color: "#ffffff", textTransform: "uppercase" as const, letterSpacing: ".04em" }}>{children}</label>;
}

function Btn({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} style={{ padding: ".7rem", background: props.disabled ? "#45475a" : "#89b4fa", color: "#18265b", border: "none", borderRadius: 8, fontSize: "1rem", fontWeight: 700, cursor: props.disabled ? "not-allowed" : "pointer", marginTop: ".25rem" }}>{children}</button>;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", backgroundColor: "#18265b", color: "#cdd6f4", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 16px 80px" },
  card: { width: "100%", maxWidth: 440, backgroundColor: "#313244", borderRadius: 16, padding: "28px 24px" },
  header: { marginBottom: 20, textAlign: "center" },
  title: { fontSize: "1.4rem", fontWeight: 700, color: "#cba6f7", margin: "0 0 4px" },
  form: { display: "flex", flexDirection: "column", gap: "0.8rem" },
  input: { padding: ".55rem .85rem", borderRadius: 8, border: "1px solid #45475a", background: "#18265b", color: "#cdd6f4", fontSize: "1rem" },
  error: { color: "#f38ba8", background: "rgba(243,139,168,.1)", border: "1px solid rgba(243,139,168,.3)", borderRadius: 6, padding: ".5rem .75rem", fontSize: ".875rem", marginBottom: 4 },
  loginLink: { textAlign: "center", fontSize: ".85rem", color: "#ffffff", margin: "4px 0 0" },
  link: { color: "#89b4fa", textDecoration: "none" },
  question: { fontSize: "1rem", fontWeight: 600, color: "#cdd6f4", margin: "0 0 8px", textAlign: "center" },
  typeGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  typeBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "20px 8px", background: "#18265b", border: "2px solid #45475a", borderRadius: 12, cursor: "pointer", color: "#cdd6f4", fontWeight: 600, fontSize: ".9rem", transition: "border-color .15s" },
  typeBtnActive: { border: "2px solid #cba6f7", background: "#18265b" },
  typeIcon: { fontSize: "1.8rem" },
  backBtn: { background: "none", border: "none", color: "#ffffff", cursor: "pointer", fontSize: ".85rem", textAlign: "left", padding: 0, marginTop: 4 },
  teamList: { background: "#18265b", border: "1px solid #45475a", borderRadius: 8, overflow: "hidden", maxHeight: 200, overflowY: "auto" },
  teamItem: { width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: "1px solid #313244", padding: ".6rem .85rem", color: "#cdd6f4", cursor: "pointer", fontSize: ".9rem" },
  teamItemSelected: { background: "#45475a", color: "#cba6f7", fontWeight: 700 },
  noResults: { padding: ".6rem .85rem", color: "#ffffff", fontSize: ".85rem", margin: 0 },
};

