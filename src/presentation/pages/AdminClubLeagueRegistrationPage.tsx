import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import type { ManageClubLeagueRegistrations, ClubWithRegistration } from "@application/use_cases/ManageClubLeagueRegistrations";
import { API_BASE } from "@infrastructure/apiBase";
import { authHeaders } from "@infrastructure/authHeaders";
import { useAuth } from "@presentation/context/AuthContext";

interface Props {
  manageClubLeagueRegistrations: ManageClubLeagueRegistrations;
}

interface LeagueSummary { id: string; name: string; short_name: string; }

export function AdminClubLeagueRegistrationPage({ manageClubLeagueRegistrations }: Props) {
  const { id: urlLeagueId } = useParams<{ id: string }>();
  const { isAdmin, isLeagueAdmin, leagueAdminProfiles } = useAuth();

  // Leagues available to this user
  const [adminLeagues, setAdminLeagues] = useState<LeagueSummary[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>(urlLeagueId ?? "");

  // Page data
  const [allItems, setAllItems] = useState<ClubWithRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [search, setSearch] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [affiliating, setAffiliating] = useState<string | null>(null);
  const [desfiliating, setDesfiliating] = useState<string | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // Load leagues available to this user
  useEffect(() => {
    fetch(`${API_BASE}/leagues??limit=200`, { headers: authHeaders() })
      .then((r) => r.json() as Promise<LeagueSummary[]>)
      .then((all) => {
        if (isAdmin && !isLeagueAdmin) {
          setAdminLeagues(all);
          if (!selectedLeagueId && all.length > 0) setSelectedLeagueId(all[0].id);
        } else {
          const myIds = new Set(leagueAdminProfiles.filter((p) => p.is_active).map((p) => p.league_id));
          const myLeagues = all.filter((l) => myIds.has(l.id));
          setAdminLeagues(myLeagues);
          if (myLeagues.length > 0) {
            const preferredId = urlLeagueId && myIds.has(urlLeagueId) ? urlLeagueId : myLeagues[0].id;
            setSelectedLeagueId(preferredId);
          }
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isLeagueAdmin, leagueAdminProfiles.length]);

  // Load clubs for selected league
  const load = useCallback(async () => {
    if (!selectedLeagueId) return;
    setLoading(true);
    try {
      const pageData = await manageClubLeagueRegistrations.getPageData(selectedLeagueId);
      setAllItems(pageData.clubsWithStatus);
    } catch (e) {
      showToast("error", `Erro ao carregar dados: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedLeagueId, manageClubLeagueRegistrations]);

  useEffect(() => { if (selectedLeagueId) load(); }, [load, selectedLeagueId]);

  const handleDesfiliar = async (regId: string, clubName: string) => {
    if (!selectedLeagueId) return;
    if (!window.confirm(`Desfiliar "${clubName}" desta liga?\n\nEsta ação só é permitida se o clube não possui partidas registradas.`)) return;
    setDesfiliating(regId);
    try {
      const { errors } = await manageClubLeagueRegistrations.save({
        leagueId: selectedLeagueId,
        toAdd: [],
        toRemove: [regId],
      });
      if (errors.length > 0) {
        showToast("error", errors.join("\n"));
      } else {
        showToast("success", `"${clubName}" desfiliado com sucesso.`);
        await load();
      }
    } catch (e) {
      showToast("error", `Erro: ${(e as Error).message}`);
    } finally {
      setDesfiliating(null);
    }
  };

  const handleAffiliate = async (clubId: string) => {
    if (!selectedLeagueId) return;
    setAffiliating(clubId);
    try {
      const { errors } = await manageClubLeagueRegistrations.save({
        leagueId: selectedLeagueId,
        toAdd: [clubId],
        toRemove: [],
      });
      if (errors.length > 0) {
        showToast("error", errors.join("\n"));
      } else {
        showToast("success", "Clube filiado com sucesso.");
        setShowModal(false);
        setModalSearch("");
        await load();
      }
    } catch (e) {
      showToast("error", `Erro: ${(e as Error).message}`);
    } finally {
      setAffiliating(null);
    }
  };

  const currentLeague = adminLeagues.find((l) => l.id === selectedLeagueId);
  const affiliatedClubs = allItems.filter((i) => i.isRegistered);
  const nonAffiliatedClubs = allItems.filter((i) => !i.isRegistered);

  const filteredAffiliated = search.trim()
    ? affiliatedClubs.filter((i) =>
        i.club.name.toLowerCase().includes(search.toLowerCase()) ||
        (i.club.nickname ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : affiliatedClubs;

  const filteredModal = modalSearch.trim()
    ? nonAffiliatedClubs.filter((i) =>
        i.club.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
        (i.club.nickname ?? "").toLowerCase().includes(modalSearch.toLowerCase())
      )
    : nonAffiliatedClubs;

  return (
    <>
      {toast && (
        <div style={{ ...S.toast, background: toast.type === "success" ? "#a6e3a1" : "#f38ba8", color: "#18265b" }}>
          {toast.msg}
        </div>
      )}

      <header style={S.hero}>
        <div style={S.heroAccent} />
        <div style={S.heroInner}>
          <h1 style={S.title}>Clubes Filiados</h1>
          {currentLeague && <p style={S.subtitle}>{currentLeague.name}</p>}
        </div>
      </header>

      <main style={S.page}>
        {/* Toolbar: league selector + Filiar button */}
        <div style={S.toolbar}>
          <select
            style={S.leagueSelect}
            value={selectedLeagueId}
            onChange={(e) => { setSelectedLeagueId(e.target.value); setSearch(""); }}
            disabled={isLeagueAdmin && !isAdmin && adminLeagues.length <= 1}
          >
            {adminLeagues.length === 0 && <option value="">Nenhuma liga disponível</option>}
            {adminLeagues.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <div style={{ flex: 1 }} />
          <button
            style={S.btnFiliar}
            onClick={() => { setShowModal(true); setModalSearch(""); }}
            disabled={!selectedLeagueId || loading}
          >
            + Filiar Clube
          </button>
        </div>

        {/* Stats */}
        {!loading && (
          <div style={S.stats}>
            <span style={S.badge}>{affiliatedClubs.length} filiado(s)</span>
          </div>
        )}

        {/* Search within affiliated */}
        {affiliatedClubs.length > 3 && (
          <input
            style={S.search}
            type="text"
            placeholder="Buscar clube filiado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}

        {loading && <p style={{ color: "#cdd6f4", marginTop: "1rem" }}>Carregando...</p>}

        {!loading && filteredAffiliated.length === 0 && (
          <p style={{ color: "#ffffff", marginTop: "2rem" }}>
            {affiliatedClubs.length === 0
              ? 'Nenhum clube filiado a esta liga. Use "+ Filiar Clube" para adicionar.'
              : "Nenhum clube encontrado para a busca."}
          </p>
        )}

        <ul style={S.list}>
          {filteredAffiliated.map((item) => (
            <li key={item.club.id} style={S.item}>
              <div style={S.clubInfo}>
                <span style={S.clubName}>{item.club.name}</span>
                {item.club.nickname && <span style={S.clubNick}>{item.club.nickname}</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={S.tagFiliado}>filiado</span>
                {item.registration && (
                  <button
                    style={S.btnDesfiliar}
                    onClick={() => handleDesfiliar(item.registration!.id, item.club.name)}
                    disabled={!!desfiliating}
                    title="Desfiliar clube"
                  >
                    {desfiliating === item.registration.id ? "..." : "Desfiliar"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </main>

      {/* ── Filiar Clube Modal ── */}
      {showModal && (
        <div style={S.overlay} onClick={() => setShowModal(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <h3 style={S.modalTitle}>Filiar Clube</h3>
              <button style={S.btnClose} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <input
              style={S.search}
              type="text"
              placeholder="Buscar clube..."
              value={modalSearch}
              onChange={(e) => setModalSearch(e.target.value)}
              autoFocus
            />
            {filteredModal.length === 0 ? (
              <p style={{ color: "#ffffff", marginTop: "1rem", textAlign: "center" }}>
                {nonAffiliatedClubs.length === 0
                  ? "Todos os clubes já estão filiados."
                  : "Nenhum clube encontrado."}
              </p>
            ) : (
              <ul style={{ ...S.list, maxHeight: "380px", overflowY: "auto", marginTop: "0.75rem" }}>
                {filteredModal.map((item) => (
                  <li
                    key={item.club.id}
                    style={{ ...S.item, cursor: affiliating ? "not-allowed" : "pointer" }}
                    onClick={() => !affiliating && handleAffiliate(item.club.id)}
                  >
                    <div style={S.clubInfo}>
                      <span style={S.clubName}>{item.club.name}</span>
                      {item.club.nickname && <span style={S.clubNick}>{item.club.nickname}</span>}
                    </div>
                    {affiliating === item.club.id ? (
                      <span style={{ color: "#f9e2af", fontSize: "0.8rem" }}>Afiliando...</span>
                    ) : (
                      <span style={S.tagFiliarBtn}>Filiar</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: {
    background: "linear-gradient(135deg, #18265b 0%, #18265b 100%)",
    borderBottom: "1px solid #313244",
    paddingBottom: "1.5rem",
    position: "relative",
    overflow: "hidden",
  },
  heroAccent: {
    position: "absolute", top: 0, left: 0, right: 0, height: "3px",
    background: "linear-gradient(90deg, #89b4fa, #cba6f7)",
  },
  heroInner: { maxWidth: "900px", margin: "0 auto", padding: "1.5rem 1.5rem 0" },
  title: { color: "#cdd6f4", fontSize: "1.6rem", fontWeight: 700, margin: "0.5rem 0 0.2rem" },
  subtitle: { color: "#ffffff", fontSize: "0.9rem", margin: 0 },
  page: { maxWidth: "900px", margin: "0 auto", padding: "1.5rem" },
  toolbar: {
    display: "flex", alignItems: "center", gap: "0.75rem",
    marginBottom: "1rem", flexWrap: "wrap",
  },
  leagueSelect: {
    background: "#313244", border: "1px solid #45475a",
    borderRadius: "6px", color: "#cdd6f4",
    padding: "0.45rem 0.75rem", fontSize: "0.9rem", minWidth: "220px",
  },
  stats: { display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem" },
  badge: {
    background: "#89b4fa", color: "#18265b",
    borderRadius: "12px", padding: "0.2rem 0.7rem",
    fontSize: "0.78rem", fontWeight: 600,
  },
  search: {
    width: "100%", boxSizing: "border-box",
    background: "#313244", border: "1px solid #45475a",
    borderRadius: "6px", color: "#cdd6f4",
    padding: "0.45rem 0.75rem", fontSize: "0.9rem",
    marginBottom: "0.5rem",
  },
  btnFiliar: {
    background: "#a6e3a1", color: "#18265b",
    border: "none", borderRadius: "6px",
    padding: "0.5rem 1.25rem", fontWeight: 700,
    cursor: "pointer", fontSize: "0.9rem",
    whiteSpace: "nowrap",
  },
  list: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.4rem" },
  item: {
    display: "flex", alignItems: "center", gap: "0.75rem",
    borderRadius: "8px", padding: "0.7rem 1rem",
    background: "#18265b", border: "1px solid #313244",
  },
  clubInfo: { display: "flex", alignItems: "baseline", gap: "0.5rem", flex: 1 },
  clubName: { color: "#cdd6f4", fontWeight: 600, fontSize: "0.95rem" },
  clubNick: { color: "#ffffff", fontSize: "0.8rem" },
  tagFiliado: {
    background: "#a6e3a1", color: "#18265b",
    borderRadius: "10px", padding: "0.15rem 0.6rem",
    fontSize: "0.72rem", fontWeight: 600,
  },
  btnDesfiliar: {
    background: "transparent", border: "1px solid #f38ba8",
    borderRadius: "6px", color: "#f38ba8",
    padding: "0.2rem 0.55rem", fontSize: "0.72rem",
    fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const,
  },
  tagFiliarBtn: {
    background: "#89b4fa", color: "#18265b",
    borderRadius: "10px", padding: "0.15rem 0.65rem",
    fontSize: "0.72rem", fontWeight: 600,
  },
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.6)", zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  modal: {
    background: "#18265b", border: "1px solid #45475a",
    borderRadius: "12px", padding: "1.5rem",
    width: "100%", maxWidth: "500px",
    maxHeight: "85vh", overflow: "hidden",
    display: "flex", flexDirection: "column",
  },
  modalHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: "1rem",
  },
  modalTitle: { color: "#cdd6f4", margin: 0, fontSize: "1.1rem", fontWeight: 700 },
  btnClose: {
    background: "transparent", border: "none",
    color: "#ffffff", cursor: "pointer", fontSize: "1.1rem",
    padding: "0.2rem 0.4rem",
  },
  toast: {
    position: "fixed", bottom: "1.5rem", right: "1.5rem",
    padding: "0.8rem 1.25rem", borderRadius: "8px",
    fontWeight: 600, fontSize: "0.9rem", zIndex: 9999,
    boxShadow: "0 4px 20px rgba(0,0,0,0.4)", whiteSpace: "pre-line",
    maxWidth: "360px",
  },
};
