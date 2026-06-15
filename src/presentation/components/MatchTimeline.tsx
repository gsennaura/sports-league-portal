import React, { useState } from "react";
import type { MatchEvent, MatchEventType, MatchEventPeriod, MatchEventPayload } from "@domain/entities/MatchEvent";
import {
  EVENT_ICONS, EVENT_LABELS, PERIOD_LABELS, ALL_EVENT_TYPES, ALL_PERIODS,
} from "@domain/entities/MatchEvent";
import type { AthleteTeamHistory } from "@domain/entities/Athlete";
import type { AddMatchEvent } from "@application/use_cases/MatchEvent";
import type { AnnulMatchEvent } from "@application/use_cases/MatchEvent";

// ── Period ordering ────────────────────────────────────────────────────────────
const PERIOD_ORDER: Record<MatchEventPeriod, number> = {
  first_half: 0,
  second_half: 1,
  extra_time_1: 2,
  extra_time_2: 3,
  penalties: 4,
};

function sortEvents(events: MatchEvent[]): MatchEvent[] {
  return [...events].sort((a, b) => {
    const pd = PERIOD_ORDER[a.period] - PERIOD_ORDER[b.period];
    if (pd !== 0) return pd;
    return (a.minute ?? 999) - (b.minute ?? 999);
  });
}

// ── Event row ─────────────────────────────────────────────────────────────────

function minuteLabel(e: MatchEvent): string {
  if (e.minute == null) return "";
  return e.extra_time ? `${e.minute}+${e.extra_time}'` : `${e.minute}'`;
}

interface EventRowProps {
  event: MatchEvent;
  side: "home" | "away" | "center";
  athleteMap: Record<string, string>; // id → name/nickname
  isAdmin: boolean;
  onAnnul: (eventId: string) => void;
}

function EventRow({ event: e, side, athleteMap, isAdmin, onAnnul }: EventRowProps) {
  const icon = EVENT_ICONS[e.event_type];
  const label = EVENT_LABELS[e.event_type];
  const min = minuteLabel(e);
  const athlete = e.athlete_id ? (athleteMap[e.athlete_id] ?? "—") : null;

  const rowStyle: React.CSSProperties = {
    ...TS.row,
    opacity: e.is_annulled ? 0.4 : 1,
    justifyContent: side === "home" ? "flex-end" : side === "away" ? "flex-start" : "center",
    flexDirection: side === "home" ? "row-reverse" : "row",
  };

  if (side === "center") {
    return (
      <div style={{ ...TS.row, justifyContent: "center", opacity: e.is_annulled ? 0.4 : 1 }}>
        <span style={TS.iconCenter}>{icon}</span>
        <span style={TS.labelCenter}>{label}</span>
        {min && <span style={TS.minCenter}>{min}</span>}
      </div>
    );
  }

  return (
    <div style={rowStyle}>
      <span style={TS.icon}>{icon}</span>
      <div style={{ display: "flex", flexDirection: "column", alignItems: side === "home" ? "flex-end" : "flex-start", gap: "0.05rem" }}>
        <span style={TS.eventLabel}>{label}{e.is_annulled ? " ✗" : ""}</span>
        {athlete && <span style={TS.athleteName}>{athlete}</span>}
      </div>
      {min && <span style={TS.minute}>{min}</span>}
      {isAdmin && !e.is_annulled && (
        <button
          style={TS.annulBtn}
          title="Anular evento"
          onClick={() => onAnnul(e.id)}
        >×</button>
      )}
    </div>
  );
}

// ── Period section ────────────────────────────────────────────────────────────

