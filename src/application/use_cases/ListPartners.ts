import type { Partner } from "@domain/entities/Partner";
import type { PartnerRepository } from "@domain/repositories/PartnerRepository";

export class ListPartners {
  constructor(private readonly repository: PartnerRepository) {}

  execute(leagueId?: string): Promise<Partner[]> {
    return this.repository.listAll(leagueId);
  }
}
