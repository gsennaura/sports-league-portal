import type { RefereeRepository } from "@domain/repositories/RefereeRepository";

export class DeleteReferee {
  constructor(private readonly repo: RefereeRepository) {}

  execute(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}
