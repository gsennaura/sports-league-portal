import React, { useState, useEffect, useRef } from "react";
import { PageLoader } from "@presentation/components/PageLoader";
import { Link, useParams, useNavigate } from "react-router-dom";
import type { GetAthleteDetail } from "@application/use_cases/GetAthleteDetail";
import type { GetAthleteStats } from "@application/use_cases/GetAthleteStats";
import type { DeleteAthlete } from "@application/use_cases/DeleteAthlete";
import type { GetAthleteChampionshipRegistrations } from "@application/use_cases/ChampionshipRegistration";
import type { RegisterAthleteChampionship } from "@application/use_cases/ChampionshipRegistration";
import type { UpdateChampionshipRegistration } from "@application/use_cases/ChampionshipRegistration";
import type { CancelChampionshipRegistration } from "@application/use_cases/ChampionshipRegistration";
import type { ListChampionships } from "@application/use_cases/ListChampionships";
import type { AthleteDetail, AthleteStats, AthleteTeamHistory, AthleteChampionshipRegistration, GoalMatchItem } from "@domain/entities/Athlete";
import type { Championship } from "@domain/entities/Championship";
import type { AthleteRepository } from "@domain/repositories/AthleteRepository";


const NO_PHOTO =
  "https://raw.githubusercontent.com/gsennaura/sports-manager-assets/main/athletes/no_athlete_photo.png";

