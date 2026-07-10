import type { EmendaRepository } from "@domain/repositories/EmendaRepository";

export class DeleteEmenda {
  constructor(private readonly repository: EmendaRepository) {}
  execute(id: string): Promise<void> {
    return this.repository.delete(id);
  }
}
