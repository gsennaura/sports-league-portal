export interface Athlete {
  id: string;
  name: string;
  birth_date: string | null;
  cpf: string | null;
  rg: string | null;
  nationality: string | null;
  city_id: string | null;
  position: string | null;
  nickname: string | null;
  preferred_foot: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string | null;
}

export interface AthleteTeamHistory {
  id: string;
  athlete_id: string;
  team_id: string;
  start_date: string;
  end_date: string | null;
  jersey_number: number | null;
  notes: string | null;
  is_active: boolean;
  athlete_name: string | null;
  athlete_nickname: string | null;
  athlete_photo_url: string | null;
  athlete_position: string | null;
  team_name: string | null;
}

export interface AthleteDetail {
  athlete: Athlete;
  team_history: AthleteTeamHistory[];
}

export interface AthleteChampionshipRegistration {
  id: string;
  athlete_id: string;
  championship_edition_id: string;
  team_id: string;
  registration_number: string | null;
  registered_at: string | null;
  notes: string | null;
  document_url: string | null;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  // Enriched by API
  championship_name?: string | null;
  championship_year?: number | null;
  team_name?: string | null;
}

export interface GoalMatchItem {
  match_id: string;
  match_date: string | null;
  home_team_name: string;
  away_team_name: string;
  home_score: number | null;
  away_score: number | null;
  minute: number | null;
  period: string;
  championship_name: string | null;
  championship_year: number | null;
}

export interface AthleteTeamStat {
  team_id: string;
  team_name: string;
  goals: number;
  yellow_cards: number;
  red_cards: number;
  matches_played: number;
}

export interface TeamAthleteStat {
  athlete_id: string;
  goals: number;
  yellow_cards: number;
  red_cards: number;
}

export interface AthleteStats {
  goals: number;
  yellow_cards: number;
  red_cards: number;
  substitutions_in: number;
  substitutions_out: number;
  matches_played: number;
  goal_matches: GoalMatchItem[];
  by_team: AthleteTeamStat[];
}
