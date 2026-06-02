export interface ClubTitle {
  year: number;
  championship_id: string;
  championship_name: string;
  championship_nickname: string | null;
  championship_level: string | null;
  edition_id: string;
  team_id: string;
  team_name: string;
  team_category: string | null;
  result: "champion" | "runner_up";
}
