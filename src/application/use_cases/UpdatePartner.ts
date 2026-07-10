import type { Partner } from "@domain/entities/Partner";
import type { PartnerRepository, UpdatePartnerInput } from "@domain/repositories/PartnerRepository";

export class UpdatePartner {
  constructor(private readonly repository: PartnerRepository) {}
  execute(input: UpdatePartnerInput): Promise<Partner> {
    return this.repository.update(input);
  }
}
