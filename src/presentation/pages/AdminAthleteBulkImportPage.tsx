import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { BulkImportAthletes, BulkAthleteRow, BulkAthleteResult } from "@application/use_cases/BulkImportAthletes";
import type { AddAthleteToTeam } from "@application/use_cases/AthleteTeam";
import { API_BASE } from "@infrastructure/apiBase";

interface Props {
  bulkImportAthletes: BulkImportAthletes;
  addAthleteToTeam: AddAthleteToTeam;
}

// CSV columns (order matters): name*, birth_date, cpf, rg, nationality, position, nickname, phone, email, notes
const CSV_HEADERS = ["name", "birth_date", "cpf", "rg", "nationality", "position", "nickname", "phone", "email", "notes"] as const;
const TEMPLATE_CSV = CSV_HEADERS.join(",") + "\n" +
  "João da Silva,2000-05-15,123.456.789-00,,Brasileiro,Atacante,Jão,11999999999,joao@email.com,\n" +
  "Maria Oliveira,1998-11-22,,,,Goleira,,,,Atleta destaque 2024";

function parseCSV(text: string): BulkAthleteRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  // Skip header row
  const start = lines[0].toLowerCase().startsWith("name") ? 1 : 0;
  return lines.slice(start).map(line => {
    const cols = line.split(",").map(c => c.trim());
    const get = (i: number) => (cols[i] ?? "").replace(/^"|"$/g, "").trim() || undefined;
    return {
      name: get(0) ?? "",
      birth_date: get(1),
      cpf: get(2),
      rg: get(3),
      nationality: get(4),
      position: get(5),
      nickname: get(6),
      phone: get(7),
      email: get(8),
      notes: get(9),
    };
  }).filter(r => r.name);
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "modelo_atletas.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminAthleteBulkImportPage({ bulkImportAthletes, addAthleteToTeam }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<BulkAthleteRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<BulkAthleteResult[] | null>(null);
  const [summary, setSummary] = useState<{ total: number; created: number; errors: number } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // League / Club / Category / Team cascade
  type LeagueOpt = { id: string; name: string };
  type ClubOpt = { id: string; name: string };           // from /leagues/{id}/clubs enriched
  type TeamOpt = { id: string; name: string; club_id: string | null; category: string | null };

  const CATEGORY_LABEL: Record<string, string> = {
    amador: "Amador",
    terrao: "Terrão",
    clube_social: "Clube Social",
    profissional: "Profissional",
    base: "Base",
    junior: "Júnior",
    juvenil: "Juvenil",
    infantil: "Infantil",
    mirim: "Mirim",
    "pre-mirim": "Pré-Mirim",
    master: "Master",
    universitaria: "Universitária",
    rural: "Rural",
    "inter-municipal": "Inter-municipal",
  };

  const [leagues, setLeagues] = useState<LeagueOpt[]>([]);
  const [leagueClubs, setLeagueClubs] = useState<ClubOpt[]>([]);   // clubs in selected league
  const [allTeams, setAllTeams] = useState<TeamOpt[]>([]);
  const [selLeague, setSelLeague] = useState("");
  const [selClub, setSelClub] = useState("");
  const [selCategory, setSelCategory] = useState("");
  const [selTeam, setSelTeam] = useState("");
  const [leagueClubsLoading, setLeagueClubsLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);

  // Load leagues + all teams on mount
  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/leagues?`).then(r => r.json() as Promise<LeagueOpt[]>).catch(() => []),
      fetch(`${API_BASE}/teams`).then(r => r.json() as Promise<TeamOpt[]>).catch(() => []),
    ]).then(([l, t]) => {
      setLeagues((l as LeagueOpt[]).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setAllTeams((t as TeamOpt[]).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
    }).finally(() => setOptionsLoading(false));
  }, []);

  // When league changes, fetch clubs in that league
  useEffect(() => {
    if (!selLeague) { setLeagueClubs([]); return; }
    setLeagueClubsLoading(true);
    fetch(`${API_BASE}/leagues/${selLeague}/clubs`)
      .then(r => r.json() as Promise<{ club_id: string; club_name: string | null }[]>)
      .then(data => {
        const mapped: ClubOpt[] = data
          .filter(d => d.club_id)
          .map(d => ({ id: d.club_id, name: d.club_name ?? d.club_id }))
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        setLeagueClubs(mapped);
      })
      .catch(() => setLeagueClubs([]))
      .finally(() => setLeagueClubsLoading(false));
  }, [selLeague]);

  // Categories available for the selected club
  const clubCategories = selClub
    ? [...new Set(
        allTeams
          .filter(t => t.club_id === selClub && t.category)
          .map(t => t.category as string)
      )].sort((a, b) => (CATEGORY_LABEL[a] ?? a).localeCompare(CATEGORY_LABEL[b] ?? b, "pt-BR"))
    : [];

  // Teams to show: filtered by club + category
  const filteredTeams = allTeams.filter(t => {
    if (selClub && t.club_id !== selClub) return false;
    if (selCategory && t.category !== selCategory) return false;
    return true;
  });

  function updateRow(index: number, field: keyof BulkAthleteRow, value: string) {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value || undefined } : r));
  }

  function deleteRow(index: number) {
    setRows(prev => prev.filter((_, i) => i !== index));
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResults(null);
    setSummary(null);
    setSubmitError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setParseError("Nenhum atleta encontrado. Verifique o formato do arquivo.");
          setRows([]);
        } else {
          setParseError(null);
          setRows(parsed);
        }
      } catch {
        setParseError("Erro ao ler o arquivo CSV.");
        setRows([]);
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (rows.length === 0 || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    setResults(null);
    setSummary(null);
    try {
      const res = await bulkImportAthletes.execute(rows);
      // If a team was selected, link successfully created athletes to it
      if (selTeam) {
        const today = new Date().toISOString().slice(0, 10);
        await Promise.allSettled(
          res.results
            .filter(r => r.success && r.athlete_id)
            .map(r => addAthleteToTeam.execute(r.athlete_id!, { team_id: selTeam, start_date: today })),
        );
      }
      setResults(res.results);
      setSummary({ total: res.total, created: res.created, errors: res.errors });
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setRows([]);
    setFileName(null);
    setParseError(null);
    setResults(null);
    setSummary(null);
    setSubmitError(null);
    setSelLeague("");
    setSelClub("");
    setSelCategory("");
    setSelTeam("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <>
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner">
          <Link to="/admin/atletas" className="back-link">← Atletas</Link>
          <h1 className="page-title">Importar Atletas em Lote</h1>
          <p className="page-subtitle">Cadastre múltiplos atletas de uma vez via arquivo CSV.</p>
        </div>
      </header>

      <main className="page-container">
        {/* Instructions */}
        <section style={S.card}>
          <h2 style={S.sectionTitle}>Formato do CSV</h2>
          <p style={S.hint}>
            O arquivo deve ter colunas separadas por vírgula. A primeira linha deve ser o cabeçalho.
            Apenas o campo <strong>name</strong> é obrigatório. Datas no formato <code>AAAA-MM-DD</code>.
          </p>
          <div style={S.colList}>
            {CSV_HEADERS.map((h, i) => (
              <span key={h} style={{ ...S.colChip, ...(i === 0 ? S.colChipRequired : {}) }}>
                {h}{i === 0 ? " *" : ""}
              </span>
            ))}
          </div>
          <button onClick={downloadTemplate} style={S.btnDownload}>
            ⬇ Baixar modelo CSV
          </button>
        </section>

        {/* Team Association */}
        <section style={S.card}>
          <h2 style={S.sectionTitle}>Associar ao Time <span style={{ fontSize: "0.8rem", fontWeight: 400, color: "#ffffff" }}>(opcional)</span></h2>
          <p style={S.hint}>Selecione liga → clube → categoria → time para vincular os atletas importados automaticamente.</p>
          {optionsLoading ? (
            <p style={{ color: "#ffffff", fontSize: "0.85rem" }}>Carregando opções…</p>
          ) : (
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              {/* Liga */}
              <div style={S.fieldGroup}>
                <label style={S.fieldLabel}>Liga</label>
                <select
                  style={S.selectInput}
                  value={selLeague}
                  onChange={e => {
                    setSelLeague(e.target.value);
                    setSelClub("");
                    setSelCategory("");
                    setSelTeam("");
                  }}
                >
                  <option value="">— Selecione —</option>
                  {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              {/* Clube */}
              <div style={S.fieldGroup}>
                <label style={S.fieldLabel}>Clube</label>
                <select
                  style={{ ...S.selectInput, opacity: !selLeague ? 0.5 : 1 }}
                  value={selClub}
                  onChange={e => { setSelClub(e.target.value); setSelCategory(""); setSelTeam(""); }}
                  disabled={!selLeague}
                >
                  <option value="">— Selecione —</option>
                  {leagueClubsLoading
                    ? <option disabled>Carregando…</option>
                    : leagueClubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                  }
                </select>
              </div>

              {/* Categoria */}
              <div style={S.fieldGroup}>
                <label style={S.fieldLabel}>Categoria</label>
                <select
                  style={{ ...S.selectInput, opacity: !selClub ? 0.5 : 1 }}
                  value={selCategory}
                  onChange={e => { setSelCategory(e.target.value); setSelTeam(""); }}
                  disabled={!selClub}
                >
                  <option value="">— Selecione —</option>
                  {clubCategories.map(cat => (
                    <option key={cat} value={cat}>{CATEGORY_LABEL[cat] ?? cat}</option>
                  ))}
                </select>
              </div>

              {/* Time */}
              <div style={S.fieldGroup}>
                <label style={S.fieldLabel}>Time</label>
                <select
                  style={{ ...S.selectInput, opacity: !selCategory ? 0.5 : 1 }}
                  value={selTeam}
                  onChange={e => setSelTeam(e.target.value)}
                  disabled={!selCategory}
                >
                  <option value="">— Selecione —</option>
                  {filteredTeams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {selTeam && (
            <p style={{ color: "#a6e3a1", fontSize: "0.82rem", marginTop: "0.75rem" }}>
              ✓ Atletas importados serão adicionados ao time selecionado.
            </p>
          )}
        </section>

        {/* Upload */}
        <section style={S.card}>
          <h2 style={S.sectionTitle}>Selecionar Arquivo</h2>
          <div style={S.uploadRow}>
            <label style={S.fileLabel}>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFile}
                style={{ display: "none" }}
              />
              <span style={S.fileBtn}>Escolher arquivo CSV</span>
            </label>
            {fileName && <span style={S.fileName}>{fileName}</span>}
          </div>
          {parseError && <p style={S.errorMsg}>{parseError}</p>}
        </section>

        {/* Preview — editable */}
        {rows.length > 0 && !results && (
          <section style={S.card}>
            <div style={S.previewHeader}>
              <h2 style={S.sectionTitle}>
                {rows.length} atleta{rows.length !== 1 ? "s" : ""} encontrado{rows.length !== 1 ? "s" : ""}
                <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#ffffff", marginLeft: "0.5rem" }}>— clique nas células para editar</span>
              </h2>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button onClick={handleReset} style={S.btnCancel} disabled={submitting}>Limpar</button>
                <button onClick={handleImport} style={S.btnImport} disabled={submitting || rows.length === 0}>
                  {submitting ? "Importando…" : `Importar ${rows.length} atleta${rows.length !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
            {submitError && <p style={S.errorMsg}>{submitError}</p>}
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ ...S.th, width: "32px" }}>#</th>
                    <th style={S.th}>Nome *</th>
                    <th style={S.th}>Nascimento</th>
                    <th style={S.th}>CPF</th>
                    <th style={S.th}>Apelido</th>
                    <th style={S.th}>Posição</th>
                    <th style={S.th}>Nacionalidade</th>
                    <th style={{ ...S.th, width: "32px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} style={i % 2 === 0 ? S.trEven : S.trOdd}>
                      <td style={{ ...S.td, color: "#ffffff", textAlign: "center" }}>{i + 1}</td>
                      <td style={S.td}>
                        <input
                          style={{ ...S.cellInput, fontWeight: 600, color: r.name ? "#cdd6f4" : "#f38ba8" }}
                          value={r.name}
                          placeholder="Nome obrigatório"
                          onChange={e => updateRow(i, "name", e.target.value)}
                        />
                      </td>
                      <td style={S.td}>
                        <input
                          style={S.cellInput}
                          value={r.birth_date ?? ""}
                          placeholder="AAAA-MM-DD"
                          onChange={e => updateRow(i, "birth_date", e.target.value)}
                        />
                      </td>
                      <td style={S.td}>
                        <input
                          style={S.cellInput}
                          value={r.cpf ?? ""}
                          placeholder="CPF"
                          onChange={e => updateRow(i, "cpf", e.target.value)}
                        />
                      </td>
                      <td style={S.td}>
                        <input
                          style={S.cellInput}
                          value={r.nickname ?? ""}
                          placeholder="Apelido"
                          onChange={e => updateRow(i, "nickname", e.target.value)}
                        />
                      </td>
                      <td style={S.td}>
                        <input
                          style={S.cellInput}
                          value={r.position ?? ""}
                          placeholder="Posição"
                          onChange={e => updateRow(i, "position", e.target.value)}
                        />
                      </td>
                      <td style={S.td}>
                        <input
                          style={S.cellInput}
                          value={r.nationality ?? ""}
                          placeholder="Nacionalidade"
                          onChange={e => updateRow(i, "nationality", e.target.value)}
                        />
                      </td>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        <button
                          title="Remover linha"
                          style={S.btnDeleteRow}
                          onClick={() => deleteRow(i)}
                          disabled={submitting}
                        >✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Results */}
        {results && summary && (
          <section style={S.card}>
            <div style={S.previewHeader}>
              <h2 style={S.sectionTitle}>Resultado da Importação</h2>
              <button onClick={handleReset} style={S.btnCancel}>Nova importação</button>
            </div>
            <div style={S.summaryRow}>
              <span style={S.summaryTotal}>Total: {summary.total}</span>
              <span style={S.summaryOk}>✓ Criados: {summary.created}</span>
              {summary.errors > 0 && <span style={S.summaryErr}>✗ Erros: {summary.errors}</span>}
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={S.th}>#</th>
                    <th style={S.th}>Nome</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Detalhe</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.row} style={r.success ? S.trSuccess : S.trError}>
                      <td style={S.td}>{r.row}</td>
                      <td style={S.td}>{r.name}</td>
                      <td style={S.td}>
                        <span style={r.success ? S.badgeOk : S.badgeErr}>
                          {r.success ? "Criado" : "Erro"}
                        </span>
                      </td>
                      <td style={S.td}>{r.error ?? (r.athlete_id ? `ID: ${r.athlete_id.slice(0, 8)}…` : "–")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  hero: { background: "linear-gradient(135deg, #18265b 0%, #18265b 100%)", borderBottom: "1px solid #313244", padding: "0" },
  heroAccent: { height: "3px", background: "linear-gradient(90deg, #89b4fa, #cba6f7)" },
  heroInner: { padding: "1.5rem 2rem 1.25rem", maxWidth: "900px", margin: "0 auto" },
  back: { color: "#89b4fa", textDecoration: "none", fontSize: "0.85rem", display: "inline-block", marginBottom: "0.5rem" },
  title: { color: "#cdd6f4", fontSize: "1.5rem", fontWeight: 700, margin: 0 },
  subtitle: { color: "#ffffff", fontSize: "0.9rem", marginTop: "0.25rem" },
  page: { padding: "1.5rem 2rem", maxWidth: "900px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.25rem" },
  card: { background: "#18265b", border: "1px solid #313244", borderRadius: "8px", padding: "1.25rem 1.5rem" },
  sectionTitle: { color: "#cdd6f4", fontSize: "1rem", fontWeight: 600, margin: "0 0 0.75rem" },
  hint: { color: "#ffffff", fontSize: "0.85rem", marginBottom: "0.75rem", lineHeight: 1.5 },
  colList: { display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1rem" },
  colChip: { background: "#313244", color: "#cdd6f4", borderRadius: "4px", padding: "0.2rem 0.55rem", fontSize: "0.75rem", fontFamily: "monospace" },
  colChipRequired: { background: "#313244", color: "#89b4fa", border: "1px solid #89b4fa" },
  btnDownload: { background: "none", border: "1px solid #45475a", borderRadius: "6px", color: "#89b4fa", cursor: "pointer", fontSize: "0.85rem", padding: "0.4rem 0.9rem" },
  uploadRow: { display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" },
  fileLabel: { cursor: "pointer" },
  fileBtn: { display: "inline-block", background: "#313244", border: "1px solid #45475a", borderRadius: "6px", color: "#cdd6f4", cursor: "pointer", fontSize: "0.85rem", padding: "0.45rem 1rem" },
  fileName: { color: "#ffffff", fontSize: "0.85rem" },
  errorMsg: { color: "#f38ba8", fontSize: "0.85rem", marginTop: "0.5rem" },
  previewHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" },
  th: { background: "#18265b", color: "#ffffff", padding: "0.5rem 0.75rem", textAlign: "left", fontWeight: 500, borderBottom: "1px solid #313244" },
  td: { color: "#cdd6f4", padding: "0.45rem 0.75rem", borderBottom: "1px solid #18265b" },
  trEven: { background: "#18265b" },
  trOdd: { background: "#18265b" },
  cellInput: { background: "transparent", border: "none", borderBottom: "1px solid transparent", color: "#cdd6f4", fontSize: "0.82rem", padding: "0.1rem 0.2rem", width: "100%", outline: "none", minWidth: "80px" },
  btnDeleteRow: { background: "none", border: "none", color: "#ffffff", cursor: "pointer", fontSize: "0.85rem", padding: "0.1rem 0.3rem", borderRadius: "3px" },
  trSuccess: { background: "#1e2e1e" },
  trError: { background: "#2e1e1e" },
  summaryRow: { display: "flex", gap: "1.5rem", marginBottom: "1rem", flexWrap: "wrap" },
  summaryTotal: { color: "#ffffff", fontSize: "0.9rem" },
  summaryOk: { color: "#a6e3a1", fontWeight: 600, fontSize: "0.9rem" },
  summaryErr: { color: "#f38ba8", fontWeight: 600, fontSize: "0.9rem" },
  badgeOk: { background: "#1e3a1e", color: "#a6e3a1", borderRadius: "4px", padding: "0.1rem 0.45rem", fontSize: "0.75rem" },
  badgeErr: { background: "#3a1e1e", color: "#f38ba8", borderRadius: "4px", padding: "0.1rem 0.45rem", fontSize: "0.75rem" },
  btnImport: { background: "#89b4fa", color: "#18265b", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem", padding: "0.5rem 1.25rem" },
  btnCancel: { background: "none", border: "1px solid #45475a", borderRadius: "6px", color: "#ffffff", cursor: "pointer", fontSize: "0.85rem", padding: "0.45rem 1rem" },
  fieldGroup: { display: "flex", flexDirection: "column" as const, gap: "0.3rem", minWidth: "180px" },
  fieldLabel: { fontSize: "0.78rem", fontWeight: 600, color: "#ffffff", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  selectInput: { backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "6px", color: "#cdd6f4", fontSize: "0.875rem", padding: "0.45rem 0.75rem", outline: "none" },
};
