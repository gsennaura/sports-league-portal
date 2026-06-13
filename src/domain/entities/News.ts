export interface NewsListItem {
  id: string;
  title: string;
  summary: string | null;
  image_url: string | null;
  league_id: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

export interface NewsDetail extends NewsListItem {
  content: string;
  updated_at: string;
}
