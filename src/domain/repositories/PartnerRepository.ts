import type { Partner } from "@domain/entities/Partner";

export interface PartnerRepository {
  listAll(leagueId?: string): Promise<Partner[]>;
}
