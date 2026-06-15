import { useState } from "react";
import { PageLoader } from "@presentation/components/PageLoader";
import type { UpcomingMatch } from "@domain/entities/UpcomingMatch";
import { UpcomingMatchCard } from "@presentation/components/UpcomingMatchCard";

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function groupByDateAndChampionship(
  matches: UpcomingMatch[]
): Map<string, Map<string, UpcomingMatch[]>> {
  const byDate = new Map<string, Map<string, UpcomingMatch[]>>();
  for (const m of matches) {
    const dateKey = m.match_date.split("T")[0];
    if (!byDate.has(dateKey)) byDate.set(dateKey, new Map());
    const byChamp = byDate.get(dateKey)!;
    const key = `${m.championship_id}__${m.phase_name ?? ""}`;
    if (!byChamp.has(key)) byChamp.set(key, []);
    byChamp.get(key)!.push(m);
  }
  return byDate;
}

export function formatDateHeading(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  const weekday = date.toLocaleDateString("pt-BR", { weekday: "long" });
  const day = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${day}`;
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

export function SectionHeader({
  title,
  subtitle,
  accent,
}: {
  title: string;
  subtitle?: string;
  accent?: string;
}) {
  const color = accent ?? "#cdd6f4";
  const lineColor = accent ?? "#313244";
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "0.5rem",
        }}
      >
        <span
          style={{
            fontSize: "0.68rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            color,
          }}
        >
          {title}
        </span>
        {subtitle && (
          <span style={{ fontSize: "0.65rem", color }}>{subtitle}</span>
        )}
      </div>
      <div style={{ height: accent ? "2px" : "1px", backgroundColor: lineColor }} />
    </div>
  );
}

// ─── MatchesByDay ─────────────────────────────────────────────────────────────

interface MatchesByDayProps {
  matches: UpcomingMatch[];
  loading: boolean;
  error: string | null;
  emptyMessage: string;
  dateOrder?: "asc" | "desc";
  accent?: string;
}

export function MatchesByDay({
  matches,
  loading,
  error,
  emptyMessage,
  dateOrder = "asc",
  accent,
}: MatchesByDayProps) {
  const [dayIndex, setDayIndex] = useState(0);

  const grouped = groupByDateAndChampionship(matches);
  const sortedDates = [...grouped.keys()].sort(
    dateOrder === "asc" ? undefined : (a, b) => b.localeCompare(a)
  );

  const currentDate = sortedDates[dayIndex] ?? null;
  const byChamp = currentDate ? grouped.get(currentDate)! : null;
  const champIds = byChamp ? [...byChamp.keys()] : [];

  const canPrev = dayIndex > 0;
  const canNext = dayIndex < sortedDates.length - 1;

  if (loading) return <PageLoader />;
  if (error) return <p className="error-text">{error}</p>;
  if (sortedDates.length === 0) return <p className="empty-notice">{emptyMessage}</p>;

  return (
    <>
      <div className="mbd-day-nav" style={accent ? { background: "var(--c-positive-06)", border: "1px solid var(--c-positive-15)", borderRadius: "10px", padding: "0.5rem 0.75rem" } : undefined}>
        <button
          className="mbd-nav-btn"
          style={canPrev && accent ? { borderColor: "var(--c-positive-40)", color: "var(--c-positive)" } : undefined}
          onClick={() => canPrev && setDayIndex((i) => i - 1)}
          disabled={!canPrev}
          aria-label="Dia anterior"
        >
          ←
        </button>
        <div className="mbd-day-label">
          <span className="mbd-day-heading">
            {formatDateHeading(currentDate!)}
            <span className="mbd-day-counter"> | {dayIndex + 1}/{sortedDates.length}</span>
          </span>
        </div>
        <button
          className="mbd-nav-btn"
          style={canNext && accent ? { borderColor: "var(--c-positive-40)", color: "var(--c-positive)" } : undefined}
          onClick={() => canNext && setDayIndex((i) => i + 1)}
          disabled={!canNext}
          aria-label="Próximo dia"
        >
          →
        </button>
      </div>

      <section className="mbd-date-section">
        {champIds.map((champId) => {
          const champMatches = byChamp!.get(champId)!;
          const first = champMatches[0];
          const champLabel = first.league_short_name
            ? `${first.championship_name} · ${first.league_short_name}`
            : first.championship_name;

          return (
            <div key={champId} className="">
              <div className="mbd-champ-header">
                <span className="mbd-champ-name">
                  {champLabel}
                  {first.city_name && (
                    <span className="mbd-champ-meta"> — {first.city_name}</span>
                  )}
                  {first.phase_name && (
                    <span className="mbd-champ-meta"> · {first.phase_name}</span>
                  )}
                  {first.round_number != null && (
                    <span className="mbd-champ-meta"> · Rodada {first.round_number}</span>
                  )}
                </span>
              </div>
              <div className="mbd-match-list">
                {champMatches.map((match) => (
                  <UpcomingMatchCard key={match.id} match={match} />
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
// (migrado para src/styles/components.css — classes mbd-*)
