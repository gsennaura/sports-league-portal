export interface League {
  id: string;
  name: string;
  short_name: string;
  city_id: string;
  city_name: string;
  is_federated: boolean;
  address: string | null;
  president: string | null;
  website: string | null;
  founded_year: number | null;
  parent_league_id: string | null;
  logo_url: string | null;
}
