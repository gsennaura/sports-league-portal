import type { State } from "@domain/entities/State";
import type { StateRepository } from "@domain/repositories/StateRepository";

export class ListStates {
  constructor(private readonly repository: StateRepository) {}

  execute(): Promise<State[]> {
    return this.repository.listAll();
  }
}
