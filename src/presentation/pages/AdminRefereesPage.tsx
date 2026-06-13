import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { ListReferees } from "@application/use_cases/ListReferees";
import type { DeleteReferee } from "@application/use_cases/DeleteReferee";
import type { Referee } from "@domain/entities/Referee";

interface Props {
  listReferees: ListReferees;
  deleteReferee: DeleteReferee;
}

const NO_PHOTO =
  "https://raw.githubusercontent.com/gsennaura/sports-manager-assets/refs/heads/main/referees/no_referee_photo.png";

export function AdminRefereesPage({ listReferees, deleteReferee }: Props) {
  const [referees, setReferees] = useState<Referee[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listReferees
      .execute()
      .then(setReferees)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = referees.filter((r) =>
    `${r.name} ${r.nickname ?? ""}`.toLowerCase().includes(filter.toLowerCase())
  );

  async function handleDelete(r: Referee) {
    if (!confirm(`Excluir "${r.name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteReferee.execute(r.id);
      setReferees((prev) => prev.filter((x) => x.id !== r.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao excluir árbitro.");
    }
  }

  return (
    <>
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner">
          <h1 className="page-title">Árbitros</h1>
          <Link to="/admin/arbitros/novo" className="btn btn-success">+ Novo árbitro</Link>
        </div>
      </header>

      <main className="page-container">
        <input
          type="text"
          placeholder="Filtrar por nome..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="search-input"
        />

        {loading && <p className="muted">Carregando...</p>}
        {error && <p className="error-text">{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <p className="muted">Nenhum árbitro encontrado.</p>
        )}

        <div className="data-table">
          {filtered.map((r) => (
            <div key={r.id} className="form-field-group">
              <img
                src={r.photo_url ?? NO_PHOTO}
                alt={r.name}
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = NO_PHOTO; }}
                className="avatar"
              />
              <div className="muted">
                <span >{r.name}</span>
                {r.nickname && <span className="muted">"{r.nickname}"</span>}
              </div>
              <div className="form-actions">
                <Link to={`/arbitros/${r.id}`} className="btn btn-secondary">Ver</Link>
                <Link to={`/admin/arbitros/${r.id}/editar`} className="btn-edit">Editar</Link>
                <button className="btn btn-danger" onClick={() => handleDelete(r)}>Excluir</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}

