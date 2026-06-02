import type { City } from "@domain/entities/City";
import type { CityRepository, CreateCityPayload } from "@domain/repositories/CityRepository";

export class CreateCity {
  constructor(private readonly repository: CityRepository) {}

  execute(payload: CreateCityPayload): Promise<City> {
    return this.repository.create(payload);
  }
}
