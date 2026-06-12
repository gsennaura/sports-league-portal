import React, { useRef } from "react";
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
    <section style={S.section}>
      <div style={S.header}>
        <h2 style={S.heading}>Notícias</h2>
        <div style={S.arrows}>
          <button style={S.arrow} onClick={() => scroll("left")} aria-label="anterior">&#8592;</button>
          <button style={S.arrow} onClick={() => scroll("right")} aria-label="próximo">&#8594;</button>
        </div>
      </div>
      <div ref={trackRef} style={S.track}>
        {items.map((n) => (
          <Link key={n.id} to={`/noticias/${n.id}`} style={S.card}>
            {n.image_url ? (
              <img src={n.image_url} alt={n.title} style={S.img} />
            ) : (
              <div style={S.imgPlaceholder} />
            )}
            <div style={S.cardBody}>
              <span style={S.date}>{formatDate(n.published_at ?? n.created_at)}</span>
              <h3 style={S.cardTitle}>{n.title}</h3>
              {n.summary && <p style={S.cardSummary}>{n.summary}</p>}
            </div>
          </Link>
        ))}
      </div>
      <div style={S.seeAllWrap}>
        <Link to="/noticias" style={S.seeAll}>Ver todas as notícias →</Link>
      </div>
    </section>
  );
}

const S: Record<string, React.CSSProperties> = {
  section: { padding: "1.5rem 0 1rem" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", padding: "0 1.5rem" },
  heading: { margin: 0, fontSize: "1.5rem", fontWeight: 900, color: "#18265b" },
  arrows: { display: "flex", gap: "0.5rem" },
  arrow: { width: 36, height: 36, borderRadius: "50%", border: "1px solid #45475a", background: "#18265b", color: "#cdd6f4", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" },
  track: { display: "flex", gap: "1.25rem", overflowX: "auto", scrollbarWidth: "none", padding: "0.25rem 1.5rem 1rem", scrollSnapType: "x mandatory" },
  card: { flex: "0 0 280px", scrollSnapAlign: "start", background: "#18265b", border: "1px solid #313244", borderRadius: 12, overflow: "hidden", textDecoration: "none", display: "flex", flexDirection: "column", transition: "border-color 0.2s" },
  img: { width: "100%", height: 160, objectFit: "cover", background: "#18265b" },
  imgPlaceholder: { width: "100%", height: 160, background: "linear-gradient(135deg,#313244,#18265b)" },
  cardBody: { padding: "0.9rem 1rem 1.1rem", display: "flex", flexDirection: "column", gap: "0.3rem", flex: 1 },
  date: { fontSize: "0.7rem", color: "#89b4fa", textTransform: "uppercase", letterSpacing: "0.05em" },
  cardTitle: { margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "#cdd6f4", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" },
  cardSummary: { margin: 0, fontSize: "0.78rem", color: "#ffffff", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
  seeAllWrap: { textAlign: "center", marginTop: "0.75rem" },
  seeAll: { color: "#18265b", fontSize: "0.85rem", textDecoration: "none", fontWeight: 600 },
};
