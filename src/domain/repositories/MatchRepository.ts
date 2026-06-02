import type { UpcomingMatch } from "@domain/entities/UpcomingMatch";
import type { MatchDetail } from "@domain/entities/MatchDetail";
import type { HeadToHeadMatch } from "@domain/entities/HeadToHeadMatch";
import type { MatchEvent, MatchEventPayload, MatchEventUpdatePayload } from "@domain/entities/MatchEvent";

export interface MatchResultPayload {
  home_score: number;
  away_score: number;
  home_penalty_score?: number | null;
  away_penalty_score?: number | null;
  finish_match?: boolean;
}

export interface MatchUpdatePayload {
  home_score?: number | null;
  away_score?: number | null;
  home_penalty_score?: number | null;
  away_penalty_score?: number | null;
  match_date?: string | null;
  round_number?: number | null;
  venue_id?: string | null;
  status?: string | null;
}

export interface MatchRepository {
  listUpcoming(days?: number): Promise<UpcomingMatch[]>;
  listRecent(days?: number): Promise<UpcomingMatch[]>;
  getDetail(id: string): Promise<MatchDetail>;
  getHeadToHead(matchId: string): Promise<HeadToHeadMatch[]>;
  updateResult(matchId: string, payload: MatchResultPayload): Promise<MatchDetail>;
  updateMatch(matchId: string, payload: MatchUpdatePayload): Promise<MatchDetail>;
  getLiveWindow(): Promise<MatchDetail[]>;

  // Events
  addMatchEvent(matchId: string, payload: MatchEventPayload): Promise<MatchEvent>;
  annulMatchEvent(matchId: string, eventId: string): Promise<void>;
  updateMatchEvent(matchId: string, eventId: string, payload: MatchEventUpdatePayload): Promise<MatchEvent>;
}
