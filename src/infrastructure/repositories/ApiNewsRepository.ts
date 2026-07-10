import type { NewsListItem, NewsDetail } from "@domain/entities/News";
import type { NewsRepository, CreateNewsInput, UpdateNewsInput } from "@domain/repositories/NewsRepository";
import { authHeaders } from "../authHeaders";

export class ApiNewsRepository implements NewsRepository {
  constructor(private readonly baseUrl: string) {}

  async list(leagueId?: string, limit?: number): Promise<NewsListItem[]> {
    const params = new URLSearchParams();
    if (leagueId) params.set("league_id", leagueId);
    if (typeof limit === "number") params.set("limit", String(limit));
    const qs = params.toString() ? `?${params.toString()}` : "";
    const resp = await fetch(`${this.baseUrl}/news${qs}`);
    if (!resp.ok) throw new Error(`Falha ao buscar notícias: ${resp.status}`);
    return resp.json() as Promise<NewsListItem[]>;
  }

  async getById(id: string): Promise<NewsDetail> {
    const resp = await fetch(`${this.baseUrl}/news/${id}`);
    if (!resp.ok) throw new Error(`Notícia não encontrada: ${resp.status}`);
    return resp.json() as Promise<NewsDetail>;
  }

  async adminListAll(leagueId?: string): Promise<NewsListItem[]> {
    const qs = leagueId ? `?league_id=${encodeURIComponent(leagueId)}` : "";
    const resp = await fetch(`${this.baseUrl}/news/admin/all${qs}`, {
      headers: authHeaders(),
    });
    if (!resp.ok) throw new Error(`Falha ao buscar notícias: ${resp.status}`);
    return resp.json() as Promise<NewsListItem[]>;
  }

  async adminGetById(id: string): Promise<NewsDetail> {
    const resp = await fetch(`${this.baseUrl}/news/admin/${id}`, {
      headers: authHeaders(),
    });
    if (!resp.ok) throw new Error(`Notícia não encontrada: ${resp.status}`);
    return resp.json() as Promise<NewsDetail>;
  }

  async create(input: CreateNewsInput): Promise<NewsDetail> {
    const resp = await fetch(`${this.baseUrl}/news`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(input),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({})) as { detail?: string };
      throw new Error(data.detail ?? `Erro ao criar notícia: ${resp.status}`);
    }
    return resp.json() as Promise<NewsDetail>;
  }

  async update(input: UpdateNewsInput): Promise<NewsDetail> {
    const { id, ...body } = input;
    const resp = await fetch(`${this.baseUrl}/news/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({})) as { detail?: string };
      throw new Error(data.detail ?? `Erro ao atualizar notícia: ${resp.status}`);
    }
    return resp.json() as Promise<NewsDetail>;
  }

  async delete(id: string): Promise<void> {
    const resp = await fetch(`${this.baseUrl}/news/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!resp.ok && resp.status !== 204) {
      const data = await resp.json().catch(() => ({})) as { detail?: string };
      throw new Error(data.detail ?? `Erro ao excluir notícia: ${resp.status}`);
    }
  }

  async uploadImage(id: string, file: File): Promise<{ image_url: string }> {
    const form = new FormData();
    form.append("file", file);
    const resp = await fetch(`${this.baseUrl}/news/${id}/image`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({})) as { detail?: string };
      throw new Error(data.detail ?? `Erro ao enviar imagem: ${resp.status}`);
    }
    const news = await resp.json() as NewsDetail;
    return { image_url: news.image_url ?? "" };
  }
}
