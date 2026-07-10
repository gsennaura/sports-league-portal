import type { Partner } from "@domain/entities/Partner";

export interface CreatePartnerInput {
  name: string;
  logo_url?: string | null;
  external_url?: string | null;
  priority?: number;
  is_active?: boolean;
  league_ids?: string[];
}

export interface UpdatePartnerInput extends CreatePartnerInput {
  id: string;
}

export interface PartnerRepository {
  listAll(leagueId?: string, activeOnly?: boolean): Promise<Partner[]>;
  getById(id: string): Promise<Partner>;
  create(input: CreatePartnerInput): Promise<Partner>;
  update(input: UpdatePartnerInput): Promise<Partner>;
  delete(id: string): Promise<void>;
  uploadLogo(id: string, file: File): Promise<{ logo_url: string }>;
}
