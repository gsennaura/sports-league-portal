import type { Emenda } from "@domain/entities/Emenda";
import type { EmendaRepository, CreateEmendaInput } from "@domain/repositories/EmendaRepository";

export class CreateEmenda {
  constructor(private readonly repository: EmendaRepository) {}
  execute(input: CreateEmendaInput): Promise<Emenda> {
    return this.repository.create(input);
  }
}
