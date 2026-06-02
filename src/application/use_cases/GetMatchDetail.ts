import type { MatchRepository } from "@domain/repositories/MatchRepository";
import type { MatchDetail } from "@domain/entities/MatchDetail";

export class GetMatchDetail {
  constructor(private readonly repository: MatchRepository) {}

  async execute(id: string): Promise<MatchDetail> {
    return this.repository.getDetail(id);
  }
}
