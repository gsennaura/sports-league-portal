export interface RefereeMatch {
  id: string;
  match_date: string | null;
  round_number: number | null;
  home_team_id: string;
  home_team_name: string;
  away_team_id: string;
  away_team_name: string;
  home_score: number | null;
  away_score: number | null;
  home_penalty_score: number | null;
  away_penalty_score: number | null;
  championship_name: string;
  championship_year: number;
  phase_name: string;
  status: string;
  role: string;
  home_club_logo_url: string | null;
  away_club_logo_url: string | null;
}
