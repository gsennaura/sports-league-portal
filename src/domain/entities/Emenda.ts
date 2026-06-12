export type EmendaRefType = "LINK_EXTERNO" | "DOCUMENTO_ANEXADO";

export const EMENDA_REF_TYPE_LABELS: Record<EmendaRefType, string> = {
  LINK_EXTERNO: "Link Externo",
  DOCUMENTO_ANEXADO: "Documento Anexado",
};

export interface Emenda {
  id: string;
  title: string;
  description: string | null;
  ref_type: EmendaRefType;
  year: number;
  file_url: string | null;
  external_url: string | null;
  league_id: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}
