import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CreateNews } from "@application/use_cases/CreateNews";
import type { ListLeagues } from "@application/use_cases/ListLeagues";
import type { League } from "@domain/entities/League";

interface Props {
  createNews: CreateNews;
  listLeagues: ListLeagues;
}

export function AdminNewsCreatePage({ createNews, listLeagues }: Props) {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [leagueId, setLeagueId] = useState<string>("");
  const [isPublished, setIsPublished] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listLeagues.execute().then(setLeagues).catch(() => null);
  }, [listLeagues]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Título é obrigatório."); return; }
    if (!content.trim()) { setError("Conteúdo é obrigatório."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const news = await createNews.execute({
        title: title.trim(),
        summary: summary.trim() || null,
        content: content.trim(),
        league_id: leagueId || null,
        is_published: isPublished,
      });
      if (imageFile) {
        const form = new FormData();
        form.append("file", imageFile);
        await fetch(`${import.meta.env.VITE_API_BASE}/news/${news.id}/image`, {
          method: "POST",
          headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
          body: form,
        });
      }
      navigate("/admin/noticias");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar notícia.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <header style={S.hero}>
        <div style={S.heroAccent} />
        <div style={S.heroInner}><h1 style={S.title}>Nova Notícia</h1></div>
      </header>
      <main style={S.page}>
        <form onSubmit={handleSubmit} style={S.form}>
          {error && <p style={S.error}>{error}</p>}

          <label style={S.label}>
            Título *
            <input style={S.input} value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>

          <label style={S.label}>
            Resumo <span style={S.hint}>(opcional — aparece no carrossel)</span>
            <input style={S.input} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Breve descrição..." />
          </label>

          <label style={S.label}>
            Conteúdo *
            <textarea style={{ ...S.input, minHeight: 200, resize: "vertical" }} value={content} onChange={(e) => setContent(e.target.value)} required />
          </label>

          <label style={S.label}>
            Liga <span style={S.hint}>(deixe em branco para notícia geral)</span>
            <select style={S.input} value={leagueId} onChange={(e) => setLeagueId(e.target.value)}>
              <option value="">— Geral (todas as ligas) —</option>
              {leagues.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </label>

          <label style={S.label}>
            Imagem de capa
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} style={{ color: "#cdd6f4" }} />
            {imagePreview && <img src={imagePreview} alt="preview" style={S.preview} />}
          </label>

          <label style={S.checkLabel}>
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
            Publicar agora
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
  heroInner: { maxWidth: 800, margin: "0 auto", padding: "1.5rem 2rem" },
  title: { margin: 0, fontSize: "1.6rem", fontWeight: 900, color: "#cdd6f4" },
  page: { maxWidth: 800, margin: "0 auto", padding: "2rem" },
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
};
