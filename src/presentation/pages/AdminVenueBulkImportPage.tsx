import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { CreateVenue } from "@application/use_cases/CreateVenue";
import { API_BASE } from "@infrastructure/apiBase";

interface City { id: string; name: string; }

interface VenueRow {
  _id: string;
  nome: string;
  cidade: string;
  apelido: string;
  bairro: string;
  rua: string;
  numero: string;
  complemento: string;
  cep: string;
  latitude: string;
  longitude: string;
}

interface RowResult {
  row: number;
  nome: string;
  success: boolean;
  error: string | null;
}

// CSV columns (order matters)
const CSV_HEADERS = ["nome", "cidade", "apelido", "bairro", "rua", "numero", "complemento", "cep", "latitude", "longitude"] as const;
const TEMPLATE_CSV =
  CSV_HEADERS.join(",") + "\n" +
  "Poliesportivo Santa Luzia,Uberlândia,Poli Santa Luzia,Santa Luzia,,,,,,\n" +
  "Sabiazinho,Uberlândia,Sabiazinho,,,,,,-18.9186,-48.2772";

let _counter = 0;
const uid = () => `r${++_counter}-${Math.random().toString(36).slice(2)}`;

function parseCSV(text: string): VenueRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 1) return [];
  const firstLower = lines[0].toLowerCase();
  const start = firstLower.startsWith("nome") || firstLower.startsWith("name") ? 1 : 0;
  return lines.slice(start).map(line => {
    const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    const get = (i: number) => cols[i] ?? "";
    return {
      _id: uid(),
      nome: get(0),
      cidade: get(1),
      apelido: get(2),
      bairro: get(3),
      rua: get(4),
      numero: get(5),
      complemento: get(6),
      cep: get(7),
      latitude: get(8),
      longitude: get(9),
    };
  }).filter(r => r.nome.trim());
}

