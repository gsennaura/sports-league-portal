import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { UpdateNews } from "@application/use_cases/UpdateNews";
import type { DeleteNews } from "@application/use_cases/DeleteNews";
import type { ListLeagues } from "@application/use_cases/ListLeagues";
import type { NewsRepository } from "@domain/repositories/NewsRepository";
import type { League } from "@domain/entities/League";

interface Props {
  updateNews: UpdateNews;
  deleteNews: DeleteNews;
  listLeagues: ListLeagues;
  newsRepository: NewsRepository;
}

export function AdminNewsEditPage({ updateNews, deleteNews, listLeagues, newsRepository }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [leagueId, setLeagueId] = useState<string>("");
  const [isPublished, setIsPublished] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([newsRepository.adminGetById(id), listLeagues.execute()])
      .then(([news, ls]) => {
        setTitle(news.title);
        setSummary(news.summary ?? "");
        setContent(news.content);
        setLeagueId(news.league_id ?? "");
        setIsPublished(news.is_published);
        setCurrentImageUrl(news.image_url);
        setLeagues(ls);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, [id, newsRepository, listLeagues]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !title.trim()) { setError("Título é obrigatório."); return; }
    setSubmitting(true);
    setError(null);
    try {
      await updateNews.execute({
        id,
        title: title.trim(),
        summary: summary.trim() || null,
        content: content.trim(),
        league_id: leagueId || null,
        is_published: isPublished,
      });
      if (imageFile) {
        await newsRepository.uploadImage(id, imageFile);
      }
      navigate("/admin/noticias");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar notícia.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!id || !confirm("Excluir esta notícia?")) return;
    try {
      await deleteNews.execute(id);
      navigate("/admin/noticias");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir.");
    }
  }

  if (loading) return <main style={S.page}><p style={S.muted}>Carregando...</p></main>;

  return (
    <>
      <header style={S.hero}>
        <div style={S.heroAccent} />
        <div style={S.heroInner}>
          <h1 style={S.title}>Editar Notícia</h1>
          <button style={S.btnDanger} onClick={handleDelete}>Excluir</button>
        </div>
      </header>
      <main style={S.page}>
        <form onSubmit={handleSubmit} style={S.form}>
          {error && <p style={S.error}>{error}</p>}

          <label style={S.label}>
            Título *
            <input style={S.input} value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>

          <label style={S.label}>
            Resumo <span style={S.hint}>(opcional)</span>
            <input style={S.input} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </label>

          <label style={S.label}>
            Conteúdo *
            <textarea style={{ ...S.input, minHeight: 200, resize: "vertical" }} value={content} onChange={(e) => setContent(e.target.value)} required />
          </label>

          <label style={S.label}>
            Liga
            <select style={S.input} value={leagueId} onChange={(e) => setLeagueId(e.target.value)}>
              <option value="">— Geral (todas as ligas) —</option>
              {leagues.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </label>

          <label style={S.label}>
            Imagem de capa
            {currentImageUrl && !imagePreview && (
              <img src={currentImageUrl} alt="capa atual" style={S.preview} />
            )}
            {imagePreview && <img src={imagePreview} alt="nova capa" style={S.preview} />}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} style={{ color: "#cdd6f4" }} />
          </label>

          <label style={S.checkLabel}>
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
            Publicada
          </label>

          <div style={S.actions}>
            <button type="submit" style={S.btnSave} disabled={submitting}>{submitting ? "Salvando..." : "Salvar"}</button>
            <button type="button" style={S.btnCancel} onClick={() => navigate("/admin/noticias")}>Cancelar</button>
          </div>
        </form>
      </main>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: { background: "#1e1e2e", borderBottom: "1px solid #313244" },
  heroAccent: { height: "4px", background: "linear-gradient(90deg,#89dceb,#89b4fa)" },
  heroInner: { maxWidth: 800, margin: "0 auto", padding: "1.5rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" },
  title: { margin: 0, fontSize: "1.6rem", fontWeight: 900, color: "#cdd6f4" },
  btnDanger: { padding: "0.5rem 1.1rem", borderRadius: "8px", background: "transparent", border: "1px solid #f38ba8", color: "#f38ba8", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 },
  page: { maxWidth: 800, margin: "0 auto", padding: "2rem" },
  muted: { color: "#6c7086" },
  form: { display: "flex", flexDirection: "column", gap: "1.25rem" },
  error: { color: "#f38ba8", background: "#2a1a1a", border: "1px solid #f38ba8", borderRadius: 8, padding: "0.75rem 1rem", margin: 0 },
  label: { display: "flex", flexDirection: "column", gap: "0.4rem", color: "#cdd6f4", fontSize: "0.85rem", fontWeight: 600 },
  hint: { fontWeight: 400, color: "#6c7086", fontSize: "0.78rem" },
  input: { padding: "0.6rem 0.9rem", borderRadius: "8px", border: "1px solid #45475a", background: "#181825", color: "#cdd6f4", fontSize: "0.9rem" },
  preview: { width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 8, background: "#181825", marginTop: "0.4rem" },
  checkLabel: { display: "flex", alignItems: "center", gap: "0.5rem", color: "#cdd6f4", fontSize: "0.88rem", cursor: "pointer" },
  actions: { display: "flex", gap: "0.75rem", marginTop: "0.5rem" },
  btnSave: { padding: "0.65rem 1.5rem", borderRadius: "8px", background: "#89b4fa", color: "#1e1e2e", fontWeight: 700, border: "none", cursor: "pointer", fontSize: "0.9rem" },
  btnCancel: { padding: "0.65rem 1.5rem", borderRadius: "8px", background: "transparent", border: "1px solid #45475a", color: "#cdd6f4", cursor: "pointer", fontSize: "0.9rem" },
  btnDangerIcon: { padding: "0.5rem 1.1rem", borderRadius: "8px", background: "transparent", border: "1px solid #f38ba8", color: "#f38ba8", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 },
};
