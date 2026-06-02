export type MatchEventType =
  | "goal"
  | "own_goal"
  | "goal_disallowed"
  | "penalty_goal"
  | "penalty_missed"
  | "penalty_saved"
  | "assist"
  | "yellow_card"
  | "second_yellow_card"
  | "red_card"
  | "penalty_awarded"
  | "substitution_out"
  | "substitution_in"
  | "injury"
  | "match_start"
  | "halftime"
  | "match_end";

export type MatchEventPeriod =
  | "first_half"
  | "second_half"
  | "extra_time_1"
  | "extra_time_2"
  | "penalties";

export interface MatchEvent {
  id: string;
  match_id: string;
  team_id: string;
  event_type: MatchEventType;
  period: MatchEventPeriod;
  athlete_id: string | null;
  related_event_id: string | null;
  minute: number | null;
  extra_time: number | null;
  is_annulled: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface MatchEventPayload {
  team_id: string;
  event_type: MatchEventType;
  period: MatchEventPeriod;
  athlete_id?: string | null;
  related_event_id?: string | null;
  minute?: number | null;
  extra_time?: number | null;
  notes?: string | null;
  created_by?: string | null;
}

export interface MatchEventUpdatePayload {
  event_type?: MatchEventType;
  period?: MatchEventPeriod;
  minute?: number | null;
  extra_time?: number | null;
  notes?: string | null;
  related_event_id?: string | null;
}

// ── Display helpers ────────────────────────────────────────────────────────────

export const EVENT_LABELS: Record<MatchEventType, string> = {
  goal: "Gol",
  own_goal: "Gol Contra",
  goal_disallowed: "Gol Anulado",
  penalty_goal: "Pênalti Convertido",
  penalty_missed: "Pênalti Perdido",
  penalty_saved: "Pênalti Defendido",
  assist: "Assistência",
  yellow_card: "Cartão Amarelo",
  second_yellow_card: "2º Cartão Amarelo",
  red_card: "Cartão Vermelho",
  penalty_awarded: "Pênalti Assinalado",
  substitution_out: "Substituição (saiu)",
  substitution_in: "Substituição (entrou)",
  injury: "Lesão",
  match_start: "Início da Partida",
  halftime: "Intervalo",
  match_end: "Fim da Partida",
};

export const EVENT_ICONS: Record<MatchEventType, string> = {
  goal: "⚽",
  own_goal: "⚽",
  goal_disallowed: "❌",
  penalty_goal: "⚽",
  penalty_missed: "❌",
  penalty_saved: "🧤",
  assist: "🅰️",
  yellow_card: "🟨",
  second_yellow_card: "🟨🟥",
  red_card: "🟥",
  penalty_awarded: "👆",
  substitution_out: "🔴",
  substitution_in: "🟢",
  injury: "🩹",
  match_start: "🎙️",
  halftime: "🔔",
  match_end: "🏁",
};

export const PERIOD_LABELS: Record<MatchEventPeriod, string> = {
  first_half: "1º Tempo",
  second_half: "2º Tempo",
  extra_time_1: "Prorrogação 1",
  extra_time_2: "Prorrogação 2",
  penalties: "Pênaltis",
};

export const ALL_EVENT_TYPES: MatchEventType[] = [
  "goal", "own_goal", "goal_disallowed",
  "penalty_goal", "penalty_missed", "penalty_saved",
  "assist",
  "yellow_card", "second_yellow_card", "red_card",
  "penalty_awarded",
  "substitution_out", "substitution_in",
  "injury",
  "match_start", "halftime", "match_end",
];

export const ALL_PERIODS: MatchEventPeriod[] = [
  "first_half", "second_half", "extra_time_1", "extra_time_2", "penalties",
];