// ── String helpers ──────────────────────────────────────────────────────────
function normalizeStr(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (__, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "modelo_locais.csv";
  a.click();
  URL.revokeObjectURL(url);
}

interface Props { createVenue: CreateVenue; }

export function AdminVenueBulkImportPage({ createVenue }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [rows, setRows] = useState<VenueRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<RowResult[] | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // City resolution step
  const [cityResolutionDone, setCityResolutionDone] = useState(false);
  const [cityResolutionMap, setCityResolutionMap] = useState<Record<string, string | null>>({});
  const [citySuggestions, setCitySuggestions] = useState<Record<string, string | null>>({});
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/cities`)
      .then(r => r.json())
      .then((data: City[]) =>
        setCities([...data].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")))
      )
      .catch(() => {});
  }, []);

  function resolveCityId(cityName: string): string | undefined {
    const name = cityName.trim();
    if (!name) return undefined;
    // Use pre-resolved map when available
    const mapKeys = Object.keys(cityResolutionMap);
    if (mapKeys.length > 0) {
      const key = mapKeys.find(k => k.toLowerCase() === name.toLowerCase());
      if (key !== undefined) return cityResolutionMap[key] ?? undefined;
    }
    // Fallback to live city list
    const q = name.toLowerCase();
    return (
      cities.find(c => c.name.toLowerCase() === q)?.id ??
      cities.find(c => c.name.toLowerCase().includes(q))?.id
    );
  }

  async function resolveAllCities() {
    setResolving(true);
    setResolveError(null);
    try {
      const response = await fetch(`${API_BASE}/cities`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const freshCities = await response.json() as City[];
      setCities([...freshCities].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));

      const distinctNames = [...new Set(rows.map(r => r.cidade.trim()).filter(Boolean))];
      const map: Record<string, string | null> = {};
      const suggestions: Record<string, string | null> = {};
      for (const name of distinctNames) {
        const norm = normalizeStr(name);
        // 1. exact (case-insensitive)
        let found = freshCities.find(c => c.name.toLowerCase() === name.toLowerCase());
        // 2. normalized accent-stripped exact
        if (!found) found = freshCities.find(c => normalizeStr(c.name) === norm);
        // 3. normalized includes (substring)
        if (!found) found = freshCities.find(c => normalizeStr(c.name).includes(norm) || norm.includes(normalizeStr(c.name)));
        // 4. levenshtein ≤ 2 (small typos)
        if (!found) found = freshCities.find(c => levenshtein(normalizeStr(c.name), norm) <= 2);

        map[name] = found?.id ?? null;

        if (!found) {
          // Find closest match to show as suggestion (up to distance 5)
          let bestDist = Infinity;
          let bestName: string | null = null;
          for (const c of freshCities) {
            const d = levenshtein(normalizeStr(c.name), norm);
            if (d < bestDist) { bestDist = d; bestName = c.name; }
          }
          suggestions[name] = bestDist <= 5 ? bestName : null;
        }
      }
      setCityResolutionMap(map);
      setCitySuggestions(suggestions);
    } catch (err) {
      setResolveError(err instanceof Error ? err.message : "Erro ao buscar cidades.");
    } finally {
      setResolving(false);
    }
  }

  function handleFile(file: File) {
    setFileName(file.name);
    setParseError(null);
    setResults(null);
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = parseCSV(e.target?.result as string);
        if (!parsed.length) {
          setParseError("Nenhuma linha válida encontrada no CSV.");
        } else {
          setRows(parsed);
        }
      } catch {
        setParseError("Erro ao processar o arquivo CSV.");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  function updateRow(id: string, field: keyof VenueRow, value: string) {
    setRows(prev => prev.map(r => r._id === id ? { ...r, [field]: value } : r));
  }

  function removeRow(id: string) {
    setRows(prev => prev.filter(r => r._id !== id));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    const res: RowResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const cityId = resolveCityId(row.cidade);

      if (!row.nome.trim()) {
        res.push({ row: i + 1, nome: row.nome || "(sem nome)", success: false, error: "Nome é obrigatório." });
        continue;
      }
      if (!cityId) {
        res.push({ row: i + 1, nome: row.nome, success: false, error: `Cidade "${row.cidade}" não encontrada.` });
        continue;
      }

      try {
        await createVenue.execute({
          name: row.nome.trim(),
          city_id: cityId,
          nickname: row.apelido.trim() || undefined,
          neighborhood: row.bairro.trim() || undefined,
          street: row.rua.trim() || undefined,
          number: row.numero.trim() || undefined,
          complement: row.complemento.trim() || undefined,
          zip_code: row.cep.trim() || undefined,
          latitude: row.latitude ? parseFloat(row.latitude) : undefined,
          longitude: row.longitude ? parseFloat(row.longitude) : undefined,
        });
        res.push({ row: i + 1, nome: row.nome, success: true, error: null });
      } catch (err) {
        res.push({
          row: i + 1,
          nome: row.nome,
          success: false,
          error: err instanceof Error ? err.message : "Erro desconhecido",
        });
      }
    }

    setResults(res);
    setSaving(false);
  }

  const cityResolved = (name: string) => !!resolveCityId(name);
  const hasErrors = rows.some(r => !r.nome.trim() || !cityResolved(r.cidade));

  // ────────────────────────────────────────────
  return (
    <>
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner">
          <Link to="/admin/locais" className="back-link">← Locais</Link>
          <h1 className="page-title">Importar Locais via CSV</h1>
          <p className="page-subtitle">Carregue um CSV, revise e edite os dados antes de salvar.</p>
        </div>
      </header>

      <main className="page-container">

        {/* ── UPLOAD ── */}
        {!rows.length && !results && (
          <section style={S.uploadSection}>
            <div
              style={S.uploadBox}
              onClick={() => fileRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
            >
              <span style={S.uploadIcon}>📂</span>
              <p style={S.uploadLabel}>Clique ou arraste o arquivo CSV aqui</p>
              {fileName
                ? <p style={S.fileName}>📄 {fileName}</p>
                : <p style={S.uploadHint}>.csv • UTF-8</p>
              }
              {parseError && <p style={S.errorText}>{parseError}</p>}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <button style={S.btnTemplate} onClick={downloadTemplate}>
              ⬇ Baixar modelo CSV
            </button>
            <p style={S.hint}>
              Colunas: <code>nome*</code>, <code>cidade*</code>, <code>apelido</code>,{" "}
              <code>bairro</code>, <code>rua</code>, <code>numero</code>,{" "}
              <code>complemento</code>, <code>cep</code>, <code>latitude</code>, <code>longitude</code>
            </p>
          </section>
        )}

        {/* ── STEP 2: RESOLUÇÃO DE CIDADES ── */}
        {rows.length > 0 && !cityResolutionDone && !results && (() => {
          const distinctCities = [...new Set(rows.map(r => r.cidade.trim()).filter(Boolean))];
          const totalResolved = Object.keys(cityResolutionMap).length;
          const foundCount = Object.values(cityResolutionMap).filter(v => v !== null).length;
          const allFound = totalResolved > 0 && foundCount === totalResolved;
          const hasUnresolved = totalResolved > 0 && foundCount < totalResolved;
          return (
            <>
              <div style={S.tableTopBar}>
                <p style={S.rowCount}>
                  {rows.length} {rows.length === 1 ? "local" : "locais"} · {distinctCities.length} cidade{distinctCities.length !== 1 ? "s" : ""} única{distinctCities.length !== 1 ? "s" : ""}
                </p>
                <button
                  style={S.btnSecondary}
                  onClick={() => { setRows([]); setFileName(null); setSaveError(null); setCityResolutionMap({}); setCitySuggestions({}); setCityResolutionDone(false); }}
                >
                  ↩ Recarregar CSV
                </button>
              </div>

              <div style={S.resolveCard}>
                <div style={S.resolveHeader}>
                  <div>
                    <h2 style={S.resolveTitle}>Resolução de Cidades</h2>
                    <p style={S.resolveDesc}>
                      {totalResolved === 0
                        ? `Identifique as ${distinctCities.length} cidade${distinctCities.length !== 1 ? "s" : ""} do arquivo no sistema antes de revisar os locais.`
                        : allFound
                          ? `Todas as ${totalResolved} cidades foram encontradas. ✅`
                          : `${foundCount} de ${totalResolved} cidades encontradas.`
                      }
                    </p>
                  </div>
                  <button
                    style={{ ...S.btnResolve, opacity: resolving ? 0.6 : 1 }}
                    onClick={() => void resolveAllCities()}
                    disabled={resolving}
                  >
                    {resolving ? "Buscando…" : totalResolved === 0 ? "🔍 Buscar no Sistema" : "↻ Re-buscar"}
                  </button>
                </div>

                <div style={S.cityList}>
                  {distinctCities.map(name => {
                    const checked = name in cityResolutionMap;
                    const found = checked && cityResolutionMap[name] !== null;
                    const suggestion = citySuggestions[name] ?? null;
                    return (
                      <div key={name} style={{ ...S.cityChip, ...(checked ? (found ? S.cityChipOk : S.cityChipErr) : {}) }}>
                        <span>{name}</span>
                        {!checked && <span style={{ color: "#ffffff", fontSize: "0.7rem" }}>—</span>}
                        {found   && <span style={{ color: "#a6e3a1", fontSize: "0.75rem", fontWeight: 700 }}>✓</span>}
                        {checked && !found && (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                            <span style={{ color: "#f38ba8", fontSize: "0.75rem", fontWeight: 700 }}>✗ não encontrada</span>
                            {suggestion && (
                              <span style={{ color: "#fab387", fontSize: "0.65rem" }}>
                                Quis dizer: <em>{suggestion}</em>?
                              </span>
                            )}
                            {!suggestion && (
                              <span style={{ color: "#ffffff", fontSize: "0.65rem" }}>Nenhum nome parecido no sistema</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {resolveError && <p style={S.errorText}>{resolveError}</p>}
              </div>

              {totalResolved > 0 && (
                <div style={S.actions}>
                  <button
                    style={{ ...S.btnPrimary, opacity: allFound ? 1 : 0.5 }}
                    onClick={() => setCityResolutionDone(true)}
                    disabled={!allFound}
                    title={allFound ? "" : "Todas as cidades precisam ser encontradas"}
                  >
                    Continuar para revisão →
                  </button>
                  {hasUnresolved && (
                    <>
                      <button style={S.btnSecondary} onClick={() => setCityResolutionDone(true)}>
                        Continuar mesmo assim
                      </button>
                      <span style={S.hintWarn}>⚠ Cidades não encontradas ficarão destacadas na tabela.</span>
                    </>
                  )}
                </div>
              )}
            </>
          );
        })()}

        {/* ── STEP 3: TABELA EDITÁVEL ── */}
        {rows.length > 0 && cityResolutionDone && !results && (
          <>
            <div style={S.tableTopBar}>
              <p style={S.rowCount}>
                {rows.length} {rows.length === 1 ? "local carregado" : "locais carregados"}
              </p>
              <button
                style={S.btnSecondary}
                onClick={() => { setCityResolutionDone(false); }}
              >
                ← Voltar às cidades
              </button>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={S.th}>#</th>
                    <th style={S.th}>Nome *</th>
                    <th style={{ ...S.th, minWidth: "160px" }}>Cidade *</th>
                    <th style={S.th}>Apelido</th>
                    <th style={S.th}>Bairro</th>
                    <th style={S.th}>Rua</th>
                    <th style={S.th}>Nº</th>
                    <th style={S.th}>Complemento</th>
                    <th style={S.th}>CEP</th>
                    <th style={S.th}>Lat</th>
                    <th style={S.th}>Lng</th>
                    <th style={S.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const cityOk = cityResolved(row.cidade);
                    const rowBg = i % 2 === 0 ? "#18265b" : "#18265b";
                    return (
                      <tr key={row._id} style={{ backgroundColor: rowBg }}>
                        <td style={S.tdNum}>{i + 1}</td>

                        {/* Nome */}
                        <td style={S.td}>
                          <input
                            style={{ ...S.cell, ...(!row.nome.trim() ? S.cellErr : {}) }}
                            value={row.nome}
                            onChange={e => updateRow(row._id, "nome", e.target.value)}
                            placeholder="Nome"
                          />
                        </td>

                        {/* Cidade */}
                        <td style={S.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <input
                              style={{ ...S.cell, width: "130px", ...(!cityOk && row.cidade ? S.cellErr : {}) }}
                              value={row.cidade}
                              onChange={e => updateRow(row._id, "cidade", e.target.value)}
                              list={`cities-${row._id}`}
                              placeholder="Cidade"
                            />
                            <datalist id={`cities-${row._id}`}>
                              {cities.map(c => <option key={c.id} value={c.name} />)}
                            </datalist>
                            <span style={cityOk ? S.ok : (row.cidade ? S.warn : S.muted)}>
                              {cityOk ? "✓" : (row.cidade ? "?" : "—")}
                            </span>
                          </div>
                        </td>

                        {/* Apelido */}
                        <td style={S.td}>
                          <input style={S.cell} value={row.apelido}
                            onChange={e => updateRow(row._id, "apelido", e.target.value)} placeholder="Apelido" />
                        </td>

                        {/* Bairro */}
                        <td style={S.td}>
                          <input style={S.cell} value={row.bairro}
                            onChange={e => updateRow(row._id, "bairro", e.target.value)} placeholder="Bairro" />
                        </td>

                        {/* Rua */}
                        <td style={S.td}>
                          <input style={S.cell} value={row.rua}
                            onChange={e => updateRow(row._id, "rua", e.target.value)} placeholder="Rua" />
                        </td>

                        {/* Número */}
                        <td style={S.td}>
                          <input style={{ ...S.cell, width: "55px" }} value={row.numero}
                            onChange={e => updateRow(row._id, "numero", e.target.value)} placeholder="Nº" />
                        </td>

                        {/* Complemento */}
                        <td style={S.td}>
                          <input style={S.cell} value={row.complemento}
                            onChange={e => updateRow(row._id, "complemento", e.target.value)} placeholder="Compl." />
                        </td>

                        {/* CEP */}
                        <td style={S.td}>
                          <input style={{ ...S.cell, width: "80px" }} value={row.cep}
                            onChange={e => updateRow(row._id, "cep", e.target.value)} placeholder="CEP" />
                        </td>

                        {/* Latitude */}
                        <td style={S.td}>
                          <input style={{ ...S.cell, width: "75px" }} value={row.latitude}
                            onChange={e => updateRow(row._id, "latitude", e.target.value)} placeholder="-18.00" />
                        </td>

                        {/* Longitude */}
                        <td style={S.td}>
                          <input style={{ ...S.cell, width: "75px" }} value={row.longitude}
                            onChange={e => updateRow(row._id, "longitude", e.target.value)} placeholder="-48.00" />
                        </td>

                        {/* Remover */}
                        <td style={S.td}>
                          <button style={S.btnDel} onClick={() => removeRow(row._id)} title="Remover">✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {hasErrors && (
              <p style={S.warning}>⚠ Corrija os campos em vermelho antes de salvar.</p>
            )}
            {saveError && <p style={S.errorText}>{saveError}</p>}

            <div style={S.actions}>
              <button
                style={{ ...S.btnPrimary, opacity: saving || hasErrors ? 0.55 : 1 }}
                onClick={handleSave}
                disabled={saving || hasErrors}
              >
                {saving ? "Salvando…" : `Confirmar e Salvar (${rows.length})`}
              </button>
            </div>
          </>
        )}

        {/* ── RESULTADOS ── */}
        {results && (
          <>
            <div style={S.resultsBar}>
              <span style={S.badgeOk}>✅ {results.filter(r => r.success).length} salvos</span>
              {results.some(r => !r.success) && (
                <span style={S.badgeFail}>❌ {results.filter(r => !r.success).length} com erro</span>
              )}
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
                  {results.map(r => (
                    <tr key={r.row} style={{ backgroundColor: r.success ? "#1a2e1e" : "#2e1a1e" }}>
                      <td style={S.tdNum}>{r.row}</td>
                      <td style={S.td}>{r.nome}</td>
                      <td style={S.td}>{r.success ? "✅ Criado" : "❌ Erro"}</td>
                      <td style={{ ...S.td, color: r.success ? "#a6e3a1" : "#f38ba8" }}>
                        {r.error ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={S.actions}>
              <Link to="/admin/locais" style={S.btnPrimary}>← Ver locais</Link>
              <button
                style={S.btnSecondary}
                onClick={() => { setRows([]); setResults(null); setFileName(null); setCityResolutionMap({}); setCitySuggestions({}); setCityResolutionDone(false); }}
              >
                Importar mais
              </button>
            </div>
          </>
        )}
      </main>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: { backgroundColor: "#18265b", borderBottom: "1px solid #313244", position: "relative", overflow: "hidden" },
  heroAccent: { position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #89b4fa, #a6e3a1)" },
  heroInner: { maxWidth: "1300px", margin: "0 auto", padding: "1.5rem 1.5rem 1.25rem" },
  back: { display: "inline-block", color: "#89b4fa", textDecoration: "none", fontSize: "0.85rem", marginBottom: "0.75rem" },
  title: { fontSize: "1.5rem", fontWeight: 700, color: "#cdd6f4", margin: "0 0 0.2rem" },
  subtitle: { color: "#ffffff", fontSize: "0.875rem", margin: 0 },
  page: { maxWidth: "1300px", margin: "0 auto", padding: "2rem 1.5rem 4rem" },

  uploadSection: { display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" },
  uploadBox: {
    width: "100%", maxWidth: "480px", border: "2px dashed #45475a", borderRadius: "12px",
    padding: "2.5rem", textAlign: "center", cursor: "pointer", backgroundColor: "#18265b",
  },
  uploadIcon: { fontSize: "2.5rem", display: "block", marginBottom: "0.5rem" },
  uploadLabel: { color: "#cdd6f4", fontWeight: 600, margin: "0 0 0.25rem" },
  uploadHint: { color: "#ffffff", fontSize: "0.8rem", margin: 0 },
  fileName: { color: "#a6e3a1", fontSize: "0.85rem", marginTop: "0.75rem", margin: "0.75rem 0 0" },
  btnTemplate: {
    background: "none", border: "1px solid #45475a", color: "#cdd6f4",
    padding: "0.4rem 1rem", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem",
  },
  hint: { color: "#ffffff", fontSize: "0.8rem", textAlign: "center" },

  resolveCard: {
    backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "10px",
    padding: "1.25rem", marginBottom: "1.25rem",
  },
  resolveHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "1rem" },
  resolveTitle: { color: "#cdd6f4", fontSize: "1rem", fontWeight: 700, margin: "0 0 0.25rem" },
  resolveDesc: { color: "#ffffff", fontSize: "0.85rem", margin: 0 },
  btnResolve: {
    backgroundColor: "#313244", border: "1px solid #45475a", color: "#cdd6f4",
    padding: "0.5rem 1rem", borderRadius: "7px", cursor: "pointer",
    fontSize: "0.85rem", fontWeight: 600, whiteSpace: "nowrap" as const,
  },
  cityList: { display: "flex", flexWrap: "wrap" as const, gap: "0.5rem" },
  cityChip: {
    display: "flex", alignItems: "center", gap: "0.4rem",
    backgroundColor: "#313244", border: "1px solid #45475a",
    borderRadius: "6px", padding: "0.3rem 0.65rem", fontSize: "0.82rem", color: "#cdd6f4",
  },
  cityChipOk: { backgroundColor: "#1a3a2a", borderColor: "#a6e3a1", color: "#a6e3a1" },
  cityChipErr: { backgroundColor: "#3a1e2e", borderColor: "#f38ba8", color: "#f38ba8" },
  hintWarn: { color: "#fab387", fontSize: "0.82rem" },

  tableTopBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" },
  rowCount: { color: "#cdd6f4", fontWeight: 600, margin: 0 },
  tableWrap: { overflowX: "auto", borderRadius: "8px", border: "1px solid #313244" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" },
  th: {
    padding: "0.6rem 0.6rem", textAlign: "left", color: "#ffffff",
    backgroundColor: "#18265b", fontWeight: 600, whiteSpace: "nowrap",
    borderBottom: "1px solid #313244",
  },
  td: { padding: "0.3rem 0.4rem", color: "#cdd6f4", verticalAlign: "middle" },
  tdNum: { padding: "0.3rem 0.6rem", color: "#ffffff", fontSize: "0.75rem", textAlign: "center", verticalAlign: "middle" },

  cell: {
    background: "#313244", border: "1px solid #45475a", color: "#cdd6f4",
    borderRadius: "4px", padding: "0.3rem 0.4rem", fontSize: "0.8rem",
    width: "115px", outline: "none",
  },
  cellErr: { borderColor: "#f38ba8", backgroundColor: "#3a1e2e" },

  ok: { color: "#a6e3a1", fontSize: "0.75rem", fontWeight: 700 },
  warn: { color: "#f38ba8", fontSize: "0.75rem", fontWeight: 700 },
  muted: { color: "#ffffff", fontSize: "0.75rem" },

  btnDel: { background: "none", border: "none", color: "#f38ba8", cursor: "pointer", fontSize: "0.9rem", padding: "0.15rem 0.35rem" },

  warning: { color: "#fab387", fontSize: "0.85rem", marginTop: "0.75rem" },
  errorText: { color: "#f38ba8", fontSize: "0.85rem", marginTop: "0.5rem" },

  actions: { display: "flex", gap: "1rem", marginTop: "1.5rem", alignItems: "center" },
  btnPrimary: {
    background: "#89b4fa", color: "#18265b", border: "none",
    padding: "0.65rem 1.5rem", borderRadius: "8px", fontWeight: 700,
    cursor: "pointer", fontSize: "0.9rem", textDecoration: "none",
  },
  btnSecondary: {
    background: "none", border: "1px solid #45475a", color: "#cdd6f4",
    padding: "0.6rem 1.25rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.9rem",
  },

  resultsBar: { display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1rem" },
  badgeOk: { background: "#1a3a2a", color: "#a6e3a1", padding: "0.3rem 0.75rem", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600 },
  badgeFail: { background: "#3a1e2e", color: "#f38ba8", padding: "0.3rem 0.75rem", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600 },
};
