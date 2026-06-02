export interface Team {
  id: string;
  name: string;
  city_id: string;
  city_name: string;
  sport_id: string;
  sport_name: string | null;
  venue_id: string | null;
  venue_name: string | null;
  president: string | null;
  founded_at: string | null;
  club_id: string | null;
  club_name: string | null;
  club_logo_url: string | null;
  category: string | null;
}
