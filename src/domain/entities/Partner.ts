export interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  external_url: string | null;
  priority: number;
  is_active: boolean;
  league_ids: string[];
}
