import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { CreateClub } from "@application/use_cases/CreateClub";
import { API_BASE } from "@infrastructure/apiBase";
import { authHeaders } from "@infrastructure/authHeaders";

interface City   { id: string; name: string; }
interface Venue  { id: string; name: string; }
interface Sport  { id: string; name: string; }
interface League { id: string; name: string; short_name: string; }

const TEAM_CATEGORIES = [
  { key: "amador",       label: "Amador",          suffix: "" },
  { key: "terrao",       label: "Terrão",          suffix: " Terrão" },
  { key: "clube_social", label: "Clube Social",    suffix: " Social" },
  { key: "profissional", label: "Profissional",    suffix: " Pro" },
  { key: "base",         label: "Base",            suffix: " Base" },
  { key: "junior",       label: "Junior (Sub-20)", suffix: " Sub-20" },
  { key: "juvenil",      label: "Juvenil (Sub-17)",suffix: " Sub-17" },
  { key: "infantil",     label: "Infantil",        suffix: " Infantil" },
  { key: "mirim",        label: "Mirim",           suffix: " Mirim" },
  { key: "pre-mirim",    label: "Pré-Mirim",       suffix: " Pré-Mirim" },
  { key: "master",       label: "Master (Veterano)",suffix: " Veterano" },
  { key: "universitaria",label: "Universitária",  suffix: " Universitário" },
] as const;

type CategoryKey = typeof TEAM_CATEGORIES[number]["key"];

interface ClubRow {
  _id: string;
  nome: string;
  cidade: string;
  local: string;
  sigla: string;
  apelido: string;
  fundacao: string;
  presidente: string;
  instituicao_vinculada: string;
  site: string;
  logo_url: string;
}

interface RowResult {
  row: number;
  nome: string;
  success: boolean;
  error: string | null;
  teamsCreated?: number;
  teamErrors?: string[];
  leagueAffiliated?: boolean;
  leagueError?: string | null;
}

const CSV_HEADERS = [
  "nome", "cidade", "local", "sigla", "apelido",
  "fundacao", "presidente", "instituicao_vinculada", "site", "logo_url",
] as const;

const TEMPLATE_CSV =
  CSV_HEADERS.join(",") + "\n" +
  "Atlético Uberlândia,Uberlândia,Sabiazinho,ATL,Atlético,1954-06-20,João Silva,\n" +
  "Real Capinópolis,Capinópolis,Estádio Norberto Simari,RCP,,,,";

let _counter = 0;
const uid = () => `r${++_counter}-${Math.random().toString(36).slice(2)}`;

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

function fuzzyResolve(
  inputNames: string[],
  candidates: { id: string; name: string }[],
): { map: Record<string, string | null>; suggestions: Record<string, string | null> } {
  const map: Record<string, string | null> = {};
  const suggestions: Record<string, string | null> = {};
  for (const name of inputNames) {
    const norm = normalizeStr(name);
    const found =
      candidates.find(c => c.name.toLowerCase() === name.toLowerCase()) ??
      candidates.find(c => normalizeStr(c.name) === norm) ??
      candidates.find(c => normalizeStr(c.name).includes(norm) || norm.includes(normalizeStr(c.name))) ??
      candidates.find(c => levenshtein(normalizeStr(c.name), norm) <= 2);
    map[name] = found?.id ?? null;
    if (!found) {
      let bestDist = Infinity, bestName: string | null = null;
      for (const c of candidates) {
        const d = levenshtein(normalizeStr(c.name), norm);
        if (d < bestDist) { bestDist = d; bestName = c.name; }
      }
      suggestions[name] = bestDist <= 5 ? bestName : null;
    }
  }
  return { map, suggestions };
}

function parseCSV(text: string): ClubRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const firstLower = lines[0].toLowerCase();
  const start = firstLower.startsWith("nome") ? 1 : 0;
  return lines.slice(start).map(line => {
    const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    const get = (i: number) => cols[i] ?? "";
    return {
      _id: uid(),
      nome: get(0),
      cidade: get(1),
      local: get(2),
      sigla: get(3),
      apelido: get(4),
      fundacao: get(5),
      presidente: get(6),
      instituicao_vinculada: get(7),
      site: get(8),
      logo_url: get(9),
    };
  }).filter(r => r.nome.trim());
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "modelo_clubes.csv"; a.click();
  URL.revokeObjectURL(url);
}

