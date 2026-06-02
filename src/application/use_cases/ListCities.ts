import type { City } from "@domain/entities/City";
import type { CityRepository } from "@domain/repositories/CityRepository";

export class ListCities {
  constructor(private readonly repository: CityRepository) {}

  execute(stateId?: string): Promise<City[]> {
    if (stateId) return this.repository.listByStateId(stateId);
    return this.repository.listAll();
  }
}
