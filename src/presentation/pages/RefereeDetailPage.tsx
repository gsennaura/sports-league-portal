import React, { useState, useEffect } from "react";
import { PageLoader } from "@presentation/components/PageLoader";
import { Link, useParams } from "react-router-dom";
import type { GetRefereeDetail } from "@application/use_cases/GetRefereeDetail";
import type { GetRefereeMatches } from "@application/use_cases/GetRefereeMatches";
import type { Referee } from "@domain/entities/Referee";
import type { RefereeMatch } from "@domain/entities/RefereeMatch";
import { ROLE_LABELS } from "@domain/entities/MatchReferee";
import { useAuth } from "@presentation/context/AuthContext";

const NO_PHOTO =
  "https://raw.githubusercontent.com/gsennaura/sports-manager-assets/refs/heads/main/referees/no_referee_photo.png";

interface RefereeDetailPageProps {
  getRefereeDetail: GetRefereeDetail;
  getRefereeMatches: GetRefereeMatches;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(`${dateStr.slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatScore(m: RefereeMatch): string {
  if (m.home_score == null || m.away_score == null) return "–";
  let s = `${m.home_score} × ${m.away_score}`;
  if (m.home_penalty_score != null && m.away_penalty_score != null) {
    s += ` (${m.home_penalty_score}–${m.away_penalty_score} pên.)`;
  }
  return s;
}

export function RefereeDetailPage({ getRefereeDetail, getRefereeMatches }: RefereeDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const [referee, setReferee] = useState<Referee | null>(null);
  const [matches, setMatches] = useState<RefereeMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getRefereeDetail.execute(id),
      getRefereeMatches.execute(id),
    ])
      .then(([ref, mts]) => {
        setReferee(ref);
        setMatches(mts);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Erro ao carregar árbitro."))
      .finally(() => setLoading(false));
  }, [id, getRefereeDetail, getRefereeMatches]);

  if (loading) {
    return (
      <>
        <div style={S.accentBar} />
        <main style={S.page}><PageLoader /></main>
      </>
    );
  }

  if (error || !referee) {
    return (
      <>
        <div style={S.accentBar} />
        <main style={S.page}>
          <p style={S.errorText}>{error ?? "Árbitro não encontrado."}</p>
          <Link to="/arbitros" style={S.backLink}>← Voltar para Árbitros</Link>
        </main>
      </>
    );
  }

  const attrs: [string, string | null | undefined][] = [
    ["Apelido", referee.nickname],
    ["Nacionalidade", referee.nationality],
    ["Nascimento", referee.birth_date ? formatDate(referee.birth_date) : null],
    ["Telefone", isAdmin ? referee.phone : referee.phone ? "•••••••••••" : null],
    ["E-mail", isAdmin ? referee.email : referee.email ? "•••••••••••" : null],
  ].filter(([, v]) => !!v) as [string, string][];

  return (
    <>
      {/* Accent bar */}
      <div style={S.accentBar} />

      {/* Hero */}
      <header style={S.hero}>
        <div style={S.heroInner}>
          <div style={S.heroTopRow}>
            <Link to="/arbitros" style={S.backLink}>← Árbitros</Link>
            {isAdmin && (
              <Link to={`/admin/arbitros/${id}/editar`} style={S.adminBtnEdit}>
                ✏️ Editar
              </Link>
            )}
          </div>

          <div style={S.heroProfile}>
            <img
              src={referee.photo_url ?? NO_PHOTO}
              alt={referee.name}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = NO_PHOTO;
              }}
              style={S.heroPhoto}
            />
            <div style={S.heroInfo}>
              <h1 style={S.heroName}>{referee.name}</h1>
              {referee.nickname && (
                <p style={S.nickname}>"{referee.nickname}"</p>
              )}
              <div style={S.attrGrid}>
                {attrs.map(([label, value]) => (
                  <div key={label} style={S.attrItem}>
                    <span style={S.attrLabel}>{label}</span>
                    <span style={S.attrValue}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main style={S.page}>
        {/* Notes */}
        {referee.notes && (
          <section style={S.section}>
            <h2 style={S.sectionTitle}>Observações</h2>
            <p style={S.notes}>{referee.notes}</p>
          </section>
        )}

        {!referee.notes && matches.length === 0 && (
          <p style={S.empty}>Nenhuma informação adicional registrada.</p>
        )}

        {/* Partidas Apitadas */}
        <section style={S.section}>
          <h2 style={S.sectionTitle}>Partidas Apitadas ({matches.length})</h2>
          {matches.length === 0 ? (
            <p style={S.empty}>Nenhuma partida registrada.</p>
          ) : (
            <div style={S.matchList}>
              {matches.map((m) => (
                <Link key={m.id} to={`/partidas/${m.id}`} style={S.matchCard}>
                  <div style={S.matchCardHeader}>
                    <span style={S.matchChampionship}>
                      {m.championship_name} {m.championship_year} — {m.phase_name}
                      {m.round_number != null ? ` · Rodada ${m.round_number}` : ""}
                    </span>
                    <span style={S.roleBadge}>{ROLE_LABELS[m.role as keyof typeof ROLE_LABELS] ?? m.role}</span>
                  </div>
                  <div style={S.matchTeamsRow}>
                    {m.home_club_logo_url && (
                      <img src={m.home_club_logo_url} alt="" style={S.clubLogo} />
                    )}
                    <span style={S.teamName}>{m.home_team_name}</span>
                    <span style={S.scoreText}>{formatScore(m)}</span>
                    <span style={S.teamName}>{m.away_team_name}</span>
                    {m.away_club_logo_url && (
                      <img src={m.away_club_logo_url} alt="" style={S.clubLogo} />
                    )}
                  </div>
                  {m.match_date && (
                    <span style={S.matchDate}>{formatDate(m.match_date)}</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  accentBar: {
    height: "4px",
    background: "linear-gradient(90deg, #cba6f7 0%, #89b4fa 50%, #a6e3a1 100%)",
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
  },
  heroTopRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap" as const,
    gap: "0.5rem",
    marginBottom: "1.25rem",
  },
  backLink: {
    color: "#89b4fa",
    textDecoration: "none",
    fontSize: "0.85rem",
  },
  adminBtnEdit: {
    padding: "0.4rem 1rem",
    borderRadius: "6px",
    background: "#313244",
    color: "#cdd6f4",
    textDecoration: "none",
    fontSize: "0.85rem",
    fontWeight: 600,
  },
  heroProfile: {
    display: "flex",
    gap: "1.5rem",
    alignItems: "flex-start",
    flexWrap: "wrap" as const,
  },
  heroPhoto: {
    width: 100,
    height: 100,
    borderRadius: "50%",
    objectFit: "cover" as const,
    border: "3px solid #313244",
    flexShrink: 0,
    backgroundColor: "#18265b",
  },
  heroInfo: {
    flex: 1,
    minWidth: "200px",
  },
  heroName: {
    margin: "0 0 0.25rem",
    fontSize: "clamp(1.3rem, 3vw, 2rem)",
    fontWeight: 800,
    color: "#cdd6f4",
    lineHeight: 1.2,
    letterSpacing: "-0.02em",
  },
  nickname: {
    color: "#cba6f7",
    fontSize: "0.95rem",
    fontStyle: "italic",
    margin: "0 0 0.75rem",
  },
  attrGrid: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.5rem 1.5rem",
  },
  attrItem: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.1rem",
  },
  attrLabel: {
    fontSize: "0.68rem",
    color: "#ffffff",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    fontWeight: 600,
  },
  attrValue: {
    fontSize: "0.88rem",
    color: "#cdd6f4",
    fontWeight: 500,
  },
  page: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "2.5rem 2rem 4rem",
  },
  section: {
    marginBottom: "2.5rem",
  },
  sectionTitle: {
    margin: "0 0 1rem",
    fontSize: "1rem",
    fontWeight: 700,
    color: "#cdd6f4",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    borderBottom: "1px solid #313244",
    paddingBottom: "0.5rem",
  },
  notes: {
    color: "#ffffff",
    fontSize: "0.9rem",
    lineHeight: 1.6,
    margin: 0,
  },
  empty: {
    color: "#ffffff",
    fontSize: "0.9rem",
  },
  status: {
    color: "#ffffff",
    fontSize: "0.9rem",
  },
  errorText: {
    color: "#f38ba8",
    fontSize: "0.9rem",
    marginBottom: "1rem",
  },
  matchList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.75rem",
  },
  matchCard: {
    display: "block",
    background: "#18265b",
    border: "1px solid #313244",
    borderRadius: "8px",
    padding: "0.85rem 1.1rem",
    textDecoration: "none",
    color: "inherit",
    transition: "border-color 0.15s",
  },
  matchCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "0.5rem",
    marginBottom: "0.5rem",
    flexWrap: "wrap" as const,
  },
  matchChampionship: {
    fontSize: "0.75rem",
    color: "#ffffff",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  roleBadge: {
    fontSize: "0.7rem",
    fontWeight: 700,
    padding: "0.15rem 0.55rem",
    borderRadius: "999px",
    background: "#313244",
    color: "#cba6f7",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap" as const,
  },
  matchTeamsRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    flexWrap: "wrap" as const,
  },
  clubLogo: {
    width: 22,
    height: 22,
    objectFit: "contain" as const,
    flexShrink: 0,
  },
  teamName: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#cdd6f4",
  },
  scoreText: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "#a6e3a1",
    padding: "0 0.25rem",
  },
  matchDate: {
    display: "block",
    marginTop: "0.4rem",
    fontSize: "0.75rem",
    color: "#ffffff",
  },
};
