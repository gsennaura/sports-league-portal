import { useRef } from "react";
import { Link } from "react-router-dom";
import type { NewsListItem } from "@domain/entities/News";

interface Props {
  items: NewsListItem[];
}

function formatDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function NewsCarousel({ items }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    if (!trackRef.current) return;
    trackRef.current.scrollBy({ left: dir === "right" ? 320 : -320, behavior: "smooth" });
  };

  return (
    <section className="news-carousel">
      <div className="news-carousel__header">
        <h2 className="news-carousel__heading">Notícias</h2>
        <div className="news-carousel__arrows">
          <button className="news-carousel__arrow" onClick={() => scroll("left")} aria-label="anterior">&#8592;</button>
          <button className="news-carousel__arrow" onClick={() => scroll("right")} aria-label="próximo">&#8594;</button>
        </div>
      </div>
      <div ref={trackRef} className="news-carousel__track">
        {items.map((n) => (
          <Link key={n.id} to={`/noticias/${n.id}`} className="news-carousel__card">
            {n.image_url ? (
              <img src={n.image_url} alt={n.title} className="news-carousel__img" />
            ) : (
              <div className="news-carousel__placeholder" />
            )}
            <div className="news-carousel__body">
              <span className="news-carousel__date">{formatDate(n.published_at ?? n.created_at)}</span>
              <h3 className="news-carousel__title">{n.title}</h3>
              {n.summary && <p className="news-carousel__summary">{n.summary}</p>}
            </div>
          </Link>
        ))}
      </div>
      <div className="news-carousel__see-all-wrap">
        <Link to="/noticias" className="news-carousel__see-all">Ver todas as notícias →</Link>
      </div>
    </section>
  );
}
