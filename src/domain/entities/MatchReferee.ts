export type RefereeRole = "main_referee" | "assistant" | "delegate";

export interface MatchReferee {
  id: string;
  match_id: string;
  referee_id: string;
  role: RefereeRole;
  referee_name: string | null;
  referee_nickname: string | null;
  referee_photo_url: string | null;
  city_id: string | null;
}

export const ROLE_LABELS: Record<RefereeRole, string> = {
  main_referee: "Árbitro",
  assistant: "Assistente",
  delegate: "Representante",
};
