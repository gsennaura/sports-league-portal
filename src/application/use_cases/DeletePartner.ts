import type { PartnerRepository } from "@domain/repositories/PartnerRepository";

export class DeletePartner {
  constructor(private readonly repository: PartnerRepository) {}
  execute(id: string): Promise<void> {
    return this.repository.delete(id);
  }
}
