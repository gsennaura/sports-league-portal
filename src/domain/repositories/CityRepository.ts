import type { City } from "@domain/entities/City";

export interface CreateCityPayload {
  name: string;
  state_id: string;
}

export interface CityRepository {
  create(payload: CreateCityPayload): Promise<City>;
  listAll(): Promise<City[]>;
  listByStateId(stateId: string): Promise<City[]>;
}
