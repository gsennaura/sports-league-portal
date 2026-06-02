export interface Championship {
  id: string;           // championship (series) ID — used for navigation
  edition_id: string | null;  // specific edition ID (null = latest/active)
  name: string;
  nickname: string | null;
  city_id: string;
  city_name: string;
  sport_id: string;
  sport_name: string;
  year: number;
  scope: string;
  level: string | null;
  league_id: string | null;
  division: string | null;
  champion_team_id: string | null;
  runner_up_team_id: string | null;
  champion_team_name: string | null;
  runner_up_team_name: string | null;
}