// ── Category picker (per-row dropdown) ───────────────────────────────────────
function CategoryPicker({
  rowId, categories, openId, setOpenId, onToggle,
}: {
  rowId: string;
  categories: Set<CategoryKey>;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  onToggle: (rowId: string, cat: CategoryKey) => void;
}) {
  const count  = categories.size;
  const isOpen = openId === rowId;
  return (
    <div style={{ position: "relative" }}>
      <button
        style={{ ...S.pickerBtn, ...(count > 0 ? S.pickerBtnActive : {}) }}
        onClick={() => setOpenId(isOpen ? null : rowId)}
        title={count > 0 ? [...categories].map(k => TEAM_CATEGORIES.find(c => c.key === k)!.label).join(", ") : "Selecionar categorias"}
      >
        {count === 0 ? "+ cats" : `⚽ ${count}`}
      </button>
      {isOpen && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setOpenId(null)} />
          <div style={S.pickerPanel}>
            {TEAM_CATEGORIES.map(cat => {
              const checked = categories.has(cat.key);
              return (
                <label key={cat.key} style={{ ...S.pickerItem, ...(checked ? S.pickerItemOn : {}) }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    style={{ display: "none" }}
                    onChange={() => onToggle(rowId, cat.key)}
                  />
                  {cat.label}
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Resolution chip ─────────────────────────────────────────────────────────
function ResolutionChip({
  name,
  map,
  suggestions,
}: {
  name: string;
  map: Record<string, string | null>;
  suggestions: Record<string, string | null>;
}) {
  const checked    = name in map;
  const found      = checked && map[name] !== null;
  const suggestion = suggestions[name] ?? null;
  return (
    <div style={{ ...S.chip, ...(checked ? (found ? S.chipOk : S.chipErr) : {}) }}>
      <span>{name}</span>
      {!checked && <span style={{ color: "#ffffff", fontSize: "0.7rem" }}>—</span>}
      {found    && <span style={{ color: "#a6e3a1", fontSize: "0.75rem", fontWeight: 700 }}>✓</span>}
      {checked && !found && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
          <span style={{ color: "#f38ba8", fontSize: "0.75rem", fontWeight: 700 }}>✗ não encontrado</span>
          {suggestion
            ? <span style={{ color: "#fab387", fontSize: "0.65rem" }}>Quis dizer: <em>{suggestion}</em>?</span>
            : <span style={{ color: "#ffffff", fontSize: "0.65rem" }}>Nenhum nome parecido</span>
          }
        </div>
      )}
    </div>
  );
}

// ── Resolution panel ────────────────────────────────────────────────────────
function ResolutionPanel({
  title,
  entityLabel,
  distinctNames,
  map,
  suggestions,
  resolving,
  resolveError,
  mandatory,
  onSearch,
  onContinue,
  onBack,
  onSkip,
  onReload,
}: {
  title: string;
  entityLabel: string;
  distinctNames: string[];
  map: Record<string, string | null>;
  suggestions: Record<string, string | null>;
  resolving: boolean;
  resolveError: string | null;
  mandatory: boolean;
  onSearch: () => void;
  onContinue: () => void;
  onBack: () => void;
  onSkip?: () => void;
  onReload: () => void;
}) {
  const totalChecked = Object.keys(map).length;
  const foundCount   = Object.values(map).filter(v => v !== null).length;
  const allFound     = totalChecked > 0 && foundCount === totalChecked;
  const hasUnresolved = totalChecked > 0 && foundCount < totalChecked;
  const canContinue  = mandatory ? allFound : totalChecked > 0;

  return (
    <>
      <div style={S.tableTopBar}>
        <p style={S.rowCount}>{distinctNames.length} {entityLabel}{distinctNames.length !== 1 ? "s" : ""} única{distinctNames.length !== 1 ? "s" : ""}</p>
        <button style={S.btnSecondary} onClick={onReload}>↩ Recarregar CSV</button>
      </div>

      <div style={S.resolveCard}>
        <div style={S.resolveHeader}>
          <div>
            <h2 style={S.resolveTitle}>{title}</h2>
            <p style={S.resolveDesc}>
              {totalChecked === 0
                ? `Identifique as ${entityLabel}s no sistema antes de continuar.`
                : allFound
                  ? `Todas as ${totalChecked} ${entityLabel}s encontradas. ✅`
                  : `${foundCount} de ${totalChecked} ${entityLabel}s encontradas.`
              }
            </p>
          </div>
          <button
            style={{ ...S.btnResolve, opacity: resolving ? 0.6 : 1 }}
            onClick={onSearch}
            disabled={resolving}
          >
            {resolving ? "Buscando…" : totalChecked === 0 ? `🔍 Buscar ${entityLabel}s` : "↻ Re-buscar"}
          </button>
        </div>

        <div style={S.chipList}>
          {distinctNames.map(name => (
            <ResolutionChip key={name} name={name} map={map} suggestions={suggestions} />
          ))}
        </div>

        {resolveError && <p style={S.errorText}>{resolveError}</p>}
      </div>

      {totalChecked > 0 && (
        <div style={S.actions}>
          <button style={S.btnBack} onClick={onBack}>← Voltar</button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              style={{ ...S.btnPrimary, opacity: canContinue ? 1 : 0.5 }}
              onClick={onContinue}
              disabled={!canContinue}
              title={canContinue ? "" : `Todas as ${entityLabel}s precisam ser encontradas`}
            >
              Continuar →
            </button>
            {mandatory && hasUnresolved && (
              <>
                <button style={S.btnSecondary} onClick={onContinue}>Continuar mesmo assim</button>
                <span style={S.hintWarn}>⚠ {entityLabel}s não encontradas vão causar falha nas linhas correspondentes.</span>
              </>
            )}
            {!mandatory && onSkip && (
              <button style={S.btnSecondary} onClick={onSkip}>Pular resolução →</button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
interface Props { createClub: CreateClub; }

export function AdminClubBulkImportPage({ createClub }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows,      setRows]      = useState<ClubRow[]>([]);
  const [fileName,  setFileName]  = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [results,   setResults]   = useState<RowResult[] | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── City resolution ──────────────────────────────────────────────────────
  const [cityDone,    setCityDone]    = useState(false);
  const [cityMap,     setCityMap]     = useState<Record<string, string | null>>({});
  const [citySuggest, setCitySuggest] = useState<Record<string, string | null>>({});
  const [citying,     setCitying]     = useState(false);
  const [cityErr,     setCityErr]     = useState<string | null>(null);

  // ── Venue resolution ─────────────────────────────────────────────────────
  const [venueDone,    setVenueDone]    = useState(false);
  const [venueMap,     setVenueMap]     = useState<Record<string, string | null>>({});
  const [venueSuggest, setVenueSuggest] = useState<Record<string, string | null>>({});
  const [venuing,      setVenuing]      = useState(false);
  const [venueErr,     setVenueErr]     = useState<string | null>(null);

  // ── Venue list (for dropdown) ──────────────────────────────────────────────
  const [venueList, setVenueList] = useState<Venue[]>([]);

  // ── Sports & team creation config ─────────────────────────────────────────
  const [sports,        setSports]        = useState<Sport[]>([]);
  const [loadingSports, setLoadingSports] = useState(false);
  const [createTeams,     setCreateTeams]     = useState(false);
  const [selectedSportId, setSelectedSportId] = useState<string>("");
  const [rowCategories,   setRowCategories]   = useState<Record<string, Set<CategoryKey>>>({});
  const [openPickerId,    setOpenPickerId]    = useState<string | null>(null);

  // ── League affiliation ─────────────────────────────────────────────────────
  const [leagues,           setLeagues]           = useState<League[]>([]);
  const [loadingLeagues,    setLoadingLeagues]    = useState(false);
  const [affiliateLeagueId, setAffiliateLeagueId] = useState<string>("");

  // Fetch sports + venues + leagues on mount
  useEffect(() => {
    setLoadingSports(true);
    fetch(`${API_BASE}/sports`)
      .then(r => r.json())
      .then((s: Sport[]) => { setSports(s); if (s.length > 0) setSelectedSportId(s[0].id); })
      .catch(() => {})
      .finally(() => setLoadingSports(false));

    fetch(`${API_BASE}/venues`)
      .then(r => r.json())
      .then((v: Venue[]) => setVenueList(v))
      .catch(() => {});

    setLoadingLeagues(true);
    fetch(`${API_BASE}/leagues`)
      .then(r => r.json())
      .then((l: League[]) => setLeagues([...l].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))))
      .catch(() => {})
      .finally(() => setLoadingLeagues(false));
  }, []);

  // Derived
  const distinctCities = [...new Set(rows.map(r => r.cidade.trim()).filter(Boolean))];
  const distinctVenues = [...new Set(rows.map(r => r.local.trim()).filter(Boolean))];
  const hasVenueColumn = distinctVenues.length > 0;

  function resetAll() {
    setRows([]); setFileName(null); setParseError(null); setResults(null); setSaveError(null);
    setCityDone(false); setCityMap({}); setCitySuggest({}); setCityErr(null);
    setVenueDone(false); setVenueMap({}); setVenueSuggest({}); setVenueErr(null);
    setCreateTeams(false); setRowCategories({}); setOpenPickerId(null); setAffiliateLeagueId("");
  }

  function resolveCityId(name: string): string | undefined {
    const key = Object.keys(cityMap).find(k => k.toLowerCase() === name.trim().toLowerCase());
    return key !== undefined ? (cityMap[key] ?? undefined) : undefined;
  }

  function resolveVenueId(name: string): string | undefined {
    if (!name.trim()) return undefined;
    const v = venueList.find(v => v.name.toLowerCase() === name.trim().toLowerCase());
    return v?.id;
  }

  async function handleSearchCities() {
    setCitying(true); setCityErr(null);
    try {
      const r = await fetch(`${API_BASE}/cities`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const cities = await r.json() as City[];
      const { map, suggestions } = fuzzyResolve(distinctCities, cities);
      setCityMap(map); setCitySuggest(suggestions);
    } catch (e) {
      setCityErr(e instanceof Error ? e.message : "Erro ao buscar cidades.");
    } finally {
      setCitying(false);
    }
  }

  async function handleSearchVenues() {
    setVenuing(true); setVenueErr(null);
    try {
      const r = await fetch(`${API_BASE}/venues`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const venues = await r.json() as Venue[];
      setVenueList(venues);
      const { map, suggestions } = fuzzyResolve(distinctVenues, venues);
      setVenueMap(map); setVenueSuggest(suggestions);
    } catch (e) {
      setVenueErr(e instanceof Error ? e.message : "Erro ao buscar locais.");
    } finally {
      setVenuing(false);
    }
  }

  function handleFile(file: File) {
    setFileName(file.name); setParseError(null); setResults(null);
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = parseCSV(e.target?.result as string);
        if (!parsed.length) setParseError("Nenhuma linha válida encontrada no CSV.");
        else setRows(parsed);
      } catch {
        setParseError("Erro ao processar o arquivo CSV.");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = "";
  }
  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f);
  }

  function updateRow(id: string, field: keyof ClubRow, value: string) {
    setRows(prev => prev.map(r => r._id === id ? { ...r, [field]: value } : r));
  }
  function removeRow(id: string) {
    setRows(prev => prev.filter(r => r._id !== id));
  }

  function toggleRowCategory(rowId: string, cat: CategoryKey) {
    setRowCategories(prev => {
      const cats = new Set(prev[rowId] ?? []);
      if (cats.has(cat)) cats.delete(cat); else cats.add(cat);
      return { ...prev, [rowId]: cats };
    });
  }

  function toggleAllCategory(cat: CategoryKey) {
    const allHave = rows.length > 0 && rows.every(r => (rowCategories[r._id] ?? new Set()).has(cat));
    setRowCategories(prev => {
      const next = { ...prev };
      for (const row of rows) {
        const cats = new Set(next[row._id] ?? []);
        if (allHave) cats.delete(cat); else cats.add(cat);
        next[row._id] = cats;
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true); setSaveError(null);
    const res: RowResult[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.nome.trim()) {
        res.push({ row: i + 1, nome: row.nome || "(sem nome)", success: false, error: "Nome é obrigatório." });
        continue;
      }
      const cityId = resolveCityId(row.cidade);
      if (!cityId) {
        res.push({ row: i + 1, nome: row.nome, success: false, error: `Cidade "${row.cidade}" não encontrada.` });
        continue;
      }
      const venueId = row.local.trim() ? resolveVenueId(row.local) : undefined;
      try {
        const club = await createClub.execute({
          name:                 row.nome.trim(),
          city_id:              cityId,
          acronym:              row.sigla.trim()               || undefined,
          nickname:             row.apelido.trim()             || undefined,
          founded_at:           row.fundacao.trim()            || undefined,
          president:            row.presidente.trim()          || undefined,
          linked_institution:   row.instituicao_vinculada.trim() || undefined,
          venue_id:             venueId,
          site:                 row.site.trim()                 || undefined,
          logo_url:             row.logo_url.trim()             || undefined,
        });

        // Create associated teams if requested
        let teamsCreated = 0;
        const teamErrors: string[] = [];
        const rowCats = rowCategories[row._id] ?? new Set<CategoryKey>();
        if (createTeams && selectedSportId && rowCats.size > 0) {
          for (const cat of TEAM_CATEGORIES) {
            if (!rowCats.has(cat.key)) continue;
            const teamName = cat.suffix ? `${row.nome.trim()}${cat.suffix}` : row.nome.trim();
            try {
              const tr = await fetch(`${API_BASE}/teams`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({
                  name:      teamName,
                  sport_id:  selectedSportId,
                  city_id:   cityId,
                  club_id:   club.id,
                  category:  cat.key,
                }),
              });
              if (tr.ok) teamsCreated++;
              else {
                const errBody = await tr.json().catch(() => ({}));
                teamErrors.push(`${cat.label}: ${(errBody as { detail?: string }).detail ?? tr.status}`);
              }
            } catch (te) {
              teamErrors.push(`${cat.label}: ${te instanceof Error ? te.message : "erro"}`);
            }
          }
        }

        // Affiliate club to league if requested
        let leagueAffiliated: boolean | undefined;
        let leagueError: string | null | undefined;
        if (affiliateLeagueId) {
          try {
            const lr = await fetch(`${API_BASE}/leagues/${affiliateLeagueId}/clubs`, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...authHeaders() },
              body: JSON.stringify({ club_id: club.id }),
            });
            if (lr.ok) {
              leagueAffiliated = true;
            } else {
              const errBody = await lr.json().catch(() => ({}));
              leagueError = (errBody as { detail?: string }).detail ?? `HTTP ${lr.status}`;
            }
          } catch (le) {
            leagueError = le instanceof Error ? le.message : "erro na filiação";
          }
        }
        res.push({ row: i + 1, nome: row.nome, success: true, error: null, teamsCreated, teamErrors, leagueAffiliated, leagueError });
      } catch (e) {
        res.push({ row: i + 1, nome: row.nome, success: false, error: e instanceof Error ? e.message : "Erro desconhecido." });
      }
    }
    setSaving(false); setResults(res);
  }

  // ── Routing conditions ────────────────────────────────────────────────────
  const showUpload       = rows.length === 0 && !results;
  const showCityStep     = rows.length > 0 && !cityDone && !results;
  const showVenueStep    = rows.length > 0 && cityDone && !venueDone && hasVenueColumn && !results;
  const showTable        = rows.length > 0 && cityDone && (venueDone || !hasVenueColumn) && !results;
  const showResults      = !!results;

  const successCount  = results?.filter(r => r.success).length ?? 0;
  const failCount     = results?.filter(r => !r.success).length ?? 0;
  const teamsOkCount   = results?.reduce((acc, r) => acc + (r.teamsCreated ?? 0), 0) ?? 0;
  const teamsErrCount  = results?.reduce((acc, r) => acc + (r.teamErrors?.length ?? 0), 0) ?? 0;
  const leagueOkCount  = results?.filter(r => r.leagueAffiliated).length ?? 0;
  const leagueErrCount = results?.filter(r => r.leagueError).length ?? 0;
  const totalTeamsToBuild = createTeams
    ? Object.values(rowCategories).reduce((sum, cats) => sum + cats.size, 0)
    : 0;

  return (
    <>
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner">
          <Link to="/admin/clubes" className="back-link">← Clubes</Link>
          <h1 className="page-title">Importar Clubes em Bulk</h1>
          <p className="page-subtitle">Upload CSV → Resolve cidades → Resolve locais → Revisa → Importa</p>
        </div>
      </header>

      <main className="page-container">

        {/* ── STEP 1: UPLOAD ── */}
        {showUpload && (
          <section
            style={{ ...S.dropzone, ...(parseError ? S.dropzoneError : {}) }}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleFileChange} />
            <div style={S.dropIcon}>📋</div>
            <p style={S.dropTitle}>Arraste o CSV aqui ou clique para selecionar</p>
            {fileName
              ? <p style={S.dropHint}>Arquivo selecionado: <strong>{fileName}</strong></p>
              : <p style={S.dropHint}>Arquivo CSV com os clubes para importar</p>
            }
            {parseError && <p style={S.errorText}>{parseError}</p>}
          </section>
        )}

        {showUpload && (
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "0.5rem" }}>
            <button style={S.btnTemplate} onClick={e => { e.stopPropagation(); downloadTemplate(); }}>
              ⬇ Baixar modelo CSV
            </button>
            <p style={S.hint}>
              Colunas: <code>nome*</code>, <code>cidade*</code>, <code>local</code>,{" "}
              <code>sigla</code>, <code>apelido</code>, <code>fundacao</code>,{" "}
              <code>presidente</code>, <code>instituicao_vinculada</code>
            </p>
          </div>
        )}

        {/* ── STEP 2: CIDADES ── */}
        {showCityStep && (
          <ResolutionPanel
            title="Resolução de Cidades"
            entityLabel="cidade"
            distinctNames={distinctCities}
            map={cityMap}
            suggestions={citySuggest}
            resolving={citying}
            resolveError={cityErr}
            mandatory={true}
            onSearch={() => void handleSearchCities()}
            onContinue={() => setCityDone(true)}
            onBack={resetAll}
            onReload={resetAll}
          />
        )}

        {/* ── STEP 3: LOCAIS ── */}
        {showVenueStep && (
          <ResolutionPanel
            title="Resolução de Locais"
            entityLabel="local"
            distinctNames={distinctVenues}
            map={venueMap}
            suggestions={venueSuggest}
            resolving={venuing}
            resolveError={venueErr}
            mandatory={false}
            onSearch={() => void handleSearchVenues()}
            onContinue={() => setVenueDone(true)}
            onBack={() => setCityDone(false)}
            onSkip={() => setVenueDone(true)}
            onReload={resetAll}
          />
        )}

        {/* ── STEP 4: TABELA EDITÁVEL ── */}
        {showTable && (
          <>
            <div style={S.tableTopBar}>
              <p style={S.rowCount}>
                {rows.length} {rows.length === 1 ? "clube carregado" : "clubes carregados"}
              </p>
              <button
                style={S.btnSecondary}
                onClick={() => hasVenueColumn ? setVenueDone(false) : setCityDone(false)}
              >
                ← Voltar
              </button>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={S.th}>Nome *</th>
                    <th style={S.th}>Cidade *</th>
                    <th style={S.th}>Local</th>
                    <th style={S.th}>Sigla</th>
                    <th style={S.th}>Apelido</th>
                    <th style={S.th}>Fundação</th>
                    <th style={S.th}>Presidente</th>
                    <th style={S.th}>Instituição</th>
                    <th style={S.th}>Site</th>
                    <th style={S.th}>Escudo</th>
                    {createTeams && <th style={{ ...S.th, color: "#89b4fa" }}>Times ⚽</th>}
                    <th style={S.th}>✕</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const cityId   = resolveCityId(row.cidade);
                    const cityErr  = !cityId;
                    return (
                      <tr key={row._id} style={{ ...S.tr, ...(cityErr ? S.trErr : {}) }}>
                        <td style={S.td}>
                          <input style={S.cell} value={row.nome} onChange={e => updateRow(row._id, "nome", e.target.value)} />
                        </td>
                        <td style={{ ...S.td, ...(cityErr ? { backgroundColor: "#3a1e2e" } : {}) }}>
                          <input style={{ ...S.cell, ...(cityErr ? { color: "#f38ba8" } : {}) }}
                            value={row.cidade} onChange={e => updateRow(row._id, "cidade", e.target.value)} />
                        </td>
                        <td style={S.td}>
                          <select
                            style={S.venueSelect}
                            value={row.local}
                            onChange={e => updateRow(row._id, "local", e.target.value)}
                          >
                            <option value="">— Local desconhecido —</option>
                            {venueList.map(v => (
                              <option key={v.id} value={v.name}>{v.name}</option>
                            ))}
                          </select>
                        </td>
                        <td style={S.td}>
                          <input style={S.cell} value={row.sigla} onChange={e => updateRow(row._id, "sigla", e.target.value)} />
                        </td>
                        <td style={S.td}>
                          <input style={S.cell} value={row.apelido} onChange={e => updateRow(row._id, "apelido", e.target.value)} />
                        </td>
                        <td style={S.td}>
                          <input style={S.cell} type="date" value={row.fundacao} onChange={e => updateRow(row._id, "fundacao", e.target.value)} />
                        </td>
                        <td style={S.td}>
                          <input style={S.cell} value={row.presidente} onChange={e => updateRow(row._id, "presidente", e.target.value)} />
                        </td>
                        <td style={S.td}>
                          <input style={S.cell} value={row.instituicao_vinculada} onChange={e => updateRow(row._id, "instituicao_vinculada", e.target.value)} />
                        </td>
                        <td style={S.td}>
                          <input style={S.cell} value={row.site} onChange={e => updateRow(row._id, "site", e.target.value)} placeholder="https://" />
                        </td>
                        <td style={{ ...S.td, textAlign: "center" as const, minWidth: 48 }}>
                          {row.logo_url ? (
                            <img src={row.logo_url} alt="" style={{ width: 32, height: 32, objectFit: "contain", borderRadius: 4 }} />
                          ) : (
                            <span style={{ color: "#45475a", fontSize: "0.75rem" }}>—</span>
                          )}
                        </td>
                        {createTeams && (
                          <td style={{ ...S.td, minWidth: 70, textAlign: "center" as const }}>
                            <CategoryPicker
                              rowId={row._id}
                              categories={rowCategories[row._id] ?? new Set()}
                              openId={openPickerId}
                              setOpenId={setOpenPickerId}
                              onToggle={toggleRowCategory}
                            />
                          </td>
                        )}
                        <td style={S.td}>
                          <button style={S.btnRemove} onClick={() => removeRow(row._id)}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {saveError && <p style={S.errorText}>{saveError}</p>}

            {/* ── League affiliation ── */}
            <div style={S.leagueCard}>
              <div style={S.teamsToggleRow}>
                <span style={S.teamsToggleLabel}>🏆 Filiar clubes a uma liga</span>
                {affiliateLeagueId && leagues.find(l => l.id === affiliateLeagueId) && (
                  <span style={{ color: "#89b4fa", fontSize: "0.78rem", fontWeight: 600 }}>
                    {leagues.find(l => l.id === affiliateLeagueId)!.name}
                  </span>
                )}
              </div>
              <div style={{ marginTop: "0.75rem" }}>
                {loadingLeagues
                  ? <span style={{ color: "#ffffff", fontSize: "0.85rem" }}>Carregando ligas…</span>
                  : (
                    <select
                      value={affiliateLeagueId}
                      onChange={e => setAffiliateLeagueId(e.target.value)}
                      style={S.sportSelect}
                    >
                      <option value="">— Não filiar a nenhuma liga —</option>
                      {leagues.map(l => (
                        <option key={l.id} value={l.id}>{l.name} ({l.short_name})</option>
                      ))}
                    </select>
                  )
                }
              </div>
            </div>

            {/* ── Team creation options ── */}
            <div style={S.teamsCard}>
              <div style={S.teamsToggleRow}>
                <label style={S.teamsToggleLabel}>
                  <input
                    type="checkbox"
                    checked={createTeams}
                    onChange={e => { setCreateTeams(e.target.checked); setOpenPickerId(null); }}
                    style={{ accentColor: "#a6e3a1", width: 15, height: 15, cursor: "pointer" }}
                  />
                  <span>Criar times associados aos clubes importados?</span>
                </label>
                {createTeams && totalTeamsToBuild > 0 && (
                  <span style={{ color: "#89b4fa", fontSize: "0.78rem", fontWeight: 600 }}>
                    ⚽ {totalTeamsToBuild} time{totalTeamsToBuild !== 1 ? "s" : ""} configurado{totalTeamsToBuild !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {createTeams && (
                <div style={S.teamsBody}>
                  <div style={S.teamsRow}>
                    <span style={S.teamsLabel}>Esporte:</span>
                    {loadingSports
                      ? <span style={{ color: "#ffffff", fontSize: "0.85rem" }}>Carregando…</span>
                      : sports.length === 0
                        ? <span style={{ color: "#f38ba8", fontSize: "0.85rem" }}>Nenhum esporte cadastrado</span>
                        : (
                          <select
                            value={selectedSportId}
                            onChange={e => setSelectedSportId(e.target.value)}
                            style={S.sportSelect}
                          >
                            {sports.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        )
                    }
                  </div>
                  <div style={S.bulkCatRow}>
                    <span style={S.teamsLabel}>Aplicar a todos:</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                      {TEAM_CATEGORIES.map(cat => {
                        const allHave  = rows.length > 0 && rows.every(r => (rowCategories[r._id] ?? new Set()).has(cat.key));
                        const someHave = !allHave && rows.some(r => (rowCategories[r._id] ?? new Set()).has(cat.key));
                        return (
                          <button
                            key={cat.key}
                            style={{ ...S.bulkCatBtn, ...(allHave ? S.bulkCatBtnAll : someHave ? S.bulkCatBtnSome : {}) }}
                            onClick={() => toggleAllCategory(cat.key)}
                            title={allHave ? `Remover "${cat.label}" de todos` : someHave ? `Adicionar "${cat.label}" aos que faltam` : `Adicionar "${cat.label}" a todos`}
                          >
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={S.actions}>
              <button
                style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1 }}
                onClick={() => void handleSave()}
                disabled={saving}
              >
                {saving
                  ? `Salvando… (0/${rows.length})`
                  : `⬆ Importar ${rows.length} clube${rows.length !== 1 ? "s" : ""}${affiliateLeagueId ? ` → ${leagues.find(l => l.id === affiliateLeagueId)?.short_name ?? "liga"}` : ""}${totalTeamsToBuild > 0 ? ` + ${totalTeamsToBuild} time${totalTeamsToBuild !== 1 ? "s" : ""}` : ""}`
                }
              </button>
              <button style={S.btnSecondary} onClick={resetAll}>✕ Cancelar</button>
            </div>
          </>
        )}

        {/* ── STEP 5: RESULTADOS ── */}
        {showResults && (
          <>
            <div style={S.resultsHeader}>
              <h2 style={S.resultsTitle}>Resultado da importação</h2>
              <div style={S.resultsSummary}>
                <span style={S.badgeOk}>✓ {successCount} clube{successCount !== 1 ? "s" : ""} importado{successCount !== 1 ? "s" : ""}</span>
                {failCount > 0 && <span style={S.badgeErr}>✗ {failCount} com erro</span>}
                {teamsOkCount > 0 && <span style={S.badgeTeam}>⚽ {teamsOkCount} time{teamsOkCount !== 1 ? "s" : ""} criado{teamsOkCount !== 1 ? "s" : ""}</span>}
                {teamsErrCount > 0 && <span style={S.badgeErr}>⚠ {teamsErrCount} time{teamsErrCount !== 1 ? "s" : ""} com erro</span>}
                {leagueOkCount > 0 && <span style={S.badgeTeam}>🏆 {leagueOkCount} filiado{leagueOkCount !== 1 ? "s" : ""}</span>}
                {leagueErrCount > 0 && <span style={S.badgeErr}>⚠ {leagueErrCount} erro{leagueErrCount !== 1 ? "s" : ""} de filiação</span>}
              </div>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={S.th}>#</th>
                    <th style={S.th}>Nome</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Times</th>
                    <th style={S.th}>Detalhe</th>
                  </tr>
                </thead>
                <tbody>
                  {results!.map(r => (
                    <tr key={r.row} style={{ ...S.tr, ...(r.success ? {} : S.trErr) }}>
                      <td style={S.td}>{r.row}</td>
                      <td style={S.td}>{r.nome}</td>
                      <td style={S.td}>
                        <span style={r.success ? S.badgeOk : S.badgeErr}>
                          {r.success ? "✓ ok" : "✗ erro"}
                        </span>
                      </td>
                      <td style={S.td}>
                        {r.success && (
                          <span style={r.teamErrors?.length ? S.badgeErr : (r.teamsCreated ? S.badgeTeam : { color: "#ffffff", fontSize: "0.78rem" })}>
                            {r.teamsCreated
                              ? `⚽ ${r.teamsCreated}`
                              : (r.teamErrors?.length ? `⚠ ${r.teamErrors.length} erro${r.teamErrors.length !== 1 ? "s" : ""}` : "—")}
                          </span>
                        )}
                      </td>
                      <td style={{ ...S.td, color: r.success ? "#a6e3a1" : "#f38ba8" }}>
                        {r.success ? (
                          <>
                            {r.teamErrors?.length ? r.teamErrors.join("; ") : "Criado com sucesso"}
                            {r.leagueError && <span style={{ color: "#f38ba8", marginLeft: "0.5rem" }}>⚠ Liga: {r.leagueError}</span>}
                          </>
                        ) : r.error}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={S.actions}>
              <Link to="/admin/clubes" style={S.btnPrimary}>Ver clubes →</Link>
              <button style={S.btnSecondary} onClick={resetAll}>⬆ Importar mais</button>
            </div>
          </>
        )}
      </main>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  hero: { backgroundColor: "#18265b", borderBottom: "1px solid #313244", position: "relative", overflow: "hidden" },
  heroAccent: { position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #cba6f7, #a6e3a1)" },
  heroInner: { maxWidth: "1100px", margin: "0 auto", padding: "1.5rem 1.5rem 1.25rem" },
  back: { color: "#89b4fa", textDecoration: "none", fontSize: "0.85rem", display: "block", marginBottom: "0.5rem" },
  title: { margin: 0, fontSize: "1.6rem", fontWeight: 700, color: "#cdd6f4" },
  subtitle: { margin: "0.25rem 0 0", fontSize: "0.875rem", color: "#ffffff" },

  page: { maxWidth: "1100px", margin: "0 auto", padding: "1.5rem" },

  // Upload
  dropzone: {
    border: "2px dashed #45475a", borderRadius: "10px", padding: "2.5rem",
    textAlign: "center", cursor: "pointer", transition: "border-color 0.2s",
    backgroundColor: "#18265b",
  },
  dropzoneError: { borderColor: "#f38ba8" },
  dropIcon: { fontSize: "2.5rem", marginBottom: "0.5rem" },
  dropTitle: { margin: 0, fontWeight: 600, color: "#cdd6f4", fontSize: "1rem" },
  dropHint: { margin: "0.4rem 0 0", color: "#ffffff", fontSize: "0.85rem" },
  btnTemplate: {
    padding: "0.45rem 1rem", border: "1px solid #45475a", borderRadius: "6px",
    background: "#18265b", color: "#cdd6f4", cursor: "pointer", fontSize: "0.82rem",
    whiteSpace: "nowrap" as const,
  },
  hint: { color: "#ffffff", fontSize: "0.8rem", margin: 0 },
  errorText: { color: "#f38ba8", fontSize: "0.85rem", margin: "0.5rem 0 0" },

  // Resolution
  resolveCard: {
    backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "10px",
    padding: "1.25rem", marginBottom: "1rem",
  },
  resolveHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "1rem" },
  resolveTitle: { margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#cba6f7" },
  resolveDesc: { margin: "0.2rem 0 0", fontSize: "0.85rem", color: "#ffffff" },
  btnResolve: {
    padding: "0.5rem 1.1rem", border: "1px solid #cba6f7", borderRadius: "6px",
    backgroundColor: "transparent", color: "#cba6f7", cursor: "pointer", fontWeight: 600,
    fontSize: "0.85rem", whiteSpace: "nowrap" as const, flexShrink: 0,
  },
  chipList: { display: "flex", flexWrap: "wrap" as const, gap: "0.5rem" },
  chip: {
    display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.3rem 0.75rem",
    borderRadius: "999px", border: "1px solid #45475a", backgroundColor: "#18265b",
    fontSize: "0.82rem", color: "#cdd6f4",
  },
  chipOk:  { backgroundColor: "#1a3a2a", borderColor: "#a6e3a1", color: "#a6e3a1" },
  chipErr: { backgroundColor: "#3a1e2e", borderColor: "#f38ba8", color: "#f38ba8", borderRadius: "8px", padding: "0.4rem 0.75rem" },
  hintWarn: { color: "#fab387", fontSize: "0.8rem" },

  // Table
  tableTopBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" },
  rowCount: { margin: 0, color: "#ffffff", fontSize: "0.85rem" },
  tableWrap: { overflowX: "auto" as const, marginBottom: "1rem" },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: "0.82rem" },
  th: { padding: "0.5rem 0.6rem", textAlign: "left" as const, borderBottom: "1px solid #313244", color: "#ffffff", fontWeight: 600, whiteSpace: "nowrap" as const },
  tr: { borderBottom: "1px solid #18265b" },
  trErr: { backgroundColor: "#2a1525" },
  td: { padding: "0.25rem 0.4rem" },
  cell: {
    width: "100%", background: "transparent", border: "none", color: "#cdd6f4",
    fontSize: "0.82rem", padding: "0.25rem 0.3rem", outline: "none",
  },
  venueSelect: {
    width: "100%", background: "#18265b", border: "none", color: "#cdd6f4",
    fontSize: "0.82rem", padding: "0.25rem 0.3rem", cursor: "pointer", outline: "none",
    minWidth: 200,
  },
  btnRemove: { background: "transparent", border: "none", color: "#ffffff", cursor: "pointer", fontSize: "0.9rem", padding: "0.2rem 0.4rem" },

  // Actions
  actions: { display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" as const, marginTop: "0.5rem" },
  btnPrimary: {
    padding: "0.55rem 1.3rem", border: "none", borderRadius: "6px",
    backgroundColor: "#cba6f7", color: "#18265b", fontWeight: 700,
    cursor: "pointer", fontSize: "0.9rem", textDecoration: "none",
    display: "inline-block",
  },
  btnSecondary: {
    padding: "0.5rem 1rem", border: "1px solid #45475a", borderRadius: "6px",
    background: "transparent", color: "#cdd6f4", cursor: "pointer", fontSize: "0.85rem",
  },
  btnBack: {
    padding: "0.5rem 1rem", border: "1px solid #45475a", borderRadius: "6px",
    background: "transparent", color: "#ffffff", cursor: "pointer", fontSize: "0.85rem",
  },

  // Results
  resultsHeader: { marginBottom: "1rem" },
  resultsTitle: { margin: "0 0 0.5rem", color: "#cdd6f4", fontSize: "1.1rem" },
  resultsSummary: { display: "flex", gap: "0.75rem", flexWrap: "wrap" as const },
  badgeOk:   { backgroundColor: "#1a3a2a", color: "#a6e3a1", border: "1px solid #a6e3a1", borderRadius: "999px", padding: "0.2rem 0.7rem", fontSize: "0.8rem", fontWeight: 600 },
  badgeErr:  { backgroundColor: "#3a1e2e", color: "#f38ba8", border: "1px solid #f38ba8", borderRadius: "999px", padding: "0.2rem 0.7rem", fontSize: "0.8rem", fontWeight: 600 },
  badgeTeam: { backgroundColor: "#1a2a3a", color: "#89b4fa", border: "1px solid #89b4fa", borderRadius: "999px", padding: "0.2rem 0.7rem", fontSize: "0.8rem", fontWeight: 600 },

  // League affiliation panel
  leagueCard: {
    backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "10px",
    padding: "1rem 1.25rem", margin: "1rem 0 0",
  },

  // Team creation panel
  teamsCard: {
    backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "10px",
    padding: "1rem 1.25rem", margin: "1rem 0 0",
  },
  teamsToggleRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" },
  teamsToggleLabel: { display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", color: "#cdd6f4", fontWeight: 600, fontSize: "0.9rem" },
  teamsBody: { marginTop: "1rem", display: "flex", flexDirection: "column" as const, gap: "0.75rem" },
  teamsRow: { display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" as const },
  teamsLabel: { color: "#ffffff", fontSize: "0.85rem", minWidth: 80, flexShrink: 0 },
  sportSelect: {
    backgroundColor: "#18265b", border: "1px solid #45475a", borderRadius: "6px",
    color: "#cdd6f4", padding: "0.35rem 0.75rem", fontSize: "0.85rem", cursor: "pointer",
  },

  // Bulk-apply category bar
  bulkCatRow: { display: "flex", alignItems: "flex-start", gap: "0.75rem", flexWrap: "wrap" as const, marginTop: "0.25rem" },
  bulkCatBtn: {
    padding: "0.2rem 0.6rem", borderRadius: 6, border: "1px solid #45475a",
    background: "#18265b", color: "#ffffff", fontSize: "0.78rem", cursor: "pointer",
  },
  bulkCatBtnAll:  { background: "#a6e3a1", color: "#18265b", borderColor: "#a6e3a1", fontWeight: 700 as const },
  bulkCatBtnSome: { background: "#fab387", color: "#18265b", borderColor: "#fab387" },

  // Per-row category picker
  pickerBtn: {
    padding: "0.25rem 0.6rem", border: "1px solid #45475a", borderRadius: "999px",
    background: "#18265b", color: "#ffffff", cursor: "pointer", fontSize: "0.75rem",
    whiteSpace: "nowrap" as const,
  },
  pickerBtnActive: { borderColor: "#89b4fa", color: "#89b4fa", backgroundColor: "#1a2a3a", fontWeight: 700 },
  pickerPanel: {
    position: "absolute" as const, top: "calc(100% + 4px)", left: 0, zIndex: 100,
    backgroundColor: "#18265b", border: "1px solid #45475a", borderRadius: "8px",
    padding: "0.5rem", display: "flex", flexDirection: "column" as const,
    gap: "0.25rem", minWidth: 180, boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
  },
  pickerItem: {
    padding: "0.3rem 0.6rem", borderRadius: "4px", cursor: "pointer",
    fontSize: "0.8rem", color: "#ffffff", userSelect: "none" as const,
  },
  pickerItemOn: { backgroundColor: "#1a2a3a", color: "#89b4fa", fontWeight: 600 },
};