interface AthleteDetailPageProps {
  getAthleteDetail: GetAthleteDetail;
  getAthleteStats: GetAthleteStats;
  deleteAthlete: DeleteAthlete;
  getAthleteChampionshipRegistrations: GetAthleteChampionshipRegistrations;
  registerAthleteChampionship: RegisterAthleteChampionship;
  updateChampionshipRegistration: UpdateChampionshipRegistration;
  cancelChampionshipRegistration: CancelChampionshipRegistration;
  listChampionships: ListChampionships;
  athleteRepository?: AthleteRepository;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(`${dateStr.slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function periodLabel(entry: AthleteTeamHistory): string {
  const start = formatDate(entry.start_date as unknown as string);
  const end = entry.end_date ? formatDate(entry.end_date as unknown as string) : null;
  return end ? `${start} → ${end}` : `${start} → Atual`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HistoryRow({ entry }: { entry: AthleteTeamHistory }) {
  const active = entry.is_active;
  return (
    <div className="match-team-row">
      <div style={historyDotStyle(active)} />
      <div >
        <span className="team-name">{entry.team_name ?? entry.team_id}</span>
        {entry.jersey_number != null && (
          <span className="badge">#{entry.jersey_number}</span>
        )}
        {active && <span className="badge badge--success">Atual</span>}
        <span className="muted">{periodLabel(entry)}</span>
        {entry.notes && <span className="muted">{entry.notes}</span>}
      </div>
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
};

function statusBadgeStyle(status: string): React.CSSProperties {
  const colors: Record<string, { bg: string; color: string; border: string }> = {
    pending:  { bg: "#2a2316", color: "#f9e2af", border: "#7a6030" },
    approved: { bg: "#1a2e1a", color: "#a6e3a1", border: "#2a6030" },
    rejected: { bg: "#2e1a1a", color: "#f38ba8", border: "#602a30" },
  };
  const c = colors[status] ?? colors.pending;
  return {
    fontSize: "0.7rem",
    fontWeight: 700,
    padding: "0.15rem 0.55rem",
    borderRadius: "4px",
    backgroundColor: c.bg,
    color: c.color,
    border: `1px solid ${c.border}`,
    whiteSpace: "nowrap",
  };
}

function ChampRegRow({
  reg,
  teamName,
  editionLabel,
  isAdmin,
  onApprove,
  onReject,
  onCancel,
  busy,
}: {
  reg: AthleteChampionshipRegistration;
  teamName: string;
  editionLabel: string;
  isAdmin: boolean;
  onApprove: () => void;
  onReject: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  return (
    <div style={CR.row}>
      <div style={CR.main}>
        <div style={CR.editionLabel}>{editionLabel}</div>
        <div style={CR.meta}>
          <span style={CR.teamName}>{teamName}</span>
          {reg.registration_number && (
            <span style={CR.regNum}>Nº {reg.registration_number}</span>
          )}
          {reg.registered_at && (
            <span style={CR.date}>{formatDate(reg.registered_at)}</span>
          )}
        </div>
      </div>
      <div style={CR.right}>
        <span style={statusBadgeStyle(reg.status)}>{STATUS_LABELS[reg.status] ?? reg.status}</span>
        {isAdmin && (
          <div style={CR.actions}>
            {reg.status !== "approved" && (
              <button style={CR.approveBtn} disabled={busy} onClick={onApprove}>✓</button>
            )}
            {reg.status !== "rejected" && (
              <button style={CR.rejectBtn} disabled={busy} onClick={onReject}>✗</button>
            )}
            <button style={CR.cancelBtn} disabled={busy} onClick={onCancel} title="Cancelar inscrição">🗑</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stats sub-components ─────────────────────────────────────────────────────

function StatCounter({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div style={ST.counter}>
      <span style={ST.counterIcon}>{icon}</span>
      <span style={ST.counterValue}>{value}</span>
      <span style={ST.counterLabel}>{label}</span>
    </div>
  );
}

function GoalMatchRow({ item: gm }: { item: GoalMatchItem }) {
  const dateLabel = gm.match_date
    ? new Date(`${gm.match_date.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;
  const hasScore = gm.home_score !== null && gm.away_score !== null;
  const minuteLabel = gm.minute != null ? `${gm.minute}'` : null;

  return (
    <Link to={`/partidas/${gm.match_id}`} style={ST.goalRow}>
      <div style={ST.goalLeft}>
        {dateLabel && <span style={ST.goalDate}>{dateLabel}</span>}
        {gm.championship_name && (
          <span style={ST.goalChamp}>{gm.championship_name}{gm.championship_year ? ` ${gm.championship_year}` : ""}</span>
        )}
      </div>
      <div style={ST.goalCenter}>
        <span style={ST.goalTeam}>{gm.home_team_name}</span>
        <span style={ST.goalScore}>{hasScore ? `${gm.home_score} × ${gm.away_score}` : "vs"}</span>
        <span style={ST.goalTeam}>{gm.away_team_name}</span>
      </div>
      {minuteLabel && <span style={ST.goalMinute}>{minuteLabel}</span>}
    </Link>
  );
}

const ST: Record<string, React.CSSProperties> = {
  countersRow: {
    display: "flex",
    gap: "0.75rem",
    flexWrap: "wrap",
  },
  counter: {
    background: "#18265b",
    border: "1px solid #313244",
    borderRadius: "10px",
    padding: "0.75rem 1rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.2rem",
    minWidth: "64px",
  },
  counterIcon: { fontSize: "1.2rem" },
  counterValue: { fontSize: "1.4rem", fontWeight: 900, color: "#cdd6f4" },
  counterLabel: { fontSize: "0.7rem", color: "#ffffff" },
  subTitle: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "#ffffff",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    margin: "0 0 0.5rem",
  },
  goalList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.4rem",
  },
  goalRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    background: "#18265b",
    border: "1px solid #313244",
    borderRadius: "8px",
    padding: "0.5rem 0.75rem",
    textDecoration: "none",
    color: "#cdd6f4",
  },
  goalLeft: {
    display: "flex",
    flexDirection: "column" as const,
    minWidth: "80px",
    gap: "0.1rem",
  },
  goalDate: { fontSize: "0.72rem", color: "#ffffff" },
  goalChamp: { fontSize: "0.68rem", color: "#cba6f7" },
  goalCenter: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    flexWrap: "wrap" as const,
  },
  goalTeam: { fontSize: "0.8rem", fontWeight: 600 },
  goalScore: { fontSize: "0.85rem", fontWeight: 900, color: "#a6e3a1" },
  goalMinute: {
    fontSize: "0.72rem",
    color: "#89b4fa",
    fontWeight: 700,
    whiteSpace: "nowrap" as const,
  },
  byTeamTable: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "0.82rem",
  },
  byTeamTh: {
    padding: "0.4rem 0.75rem",
    color: "#ffffff",
    fontWeight: 600,
    fontSize: "0.72rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    borderBottom: "1px solid #313244",
    textAlign: "left" as const,
  },
  byTeamTd: {
    padding: "0.45rem 0.75rem",
    color: "#cdd6f4",
    borderBottom: "1px solid #18265b",
  },
  byTeamTr: {
    background: "transparent",
  },
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AthleteDetailPage({
  getAthleteDetail,
  getAthleteStats,
  deleteAthlete,
  getAthleteChampionshipRegistrations,
  registerAthleteChampionship,
  updateChampionshipRegistration,
  cancelChampionshipRegistration,
  listChampionships,
  athleteRepository,
}: AthleteDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAdmin = false;
  const [detail, setDetail] = useState<AthleteDetail | null>(null);
  const [stats, setStats] = useState<AthleteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Photo edit
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null);

  // Championship registrations
  const [champRegs, setChampRegs] = useState<AthleteChampionshipRegistration[]>([]);
  const [regBusy, setRegBusy] = useState<string | null>(null); // registration id being acted upon

  // Registration modal
  const [showRegModal, setShowRegModal] = useState(false);
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [champLoading, setChampLoading] = useState(false);
  const [regForm, setRegForm] = useState({ edition_id: "", team_id: "", registration_number: "", notes: "" });
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const champLoadedRef = useRef(false);

  // Action confirm modal
  const [actionConfirm, setActionConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // ── Championship registration helpers ──────────────────────────────────────

  async function openRegModal() {
    setRegForm({ edition_id: "", team_id: "", registration_number: "", notes: "" });
    setRegError(null);
    setShowRegModal(true);
    if (!champLoadedRef.current) {
      setChampLoading(true);
      try {
        const list = await listChampionships.execute();
        setChampionships(list.filter((c) => c.edition_id !== null));
        champLoadedRef.current = true;
      } catch { /* ignore */ }
      finally { setChampLoading(false); }
    }
  }

  async function handleRegSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !regForm.edition_id || !regForm.team_id) return;
    setRegSubmitting(true);
    setRegError(null);
    try {
      const reg = await registerAthleteChampionship.execute(regForm.edition_id, {
        athlete_id: id,
        team_id: regForm.team_id,
        registration_number: regForm.registration_number || null,
        notes: regForm.notes || null,
      });
      setChampRegs((prev) => [reg, ...prev]);
      setShowRegModal(false);
    } catch (e) {
      setRegError((e as Error).message);
    } finally {
      setRegSubmitting(false);
    }
  }

  async function handleUpdateStatus(
    reg: AthleteChampionshipRegistration,
    status: "approved" | "rejected",
  ) {
    const label = status === "approved" ? "aprovar" : "rejeitar";
    setActionConfirm({
      message: `Deseja ${label} a inscrição de ${reg.team_name ?? ""} neste campeonato?`,
      onConfirm: async () => {
        setActionConfirm(null);
        setRegBusy(reg.id);
        try {
          const updated = await updateChampionshipRegistration.execute(
            reg.championship_edition_id,
            reg.id,
            { status },
          );
          setChampRegs((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        } catch { /* ignore */ }
        finally { setRegBusy(null); }
      },
    });
  }

  async function handleCancelReg(reg: AthleteChampionshipRegistration) {
    setActionConfirm({
      message: "Cancelar esta inscrição? Esta ação não pode ser desfeita.",
      onConfirm: async () => {
        setActionConfirm(null);
        setRegBusy(reg.id);
        try {
          await cancelChampionshipRegistration.execute(reg.championship_edition_id, reg.id);
          setChampRegs((prev) => prev.filter((r) => r.id !== reg.id));
        } catch { /* ignore */ }
        finally { setRegBusy(null); }
      },
    });
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!id || !detail) return;
    if (!confirm(`Tem certeza que deseja excluir "${detail.athlete.name}"? Esta ação não pode ser desfeita.`)) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAthlete.execute(id);
      navigate("/atletas");
    } catch (e) {
      setDeleteError((e as Error).message);
      setDeleting(false);
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id || !athleteRepository) return;
    setPhotoUploading(true);
    try {
      const result = await athleteRepository.uploadPhoto(id, file);
      setCurrentPhotoUrl(result.photo_url);
    } catch { /* ignore */ }
    finally { setPhotoUploading(false); }
  }

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      getAthleteDetail.execute(id),
      getAthleteStats.execute(id).catch(() => null),
      getAthleteChampionshipRegistrations.execute(id).catch(() => []),
    ]).then(([detailData, statsData, regsData]) => {
        setDetail(detailData);
        setStats(statsData);
        setChampRegs(regsData as AthleteChampionshipRegistration[]);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro ao carregar atleta.");
        setLoading(false);
      });
  }, [id, getAthleteDetail, getAthleteStats, getAthleteChampionshipRegistrations]);

  if (loading) {
    return (
      <>
        <div className="hero__bar" />
        <main className="page-container"><PageLoader /></main>
      </>
    );
  }

  if (error || !detail) {
    return (
      <>
        <div className="hero__bar" />
        <main className="page-container">
          <p className="error-text">{error ?? "Atleta não encontrado."}</p>
          <Link to="/atletas" className="back-link">← Voltar para Atletas</Link>
        </main>
      </>
    );
  }

  const { athlete, team_history } = detail;

  // Build lookup maps for resolving names in championship registrations (fallback when API enrichment is absent)
  const teamNameById = Object.fromEntries(
    team_history.map((h) => [h.team_id, h.team_name ?? h.team_id]),
  );
  const editionLabelById = Object.fromEntries(
    championships
      .filter((c) => c.edition_id !== null)
      .map((c) => [c.edition_id as string, `${c.name} ${c.year}`]),
  );

  // Active teams for the registration modal
  const activeTeams = team_history.filter((h) => h.is_active);

  // Sort history: most recent first
  const sortedHistory = [...team_history].sort((a, b) => {
    const aStr = a.start_date as unknown as string;
    const bStr = b.start_date as unknown as string;
    return bStr.localeCompare(aStr);
  });

  const preferredFootLabel: Record<string, string> = {
    direito: "Destro",
    esquerdo: "Canhoto",
    ambidestro: "Ambidestro",
  };

  const attrs: [string, string | null | undefined][] = [
    ["Posição", athlete.position],
    ["Pé dominante", athlete.preferred_foot ? (preferredFootLabel[athlete.preferred_foot] ?? athlete.preferred_foot) : null],
    ["Nacionalidade", athlete.nationality],
    [
      "Nascimento",
      athlete.birth_date
        ? formatDate(athlete.birth_date as unknown as string)
        : null,
    ],
    ["Altura", athlete.height_cm ? `${athlete.height_cm} cm` : null],
    ["Peso", athlete.weight_kg ? `${athlete.weight_kg} kg` : null],
  ].filter(([, v]) => !!v) as [string, string][];

  return (
    <>
      {/* Accent bar */}
      <div className="hero__bar" />

      {/* Hero */}
      <header className="hero">
        <div className="hero__inner">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <Link to="/atletas" className="back-link">← Atletas</Link>
            {isAdmin && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Link
                  to={`/admin/atletas/${id}/editar`}
                  state={{ athlete: detail.athlete }}
                  className="btn-edit"
                >
                  ✏️ Editar
                </Link>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="action-btn action-btn--danger"
                >
                  {deleting ? "Excluindo…" : "🗑 Excluir"}
                </button>
              </div>
            )}
          </div>
          {deleteError && (
            <p style={{ color: "var(--c-negative)", backgroundColor: "#2a1a1f", border: "1px solid #5a2a30", borderRadius: "6px", padding: "0.65rem 1rem", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
              ⚠ {deleteError}
            </p>
          )}
          <div className="hero__inner">
            <div style={{ position: "relative", flexShrink: 0 }}>
              <img
                src={currentPhotoUrl ?? athlete.photo_url ?? NO_PHOTO}
                alt={athlete.name}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = NO_PHOTO;
                }}
                className="avatar avatar--lg"
              />
              {isAdmin && athleteRepository && (
                <>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: "none" }}
                    onChange={handlePhotoChange}
                  />
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    disabled={photoUploading}
                    title="Alterar foto do atleta"
                    style={{
                      position: "absolute",
                      bottom: "6px",
                      right: "6px",
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      backgroundColor: photoUploading ? "#45475a" : "#cba6f7",
                      border: "2px solid #18265b",
                      cursor: photoUploading ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      lineHeight: 1,
                      padding: 0,
                    }}
                  >
                    {photoUploading ? "…" : "✏"}
                  </button>
                </>
              )}
            </div>
            <div className="hero__text">
              <h1 className="page-title">{athlete.name}</h1>
              {athlete.nickname && (
                <p style={{ color: "var(--c-action)", fontSize: "1rem", fontStyle: "italic", margin: "0 0 0.75rem" }}>"{athlete.nickname}"</p>
              )}
              <div className="form-field-group">
                {attrs.map(([label, value]) => (
                  <div key={label} >
                    <span className="form-label">{label}</span>
                    <span >{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="page-container">
        {/* ─── Estatísticas ─────────────────────────────────────── */}
        {stats && (stats.goals > 0 || stats.yellow_cards > 0 || stats.red_cards > 0 || stats.matches_played > 0) && (
          <section className="page-section">
            <h2 className="section-heading">Estatísticas</h2>

            {/* counters row */}
            <div style={ST.countersRow}>
              <StatCounter icon="⚽" label="Gols" value={stats.goals} />
              <StatCounter icon="🟨" label="Amarelos" value={stats.yellow_cards} />
              <StatCounter icon="🟥" label="Vermelhos" value={stats.red_cards} />
              <StatCounter icon="🔄" label="Subst." value={stats.substitutions_in} />
              <StatCounter icon="🏟️" label="Jogos" value={stats.matches_played} />
            </div>

            {/* goal matches */}
            {stats.goal_matches.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <p style={ST.subTitle}>Partidas com gol</p>
                <div style={ST.goalList}>
                  {stats.goal_matches.map((gm, i) => (
                    <GoalMatchRow key={i} item={gm} />
                  ))}
                </div>
              </div>
            )}

            {/* by-team breakdown */}
            {stats.by_team && stats.by_team.length > 0 && (
              <div style={{ marginTop: "1.25rem" }}>
                <p style={ST.subTitle}>Por time</p>
                <table style={ST.byTeamTable}>
                  <thead>
                    <tr>
                      <th style={ST.byTeamTh}>Time</th>
                      <th style={{ ...ST.byTeamTh, textAlign: "center" as const }}>Jogos</th>
                      <th style={{ ...ST.byTeamTh, textAlign: "center" as const }}>⚽</th>
                      <th style={{ ...ST.byTeamTh, textAlign: "center" as const }}>🟨</th>
                      <th style={{ ...ST.byTeamTh, textAlign: "center" as const }}>🟥</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.by_team.map((t) => (
                      <tr key={t.team_id} style={ST.byTeamTr}>
                        <td style={ST.byTeamTd}>{t.team_name}</td>
                        <td style={{ ...ST.byTeamTd, textAlign: "center" as const, color: "#ffffff" }}>{t.matches_played}</td>
                        <td style={{ ...ST.byTeamTd, textAlign: "center" as const, color: "var(--c-positive)", fontWeight: 700 }}>{t.goals > 0 ? t.goals : "–"}</td>
                        <td style={{ ...ST.byTeamTd, textAlign: "center" as const, color: "var(--c-warning)", fontWeight: 700 }}>{t.yellow_cards > 0 ? t.yellow_cards : "–"}</td>
                        <td style={{ ...ST.byTeamTd, textAlign: "center" as const, color: "var(--c-negative)", fontWeight: 700 }}>{t.red_cards > 0 ? t.red_cards : "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Career timeline */}
        <section className="page-section">
          <h2 className="section-heading">Carreira</h2>
          {sortedHistory.length === 0 ? (
            <p className="muted">Nenhum vínculo com time registrado.</p>
          ) : (
            <div className="data-list">
              {sortedHistory.map((entry) => (
                <HistoryRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </section>

        {/* ─── Inscrições em Campeonatos ─────────────────────────────── */}
        {(isAdmin || champRegs.length > 0) && (
          <section className="page-section">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", paddingBottom: "0.4rem", borderBottom: "1px solid #313244" }}>
              <h2 style={{ ...S.sectionTitle, margin: 0, borderBottom: "none", paddingBottom: 0 }}>Inscrições em Campeonatos</h2>
              {isAdmin && (
                <button style={CR.addBtn} onClick={openRegModal}>+ Inscrever</button>
              )}
            </div>
            {champRegs.length === 0 ? (
              <p className="muted">Nenhuma inscrição em campeonato.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {champRegs.map((reg) => (
                  <ChampRegRow
                    key={reg.id}
                    reg={reg}
                    teamName={reg.team_name ?? teamNameById[reg.team_id] ?? reg.team_id}
                    editionLabel={
                      reg.championship_name
                        ? `${reg.championship_name}${reg.championship_year ? ` ${reg.championship_year}` : ""}`
                        : (editionLabelById[reg.championship_edition_id] ?? reg.championship_edition_id.slice(0, 8) + "…")
                    }
                    isAdmin={isAdmin}
                    onApprove={() => handleUpdateStatus(reg, "approved")}
                    onReject={() => handleUpdateStatus(reg, "rejected")}
                    onCancel={() => handleCancelReg(reg)}
                    busy={regBusy === reg.id}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Notes */}
        {athlete.notes && (
          <section className="page-section">
            <h2 className="section-heading">Observações</h2>
            <p className="muted">{athlete.notes}</p>
          </section>
        )}
      </main>

      {/* ─── Registration Modal ──────────────────────────────────────────── */}
      {showRegModal && (
        <div style={M.overlay} onClick={() => setShowRegModal(false)}>
          <div style={M.modal} onClick={(e) => e.stopPropagation()}>
            <div style={M.header}>
              <span style={M.title}>Inscrever em Campeonato</span>
              <button style={M.closeBtn} onClick={() => setShowRegModal(false)}>×</button>
            </div>
            <form onSubmit={handleRegSubmit}>
              <div style={M.body}>
                {regError && <p style={M.errorMsg}>{regError}</p>}

                <label style={M.label}>Edição do Campeonato *</label>
                {champLoading ? (
                  <p style={{ color: "#ffffff", fontSize: "0.85rem" }}>Carregando campeonatos…</p>
                ) : (
                  <select
                    style={M.select}
                    value={regForm.edition_id}
                    onChange={(e) => setRegForm((f) => ({ ...f, edition_id: e.target.value }))}
                    required
                  >
                    <option value="">— selecione —</option>
                    {championships.map((c) => (
                      <option key={c.edition_id} value={c.edition_id!}>
                        {c.name} {c.year}
                      </option>
                    ))}
                  </select>
                )}

                <label style={M.label}>Time *</label>
                {activeTeams.length === 0 ? (
                  <p style={{ color: "var(--c-negative)", fontSize: "0.82rem" }}>Atleta não possui vínculo ativo com nenhum time.</p>
                ) : (
                  <select
                    style={M.select}
                    value={regForm.team_id}
                    onChange={(e) => setRegForm((f) => ({ ...f, team_id: e.target.value }))}
                    required
                  >
                    <option value="">— selecione —</option>
                    {activeTeams.map((h) => (
                      <option key={h.id} value={h.team_id}>
                        {h.team_name ?? h.team_id}
                      </option>
                    ))}
                  </select>
                )}

                <label style={M.label}>Número de inscrição</label>
                <input
                  style={M.input}
                  type="text"
                  placeholder="opcional"
                  value={regForm.registration_number}
                  onChange={(e) => setRegForm((f) => ({ ...f, registration_number: e.target.value }))}
                />

                <label style={M.label}>Observações</label>
                <textarea
                  style={{ ...M.input, minHeight: "60px", resize: "vertical" }}
                  placeholder="opcional"
                  value={regForm.notes}
                  onChange={(e) => setRegForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div style={M.footer}>
                <button type="button" style={M.cancelBtn} onClick={() => setShowRegModal(false)}>Cancelar</button>
                <button type="submit" style={M.saveBtn} disabled={regSubmitting || activeTeams.length === 0}>
                  {regSubmitting ? "Inscrevendo…" : "Inscrever"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Action Confirm Modal ─────────────────────────────────────────── */}
      {actionConfirm && (
        <div
          style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setActionConfirm(null)}
        >
          <div
            style={{ background: "var(--c-brand)", border: "1px solid #313244", borderRadius: "12px", padding: "1.75rem", width: "100%", maxWidth: "400px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ margin: "0 0 1.25rem", color: "var(--c-text)", fontSize: "1rem", lineHeight: 1.5 }}>{actionConfirm.message}</p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                style={{ padding: "0.45rem 1rem", borderRadius: "6px", border: "1px solid #45475a", background: "none", color: "var(--c-text)", cursor: "pointer" }}
                onClick={() => setActionConfirm(null)}
              >
                Cancelar
              </button>
              <button
                style={{ padding: "0.45rem 1.1rem", borderRadius: "6px", border: "none", background: "var(--c-link)", color: "var(--c-brand)", fontWeight: 700, cursor: "pointer" }}
                onClick={() => void actionConfirm.onConfirm()}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function historyDotStyle(active: boolean): React.CSSProperties {
  return {
    width: 10,
    height: 10,
    borderRadius: "50%",
    backgroundColor: active ? "#a6e3a1" : "#45475a",
    flexShrink: 0,
    marginTop: "0.3rem",
    marginLeft: "-1.75rem",
    border: `2px solid ${active ? "#a6e3a1" : "#45475a"}`,
  };
}

const S: Record<string, React.CSSProperties> = {
  accentBar: {
    height: "4px",
    background: "linear-gradient(90deg, #a6e3a1 0%, #89b4fa 50%, #cba6f7 100%)",
  },
  hero: {
    background: "linear-gradient(160deg, #18265b 0%, #18265b 60%, #11111b 100%)",
    borderBottom: "1px solid #313244",
    paddingBottom: "2.5rem",
  },
  heroInner: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "2rem 2rem 0",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  backLink: {
    color: "#89b4fa",
    textDecoration: "none",
    fontSize: "0.85rem",
    alignSelf: "flex-start",
  },
  adminBtnEdit: {
    backgroundColor: "#cba6f7",
    color: "#11111b",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.82rem",
    fontWeight: 700,
    padding: "0.4rem 0.9rem",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.3rem",
  },
  adminBtnDelete: {
    backgroundColor: "transparent",
    border: "1px solid #f38ba8",
    borderRadius: "6px",
    color: "#f38ba8",
    fontSize: "0.82rem",
    fontWeight: 600,
    padding: "0.4rem 0.9rem",
    cursor: "pointer",
  },
  heroProfile: {
    display: "flex",
    gap: "1.75rem",
    alignItems: "flex-start",
  },
  heroPhoto: {
    width: 120,
    height: 120,
    borderRadius: "10px",
    objectFit: "cover",
    border: "2px solid #313244",
    flexShrink: 0,
    backgroundColor: "#18265b",
  },
  heroInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    flex: 1,
    minWidth: 0,
  },
  heroName: {
    margin: 0,
    fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
    fontWeight: 800,
    color: "#cdd6f4",
    lineHeight: 1.15,
  },
  attrGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem 1.5rem",
  },
  attrItem: {
    display: "flex",
    flexDirection: "column",
    gap: "0.1rem",
  },
  attrLabel: {
    fontSize: "0.68rem",
    fontWeight: 600,
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
  },
  attrValue: {
    fontSize: "0.9rem",
    color: "#cdd6f4",
    fontWeight: 500,
  },
  page: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "2.5rem 2rem 4rem",
    display: "flex",
    flexDirection: "column",
    gap: "2.5rem",
  },
  section: {},
  sectionTitle: {
    fontSize: "0.78rem",
    fontWeight: 700,
    color: "#89b4fa",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "0.75rem",
    paddingBottom: "0.4rem",
    borderBottom: "1px solid #313244",
  },
  timeline: {
    display: "flex",
    flexDirection: "column",
    gap: "0",
    borderLeft: "2px solid #313244",
    marginLeft: "0.5rem",
    paddingLeft: "1.25rem",
  },
  historyRow: {
    display: "flex",
    gap: "0.75rem",
    paddingBottom: "1.25rem",
    position: "relative",
  },
  historyContent: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.35rem",
  },
  historyTeam: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#cdd6f4",
  },
  historyBadge: {
    fontSize: "0.72rem",
    color: "#cba6f7",
    backgroundColor: "#18265b",
    border: "1px solid #45475a",
    borderRadius: "4px",
    padding: "0.1rem 0.4rem",
  },
  activeBadge: {
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "#18265b",
    backgroundColor: "#a6e3a1",
    borderRadius: "4px",
    padding: "0.1rem 0.45rem",
  },
  historyPeriod: {
    fontSize: "0.78rem",
    color: "#ffffff",
    width: "100%",
  },
  historyNotes: {
    fontSize: "0.75rem",
    color: "#ffffff",
    fontStyle: "italic",
    width: "100%",
  },
  notes: {
    fontSize: "0.9rem",
    color: "#ffffff",
    lineHeight: 1.6,
    backgroundColor: "#18265b",
    border: "1px solid #313244",
    borderRadius: "8px",
    padding: "1rem",
  },
  status: { color: "#cdd6f4" },
  errorText: { color: "#f38ba8" },
  empty: { color: "#ffffff", fontSize: "0.9rem" },
};

// ─── Championship Registration Row styles ─────────────────────────────────────

const CR: Record<string, React.CSSProperties> = {
  row: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.65rem 1rem",
    backgroundColor: "#18265b",
    border: "1px solid #313244",
    borderRadius: "8px",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "0.2rem",
    minWidth: 0,
  },
  editionLabel: {
    fontSize: "0.88rem",
    fontWeight: 600,
    color: "#cdd6f4",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  meta: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.4rem",
    alignItems: "center",
  },
  teamName: { fontSize: "0.78rem", color: "#ffffff" },
  regNum: {
    fontSize: "0.72rem",
    color: "#cba6f7",
    backgroundColor: "#18265b",
    border: "1px solid #45475a",
    borderRadius: "4px",
    padding: "0.1rem 0.4rem",
  },
  date: { fontSize: "0.72rem", color: "#ffffff" },
  right: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    flexShrink: 0,
  },
  actions: {
    display: "flex",
    gap: "0.25rem",
  },
  approveBtn: {
    background: "transparent",
    border: "1px solid #a6e3a1",
    color: "#a6e3a1",
    borderRadius: "4px",
    fontSize: "0.8rem",
    padding: "0.15rem 0.45rem",
    cursor: "pointer",
    fontWeight: 700,
  },
  rejectBtn: {
    background: "transparent",
    border: "1px solid #f38ba8",
    color: "#f38ba8",
    borderRadius: "4px",
    fontSize: "0.8rem",
    padding: "0.15rem 0.45rem",
    cursor: "pointer",
    fontWeight: 700,
  },
  cancelBtn: {
    background: "transparent",
    border: "1px solid #45475a",
    color: "#ffffff",
    borderRadius: "4px",
    fontSize: "0.78rem",
    padding: "0.15rem 0.45rem",
    cursor: "pointer",
  },
  addBtn: {
    backgroundColor: "#89b4fa",
    color: "#11111b",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.8rem",
    fontWeight: 700,
    padding: "0.35rem 0.9rem",
    cursor: "pointer",
    flexShrink: 0,
  },
};

// ─── Modal styles ─────────────────────────────────────────────────────────────

const M: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "1rem",
  },
  modal: {
    background: "#18265b",
    border: "1px solid #313244",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "480px",
    display: "flex",
    flexDirection: "column",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1rem 1.25rem 0.75rem",
    borderBottom: "1px solid #313244",
  },
  title: { fontSize: "1rem", fontWeight: 700, color: "#cdd6f4" },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#ffffff",
    fontSize: "1.4rem",
    cursor: "pointer",
    lineHeight: 1,
    padding: "0 0.25rem",
  },
  body: {
    padding: "1rem 1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.6rem",
  },
  label: {
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  input: {
    background: "#18265b",
    border: "1px solid #45475a",
    borderRadius: "6px",
    color: "#cdd6f4",
    fontSize: "0.9rem",
    padding: "0.5rem 0.75rem",
    width: "100%",
    boxSizing: "border-box",
  },
  select: {
    background: "#18265b",
    border: "1px solid #45475a",
    borderRadius: "6px",
    color: "#cdd6f4",
    fontSize: "0.9rem",
    padding: "0.5rem 0.75rem",
    width: "100%",
    boxSizing: "border-box",
  },
  footer: {
    display: "flex",
    gap: "0.5rem",
    justifyContent: "flex-end",
    padding: "0.75rem 1.25rem 1rem",
    borderTop: "1px solid #313244",
  },
  cancelBtn: {
    background: "transparent",
    border: "1px solid #45475a",
    color: "#ffffff",
    borderRadius: "6px",
    fontSize: "0.85rem",
    padding: "0.45rem 1rem",
    cursor: "pointer",
  },
  saveBtn: {
    backgroundColor: "#89b4fa",
    color: "#11111b",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.85rem",
    fontWeight: 700,
    padding: "0.45rem 1.25rem",
    cursor: "pointer",
  },
  errorMsg: {
    color: "#f38ba8",
    backgroundColor: "#2a1a1f",
    border: "1px solid #5a2a30",
    borderRadius: "6px",
    padding: "0.55rem 0.85rem",
    fontSize: "0.82rem",
    margin: 0,
  },
};
