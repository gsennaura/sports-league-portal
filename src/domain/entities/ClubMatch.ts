export interface ClubMatch {
  match_id: string;
  match_date: string | null;
  home_team_id: string;
  home_team_name: string;
  home_team_category: string | null;
  away_team_id: string;
  away_team_name: string;
  away_team_category: string | null;
  home_score: number | null;
  away_score: number | null;
  home_penalty_score: number | null;
  away_penalty_score: number | null;
  championship_id: string;
  championship_name: string;
  phase_name: string;
  phase_type: string;
  venue_name: string | null;
  home_club_logo_url: string | null;
  away_club_logo_url: string | null;
}