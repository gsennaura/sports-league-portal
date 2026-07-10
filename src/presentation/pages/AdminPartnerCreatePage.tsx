import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CreatePartner } from "@application/use_cases/CreatePartner";
import type { ListLeagues } from "@application/use_cases/ListLeagues";
import type { League } from "@domain/entities/League";

interface Props {
  createPartner: CreatePartner;
  listLeagues: ListLeagues;
}

export function AdminPartnerCreatePage({ createPartner, listLeagues }: Props) {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [priority, setPriority] = useState(10);
  const [isActive, setIsActive] = useState(true);
  const [selectedLeagueIds, setSelectedLeagueIds] = useState<string[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listLeagues.execute().then(setLeagues).catch(() => null);
  }, [listLeagues]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setLogoFile(f);
    setLogoPreview(URL.createObjectURL(f));
  }

  function toggleLeague(id: string) {
    setSelectedLeagueIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Nome é obrigatório."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const partner = await createPartner.execute({
        name: name.trim(),
        external_url: externalUrl.trim() || null,
        priority,
        is_active: isActive,
        league_ids: selectedLeagueIds,
      });
      // Upload logo after creation if a file was selected
      if (logoFile) {
        const form = new FormData();
        form.append("file", logoFile);
        await fetch(`${import.meta.env.VITE_API_BASE}/partners/${partner.id}/logo`, {
          method: "POST",
          headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
          body: form,
        });
      }
      navigate("/admin/parceiros");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar parceiro.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <header style={S.hero}>
        <div style={S.heroAccent} />
        <div style={S.heroInner}>
          <h1 style={S.title}>Novo Parceiro</h1>
        </div>
      </header>
      <main style={S.page}>
        <form onSubmit={handleSubmit} style={S.form}>
          {error && <p style={S.error}>{error}</p>}

          <label style={S.label}>
            Nome *
            <input style={S.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do parceiro" required />
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
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} style={{ color: "#cdd6f4" }} />
            {logoPreview && <img src={logoPreview} alt="preview" style={S.preview} />}
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
  heroInner: { maxWidth: 800, margin: "0 auto", padding: "1.5rem 2rem" },
  title: { margin: 0, fontSize: "1.6rem", fontWeight: 900, color: "#cdd6f4" },
  page: { maxWidth: 800, margin: "0 auto", padding: "2rem" },
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
