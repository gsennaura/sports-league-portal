import type { Partner } from "@domain/entities/Partner";
import type { PartnerRepository } from "@domain/repositories/PartnerRepository";

export class ApiPartnerRepository implements PartnerRepository {
  constructor(private readonly baseUrl: string) {}

  async listAll(leagueId?: string): Promise<Partner[]> {
    const params = leagueId ? `?league_id=${encodeURIComponent(leagueId)}` : "";
    const resp = await fetch(`${this.baseUrl}/partners${params}`);
    if (!resp.ok) throw new Error(`Falha ao buscar parceiros: ${resp.status}`);
    return resp.json() as Promise<Partner[]>;
  }
}
