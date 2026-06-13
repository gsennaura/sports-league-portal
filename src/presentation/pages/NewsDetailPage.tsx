import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { GetNewsDetail } from "@application/use_cases/GetNewsDetail";
import type { NewsDetail } from "@domain/entities/News";

interface Props {
  getNewsDetail: GetNewsDetail;
}

function formatDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function NewsDetailPage({ getNewsDetail }: Props) {
  const { id } = useParams<{ id: string }>();
  const [news, setNews] = useState<NewsDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getNewsDetail.execute(id)
      .then(setNews)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar notícia."))
      .finally(() => setLoading(false));
  }, [id, getNewsDetail]);

  if (loading) return <main className="page-container"><p className="muted">Carregando...</p></main>;
  if (error || !news) return (
    <main className="page-container">
      <p className="error-text">{error ?? "Notícia não encontrada."}</p>
      <Link to="/noticias" className="back-link">← Voltar</Link>
    </main>
  );

  return (
    <>
      {news.image_url && (
        <div style={{ ...S.coverWrap }}>
          <img src={news.image_url} alt={news.title}  />
          <div  />
        </div>
      )}
      <main className="page-container">
        <Link to="/noticias" className="back-link">← Notícias</Link>
        <article >
          <span className="muted">{formatDate(news.published_at ?? news.created_at)}</span>
          <h1 className="page-title">{news.title}</h1>
          {news.summary && <p className="muted">{news.summary}</p>}
          <hr  />
          <div
            
            dangerouslySetInnerHTML={{ __html: news.content.replace(/\n/g, "<br />") }}
          />
        </article>
      </main>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  coverWrap: { position: "relative", width: "100%", maxHeight: 420, overflow: "hidden" },
  cover: { width: "100%", maxHeight: 420, objectFit: "cover", display: "block" },
  coverOverlay: { position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 50%, #11111b 100%)" },
  article: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  date: { fontSize: "0.72rem", color: "#89b4fa", textTransform: "uppercase", letterSpacing: "0.05em" },
  summary: { margin: 0, fontSize: "1.05rem", color: "#ffffff", lineHeight: 1.55, fontStyle: "italic" },
  divider: { border: "none", borderTop: "1px solid #313244", margin: "0.5rem 0" },
  content: { fontSize: "0.95rem", color: "#cdd6f4", lineHeight: 1.8, whiteSpace: "pre-wrap" },
};
