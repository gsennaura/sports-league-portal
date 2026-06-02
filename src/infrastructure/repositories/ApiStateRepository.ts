import type { State } from "@domain/entities/State";
import type { StateRepository } from "@domain/repositories/StateRepository";

export class ApiStateRepository implements StateRepository {
  constructor(private readonly baseUrl: string) {}

  async listAll(): Promise<State[]> {
    const response = await fetch(`${this.baseUrl}/states`);
    if (!response.ok) throw new Error(`Falha ao buscar estados: ${response.status}`);
    return response.json() as Promise<State[]>;
  }

  async listByCountryId(countryId: string): Promise<State[]> {
    const response = await fetch(`${this.baseUrl}/states?country_id=${countryId}`);
    if (!response.ok) throw new Error(`Falha ao buscar estados: ${response.status}`);
    return response.json() as Promise<State[]>;
  }
}
