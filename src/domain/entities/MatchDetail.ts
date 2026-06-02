import type { UpcomingMatch } from "./UpcomingMatch";
import type { MatchEvent } from "./MatchEvent";
import type { MatchReferee } from "./MatchReferee";

export interface MatchDetail extends Omit<UpcomingMatch, "match_date"> {
  match_date: string | null;
  events: MatchEvent[];
  referees: MatchReferee[];
}
