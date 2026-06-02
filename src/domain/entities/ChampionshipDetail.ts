export interface TeamEntry {
  id: string;
  name: string;
  club_logo_url: string | null;
}

export interface TopScorerItem {
  athlete_id: string;
  athlete_name: string;
  team_id: string;
  team_name: string;
  goals: number;
}

export interface MatchEntry {
  id: string;
  round_number: number;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  home_penalty_score: number | null;
  away_penalty_score: number | null;
  match_date: string | null;
  venue_name: string | null;
  home_club_logo_url: string | null;
  away_club_logo_url: string | null;
}

export interface StandingEntry {
  team_id: string;
  team_name: string;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  club_logo_url: string | null;
}

export interface GroupDetail {
  id: string;
  name: string;
  teams: TeamEntry[];
  standings: StandingEntry[];
  matches: MatchEntry[];
}

export interface PhaseDetail {
  id: string;
  name: string;
  phase_type: string;
  phase_order: number;
  status: string;
  groups: GroupDetail[];
  groups_loaded: boolean;
}

export interface ChampionshipDetail {
  id: string;
  name: string;
  nickname: string | null;
  year: number;
  scope: string;
  level: string | null;
  division: string | null;
  league_id: string | null;
  champion_team_id: string | null;
  runner_up_team_id: string | null;
  phases: PhaseDetail[];
  top_scorers: TopScorerItem[];
  overall_standings: StandingEntry[];
  sibling_editions: SiblingEdition[];
}

export interface SiblingEdition {
  edition_id: string;
  year: number;
  champion_team_id: string | null;
  champion_team_name: string | null;
  runner_up_team_id: string | null;
  runner_up_team_name: string | null;
}
