import type { State } from "@domain/entities/State";

export interface StateRepository {
  listAll(): Promise<State[]>;
  listByCountryId(countryId: string): Promise<State[]>;
}
