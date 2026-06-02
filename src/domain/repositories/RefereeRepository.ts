import type { Referee } from "@domain/entities/Referee";
import type { RefereeMatch } from "@domain/entities/RefereeMatch";

export interface CreateRefereeInput {
  name: string;
  nickname?: string;
  birth_date?: string;
  cpf?: string;
  nationality?: string;
  phone?: string;
  email?: string;
  photo_url?: string;
  notes?: string;
}

export interface UpdateRefereeInput extends CreateRefereeInput {
  id: string;
}

export interface RefereeRepository {
  listAll(name?: string): Promise<Referee[]>;
  getById(id: string): Promise<Referee>;
  create(input: CreateRefereeInput): Promise<Referee>;
  update(input: UpdateRefereeInput): Promise<Referee>;
  delete(id: string): Promise<void>;
  uploadPhoto(id: string, file: File): Promise<{ photo_url: string }>;
  getMatchesByReferee(refereeId: string): Promise<RefereeMatch[]>;
}
