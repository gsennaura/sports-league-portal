import type { City } from "@domain/entities/City";
import { authHeaders } from "../authHeaders";
import type { CityRepository, CreateCityPayload } from "@domain/repositories/CityRepository";

export class ApiCityRepository implements CityRepository {
  constructor(private readonly baseUrl: string) {}

  async create(payload: CreateCityPayload): Promise<City> {
    const response = await fetch(`${this.baseUrl}/cities`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(detail.detail ?? `Erro ao criar cidade: ${response.status}`);
    }
    return response.json() as Promise<City>;
  }

  async listAll(): Promise<City[]> {
    const response = await fetch(`${this.baseUrl}/cities`);
    if (!response.ok) throw new Error(`Falha ao buscar cidades: ${response.status}`);
    return response.json() as Promise<City[]>;
  }

  async listByStateId(stateId: string): Promise<City[]> {
    const response = await fetch(`${this.baseUrl}/cities?state_id=${stateId}`);
    if (!response.ok) throw new Error(`Falha ao buscar cidades: ${response.status}`);
    return response.json() as Promise<City[]>;
  }
}
