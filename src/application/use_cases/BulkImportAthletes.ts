import { authHeaders } from "@infrastructure/authHeaders";
import { API_BASE } from "@infrastructure/apiBase";

export interface BulkAthleteRow {
  name: string;
  birth_date?: string;
  cpf?: string;
  rg?: string;
  nationality?: string;
  position?: string;
  nickname?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface BulkAthleteResult {
  row: number;
  success: boolean;
  athlete_id: string | null;
  name: string;
  error: string | null;
}

export interface BulkImportAthletesResult {
  total: number;
  created: number;
  errors: number;
  results: BulkAthleteResult[];
}

export class BulkImportAthletes {
  async execute(rows: BulkAthleteRow[]): Promise<BulkImportAthletesResult> {
    const resp = await fetch(`${API_BASE}/athletes/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ athletes: rows }),
    });
    if (!resp.ok) {
      const d = await resp.json().catch(() => ({})) as { detail?: string };
      throw new Error(d.detail ?? `Erro ${resp.status}`);
    }
    return resp.json() as Promise<BulkImportAthletesResult>;
  }
}
