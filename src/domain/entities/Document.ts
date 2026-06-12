export type DocumentType = "DOCUMENTO" | "EDITAL_CONVOCACAO" | "RESULTADO_JULGAMENTO";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  DOCUMENTO: "Documento",
  EDITAL_CONVOCACAO: "Edital de Convocação",
  RESULTADO_JULGAMENTO: "Resultado de Julgamento",
};

export interface Document {
  id: string;
  title: string;
  description: string | null;
  type: DocumentType;
  file_url: string | null;
  external_url: string | null;
  league_id: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}
