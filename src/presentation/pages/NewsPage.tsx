import { Link } from "react-router-dom";
import type { ListNews } from "@application/use_cases/ListNews";
import { useNews } from "@presentation/hooks/useNews";

interface Props {
  listNews: ListNews;
  leagueId?: string;
}

function formatDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function NewsPage({ listNews, leagueId }: Props) {
  const { news, loading, error } = useNews(listNews, leagueId);

  return (
    <>
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner"><h1 className="page-title">Notícias</h1></div>
      </header>
      <main className="page-container">
        {loading && <p className="muted">Carregando...</p>}
        {error && <p className="error-text">{error}</p>}
        {!loading && !error && news.length === 0 && <p className="muted">Nenhuma notícia publicada ainda.</p>}
        <div className="person-grid">
          {news.map((n) => (
            <Link key={n.id} to={`/noticias/${n.id}`} className="person-card">
              {n.image_url ? (
                <img src={n.image_url} alt={n.title} className="news-grid__img" />
              ) : (
                <div className="news-grid__placeholder" />
              )}
              <div className="person-card__body">
                <span className="news-grid__date">{formatDate(n.published_at ?? n.created_at)}</span>
                <h2 className="news-grid__title">{n.title}</h2>
                {n.summary && <p className="news-grid__summary">{n.summary}</p>}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}

