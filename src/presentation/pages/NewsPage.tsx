import React from "react";
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
      <header style={S.hero}>
        <div style={S.heroAccent} />
        <div style={S.heroInner}><h1 style={S.title}>Notícias</h1></div>
      </header>
      <main style={S.page}>
        {loading && <p style={S.muted}>Carregando...</p>}
        {error && <p style={S.error}>{error}</p>}
        {!loading && !error && news.length === 0 && <p style={S.muted}>Nenhuma notícia publicada ainda.</p>}
        <div style={S.grid}>
          {news.map((n) => (
            <Link key={n.id} to={`/noticias/${n.id}`} style={S.card}>
              {n.image_url ? (
                <img src={n.image_url} alt={n.title} style={S.img} />
              ) : (
                <div style={S.imgPlaceholder} />
              )}
              <div style={S.cardBody}>
                <span style={S.date}>{formatDate(n.published_at ?? n.created_at)}</span>
                <h2 style={S.cardTitle}>{n.title}</h2>
                {n.summary && <p style={S.cardSummary}>{n.summary}</p>}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: { background: "#18265b", borderBottom: "1px solid #313244" },
  heroAccent: { height: "4px", background: "linear-gradient(90deg,#89dceb,#89b4fa)" },
  heroInner: { maxWidth: 1100, margin: "0 auto", padding: "1.5rem 2rem" },
  title: { margin: 0, fontSize: "1.8rem", fontWeight: 900, color: "#cdd6f4" },
  page: { maxWidth: 1100, margin: "0 auto", padding: "2.5rem 2rem" },
  muted: { color: "#ffffff" },
  error: { color: "#f38ba8" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" },
  card: { background: "#18265b", border: "1px solid #313244", borderRadius: 12, overflow: "hidden", textDecoration: "none", display: "flex", flexDirection: "column" },
  img: { width: "100%", height: 180, objectFit: "cover", background: "#18265b" },
  imgPlaceholder: { width: "100%", height: 180, background: "linear-gradient(135deg,#313244,#18265b)" },
  cardBody: { padding: "1rem 1.1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.4rem" },
  date: { fontSize: "0.72rem", color: "#89b4fa", textTransform: "uppercase", letterSpacing: "0.05em" },
  cardTitle: { margin: 0, fontSize: "1rem", fontWeight: 700, color: "#cdd6f4", lineHeight: 1.35 },
  cardSummary: { margin: 0, fontSize: "0.82rem", color: "#ffffff", lineHeight: 1.45 },
};
