import type { Emenda } from "@domain/entities/Emenda";
import type { EmendaRepository, UpdateEmendaInput } from "@domain/repositories/EmendaRepository";

export class UpdateEmenda {
  constructor(private readonly repository: EmendaRepository) {}
  execute(input: UpdateEmendaInput): Promise<Emenda> {
    return this.repository.update(input);
  }
}
