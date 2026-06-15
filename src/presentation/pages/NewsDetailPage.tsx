import { useEffect, useState } from "react";
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
        <div className="news-article__cover">
          <img src={news.image_url} alt={news.title} />
          <div className="news-article__cover-overlay" />
        </div>
      )}
      <main className="page-container">
        <Link to="/noticias" className="back-link">← Notícias</Link>
        <article className="news-article">
          <span className="news-article__date">{formatDate(news.published_at ?? news.created_at)}</span>
          <h1 className="news-article__title">{news.title}</h1>
          {news.summary && <p className="news-article__summary">{news.summary}</p>}
          <hr className="news-article__divider" />
          <div
            className="news-article__content"
            dangerouslySetInnerHTML={{ __html: news.content.replace(/\n/g, "<br />") }}
          />
        </article>
      </main>
    </>
  );
}
