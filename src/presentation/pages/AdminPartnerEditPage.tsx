import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { UpdatePartner } from "@application/use_cases/UpdatePartner";
import type { DeletePartner } from "@application/use_cases/DeletePartner";
import type { ListLeagues } from "@application/use_cases/ListLeagues";
import type { PartnerRepository } from "@domain/repositories/PartnerRepository";
import type { League } from "@domain/entities/League";

interface Props {
  updatePartner: UpdatePartner;
  deletePartner: DeletePartner;
  listLeagues: ListLeagues;
  partnerRepository: PartnerRepository;
}

export function AdminPartnerEditPage({ updatePartner, deletePartner, listLeagues, partnerRepository }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [priority, setPriority] = useState(10);
  const [isActive, setIsActive] = useState(true);
  const [selectedLeagueIds, setSelectedLeagueIds] = useState<string[]>([]);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      partnerRepository.getById(id),
      listLeagues.execute(),
    ]).then(([partner, ls]) => {
      setName(partner.name);
      setExternalUrl(partner.external_url ?? "");
      setPriority(partner.priority);
      setIsActive(partner.is_active);
      setSelectedLeagueIds(partner.league_ids);
      setCurrentLogoUrl(partner.logo_url);
      setLeagues(ls);
    }).catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, [id, partnerRepository, listLeagues]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setLogoFile(f);
    setLogoPreview(URL.createObjectURL(f));
  }

  function toggleLeague(lid: string) {
    setSelectedLeagueIds((prev) =>
      prev.includes(lid) ? prev.filter((x) => x !== lid) : [...prev, lid]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !name.trim()) { setError("Nome é obrigatório."); return; }
    setSubmitting(true);
    setError(null);
    try {
      await updatePartner.execute({
        id,
        name: name.trim(),
        external_url: externalUrl.trim() || null,
        priority,
        is_active: isActive,
        league_ids: selectedLeagueIds,
      });
      if (logoFile) {
        await partnerRepository.uploadLogo(id, logoFile);
      }
      navigate("/admin/parceiros");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar parceiro.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!id || !confirm("Excluir este parceiro? Esta ação não pode ser desfeita.")) return;
    try {
      await deletePartner.execute(id);
      navigate("/admin/parceiros");
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
          <h1 style={S.title}>Editar Parceiro</h1>
          <button style={S.btnDanger} onClick={handleDelete}>Excluir</button>
        </div>
      </header>
      <main style={S.page}>
        <form onSubmit={handleSubmit} style={S.form}>
          {error && <p style={S.error}>{error}</p>}

          <label style={S.label}>
            Nome *
            <input style={S.input} value={name} onChange={(e) => setName(e.target.value)} required />
          </label>

          <label style={S.label}>
            Link externo
            <input style={S.input} value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://..." />
          </label>

          <label style={S.label}>
            Prioridade (menor = mais destaque)
            <input style={S.input} type="number" min={1} value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
          </label>

          <label style={S.label}>
            Logo
            {currentLogoUrl && !logoPreview && (
              <img src={currentLogoUrl} alt="logo atual" style={S.preview} />
            )}
            {logoPreview && <img src={logoPreview} alt="nova logo" style={S.preview} />}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} style={{ color: "#cdd6f4" }} />
          </label>

          <div style={S.label}>
            Ligas vinculadas <span style={S.hint}>(deixe em branco para parceiro global)</span>
            <div style={S.leagueList}>
              {leagues.map((l) => (
                <label key={l.id} style={S.checkLabel}>
                  <input type="checkbox" checked={selectedLeagueIds.includes(l.id)} onChange={() => toggleLeague(l.id)} />
                  {l.name}
                </label>
              ))}
            </div>
          </div>

          <label style={S.checkLabel}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Ativo (visível no portal)
          </label>

          <div style={S.actions}>
            <button type="submit" style={S.btnSave} disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar"}
            </button>
            <button type="button" style={S.btnCancel} onClick={() => navigate("/admin/parceiros")}>
              Cancelar
            </button>
          </div>
        </form>
      </main>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: { background: "#1e1e2e", borderBottom: "1px solid #313244" },
  heroAccent: { height: "4px", background: "linear-gradient(90deg,#cba6f7,#89b4fa)" },
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
  preview: { width: 80, height: 80, objectFit: "contain", borderRadius: 8, background: "#181825", marginTop: "0.4rem" },
  leagueList: { display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.25rem" },
  checkLabel: { display: "flex", alignItems: "center", gap: "0.5rem", color: "#cdd6f4", fontSize: "0.88rem", fontWeight: 400, cursor: "pointer" },
  actions: { display: "flex", gap: "0.75rem", marginTop: "0.5rem" },
  btnSave: { padding: "0.65rem 1.5rem", borderRadius: "8px", background: "#cba6f7", color: "#1e1e2e", fontWeight: 700, border: "none", cursor: "pointer", fontSize: "0.9rem" },
  btnCancel: { padding: "0.65rem 1.5rem", borderRadius: "8px", background: "transparent", border: "1px solid #45475a", color: "#cdd6f4", cursor: "pointer", fontSize: "0.9rem" },
};
