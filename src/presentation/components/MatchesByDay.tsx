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
  if (error) return <p style={S.errText}>{error}</p>;
  if (sortedDates.length === 0) return <p style={S.muted}>{emptyMessage}</p>;

  return (
    <>
      <div style={{ ...S.dayNav, ...(accent ? { background: "rgba(166,227,161,0.05)", border: "1px solid rgba(166,227,161,0.18)", borderRadius: "10px", padding: "0.5rem 0.75rem" } : {}) }}>
        <button
          style={{ ...S.navBtn, ...(canPrev ? (accent ? { borderColor: "rgba(166,227,161,0.4)", color: "#a6e3a1" } : {}) : S.navBtnDisabled) }}
          onClick={() => canPrev && setDayIndex((i) => i - 1)}
          disabled={!canPrev}
          aria-label="Dia anterior"
        >
          ←
        </button>
        <div style={S.dayLabel}>
          <span style={{ ...S.dayHeading, ...(accent ? { color: accent } : {}) }}>
            {formatDateHeading(currentDate!)}
            <span style={S.dayCounter}> | {dayIndex + 1}/{sortedDates.length}</span>
          </span>
        </div>
        <button
          style={{ ...S.navBtn, ...(canNext ? (accent ? { borderColor: "rgba(166,227,161,0.4)", color: "#a6e3a1" } : {}) : S.navBtnDisabled) }}
          onClick={() => canNext && setDayIndex((i) => i + 1)}
          disabled={!canNext}
          aria-label="Próximo dia"
        >
          →
        </button>
      </div>

      <section style={S.dateSection}>
        {champIds.map((champId) => {
          const champMatches = byChamp!.get(champId)!;
          const first = champMatches[0];
          const champLabel = first.league_short_name
            ? `${first.championship_name} · ${first.league_short_name}`
            : first.championship_name;

          return (
            <div key={champId} style={S.champBlock}>
              <div style={S.champHeader}>
                <span style={S.champName}>
                  {champLabel}
                  {first.city_name && (
                    <span style={S.champCity}> — {first.city_name}</span>
                  )}
                  {first.phase_name && (
                    <span style={S.champPhase}> · {first.phase_name}</span>
                  )}
                  {first.round_number != null && (
                    <span style={S.champRound}> · Rodada {first.round_number}</span>
                  )}
                </span>
              </div>
              <div style={S.matchList}>
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

const S: Record<string, React.CSSProperties> = {
  muted: { color: "#cdd6f4", fontSize: "0.9rem", margin: 0 },
  errText: { color: "#f38ba8", fontSize: "0.9rem", margin: 0 },
  dayNav: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "1.25rem",
  },
  navBtn: {
    background: "#1e1e2e",
    border: "1px solid #313244",
    borderRadius: "6px",
    color: "#cdd6f4",
    fontSize: "1.1rem",
    padding: "0.4rem 0.85rem",
    cursor: "pointer",
    flexShrink: 0,
    lineHeight: 1,
  },
  navBtnDisabled: {
    color: "#cdd6f4",
    cursor: "default",
    borderColor: "#1e1e2e",
  },
  dayLabel: {
    flex: 1,
  },
  dayHeading: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#cdd6f4",
    textTransform: "capitalize" as const,
  },
  dayCounter: {
    fontSize: "0.72rem",
    fontWeight: 400,
    color: "#6c7086",
  },
  dateSection: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "1.25rem",
  },
  champBlock: {},
  champHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.5rem",
    gap: "0.5rem",
    paddingBottom: "0.35rem",
    borderBottom: "1px solid #313244",
  },
  champName: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "#cba6f7",
  },
  champCity: {
    fontWeight: 400,
    color: "#cdd6f4",
    fontSize: "0.78rem",
  },
  champPhase: {
    fontWeight: 500,
    color: "#89b4fa",
    fontSize: "0.78rem",
  },
  champRound: {
    fontWeight: 400,
    color: "#cdd6f4",
    fontSize: "0.75rem",
  },
  matchList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.5rem",
  },
};
