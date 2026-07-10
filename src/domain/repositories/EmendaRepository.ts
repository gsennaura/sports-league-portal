import type { Emenda, EmendaRefType } from "../entities/Emenda";

export interface CreateEmendaInput {
  title: string;
  ref_type: EmendaRefType;
  year: number;
  description: string | null;
  file_url: string | null;
  external_url: string | null;
  league_id: string | null;
  is_published: boolean;
}

export interface UpdateEmendaInput extends CreateEmendaInput {
  id: string;
}

export interface EmendaRepository {
  list(leagueId?: string, year?: number): Promise<Emenda[]>;
  adminListAll(leagueId?: string, year?: number): Promise<Emenda[]>;
  adminGetById(id: string): Promise<Emenda>;
  create(input: CreateEmendaInput): Promise<Emenda>;
  update(input: UpdateEmendaInput): Promise<Emenda>;
  delete(id: string): Promise<void>;
  uploadFile(id: string, file: File): Promise<Emenda>;
}
