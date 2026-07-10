import type { Partner } from "@domain/entities/Partner";
import type { PartnerRepository, CreatePartnerInput, UpdatePartnerInput } from "@domain/repositories/PartnerRepository";
import { authHeaders } from "../authHeaders";

export class ApiPartnerRepository implements PartnerRepository {
  constructor(private readonly baseUrl: string) {}

  async listAll(leagueId?: string, activeOnly = true): Promise<Partner[]> {
    const params = new URLSearchParams();
    if (leagueId) params.set("league_id", leagueId);
    if (!activeOnly) params.set("active_only", "false");
    const qs = params.toString() ? `?${params.toString()}` : "";
    const resp = await fetch(`${this.baseUrl}/partners${qs}`);
    if (!resp.ok) throw new Error(`Falha ao buscar parceiros: ${resp.status}`);
    return resp.json() as Promise<Partner[]>;
  }

  async getById(id: string): Promise<Partner> {
    const resp = await fetch(`${this.baseUrl}/partners/${id}`);
    if (!resp.ok) throw new Error(`Parceiro não encontrado: ${resp.status}`);
    return resp.json() as Promise<Partner>;
  }

  async create(input: CreatePartnerInput): Promise<Partner> {
    const resp = await fetch(`${this.baseUrl}/partners`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(input),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({})) as { detail?: string };
      throw new Error(data.detail ?? `Erro ao criar parceiro: ${resp.status}`);
    }
    return resp.json() as Promise<Partner>;
  }

  async update(input: UpdatePartnerInput): Promise<Partner> {
    const { id, ...body } = input;
    const resp = await fetch(`${this.baseUrl}/partners/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({})) as { detail?: string };
      throw new Error(data.detail ?? `Erro ao atualizar parceiro: ${resp.status}`);
    }
    return resp.json() as Promise<Partner>;
  }

  async delete(id: string): Promise<void> {
    const resp = await fetch(`${this.baseUrl}/partners/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!resp.ok && resp.status !== 204) {
      const data = await resp.json().catch(() => ({})) as { detail?: string };
      throw new Error(data.detail ?? `Erro ao excluir parceiro: ${resp.status}`);
    }
  }

  async uploadLogo(id: string, file: File): Promise<{ logo_url: string }> {
    const form = new FormData();
    form.append("file", file);
    const resp = await fetch(`${this.baseUrl}/partners/${id}/logo`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({})) as { detail?: string };
      throw new Error(data.detail ?? `Erro ao enviar logo: ${resp.status}`);
    }
    const partner = await resp.json() as Partner;
    return { logo_url: partner.logo_url ?? "" };
  }
}
