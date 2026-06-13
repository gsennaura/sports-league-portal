import { useState, useEffect } from "react";
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
        <div className="hero__bar" />
        <main className="page-container"><PageLoader /></main>
      </>
    );
  }

  if (error || !referee) {
    return (
      <>
        <div className="hero__bar" />
        <main className="page-container">
          <p className="error-text">{error ?? "Árbitro não encontrado."}</p>
          <Link to="/arbitros" className="back-link">← Voltar para Árbitros</Link>
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
      <div className="hero__bar" />

      {/* Hero */}
      <header className="hero">
        <div className="hero__inner">
          <div className="hero__row">
            <Link to="/arbitros" className="back-link">← Árbitros</Link>
            {isAdmin && (
              <Link to={`/admin/arbitros/${id}/editar`} className="btn-edit">
                ✏️ Editar
              </Link>
            )}
          </div>

          <div className="hero__inner">
            <img
              src={referee.photo_url ?? NO_PHOTO}
              alt={referee.name}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = NO_PHOTO;
              }}
              className="avatar avatar--lg"
            />
            <div className="hero__text">
              <h1 className="page-title">{referee.name}</h1>
              {referee.nickname && (
                <p className="muted">"{referee.nickname}"</p>
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
        {/* Notes */}
        {referee.notes && (
          <section className="page-section">
            <h2 className="section-heading">Observações</h2>
            <p className="muted">{referee.notes}</p>
          </section>
        )}

        {!referee.notes && matches.length === 0 && (
          <p className="muted">Nenhuma informação adicional registrada.</p>
        )}

        {/* Partidas Apitadas */}
        <section className="page-section">
          <h2 className="section-heading">Partidas Apitadas ({matches.length})</h2>
          {matches.length === 0 ? (
            <p className="muted">Nenhuma partida registrada.</p>
          ) : (
            <div className="data-list">
              {matches.map((m) => (
                <Link key={m.id} to={`/partidas/${m.id}`} className="card">
                  <div className="toolbar">
                    <span className="muted">
                      {m.championship_name} {m.championship_year} — {m.phase_name}
                      {m.round_number != null ? ` · Rodada ${m.round_number}` : ""}
                    </span>
                    <span className="badge">{ROLE_LABELS[m.role as keyof typeof ROLE_LABELS] ?? m.role}</span>
                  </div>
                  <div className="match-team-row">
                    {m.home_club_logo_url && (
                      <img src={m.home_club_logo_url} alt="" className="avatar" />
                    )}
                    <span className="team-name">{m.home_team_name}</span>
                    <span className="score-big">{formatScore(m)}</span>
                    <span className="team-name">{m.away_team_name}</span>
                    {m.away_club_logo_url && (
                      <img src={m.away_club_logo_url} alt="" className="avatar" />
                    )}
                  </div>
                  {m.match_date && (
                    <span className="muted">{formatDate(m.match_date)}</span>
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