function PeriodSection({
  period, events, homeTeamId, athleteMap, isAdmin, onAnnul,
}: {
  period: MatchEventPeriod;
  events: MatchEvent[];
  homeTeamId: string;
  athleteMap: Record<string, string>;
  isAdmin: boolean;
  onAnnul: (id: string) => void;
}) {
  const CENTER_TYPES: MatchEventType[] = ["match_start", "halftime", "match_end"];

  return (
    <div style={TS.periodBlock}>
      <div style={TS.periodHeader}>{PERIOD_LABELS[period]}</div>
      <div style={TS.periodBody}>
        <div style={TS.timelineTrack} />
        {events.map((e) => {
          const isCenter = CENTER_TYPES.includes(e.event_type);
          const side = isCenter ? "center" : e.team_id === homeTeamId ? "home" : "away";
          return (
            <div key={e.id} style={TS.eventLine}>
              <div style={TS.homeSlot}>
                {side === "home" && (
                  <EventRow event={e} side="home" athleteMap={athleteMap} isAdmin={isAdmin} onAnnul={onAnnul} />
                )}
              </div>
              <div style={TS.dot} />
              <div style={TS.awaySlot}>
                {side === "away" && (
                  <EventRow event={e} side="away" athleteMap={athleteMap} isAdmin={isAdmin} onAnnul={onAnnul} />
                )}
                {side === "center" && (
                  <div style={{ gridColumn: "span 3" }}>
                    <EventRow event={e} side="center" athleteMap={athleteMap} isAdmin={isAdmin} onAnnul={onAnnul} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Add Event Modal ───────────────────────────────────────────────────────────

interface AddEventModalProps {
  matchId: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  homeAthletes: AthleteTeamHistory[];
  awayAthletes: AthleteTeamHistory[];
  addMatchEvent: AddMatchEvent;
  onSaved: (event: MatchEvent) => void;
  onClose: () => void;
}

function AddEventModal({
  matchId, homeTeamId, homeTeamName, awayTeamId, awayTeamName,
  homeAthletes, awayAthletes, addMatchEvent, onSaved, onClose,
}: AddEventModalProps) {
  const [teamId, setTeamId] = useState(homeTeamId);
  const [eventType, setEventType] = useState<MatchEventType>("goal");
  const [period, setPeriod] = useState<MatchEventPeriod>("first_half");
  const [athleteId, setAthleteId] = useState<string>("");
  const [minute, setMinute] = useState<string>("");
  const [extraTime, setExtraTime] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const athletes = teamId === homeTeamId ? homeAthletes : awayAthletes;
  const sortedAthletes = [...athletes].sort((a, b) => (a.jersey_number ?? 99) - (b.jersey_number ?? 99));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: MatchEventPayload = {
        team_id: teamId,
        event_type: eventType,
        period,
        athlete_id: athleteId || null,
        minute: minute ? parseInt(minute) : null,
        extra_time: extraTime ? parseInt(extraTime) : null,
        notes: notes || null,
      };
      const saved = await addMatchEvent.execute(matchId, payload);
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar evento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={TS.overlay} onClick={onClose}>
      <div style={TS.modal} onClick={(e) => e.stopPropagation()}>
        <div style={TS.modalHeader}>
          <span style={TS.modalTitle}>Adicionar Evento</span>
          <button style={TS.closeBtn} onClick={onClose}>×</button>
        </div>

        <div style={TS.modalBody}>
          {/* Team */}
          <label style={TS.label}>Time</label>
          <div style={TS.segmented}>
            <button
              style={{ ...TS.seg, ...(teamId === homeTeamId ? TS.segActive : {}) }}
              onClick={() => { setTeamId(homeTeamId); setAthleteId(""); }}
            >{homeTeamName}</button>
            <button
              style={{ ...TS.seg, ...(teamId === awayTeamId ? TS.segActive : {}) }}
              onClick={() => { setTeamId(awayTeamId); setAthleteId(""); }}
            >{awayTeamName}</button>
          </div>

          {/* Event type */}
          <label style={TS.label}>Tipo de evento</label>
          <select style={TS.select} value={eventType} onChange={(e) => setEventType(e.target.value as MatchEventType)}>
            {ALL_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{EVENT_ICONS[t]} {EVENT_LABELS[t]}</option>
            ))}
          </select>

          {/* Period */}
          <label style={TS.label}>Período</label>
          <select style={TS.select} value={period} onChange={(e) => setPeriod(e.target.value as MatchEventPeriod)}>
            {ALL_PERIODS.map((p) => (
              <option key={p} value={p}>{PERIOD_LABELS[p]}</option>
            ))}
          </select>

          {/* Athlete */}
          <label style={TS.label}>Atleta (opcional)</label>
          <select style={TS.select} value={athleteId} onChange={(e) => setAthleteId(e.target.value)}>
            <option value="">— Sem atleta —</option>
            {sortedAthletes.map((a) => (
              <option key={a.athlete_id} value={a.athlete_id}>
                {a.jersey_number != null ? `#${a.jersey_number} ` : ""}{a.athlete_nickname ?? a.athlete_name ?? "—"}
              </option>
            ))}
          </select>

          {/* Minute */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={TS.label}>Minuto</label>
              <input
                style={TS.input}
                type="number"
                min={0}
                max={200}
                placeholder="Ex: 35"
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
              />
            </div>
            <div>
              <label style={TS.label}>Acréscimo</label>
              <input
                style={TS.input}
                type="number"
                min={0}
                max={30}
                placeholder="Ex: 2"
                value={extraTime}
                onChange={(e) => setExtraTime(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <label style={TS.label}>Observações (opcional)</label>
          <input
            style={TS.input}
            type="text"
            placeholder="Ex: Cabeçada de escanteio"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {error && <p style={TS.errorMsg}>{error}</p>}
        </div>

        <div style={TS.modalFooter}>
          <button style={TS.cancelBtn} onClick={onClose} disabled={saving}>Cancelar</button>
          <button style={TS.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar evento"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface MatchTimelineProps {
  events: MatchEvent[];
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  homeAthletes: AthleteTeamHistory[];
  awayAthletes: AthleteTeamHistory[];
  matchId: string;
  isAdmin: boolean;
  addMatchEvent: AddMatchEvent;
  annulMatchEvent: AnnulMatchEvent;
  onEventAdded: (event: MatchEvent) => void;
  onEventAnnulled: (eventId: string) => void;
}

export function MatchTimeline({
  events,
  homeTeamId, homeTeamName, awayTeamId, awayTeamName,
  homeAthletes, awayAthletes, matchId,
  isAdmin, addMatchEvent, annulMatchEvent,
  onEventAdded, onEventAnnulled,
}: MatchTimelineProps) {
  const [showModal, setShowModal] = useState(false);

  // Build athlete map (id → display name)
  const athleteMap: Record<string, string> = {};
  for (const a of [...homeAthletes, ...awayAthletes]) {
    athleteMap[a.athlete_id] = a.athlete_nickname ?? a.athlete_name ?? "—";
  }

  // Group events by period
  const sorted = sortEvents(events.filter((e) => !e.is_annulled));
  const annulled = events.filter((e) => e.is_annulled);
  const all = sortEvents([...sorted, ...annulled]);

  const byPeriod = new Map<MatchEventPeriod, MatchEvent[]>();
  for (const e of all) {
    if (!byPeriod.has(e.period)) byPeriod.set(e.period, []);
    byPeriod.get(e.period)!.push(e);
  }

  const handleAnnul = async (eventId: string) => {
    if (!confirm("Anular este evento?")) return;
    try {
      await annulMatchEvent.execute(matchId, eventId);
      onEventAnnulled(eventId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao anular evento.");
    }
  };

  const handleSaved = (event: MatchEvent) => {
    onEventAdded(event);
  };

  if (events.length === 0 && !isAdmin) {
    return <p style={{ color: "#ffffff", fontSize: "0.875rem", padding: "1.25rem 1rem", margin: 0 }}>Sem eventos registrados para esta partida.</p>;
  }

  return (
    <div>
      {/* Team header */}
      <div style={TS.teamHeader}>
        <span style={TS.teamHeaderName}>{homeTeamName}</span>
        <span style={TS.teamHeaderCenter}>·</span>
        <span style={{ ...TS.teamHeaderName, textAlign: "right" as const }}>{awayTeamName}</span>
      </div>

      {/* Periods */}
      {byPeriod.size === 0 ? (
        <p style={{ color: "#ffffff", fontSize: "0.875rem", padding: "1rem 1rem 0.5rem", margin: 0 }}>Sem eventos registrados.</p>
      ) : (
        [...byPeriod.entries()].map(([period, evs]) => (
          <PeriodSection
            key={period}
            period={period}
            events={evs}
            homeTeamId={homeTeamId}
            athleteMap={athleteMap}
            isAdmin={isAdmin}
            onAnnul={handleAnnul}
          />
        ))
      )}

      {/* Admin add button */}
      {isAdmin && (
        <div style={{ padding: "0.75rem 1rem" }}>
          <button style={TS.addBtn} onClick={() => setShowModal(true)}>
            + Adicionar evento
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <AddEventModal
          matchId={matchId}
          homeTeamId={homeTeamId}
          homeTeamName={homeTeamName}
          awayTeamId={awayTeamId}
          awayTeamName={awayTeamName}
          homeAthletes={homeAthletes}
          awayAthletes={awayAthletes}
          addMatchEvent={addMatchEvent}
          onSaved={handleSaved}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const TS: Record<string, React.CSSProperties> = {
  teamHeader: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    padding: "0.5rem 1rem",
    borderBottom: "1px solid #313244",
    gap: "0.5rem",
  },
  teamHeaderName: {
    fontSize: "0.7rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#89b4fa",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  teamHeaderCenter: {
    fontSize: "0.7rem",
    color: "#ffffff",
  },
  periodBlock: {
    borderBottom: "1px solid #313244",
  },
  periodHeader: {
    fontSize: "0.65rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#ffffff",
    padding: "0.35rem 1rem",
    backgroundColor: "#18265b",
    borderBottom: "1px solid #313244",
  },
  periodBody: {
    position: "relative",
    padding: "0.25rem 0",
  },
  timelineTrack: {
    position: "absolute",
    left: "50%",
    top: 0,
    bottom: 0,
    width: "1px",
    backgroundColor: "#313244",
    transform: "translateX(-50%)",
    pointerEvents: "none",
  },
  eventLine: {
    display: "grid",
    gridTemplateColumns: "1fr 12px 1fr",
    alignItems: "center",
    minHeight: "2.2rem",
    padding: "0.15rem 0",
  },
  homeSlot: {
    paddingRight: "0.75rem",
    display: "flex",
    justifyContent: "flex-end",
  },
  awaySlot: {
    paddingLeft: "0.75rem",
    display: "flex",
    justifyContent: "flex-start",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    backgroundColor: "#45475a",
    margin: "0 auto",
    flexShrink: 0,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "0.35rem",
    fontSize: "0.8rem",
    color: "#ffffff",
  },
  icon: { fontSize: "0.95rem", flexShrink: 0 },
  iconCenter: { fontSize: "0.95rem" },
  labelCenter: { fontSize: "0.75rem", color: "#ffffff", fontWeight: 600 },
  minCenter: { fontSize: "0.68rem", color: "#ffffff" },
  eventLabel: { fontSize: "0.78rem", fontWeight: 600, color: "#ffffff" },
  athleteName: { fontSize: "0.68rem", color: "#ffffff" },
  minute: {
    fontSize: "0.68rem",
    color: "#a6e3a1",
    fontWeight: 700,
    flexShrink: 0,
    minWidth: "2.5rem",
    textAlign: "center",
  },
  annulBtn: {
    background: "none",
    border: "1px solid #45475a",
    borderRadius: "4px",
    color: "#f38ba8",
    cursor: "pointer",
    fontSize: "0.75rem",
    lineHeight: 1,
    padding: "0.1rem 0.3rem",
    flexShrink: 0,
  },
  addBtn: {
    background: "#313244",
    border: "1px solid #45475a",
    borderRadius: "6px",
    color: "#a6e3a1",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: 600,
    padding: "0.4rem 0.9rem",
    width: "100%",
  },
  // Modal
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "#18265b",
    border: "1px solid #313244",
    borderRadius: "10px",
    width: "min(92vw, 420px)",
    maxHeight: "90vh",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 1.25rem 0.75rem",
    borderBottom: "1px solid #313244",
  },
  modalTitle: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#ffffff",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#ffffff",
    fontSize: "1.25rem",
    cursor: "pointer",
    lineHeight: 1,
    padding: 0,
  },
  modalBody: {
    padding: "1rem 1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.6rem",
  },
  modalFooter: {
    padding: "0.75rem 1.25rem 1rem",
    display: "flex",
    gap: "0.75rem",
    justifyContent: "flex-end",
    borderTop: "1px solid #313244",
  },
  label: {
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: "0.15rem",
    display: "block",
  },
  select: {
    width: "100%",
    backgroundColor: "#18265b",
    border: "1px solid #45475a",
    borderRadius: "6px",
    color: "#ffffff",
    fontSize: "0.85rem",
    padding: "0.4rem 0.6rem",
  },
  input: {
    width: "100%",
    backgroundColor: "#18265b",
    border: "1px solid #45475a",
    borderRadius: "6px",
    color: "#ffffff",
    fontSize: "0.85rem",
    padding: "0.4rem 0.6rem",
    boxSizing: "border-box",
  },
  segmented: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.4rem",
  },
  seg: {
    backgroundColor: "#18265b",
    border: "1px solid #45475a",
    borderRadius: "6px",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "0.78rem",
    fontWeight: 600,
    padding: "0.35rem 0.5rem",
    textAlign: "center",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  segActive: {
    backgroundColor: "#313244",
    borderColor: "#89b4fa",
    color: "#89b4fa",
  },
  cancelBtn: {
    backgroundColor: "transparent",
    border: "1px solid #45475a",
    borderRadius: "6px",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "0.85rem",
    padding: "0.4rem 1rem",
  },
  saveBtn: {
    backgroundColor: "#89b4fa",
    border: "none",
    borderRadius: "6px",
    color: "#18265b",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 700,
    padding: "0.4rem 1.25rem",
  },
  errorMsg: {
    color: "#f38ba8",
    fontSize: "0.8rem",
    margin: 0,
    padding: "0.3rem 0",
  },
};
