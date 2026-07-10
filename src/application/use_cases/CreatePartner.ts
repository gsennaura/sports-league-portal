import type { Partner } from "@domain/entities/Partner";
import type { PartnerRepository, CreatePartnerInput } from "@domain/repositories/PartnerRepository";

export class CreatePartner {
  constructor(private readonly repository: PartnerRepository) {}
  execute(input: CreatePartnerInput): Promise<Partner> {
    return this.repository.create(input);
  }
}
