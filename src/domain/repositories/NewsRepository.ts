import type { NewsListItem, NewsDetail } from "@domain/entities/News";

export interface CreateNewsInput {
  title: string;
  content: string;
  summary?: string | null;
  image_url?: string | null;
  league_id?: string | null;
  is_published?: boolean;
  published_at?: string | null;
}

export interface UpdateNewsInput extends CreateNewsInput {
  id: string;
}

export interface NewsRepository {
  list(leagueId?: string, limit?: number): Promise<NewsListItem[]>;
  getById(id: string): Promise<NewsDetail>;
  adminListAll(leagueId?: string): Promise<NewsListItem[]>;
  adminGetById(id: string): Promise<NewsDetail>;
  create(input: CreateNewsInput): Promise<NewsDetail>;
  update(input: UpdateNewsInput): Promise<NewsDetail>;
  delete(id: string): Promise<void>;
  uploadImage(id: string, file: File): Promise<{ image_url: string }>;
}
