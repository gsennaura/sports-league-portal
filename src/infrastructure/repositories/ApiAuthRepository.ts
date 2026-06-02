import { API_BASE } from "../apiBase";

export interface AuthUser {
  id: string;
  email: string;
  role: "full_admin" | "league_admin" | "team_admin" | "athlete" | "user";
  is_active: boolean;
  name?: string | null;
  has_athlete_profile?: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterAthletePayload {
  email: string;
  password: string;
  name: string;
  nickname?: string;
  position?: string;
  birth_date?: string;
  phone?: string;
}

export interface RegisterAthleteResponse {
  user: AuthUser;
  athlete_id: string;
  athlete_name: string;
}

export interface RegisterUserPayload {
  email: string;
  password: string;
  name?: string;
}

export interface DirigenteRequestStatus {
  id: string;
  team_id: string;
  title: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PendenciasResponse {
  dirigente_requests: DirigenteRequestStatus[];
}

export interface DirigenteProfile {
  id: string;
  user_id: string;
  team_id: string;
  role: string;
  title: string | null;
  is_active: boolean;
  created_at: string;
}

export interface LeagueAdminProfile {
  id: string;
  user_id: string;
  league_id: string;
  is_active: boolean;
  created_at: string;
}

export interface LeagueAdminAssignment {
  id: string;
  user_id: string;
  league_id: string;
  is_active: boolean;
  created_at: string;
}

export class ApiAuthRepository {
  private readonly base: string;
  constructor(base = API_BASE) {
    this.base = base;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${this.base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(detail.detail ?? "Email ou senha inválidos.");
    }
    return response.json() as Promise<LoginResponse>;
  }

  async me(token: string): Promise<AuthUser> {
    const response = await fetch(`${this.base}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Sessão inválida.");
    return response.json() as Promise<AuthUser>;
  }

  async registerAthlete(payload: RegisterAthletePayload): Promise<RegisterAthleteResponse> {
    const response = await fetch(`${this.base}/auth/register/athlete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(detail.detail ?? "Erro ao criar conta.");
    }
    return response.json() as Promise<RegisterAthleteResponse>;
  }

  async getDirigenteProfiles(token: string): Promise<DirigenteProfile[]> {
    const response = await fetch(`${this.base}/dirigentes/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return [];
    return response.json() as Promise<DirigenteProfile[]>;
  }

  async getLeagueAdminProfiles(token: string): Promise<LeagueAdminProfile[]> {
    const response = await fetch(`${this.base}/auth/me/league-admin-profiles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return [];
    return response.json() as Promise<LeagueAdminProfile[]>;
  }

  async listLeagueAdminAssignments(token: string): Promise<LeagueAdminAssignment[]> {
    const response = await fetch(`${this.base}/league-admins/assignments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return [];
    return response.json() as Promise<LeagueAdminAssignment[]>;
  }

  async assignLeagueAdmin(token: string, userId: string, leagueId: string): Promise<LeagueAdminAssignment> {
    const response = await fetch(`${this.base}/league-admins/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_id: userId, league_id: leagueId }),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(detail.detail ?? "Erro ao atribuir admin de liga.");
    }
    return response.json() as Promise<LeagueAdminAssignment>;
  }

  async revokeLeagueAdmin(token: string, assignmentId: string): Promise<void> {
    const response = await fetch(`${this.base}/league-admins/assignments/${assignmentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(detail.detail ?? "Erro ao revogar admin de liga.");
    }
  }

  async registerUser(payload: RegisterUserPayload): Promise<AuthUser> {
    const response = await fetch(`${this.base}/auth/register/user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(detail.detail ?? "Erro ao criar conta.");
    }
    return response.json() as Promise<AuthUser>;
  }

  async getPendencias(token: string): Promise<PendenciasResponse> {
    const response = await fetch(`${this.base}/auth/me/pendencias`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return { dirigente_requests: [] };
    return response.json() as Promise<PendenciasResponse>;
  }
}
