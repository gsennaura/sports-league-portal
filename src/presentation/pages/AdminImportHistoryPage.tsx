import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "@infrastructure/apiBase";

type LogEntry = {
  id: string;
  operation: string;
  total: number;
  created: number;
  errors: number;
  created_at: string;
  details: string | null;
};

const OPERATION_LABEL: Record<string, string> = {
  athletes_bulk: "Atletas em Bulk",
  matches_bulk: "Partidas em Bulk",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function AdminImportHistoryPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/import/log`)
      .then((r) => {
        if (!r.ok) throw new Error(`Erro ${r.status}`);
        return r.json() as Promise<LogEntry[]>;
      })
      .then(setLogs)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <header style={S.hero}>
        <div style={S.heroAccent} />
        <div style={S.heroInner}>
          <Link to="/admin/importar" style={S.back}>← Central de Importações</Link>
          <h1 style={S.title}>Histórico de Importações</h1>
          <p style={S.subtitle}>Registro de todas as operações de importação em lote.</p>
        </div>
      </header>

      <main style={S.page}>
        {error && (
          <div style={S.errorBanner}>
            <span>⚠ {error}</span>
            <button style={S.errClose} onClick={() => setError(null)}>×</button>
          </div>
        )}

        {loading && <p style={S.hint}>Carregando...</p>}

        {!loading && logs.length === 0 && (
          <p style={S.hint}>Nenhuma importação registrada ainda.</p>
        )}

        {!loading && logs.length > 0 && (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  {["Data / Hora", "Operação", "Total", "Criados", "Erros"].map((h) => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={S.tr}>
                    <td style={S.td}>{formatDate(log.created_at)}</td>
                    <td style={S.td}>
                      <span style={S.opBadge}>
                        {OPERATION_LABEL[log.operation] ?? log.operation}
                      </span>
                    </td>
                    <td style={{ ...S.td, ...S.num }}>{log.total}</td>
                    <td style={{ ...S.td, ...S.num, color: log.created > 0 ? "#a6e3a1" : "#cdd6f4" }}>
                      {log.created}
                    </td>
                    <td style={{ ...S.td, ...S.num, color: log.errors > 0 ? "#f38ba8" : "#cdd6f4" }}>
                      {log.errors}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: { backgroundColor: "#18265b", borderBottom: "1px solid #313244", position: "relative", overflow: "hidden" },
  heroAccent: { position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #cba6f7, #a6e3a1)" },
  heroInner: { maxWidth: "900px", margin: "0 auto", padding: "1.5rem 1.5rem 1.25rem" },
  back: { display: "inline-block", color: "#89b4fa", textDecoration: "none", fontSize: "0.85rem", marginBottom: "0.75rem" },
  title: { fontSize: "1.5rem", fontWeight: 700, color: "#cdd6f4", margin: "0 0 0.2rem" },
  subtitle: { color: "#cdd6f4", fontSize: "0.875rem", margin: 0 },

  page: { maxWidth: "900px", margin: "0 auto", padding: "2rem 1.5rem 4rem" },
  hint: { color: "#ffffff", fontSize: "0.875rem" },
  errorBanner: { display: "flex", alignItems: "center", justifyContent: "space-between", color: "#f38ba8", backgroundColor: "#2a1a1f", border: "1px solid #5a2a30", borderRadius: "6px", padding: "0.75rem 1rem", fontSize: "0.875rem", marginBottom: "1.5rem" },
  errClose: { background: "none", border: "none", color: "#f38ba8", cursor: "pointer", fontSize: "1.2rem", padding: "0 0.25rem", lineHeight: 1 },

  tableWrap: { overflowX: "auto" as const },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: "0.875rem" },
  th: { padding: "0.6rem 1rem", textAlign: "left" as const, color: "#ffffff", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em", borderBottom: "1px solid #313244", backgroundColor: "#18265b", whiteSpace: "nowrap" as const },
  tr: { borderBottom: "1px solid #18265b" },
  td: { padding: "0.65rem 1rem", color: "#cdd6f4", verticalAlign: "middle" as const },
  num: { fontFamily: "monospace", textAlign: "right" as const },
  opBadge: { backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "4px", padding: "0.15rem 0.5rem", fontSize: "0.78rem", color: "#cba6f7" },
};
