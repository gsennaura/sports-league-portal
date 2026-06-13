import React, { useState, useEffect } from "react";
import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom";
import { authHeaders } from "@infrastructure/authHeaders";
import { API_BASE } from "@infrastructure/apiBase";

// ─── Types ──────────────────────────────────────────────────────────────────

type ChampInfo = {
  id: string; name: string; nickname: string | null;
  year: number; level: string | null; sport_id: string;
  league_id: string | null;
};

type TeamEntry = { team_id: string; team_name: string; group_id: string };

type MatchData = {
  id: string; home_team_id: string; away_team_id: string;
  round_number: number | null; match_date: string | null;
  home_score: number | null; away_score: number | null;
};

type GroupData = { id: string; name: string; teams: TeamEntry[]; matches: MatchData[] };

type PhaseData = {
  id: string; name: string; order: number;
  phase_type: string; format_name: string | null;
  status: string;
  groups: GroupData[];
};

type TeamOption = { id: string; name: string; sport_id: string; sport_name: string; category: string | null; };
type VenueOption = { id: string; name: string; };
type EditionInfo = { id: string; year: number; status: string; champion_team_id: string | null; runner_up_team_id: string | null; };

type RegRow = {
  id: string;
  athlete_id: string;
  team_id: string;
  athlete_name: string;
  team_name: string;
  registration_number: string | null;
  registered_at: string | null;
  notes: string | null;
  status: string;
};

// ─── Labels ─────────────────────────────────────────────────────────────────

const PHASE_TYPE_LABEL: Record<string, string> = {
  round_robin: "Pontos Corridos",
  knockout: "Mata-Mata",
};

const LEVEL_LABEL: Record<string, string> = {
  amador: "Amador", junior: "Júnior", juvenil: "Juvenil", infantil: "Infantil",
  mirim: "Mirim", "pre-mirim": "Pré-Mirim", universitario: "Universitário",
  universitaria: "Universitário",
  profissional: "Profissional", master: "Master", terrao: "Terrão",
  clube_social: "Clube Social",
};

// Maps ChampionshipLevel values → SquadCategory values when they differ
const LEVEL_TO_SQUAD: Record<string, string> = {
  universitario: "universitaria",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
};

// ─── Component ──────────────────────────────────────────────────────────────

export function AdminChampionshipManagePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const editionIdParam = searchParams.get("edicao");
  const navigate = useNavigate();

  const [champ, setChamp] = useState<ChampInfo | null>(null);
  const [phases, setPhases] = useState<PhaseData[]>([]);
  const [allTeams, setAllTeams] = useState<TeamOption[]>([]);
  const [leagueName, setLeagueName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Form visibility ────────────────────────────────────────────────────────
  const [showPhaseForm, setShowPhaseForm] = useState(false);
  const [groupFormPhase, setGroupFormPhase] = useState<string | null>(null);
  const [teamFormGroup, setTeamFormGroup] = useState<string | null>(null);

  // ── Phase form fields ──────────────────────────────────────────────────────
  const [phaseName, setPhaseName] = useState("");
  const [phaseOrder, setPhaseOrder] = useState("1");
  const [phaseType, setPhaseType] = useState("round_robin");

  // ── Group / team form fields ───────────────────────────────────────────────
  const [groupName, setGroupName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");

  // ── Generate / delete / schedule-edit state ──────────────────────────────
  // (match management moved to AdminGroupMatchesPage)
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [deletingPhaseId, setDeletingPhaseId] = useState<string | null>(null);
  const [removingTeamKey, setRemovingTeamKey] = useState<string | null>(null);

  // ── Submit state ───────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Tabs + edition ─────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"estrutura" | "inscritos" | "rodadas">("estrutura");
  const [resolvedEditionId, setResolvedEditionId] = useState<string | null>(null);

  // ── Edition management ─────────────────────────────────────────────────────
  const [editions, setEditions] = useState<{ id: string; year: number; status: string }[]>([]);
  const [editionInfo, setEditionInfo] = useState<EditionInfo | null>(null);
  const [editionStatus, setEditionStatus] = useState("planned");
  const [editionChampionId, setEditionChampionId] = useState("");
  const [editionRunnerUpId, setEditionRunnerUpId] = useState("");
  const [savingEdition, setSavingEdition] = useState(false);
  const [editionSaveOk, setEditionSaveOk] = useState(false);
  const [deletingEdition, setDeletingEdition] = useState(false);
  const [deletingChampionship, setDeletingChampionship] = useState(false);
  const [resetingPodium, setResetingPodium] = useState(false);
  const [editionClubs, setEditionClubs] = useState<{ id: string; name: string }[]>([]);

  // ── Rodadas tab state ────────────────────────────────────────────────────
  type RoundMatchRow = { home_team_id: string; away_team_id: string; match_date: string; venue_id: string; };
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [venuesLoaded, setVenuesLoaded] = useState(false);
  const [roundPhaseId, setRoundPhaseId] = useState("");
  const [roundGroupId, setRoundGroupId] = useState("");
  const [roundNumber, setRoundNumber] = useState("1");
  const [roundDefaultDate, setRoundDefaultDate] = useState("");
  const [roundRows, setRoundRows] = useState<RoundMatchRow[]>([{ home_team_id: "", away_team_id: "", match_date: "", venue_id: "" }]);
  const [savingRound, setSavingRound] = useState(false);
  const [roundResult, setRoundResult] = useState<{ total: number; created: number; errors: number; results: { row: number; success: boolean; match_id: string | null; home_team_id: string; away_team_id: string; error: string | null }[] } | null>(null);

  // ── Registrations tab ──────────────────────────────────────────────────────
  const [registrations, setRegistrations] = useState<RegRow[]>([]);
  const [regLoading, setRegLoading] = useState(false);
  const [regLoaded, setRegLoaded] = useState(false);
  const [regFilterTeam, setRegFilterTeam] = useState("");
  const [regFilterStatus, setRegFilterStatus] = useState("");
  const [regBusy, setRegBusy] = useState<Record<string, boolean>>({});
  const [regError, setRegError] = useState<string | null>(null);
  const [rejectingRegId, setRejectingRegId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [regPage, setRegPage] = useState(0);
  const REG_PAGE_SIZE = 30;

  // ── Load ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    loadAll();
  }, [id, editionIdParam]);

  useEffect(() => {
    if (!id || !resolvedEditionId) return;
    fetch(`${API_BASE}/championships/${id}/editions/${resolvedEditionId}`)
      .then(r => r.ok ? r.json() as Promise<EditionInfo> : Promise.reject())
      .then(data => {
        setEditionInfo(data);
        setEditionStatus(data.status);
        setEditionChampionId(data.champion_team_id ?? "");
        setEditionRunnerUpId(data.runner_up_team_id ?? "");
      })
      .catch(() => {});
  }, [resolvedEditionId, id]);

  useEffect(() => {
    if (!id || !resolvedEditionId) return;
    fetch(`${API_BASE}/championships/${id}/editions/${resolvedEditionId}/clubs`)
      .then(r => r.ok ? r.json() as Promise<{ id: string; name: string }[]> : [])
      .then(setEditionClubs)
      .catch(() => {});
  }, [resolvedEditionId, id]);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [champRes, phasesRes, teamsRes, sportsRes, editionsRes] = await Promise.all([
        fetch(`${API_BASE}/championships/${id}`),
        editionIdParam
          ? fetch(`${API_BASE}/championships/${id}/editions/${editionIdParam}/phases`)
          : fetch(`${API_BASE}/championships/${id}/phases`),
        fetch(`${API_BASE}/teams`),
        fetch(`${API_BASE}/sports`),
        fetch(`${API_BASE}/championships/${id}/editions`),
      ]);

      if (!champRes.ok) throw new Error("Campeonato não encontrado.");

      const champData = await champRes.json() as ChampInfo;
      const rawPhases = phasesRes.ok ? (await phasesRes.json() as Omit<PhaseData, "groups">[]) : [];

      const sportMap = new Map<string, string>();
      if (sportsRes.ok) {
        const sportsList = await sportsRes.json() as Array<{ id: string; name: string }>;
        for (const s of sportsList) sportMap.set(s.id, s.name);
      }

      // Fetch club IDs affiliated with the championship's league (if any)
      let leagueClubIds: Set<string> | null = null;
      if (champData.league_id) {
        const [leagueRes, leagueClubsRes] = await Promise.all([
          fetch(`${API_BASE}/leagues/${champData.league_id}`),
          fetch(`${API_BASE}/leagues/${champData.league_id}/clubs`),
        ]);
        if (leagueRes.ok) {
          const leagueData = await leagueRes.json() as { name: string };
          setLeagueName(leagueData.name);
        }
        if (leagueClubsRes.ok) {
          const leagueClubs = await leagueClubsRes.json() as Array<{ club_id: string }>;
          leagueClubIds = new Set(leagueClubs.map(c => c.club_id));
        }
      }

      type RawTeam = { id: string; name: string; sport_id: string; category: string | null; club_id: string | null };
      const rawTeams = teamsRes.ok ? (await teamsRes.json() as RawTeam[]) : [];

      // Filter by same sport; if championship has a level, also filter by matching category;
      // if championship has a league, only include teams from clubs affiliated with that league.
      // Map ChampionshipLevel → SquadCategory (e.g. "universitario" → "universitaria")
      const filtered = rawTeams.filter(t => {
        if (t.sport_id !== champData.sport_id) return false;
        if (champData.level && t.category) {
          const expectedCategory = LEVEL_TO_SQUAD[champData.level] ?? champData.level;
          if (t.category !== expectedCategory) return false;
        }
        if (leagueClubIds !== null && t.club_id !== null && !leagueClubIds.has(t.club_id)) return false;
        return true;
      });

      const teamsData: TeamOption[] = filtered.map(t => ({
        id: t.id,
        name: t.name,
        sport_id: t.sport_id,
        sport_name: sportMap.get(t.sport_id) ?? "–",
        category: t.category,
      }));

      setChamp(champData);
      setAllTeams(teamsData.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));

      if (editionsRes.ok) {
        type EditionEntry = { id: string; year: number; status: string };
        const editionsList = await editionsRes.json() as EditionEntry[];
        setEditions(editionsList);
        if (editionsList.length > 0) {
          // If a specific edition was requested, use it; otherwise auto-resolve
          if (editionIdParam && editionsList.some(e => e.id === editionIdParam)) {
            setResolvedEditionId(editionIdParam);
          } else {
            const active = editionsList.find(e => e.status === "ongoing") ?? editionsList.sort((a, b) => b.year - a.year)[0];
            setResolvedEditionId(active.id);
          }
        }
      }

      const phasesWithGroups = await Promise.all(
        rawPhases.map(async (phase) => {
          const groupsRes = await fetch(`${API_BASE}/phases/${phase.id}/groups`);
          const rawGroups = groupsRes.ok
            ? (await groupsRes.json() as { id: string; name: string }[])
            : [];
          const groups = await Promise.all(
            rawGroups.map(async (group) => {
              const [tRes, mRes] = await Promise.all([
                fetch(`${API_BASE}/groups/${group.id}/teams`),
                fetch(`${API_BASE}/groups/${group.id}/matches`),
              ]);
              const teams = tRes.ok ? (await tRes.json() as TeamEntry[]) : [];
              const matches = mRes.ok ? (await mRes.json() as MatchData[]) : [];
              return { ...group, teams, matches };
            })
          );
          return { ...phase, groups };
        })
      );

      setPhases(phasesWithGroups.sort((a, b) => a.order - b.order));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  async function handleDeleteChampionship() {
    if (!id || !window.confirm("Excluir este campeonato? Esta ação é irreversível.")) return;
    setDeletingChampionship(true);
    setSubmitError(null);
    const res = await fetch(`${API_BASE}/championships/${id}`, { method: "DELETE", headers: authHeaders() });
    if (res.ok) {
      navigate("/admin/campeonatos");
    } else {
      const d = await res.json().catch(() => ({})) as { detail?: string };
      setSubmitError(d.detail ?? "Erro ao excluir campeonato");
      setDeletingChampionship(false);
    }
  }

  async function handleDeleteEdition() {
    if (!resolvedEditionId || !id) return;
    if (!window.confirm("Excluir esta edição? Todas as fases, grupos e partidas serão removidas.")) return;
    setDeletingEdition(true);
    setSubmitError(null);
    const res = await fetch(`${API_BASE}/championships/${id}/editions/${resolvedEditionId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.ok) {
      navigate(`/admin/campeonatos/${id}/edicoes`);
    } else {
      const d = await res.json().catch(() => ({})) as { detail?: string };
      setSubmitError(d.detail ?? "Erro ao excluir edição");
      setDeletingEdition(false);
    }
  }

  async function handleResetPodium() {
    if (!resolvedEditionId || !id) return;
    if (!window.confirm("Resetar campeão e vice-campeão desta edição?")) return;
    setResetingPodium(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${API_BASE}/championships/${id}/editions/${resolvedEditionId}/podium`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ champion_team_id: null, runner_up_team_id: null }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(d.detail ?? `Erro ${res.status}`);
      }
      const updated = await res.json() as EditionInfo;
      setEditionInfo(updated);
      setEditionChampionId("");
      setEditionRunnerUpId("");
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setResetingPodium(false);
    }
  }

  async function handleSaveEditionInfo() {    if (!resolvedEditionId || !id) return;
    setSavingEdition(true);
    setEditionSaveOk(false);
    setSubmitError(null);
    try {
      const res = await fetch(`${API_BASE}/championships/${id}/editions/${resolvedEditionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          status: editionStatus,
          champion_team_id: editionChampionId || null,
          runner_up_team_id: editionRunnerUpId || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(d.detail ?? `Erro ${res.status}`);
      }
      const updated = await res.json() as EditionInfo;
      setEditionInfo(updated);
      setEditionSaveOk(true);
      setTimeout(() => setEditionSaveOk(false), 3000);
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSavingEdition(false);
    }
  }

  async function handleAddPhase(e: React.FormEvent) {
    e.preventDefault();
    if (!phaseName.trim() || !id) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const body: Record<string, unknown> = {
        name: phaseName.trim(),
        order: parseInt(phaseOrder, 10) || 1,
        phase_type: phaseType,
      };
      const res = await fetch(`${API_BASE}/championships/${id}/editions/${resolvedEditionId}/phases`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(d.detail ?? `Erro ${res.status}`);
      }
      const newPhase = await res.json() as Omit<PhaseData, "groups">;
      setPhases(prev => [...prev, { ...newPhase, groups: [] }].sort((a, b) => a.order - b.order));
      setPhaseName("");
      setPhaseOrder("1");
      setPhaseType("round_robin");
      setShowPhaseForm(false);
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTogglePhaseStatus(phaseId: string, currentStatus: string) {
    const newStatus = currentStatus === "finalizado" ? "em_andamento" : "finalizado";
    setSubmitError(null);
    try {
      const res = await fetch(`${API_BASE}/phases/${phaseId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(d.detail ?? `Erro ${res.status}`);
      }
      setPhases(prev => prev.map(p =>
        p.id === phaseId ? { ...p, status: newStatus } : p
      ));
    } catch (err) {
      setSubmitError((err as Error).message);
    }
  }

  async function handleAddGroup(phaseId: string, e: React.FormEvent) {
    e.preventDefault();
    if (!groupName.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${API_BASE}/phases/${phaseId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ name: groupName.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(d.detail ?? `Erro ${res.status}`);
      }
      const newGroup = await res.json() as { id: string; name: string };
      setPhases(prev => prev.map(p =>
        p.id === phaseId
          ? { ...p, groups: [...p.groups, { ...newGroup, teams: [], matches: [] }] }
          : p
      ));
      setGroupName("");
      setGroupFormPhase(null);
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddTeam(groupId: string, e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTeamId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${API_BASE}/groups/${groupId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ team_id: selectedTeamId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(d.detail ?? `Erro ${res.status}`);
      }
      const entry = await res.json() as TeamEntry;
      setPhases(prev => prev.map(p => ({
        ...p,
        groups: p.groups.map(g =>
          g.id === groupId ? { ...g, teams: [...g.teams, entry] } : g
        ),
      })));
      setSelectedTeamId("");
      setTeamFormGroup(null);
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveRound() {
    if (!roundGroupId || savingRound) return;
    const validRows = roundRows.filter(r => r.home_team_id && r.away_team_id);
    if (validRows.length === 0) {
      setSubmitError("Adicione ao menos uma partida com mandante e visitante.");
      return;
    }
    setSavingRound(true);
    setSubmitError(null);
    setRoundResult(null);
    try {
      const payload = {
        matches: validRows.map(r => ({
          home_team_id: r.home_team_id,
          away_team_id: r.away_team_id,
          round_number: parseInt(roundNumber, 10) || null,
          match_date: (r.match_date || roundDefaultDate) || null,
          venue_id: r.venue_id || null,
        })),
      };
      const res = await fetch(`${API_BASE}/groups/${roundGroupId}/matches/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(d.detail ?? `Erro ${res.status}`);
      }
      const result = await res.json() as NonNullable<typeof roundResult>;
      setRoundResult(result);
      // Update local state with created matches
      const successIds = new Set(result.results.filter(r => r.success).map(r => r.match_id));
      if (successIds.size > 0) {
        const matchesRes = await fetch(`${API_BASE}/groups/${roundGroupId}/matches`, { headers: authHeaders() });
        if (matchesRes.ok) {
          const allGroupMatches = await matchesRes.json() as MatchData[];
          setPhases(prev => prev.map(p => ({
            ...p,
            groups: p.groups.map(g =>
              g.id === roundGroupId ? { ...g, matches: allGroupMatches } : g
            ),
          })));
        }
      }
      if (result.errors === 0) {
        setRoundRows([{ home_team_id: "", away_team_id: "", match_date: "", venue_id: "" }]);
      }
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSavingRound(false);
    }
  }

  async function handleRemoveTeamFromGroup(groupId: string, teamId: string, phaseId: string) {
    const key = `${groupId}:${teamId}`;
    if (removingTeamKey) return;
    if (!window.confirm("Remover este time do grupo?")) return;
    setRemovingTeamKey(key);
    setSubmitError(null);
    try {
      const res = await fetch(`${API_BASE}/groups/${groupId}/teams/${teamId}`, { method: "DELETE", headers: { ...authHeaders() } });
      if (!res.ok && res.status !== 204) {
        const d = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(d.detail ?? `Erro ${res.status}`);
      }
      setPhases(prev => prev.map(p =>
        p.id === phaseId
          ? { ...p, groups: p.groups.map(g =>
              g.id === groupId ? { ...g, teams: g.teams.filter(t => t.team_id !== teamId) } : g
            ) }
          : p
      ));
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setRemovingTeamKey(null);
    }
  }

  async function handleDeleteGroup(groupId: string, phaseId: string) {
    if (deletingGroupId) return;
    if (!window.confirm("Excluir este grupo e todas as suas partidas e times?")) return;
    setDeletingGroupId(groupId);
    setSubmitError(null);
    try {
      const res = await fetch(`${API_BASE}/groups/${groupId}`, { method: "DELETE", headers: { ...authHeaders() } });
      if (!res.ok && res.status !== 204) {
        const d = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(d.detail ?? `Erro ${res.status}`);
      }
      setPhases(prev => prev.map(p =>
        p.id === phaseId ? { ...p, groups: p.groups.filter(g => g.id !== groupId) } : p
      ));
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setDeletingGroupId(null);
    }
  }

  async function handleDeletePhase(phaseId: string) {
    if (deletingPhaseId) return;
    if (!window.confirm("Excluir esta fase e todos os seus grupos, times e partidas?")) return;
    setDeletingPhaseId(phaseId);
    setSubmitError(null);
    try {
      const res = await fetch(`${API_BASE}/phases/${phaseId}`, { method: "DELETE", headers: { ...authHeaders() } });
      if (!res.ok && res.status !== 204) {
        const d = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(d.detail ?? `Erro ${res.status}`);
      }
      setPhases(prev => prev.filter(p => p.id !== phaseId));
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setDeletingPhaseId(null);
    }
  }

  // ── Registrations tab handlers ─────────────────────────────────────────────

  async function loadRegistrations() {
    if (!resolvedEditionId) return;
    setRegLoading(true);
    setRegError(null);
    try {
      const res = await fetch(
        `/api/championship-editions/${resolvedEditionId}/registrations`,
        { headers: authHeaders() },
      );
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      type RawReg = { id: string; athlete_id: string; team_id: string; registration_number: string | null; registered_at: string | null; notes: string | null; status: string };
      const data = await res.json() as RawReg[];

      const uniqueIds = [...new Set(data.map(r => r.athlete_id))];
      const nameMap: Record<string, string> = {};
      await Promise.all(
        uniqueIds.map(async (aid) => {
          try {
            const r = await fetch(`${API_BASE}/athletes/${aid}`);
            if (r.ok) {
              const a = await r.json() as { athlete: { name: string; nickname: string | null } };
              nameMap[aid] = a.athlete.nickname ?? a.athlete.name;
            }
          } catch { /* skip */ }
        }),
      );

      const teamNameMap = new Map<string, string>([
        ...allTeams.map((t): [string, string] => [t.id, t.name]),
        ...phases.flatMap(p => p.groups.flatMap(g => g.teams.map((t): [string, string] => [t.team_id, t.team_name]))),
      ]);

      const rows: RegRow[] = data.map(r => ({
        id: r.id,
        athlete_id: r.athlete_id,
        team_id: r.team_id,
        athlete_name: nameMap[r.athlete_id] ?? r.athlete_id.slice(0, 8) + "…",
        team_name: teamNameMap.get(r.team_id) ?? r.team_id.slice(0, 8) + "…",
        registration_number: r.registration_number,
        registered_at: r.registered_at,
        notes: r.notes,
        status: r.status,
      }));

      rows.sort((a, b) => a.team_name.localeCompare(b.team_name, "pt-BR") || a.athlete_name.localeCompare(b.athlete_name, "pt-BR"));
      setRegistrations(rows);
      setRegLoaded(true);
    } catch (e) {
      setRegError((e as Error).message);
    } finally {
      setRegLoading(false);
    }
  }

  async function handleApproveReg(regId: string) {
    if (!resolvedEditionId) return;
    setRegBusy(prev => ({ ...prev, [regId]: true }));
    try {
      const res = await fetch(
        `/api/championship-editions/${resolvedEditionId}/registrations/${regId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ status: "approved" }),
        },
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(d.detail ?? `Erro ${res.status}`);
      }
      setRegistrations(prev => prev.map(r => r.id === regId ? { ...r, status: "approved" } : r));
    } catch (e) {
      setRegError((e as Error).message);
    } finally {
      setRegBusy(prev => ({ ...prev, [regId]: false }));
    }
  }

  async function handleRejectReg(regId: string) {
    if (!resolvedEditionId) return;
    setRegBusy(prev => ({ ...prev, [regId]: true }));
    try {
      const res = await fetch(
        `/api/championship-editions/${resolvedEditionId}/registrations/${regId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ status: "rejected", notes: rejectNotes || null }),
        },
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(d.detail ?? `Erro ${res.status}`);
      }
      setRegistrations(prev => prev.map(r => r.id === regId ? { ...r, status: "rejected" } : r));
      setRejectingRegId(null);
      setRejectNotes("");
    } catch (e) {
      setRegError((e as Error).message);
    } finally {
      setRegBusy(prev => ({ ...prev, [regId]: false }));
    }
  }

  function switchToTab(tab: "estrutura" | "inscritos" | "rodadas") {
    setActiveTab(tab);
    if (tab === "inscritos" && !regLoaded && !regLoading) void loadRegistrations();
    if (tab === "rodadas" && !venuesLoaded) {
      fetch("/api/venues", { headers: authHeaders() })
        .then(r => r.json())
        .then((data: VenueOption[]) => { setVenues(data); setVenuesLoaded(true); })
        .catch(() => setVenuesLoaded(true));
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function fmtDate(d: string | null): string {
    if (!d) return "";
    const datePart = d.split("T")[0];
    const timePart = d.includes("T") ? d.split("T")[1]?.slice(0, 5) : null;
    const [y, m, day] = datePart.split("-");
    return timePart && timePart !== "00:00" ? `${day}/${m}/${y} ${timePart}` : `${day}/${m}/${y}`;
  }

  function teamsAvailableForGroup(groupId: string): TeamOption[] {
    const phase = phases.find(p => p.groups.some(g => g.id === groupId));
    if (!phase) return allTeams;
    const used = new Set(phase.groups.flatMap(g => g.teams.map(t => t.team_id)));
    return allTeams.filter(t => !used.has(t.id));
  }

  function openPhaseForm() {
    setPhaseOrder(String(phases.length + 1));
    setShowPhaseForm(true);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <main style={{ padding: "2rem 1.5rem", color: "var(--c-text)" }}>Carregando...</main>;

  if (error || !champ) {
    return (
      <main style={{ padding: "2rem 1.5rem" }}>
        <p style={{ color: "var(--c-negative)" }}>{error ?? "Campeonato não encontrado."}</p>
        <Link to="/admin/campeonatos" style={{ color: "var(--c-link)" }}>← Voltar</Link>
      </main>
    );
  }

  const filteredRegs = registrations
    .filter(r => !regFilterTeam || r.team_id === regFilterTeam)
    .filter(r => !regFilterStatus || r.status === regFilterStatus);

  const regPageCount = Math.ceil(filteredRegs.length / REG_PAGE_SIZE);
  const pagedRegs = filteredRegs.slice(regPage * REG_PAGE_SIZE, (regPage + 1) * REG_PAGE_SIZE);

  const teamStatMap: Record<string, { team_id: string; name: string; pending: number; approved: number; rejected: number; total: number }> = {};
  for (const r of registrations) {
    if (!teamStatMap[r.team_id]) {
      teamStatMap[r.team_id] = { team_id: r.team_id, name: r.team_name, pending: 0, approved: 0, rejected: 0, total: 0 };
    }
    const st = r.status as "pending" | "approved" | "rejected";
    teamStatMap[r.team_id][st]++;
    teamStatMap[r.team_id].total++;
  }
  const teamStats = Object.values(teamStatMap).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <>
      <header className="hero">
        <div className="hero__accent" />
        <div className="hero__inner">
          <Link to={id ? `/admin/campeonatos/${id}/edicoes` : "/admin/campeonatos"} className="back-link">← Edições</Link>
          <div className="hero__row">
            <div>
              <h1 className="page-title">{champ.name}</h1>
              {champ.nickname && <span className="page-subtitle">{champ.nickname}</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <div className="muted">
                <span className="badge">{champ.year}</span>
                {champ.level && <span className="badge">{LEVEL_LABEL[champ.level] ?? champ.level}</span>}
              </div>
              {editions.length === 0 && (
                <button
                  type="button"
                  onClick={handleDeleteChampionship}
                  disabled={deletingChampionship}
                  style={{ ...S.btnDanger, fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}
                  title="Excluir campeonato (sem edições)"
                >
                  {deletingChampionship ? "Excluindo..." : "🗑 Excluir campeonato"}
                </button>
              )}
            </div>
          </div>
          <div className="tab-bar">
            <button
              style={{ ...S.tab, ...(activeTab === "estrutura" ? S.tabActive : {}) }}
              onClick={() => switchToTab("estrutura")}
            >
              Estrutura
            </button>
            <button
              style={{ ...S.tab, ...(activeTab === "inscritos" ? S.tabActive : {}) }}
              onClick={() => switchToTab("inscritos")}
            >
              Atletas Inscritos{registrations.length > 0 ? ` (${registrations.length})` : ""}
            </button>
            <button
              style={{ ...S.tab, ...(activeTab === "rodadas" ? S.tabActive : {}) }}
              onClick={() => switchToTab("rodadas")}
            >
              Rodadas
            </button>
          </div>
        </div>
      </header>

      <main className="page-container">

        {/* ── Erro global de submit ─────────────────────────────────── */}
        {submitError && (
          <div className="form-error">
            <span>⚠ {submitError}</span>
            <button onClick={() => setSubmitError(null)} className="error-banner__close">×</button>
          </div>
        )}

        {/* ── FASES ────────────────────────────────────────────────── */}
        {activeTab === "estrutura" && (
        <>
          {/* Dados da Edição */}
          <section style={{ ...S.section, marginBottom: "1rem" }}>
            <div className="section-row">
              <h2 className="section-heading">Dados da Edição</h2>
            </div>
            <div className="card">
              <div className="form-field-group">
                <div >
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={editionStatus}
                    onChange={e => setEditionStatus(e.target.value)}
                  >
                    <option value="planned">Planejado</option>
                    <option value="ongoing">Em andamento</option>
                    <option value="finished">Encerrado</option>
                  </select>
                </div>
                <div >
                  <label className="form-label">Campeão</label>
                  <select
                    className="form-select"
                    value={editionChampionId}
                    onChange={e => setEditionChampionId(e.target.value)}
                  >
                    <option value="">— Sem campeão definido —</option>
                    {allTeams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div >
                  <label className="form-label">Vice-campeão</label>
                  <select
                    className="form-select"
                    value={editionRunnerUpId}
                    onChange={e => setEditionRunnerUpId(e.target.value)}
                  >
                    <option value="">— Sem vice definido —</option>
                    {allTeams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  onClick={handleSaveEditionInfo}
                  disabled={savingEdition}
                  className="btn btn-primary"
                >
                  {savingEdition ? "Salvando..." : "Salvar edição"}
                </button>
                {editionSaveOk && (
                  <span style={{ color: "var(--c-positive)", fontSize: "0.85rem" }}>✔ Salvo!</span>
                )}
                <button
                  type="button"
                  onClick={handleDeleteEdition}
                  disabled={deletingEdition}
                  style={{ ...S.btnDanger, fontSize: "0.82rem", padding: "0.35rem 0.75rem" }}
                  title="Excluir esta edição e todos os seus dados"
                >
                  {deletingEdition ? "Excluindo..." : "🗑 Excluir edição"}
                </button>
                {editionInfo?.champion_team_id && (
                  <span style={{ color: "var(--c-warning)", fontSize: "0.82rem", marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    🏆 {allTeams.find(t => t.id === editionInfo.champion_team_id)?.name}
                    {editionInfo.runner_up_team_id && (
                      <> · 🥈 {allTeams.find(t => t.id === editionInfo.runner_up_team_id)?.name}</>
                    )}
                    <button
                      type="button"
                      onClick={handleResetPodium}
                      disabled={resetingPodium}
                      style={{ background: "none", border: "1px solid #45475a", borderRadius: "4px", color: "#ffffff", fontSize: "0.75rem", cursor: "pointer", padding: "0.15rem 0.5rem", marginLeft: "0.25rem" }}
                      title="Resetar campeão e vice-campeão"
                    >
                      {resetingPodium ? "…" : "↺ Resetar"}
                    </button>
                  </span>
                )}
              </div>
              {editionClubs.length > 0 && (
                <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid #313244" }}>
                  <p style={{ fontSize: "0.8rem", color: "#ffffff", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Clubes participantes ({editionClubs.length})
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                    {editionClubs.map(c => (
                      <span key={c.id} style={{ background: "var(--c-border)", color: "var(--c-text)", borderRadius: "999px", padding: "0.2rem 0.7rem", fontSize: "0.82rem" }}>
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
          {/* Fases */}
          <section className="page-section">
            <div className="section-row">
              <h2 className="section-heading">Fases</h2>
              <button className="btn btn-success" onClick={openPhaseForm}>
                {showPhaseForm ? "Cancelar" : "+ Nova fase"}
              </button>
            </div>

          {showPhaseForm && (
            <div className="card">
              <form onSubmit={handleAddPhase}>
                <div className="form-field-group">
                  <input
                    className="form-input" style={{ flex: 2 }}
                    placeholder="Nome da fase (ex: Fase de Grupos)"
                    value={phaseName}
                    onChange={e => setPhaseName(e.target.value)}
                    required
                    autoFocus
                  />
                  <input
                    type="number"
                    className="form-input" style={{ width: "90px" }}
                    placeholder="Ordem"
                    value={phaseOrder}
                    onChange={e => setPhaseOrder(e.target.value)}
                    min={1}
                    title="Ordem de exibição (1 = primeiro)"
                  />
                </div>
                <div style={{ ...S.inlineFormRow, marginTop: "0.5rem" }}>
                  <select
                    className="form-select" style={{ flex: 1 }}
                    value={phaseType}
                    onChange={e => setPhaseType(e.target.value)}
                  >
                    <option value="round_robin">Pontos Corridos</option>
                    <option value="knockout">Mata-Mata</option>
                  </select>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>Salvar</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowPhaseForm(false)}>Cancelar</button>
                </div>
              </form>
            </div>
          )}

          {phases.length === 0 && !showPhaseForm && (
            <p className="muted">Nenhuma fase cadastrada.</p>
          )}

          {phases.map(phase => {
            const isKO = phase.phase_type === "knockout";
            const isGroupFormOpen = groupFormPhase === phase.id;

            return (
              <div key={phase.id} className="card">
                {/* Phase header */}
                <div style={{ ...S.phaseHeader, ...(isKO ? S.phaseHeaderKO : S.phaseHeaderRR) }}>
                  <div className="toolbar">
                    <span className="muted">#{phase.order}</span>
                    <span className="section-heading">{phase.name}</span>
                    <span style={{ ...S.phaseBadge, ...(isKO ? S.phaseBadgeKO : S.phaseBadgeRR) }}>
                      {PHASE_TYPE_LABEL[phase.phase_type] ?? phase.phase_type}
                    </span>
                    <span
                      style={phase.status === "finalizado" ? S.phaseStatusFinalizado : S.phaseStatusEmAndamento}
                      title="Clique para alterar o status"
                      onClick={() => handleTogglePhaseStatus(phase.id, phase.status)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && handleTogglePhaseStatus(phase.id, phase.status)}
                    >
                      {phase.status === "finalizado" ? "Finalizado" : "Em andamento"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                    <button
                      className="btn-sm btn-success btn"
                      onClick={() => {
                        setGroupName("");
                        setGroupFormPhase(isGroupFormOpen ? null : phase.id);
                        setTeamFormGroup(null);
                      }}
                    >
                      {isGroupFormOpen ? "Cancelar" : "+ Grupo"}
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDeletePhase(phase.id)}
                      disabled={deletingPhaseId === phase.id}
                      title="Excluir fase"
                    >
                      {deletingPhaseId === phase.id ? "..." : "🗑"}
                    </button>
                  </div>
                </div>

                {/* Phase body */}
                <div className="form-body">
                  {isGroupFormOpen && (
                    <form
                      onSubmit={(e) => handleAddGroup(phase.id, e)}
                      style={{ ...S.inlineForm, marginBottom: "0.75rem" }}
                    >
                      <input
                        className="form-input" style={{ flex: 1 }}
                        placeholder="Nome do grupo (ex: Grupo A, QF1)"
                        value={groupName}
                        onChange={e => setGroupName(e.target.value)}
                        required
                        autoFocus
                      />
                      <button type="submit" className="btn btn-primary" disabled={submitting}>Salvar</button>
                    </form>
                  )}

                  {phase.groups.length === 0 && !isGroupFormOpen && (
                    <p className="muted">Nenhum grupo nesta fase. Use "+ Grupo" para adicionar.</p>
                  )}

                  <div className="form-field-group">
                    {phase.groups.map(group => {
                      const available = teamsAvailableForGroup(group.id);
                      const isTeamFormOpen = teamFormGroup === group.id;

                      return (
                        <div key={group.id} className="card">
                          {/* Group header */}
                          <div className="toolbar">
                            <span className="section-heading">{group.name}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <span className="muted">
                                {group.teams.length} time{group.teams.length !== 1 ? "s" : ""}
                              </span>
                              <button
                                className="btn btn-danger"
                                onClick={() => handleDeleteGroup(group.id, phase.id)}
                                disabled={deletingGroupId === group.id}
                                title="Excluir grupo"
                              >
                                {deletingGroupId === group.id ? "..." : "🗑"}
                              </button>
                            </div>
                          </div>

                          {/* Teams list */}
                          <div className="data-list">
                            {group.teams.length === 0
                              ? <span className="muted">Sem times</span>
                              : group.teams.map(t => {
                                const tKey = `${group.id}:${t.team_id}`;
                                return (
                                  <span key={t.team_id} style={{ ...S.teamChip, display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                                    {t.team_name}
                                    <button
                                      onClick={() => handleRemoveTeamFromGroup(group.id, t.team_id, phase.id)}
                                      disabled={removingTeamKey === tKey}
                                      title="Remover do grupo"
                                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-negative)", fontSize: "0.75rem", padding: 0, lineHeight: 1 }}
                                    >
                                      {removingTeamKey === tKey ? "…" : "×"}
                                    </button>
                                  </span>
                                );
                              })
                            }
                          </div>

                          {/* Add team form / button */}
                          {isTeamFormOpen ? (
                            <form
                              onSubmit={(e) => handleAddTeam(group.id, e)}
                              className="form-body"
                            >
                              <div className="filter-bar">
                                <div >
                                  <span className="form-label">Liga</span>
                                  <span className="form-select">
                                    {champ?.league_id ? (leagueName ?? "Carregando…") : "Sem liga"}
                                  </span>
                                </div>
                                <div >
                                  <span className="form-label">Categoria</span>
                                  <span className="form-select">
                                    {champ?.level ? (LEVEL_LABEL[champ.level] ?? champ.level) : "Sem categoria"}
                                  </span>
                                </div>
                              </div>
                              <div className="form-field-group">
                                <select
                                  className="form-select" style={{ flex: 1, fontSize: "0.8rem", padding: "0.35rem 0.5rem" }}
                                  value={selectedTeamId}
                                  onChange={e => setSelectedTeamId(e.target.value)}
                                  required
                                  autoFocus
                                >
                                  <option value="">Selecionar time</option>
                                  {available.map(t => (
                                    <option key={t.id} value={t.id}>
                                      {t.name}
                                    </option>
                                  ))}
                                </select>
                                <button type="submit" className="btn-sm btn-primary btn" disabled={submitting || !selectedTeamId}>✓</button>
                                <button
                                  type="button"
                                  className="btn-sm btn-secondary btn"
                                  onClick={() => { setTeamFormGroup(null); setSelectedTeamId(""); }}
                                >×</button>
                              </div>
                            </form>
                          ) : (
                            <button
                              style={{
                                ...S.btnAddTeam,
                                ...(available.length === 0 ? S.btnAddTeamDisabled : {}),
                              }}
                              onClick={() => {
                                setSelectedTeamId("");
                                setTeamFormGroup(group.id);
                                setGroupFormPhase(null);
                              }}
                              disabled={available.length === 0}
                              title={available.length === 0 ? "Todos os times compatíveis já foram adicionados nesta fase" : undefined}
                            >
                              + time
                            </button>
                          )}

                          {/* Partidas */}
                          <div  />
                          <div className="toolbar">
                            <span className="section-heading">Partidas</span>
                            {group.matches.length > 0 && (
                              <span style={{ color: "#ffffff", fontSize: "0.72rem" }}>
                                {group.matches.length}
                              </span>
                            )}
                          </div>
                          <Link
                            to={`/admin/campeonatos/${id}/grupos/${group.id}/partidas?edicao=${resolvedEditionId ?? ""}&grupo=${encodeURIComponent(group.name)}&fase=${encodeURIComponent(phase.name)}&champ=${encodeURIComponent(champ.name)}`}
                            className="btn btn-primary"
                          >
                            {group.matches.length > 0
                              ? `Gerenciar partidas (${group.matches.length}) →`
                              : "Gerenciar partidas →"}
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          </section>
        </>
        )}

        {/* ── ATLETAS INSCRITOS ─────────────────────────────────────── */}
        {activeTab === "inscritos" && (
          <section className="page-section">
            <div className="section-row">
              <h2 className="section-heading">Atletas Inscritos</h2>
              <button className="btn btn-success" onClick={() => void loadRegistrations()}>
                ↻ Recarregar
              </button>
            </div>

            {regError && (
              <div className="form-error">
                <span>⚠ {regError}</span>
                <button onClick={() => setRegError(null)} className="error-banner__close">×</button>
              </div>
            )}

            {regLoading && <p className="muted">Carregando inscrições...</p>}

            {!regLoading && !resolvedEditionId && (
              <p style={{ ...S.emptyHint, color: "var(--c-negative)" }}>
                Nenhuma edição encontrada para este campeonato.
              </p>
            )}

            {!regLoading && resolvedEditionId && regLoaded && registrations.length === 0 && (
              <p className="muted">Nenhuma inscrição nesta edição.</p>
            )}

            {!regLoading && registrations.length > 0 && (
              <>
                <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                  <select
                    value={regFilterTeam}
                    onChange={e => { setRegFilterTeam(e.target.value); setRegPage(0); }}
                    className="form-select" style={{ minWidth: "180px" }}
                  >
                    <option value="">Todos os times</option>
                    {teamStats.map(tc => (
                      <option key={tc.team_id} value={tc.team_id}>
                        {tc.name} ({tc.total})
                      </option>
                    ))}
                  </select>
                  <select
                    value={regFilterStatus}
                    onChange={e => { setRegFilterStatus(e.target.value); setRegPage(0); }}
                    className="form-select" style={{ minWidth: "160px" }}
                  >
                    <option value="">Todos os status</option>
                    <option value="pending">Pendente</option>
                    <option value="approved">Aprovado</option>
                    <option value="rejected">Rejeitado</option>
                  </select>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                  {teamStats.map(tc => (
                    <span key={tc.team_id} style={{ ...S.teamChip, padding: "0.35rem 0.75rem" }}>
                      {tc.name} · {tc.total} inscrito{tc.total !== 1 ? "s" : ""}
                      {tc.pending > 0 && (
                        <span style={{ color: "var(--c-warning)" }}> · {tc.pending}↑</span>
                      )}
                      {tc.approved > 0 && (
                        <span style={{ color: "var(--c-positive)" }}> · {tc.approved}✓</span>
                      )}
                    </span>
                  ))}
                </div>

                {filteredRegs.length === 0 ? (
                  <p className="muted">Nenhuma inscrição corresponde aos filtros.</p>
                ) : (
                  <div style={{ ...S.inlineFormCard, padding: 0, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                      <thead>
                        <tr>
                          <th >Atleta</th>
                          <th >Time</th>
                          <th ># Insc.</th>
                          <th >Data</th>
                          <th >Status</th>
                          <th >Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedRegs.map(r => (
                          <React.Fragment key={r.id}>
                            <tr style={{ borderBottom: "1px solid #313244" }}>
                              <td >{r.athlete_name}</td>
                              <td style={{ ...S.regTd, color: "#ffffff" }}>{r.team_name}</td>
                              <td style={{ ...S.regTd, fontFamily: "monospace", color: "#ffffff" }}>
                                {r.registration_number ?? "—"}
                              </td>
                              <td style={{ ...S.regTd, color: "#ffffff" }}>
                                {r.registered_at ? fmtDate(r.registered_at) : "—"}
                              </td>
                              <td >
                                <span style={regBadgeStyle(r.status)}>
                                  {STATUS_LABEL[r.status] ?? r.status}
                                </span>
                              </td>
                              <td >
                                <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                                  {r.status !== "approved" && (
                                    <button
                                      style={{ ...S.btnSaveSmall, fontSize: "0.75rem", padding: "0.2rem 0.55rem" }}
                                      onClick={() => void handleApproveReg(r.id)}
                                      disabled={!!regBusy[r.id]}
                                      title="Aprovar inscrição"
                                    >
                                      ✓
                                    </button>
                                  )}
                                  {r.status !== "rejected" && (
                                    <button
                                      style={{ background: "none", border: "1px solid #f38ba8", borderRadius: "4px", color: "var(--c-negative)", fontSize: "0.75rem", cursor: "pointer", padding: "0.2rem 0.55rem" }}
                                      onClick={() => {
                                        setRejectingRegId(rejectingRegId === r.id ? null : r.id);
                                        setRejectNotes("");
                                      }}
                                      disabled={!!regBusy[r.id]}
                                      title="Rejeitar inscrição"
                                    >
                                      ✗
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {rejectingRegId === r.id && (
                              <tr style={{ backgroundColor: "#1a1014", borderBottom: "1px solid #313244" }}>
                                <td colSpan={6} style={{ padding: "0.6rem 1rem" }}>
                                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                                    <input
                                      className="form-input" style={{ flex: 1, minWidth: "200px", fontSize: "0.8rem" }}
                                      placeholder="Motivo da rejeição (opcional)"
                                      value={rejectNotes}
                                      onChange={e => setRejectNotes(e.target.value)}
                                      autoFocus
                                    />
                                    <button
                                      style={{ ...S.btnSaveSmall, backgroundColor: "var(--c-negative)", color: "var(--c-brand)", fontSize: "0.8rem" }}
                                      onClick={() => void handleRejectReg(r.id)}
                                      disabled={!!regBusy[r.id]}
                                    >
                                      Confirmar
                                    </button>
                                    <button
                                      className="btn-sm btn-secondary btn"
                                      onClick={() => { setRejectingRegId(null); setRejectNotes(""); }}
                                    >
                                      ×
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {regPageCount > 1 && (
                  <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginTop: "0.75rem", flexWrap: "wrap" }}>
                    <button
                      style={{ ...S.btnSaveSmall, padding: "0.25rem 0.7rem", opacity: regPage === 0 ? 0.4 : 1 }}
                      disabled={regPage === 0}
                      onClick={() => setRegPage(p => p - 1)}
                    >←</button>
                    <span style={{ color: "#ffffff", fontSize: "0.82rem" }}>
                      {regPage + 1} / {regPageCount} ({filteredRegs.length} atletas)
                    </span>
                    <button
                      style={{ ...S.btnSaveSmall, padding: "0.25rem 0.7rem", opacity: regPage >= regPageCount - 1 ? 0.4 : 1 }}
                      disabled={regPage >= regPageCount - 1}
                      onClick={() => setRegPage(p => p + 1)}
                    >→</button>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* ── RODADAS ──────────────────────────────────────────────── */}
        {activeTab === "rodadas" && (
          <section className="page-section">
            <div className="section-row">
              <h2 className="section-heading">Criar Rodada em Lote</h2>
            </div>

            {submitError && (
              <div className="form-error">
                <span>⚠ {submitError}</span>
                <button onClick={() => setSubmitError(null)} className="error-banner__close">×</button>
              </div>
            )}

            {/* Fase + Grupo */}
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <label style={{ color: "#ffffff", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Fase</label>
                <select
                  value={roundPhaseId}
                  onChange={e => { setRoundPhaseId(e.target.value); setRoundGroupId(""); setRoundRows([{ home_team_id: "", away_team_id: "", match_date: "", venue_id: "" }]); setRoundResult(null); }}
                  className="form-input"
                >
                  <option value="">Selecione uma fase</option>
                  {phases.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <label style={{ color: "#ffffff", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Grupo</label>
                <select
                  value={roundGroupId}
                  onChange={e => { setRoundGroupId(e.target.value); setRoundRows([{ home_team_id: "", away_team_id: "", match_date: "", venue_id: "" }]); setRoundResult(null); }}
                  className="form-input"
                  disabled={!roundPhaseId}
                >
                  <option value="">Selecione um grupo</option>
                  {(phases.find(p => p.id === roundPhaseId)?.groups ?? []).map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <label style={{ color: "#ffffff", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Nº da Rodada</label>
                <input
                  type="number"
                  min="1"
                  value={roundNumber}
                  onChange={e => setRoundNumber(e.target.value)}
                  className="form-input" style={{ width: "6rem" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <label style={{ color: "#ffffff", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Data/Hora Padrão</label>
                <input
                  type="datetime-local"
                  value={roundDefaultDate}
                  onChange={e => setRoundDefaultDate(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            {/* Partidas */}
            {roundGroupId && (() => {
              const group = phases.flatMap(p => p.groups).find(g => g.id === roundGroupId);
              const groupTeams = group?.teams ?? [];
              return (
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span style={{ color: "var(--c-text)", fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Partidas ({roundRows.length})
                    </span>
                    <button
                      className="btn-sm btn-success btn"
                      onClick={() => setRoundRows(prev => [...prev, { home_team_id: "", away_team_id: "", match_date: "", venue_id: "" }])}
                    >
                      + Partida
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {roundRows.map((row, idx) => (
                      <div key={idx} style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", backgroundColor: "var(--c-brand)", border: "1px solid #313244", borderRadius: "6px", padding: "0.6rem 0.75rem" }}>
                        <span style={{ color: "#ffffff", fontSize: "0.75rem", fontFamily: "monospace", minWidth: "1.5rem" }}>#{idx + 1}</span>
                        <select
                          value={row.home_team_id}
                          onChange={e => setRoundRows(prev => prev.map((r, i) => i === idx ? { ...r, home_team_id: e.target.value } : r))}
                          style={{ ...S.inputSmall, flex: 1, minWidth: "140px" }}
                        >
                          <option value="">Mandante</option>
                          {groupTeams.map(t => <option key={t.team_id} value={t.team_id}>{t.team_name}</option>)}
                        </select>
                        <span style={{ color: "#ffffff", fontSize: "0.8rem" }}>×</span>
                        <select
                          value={row.away_team_id}
                          onChange={e => setRoundRows(prev => prev.map((r, i) => i === idx ? { ...r, away_team_id: e.target.value } : r))}
                          style={{ ...S.inputSmall, flex: 1, minWidth: "140px" }}
                        >
                          <option value="">Visitante</option>
                          {groupTeams.map(t => <option key={t.team_id} value={t.team_id}>{t.team_name}</option>)}
                        </select>
                        <input
                          type="datetime-local"
                          value={row.match_date}
                          onChange={e => setRoundRows(prev => prev.map((r, i) => i === idx ? { ...r, match_date: e.target.value } : r))}
                          style={{ ...S.inputSmall, width: "9rem" }}
                          placeholder="Data (usa padrão se vazio)"
                        />
                        <select
                          value={row.venue_id}
                          onChange={e => setRoundRows(prev => prev.map((r, i) => i === idx ? { ...r, venue_id: e.target.value } : r))}
                          style={{ ...S.inputSmall, minWidth: "120px" }}
                        >
                          <option value="">Estádio (opcional)</option>
                          {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                        <button
                          onClick={() => setRoundRows(prev => prev.filter((_, i) => i !== idx))}
                          style={{ background: "none", border: "none", color: "var(--c-negative)", cursor: "pointer", fontSize: "0.9rem", padding: "0 0.2rem", lineHeight: 1 }}
                          title="Remover"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem" }}>
                    <button className="btn btn-primary" onClick={() => void handleSaveRound()} disabled={savingRound}>
                      {savingRound ? "Salvando..." : "Salvar Rodada"}
                    </button>
                    <button className="btn btn-secondary" onClick={() => { setRoundRows([{ home_team_id: "", away_team_id: "", match_date: "", venue_id: "" }]); setRoundResult(null); setSubmitError(null); }}>
                      Limpar
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Resultado */}
            {roundResult && (
              <div style={{ backgroundColor: "var(--c-brand)", border: "1px solid #313244", borderRadius: "8px", padding: "1rem", marginTop: "1rem" }}>
                <div style={{ display: "flex", gap: "1.5rem", marginBottom: "0.75rem" }}>
                  <span style={{ color: "var(--c-positive)", fontWeight: 700, fontSize: "0.875rem" }}>✓ {roundResult.created} criadas</span>
                  {roundResult.errors > 0 && <span style={{ color: "var(--c-negative)", fontWeight: 700, fontSize: "0.875rem" }}>✗ {roundResult.errors} erros</span>}
                  <span style={{ color: "#ffffff", fontSize: "0.875rem" }}>Total: {roundResult.total}</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr>
                      {["#", "Mandante", "Visitante", "Status"].map(h => (
                        <th key={h} style={{ padding: "0.4rem 0.75rem", textAlign: "left", color: "#ffffff", fontWeight: 700, textTransform: "uppercase", fontSize: "0.72rem", borderBottom: "1px solid #313244" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {roundResult.results.map(r => {
                      const group = phases.flatMap(p => p.groups).find(g => g.id === roundGroupId);
                      const teamName = (id: string) => group?.teams.find(t => t.team_id === id)?.team_name ?? id.slice(0, 8);
                      return (
                        <tr key={r.row} style={{ backgroundColor: r.success ? "#1a2e1f" : "#2a1a1f" }}>
                          <td style={{ padding: "0.4rem 0.75rem", color: "#ffffff" }}>{r.row + 1}</td>
                          <td style={{ padding: "0.4rem 0.75rem", color: "var(--c-text)" }}>{teamName(r.home_team_id)}</td>
                          <td style={{ padding: "0.4rem 0.75rem", color: "var(--c-text)" }}>{teamName(r.away_team_id)}</td>
                          <td style={{ padding: "0.4rem 0.75rem" }}>
                            {r.success
                              ? <span style={{ color: "var(--c-positive)", fontWeight: 600 }}>✓ OK</span>
                              : <span style={{ color: "var(--c-negative)" }}>✗ {r.error}</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  // Header
  hero: { backgroundColor: "#18265b", borderBottom: "1px solid #313244", position: "relative", overflow: "hidden" },
  heroAccent: { position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #cba6f7, #89b4fa)" },
  heroInner: { maxWidth: "1100px", margin: "0 auto", padding: "1.5rem 1.5rem 1.25rem" },
  back: { display: "inline-block", color: "#89b4fa", textDecoration: "none", fontSize: "0.85rem", marginBottom: "0.75rem" },
  heroRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" },
  title: { fontSize: "1.5rem", fontWeight: 700, color: "#cdd6f4", margin: 0 },
  subtitle: { color: "#cdd6f4", fontSize: "0.875rem", display: "block", marginTop: "0.2rem" },
  champMeta: { display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" },
  metaBadge: { backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "4px", color: "#89b4fa", padding: "0.25rem 0.6rem", fontSize: "0.8rem", fontWeight: 600 },
  metaTag: { backgroundColor: "#201a2a", border: "1px solid #4a2a6a", borderRadius: "4px", color: "#cba6f7", padding: "0.25rem 0.6rem", fontSize: "0.8rem", fontWeight: 600 },

  // Layout
  page: { maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.5rem 4rem" },
  section: { marginBottom: "2.5rem" },
  sectionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" },
  sectionTitle: { fontSize: "0.85rem", fontWeight: 700, color: "#cdd6f4", margin: 0, textTransform: "uppercase", letterSpacing: "0.07em" },

  // Error banner
  globalError: { display: "flex", alignItems: "center", justifyContent: "space-between", color: "#f38ba8", backgroundColor: "#2a1a1f", border: "1px solid #5a2a30", borderRadius: "6px", padding: "0.75rem 1rem", fontSize: "0.875rem", marginBottom: "1.5rem" },
  errClose: { background: "none", border: "none", color: "#f38ba8", cursor: "pointer", fontSize: "1.2rem", padding: "0 0.25rem", lineHeight: 1 },

  // Buttons
  btnAdd: { backgroundColor: "transparent", border: "1px solid #cba6f7", borderRadius: "6px", color: "#cba6f7", fontSize: "0.825rem", fontWeight: 600, padding: "0.35rem 0.9rem", cursor: "pointer" },
  btnAddSmall: { backgroundColor: "transparent", border: "1px solid #89b4fa", borderRadius: "5px", color: "#89b4fa", fontSize: "0.775rem", fontWeight: 600, padding: "0.25rem 0.65rem", cursor: "pointer", whiteSpace: "nowrap" },
  btnSave: { backgroundColor: "#a6e3a1", border: "none", borderRadius: "6px", color: "#11111b", fontSize: "0.875rem", fontWeight: 700, padding: "0.45rem 1rem", cursor: "pointer", whiteSpace: "nowrap" },
  btnSaveSmall: { backgroundColor: "#a6e3a1", border: "none", borderRadius: "4px", color: "#11111b", fontSize: "0.875rem", fontWeight: 700, padding: "0.35rem 0.6rem", cursor: "pointer" },
  btnDanger: { backgroundColor: "#f38ba8", border: "none", borderRadius: "6px", color: "#11111b", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" } as React.CSSProperties,
  btnCancel: { backgroundColor: "transparent", border: "1px solid #313244", borderRadius: "6px", color: "#cdd6f4", fontSize: "0.875rem", padding: "0.45rem 0.85rem", cursor: "pointer", whiteSpace: "nowrap" },
  btnCancelSmall: { backgroundColor: "transparent", border: "1px solid #313244", borderRadius: "4px", color: "#cdd6f4", fontSize: "0.875rem", padding: "0.35rem 0.5rem", cursor: "pointer" },
  btnAddTeam: { background: "none", border: "1px dashed #ffffff", borderRadius: "4px", color: "#cdd6f4", fontSize: "0.82rem", padding: "0.3rem 0.5rem", cursor: "pointer", marginTop: "0.5rem", width: "100%" },
  btnAddTeamDisabled: { opacity: 0.4, cursor: "default" },

  // Forms
  inlineForm: { display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" },
  inlineFormCard: { backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "8px", padding: "1rem", marginBottom: "0.75rem" },
  inlineFormRow: { display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" },
  addTeamForm: { display: "flex", flexDirection: "column" as const, gap: "0.4rem", marginTop: "0.5rem" },
  addTeamFilters: { display: "flex", gap: "0.75rem", flexWrap: "wrap" as const },
  addTeamFilterItem: { display: "flex", flexDirection: "column" as const, gap: "0.15rem" },
  addTeamFilterLabel: { fontSize: "0.65rem", fontWeight: 700, color: "#ffffff", textTransform: "uppercase" as const, letterSpacing: "0.04em" },
  addTeamFilterValue: { fontSize: "0.78rem", color: "#cdd6f4", backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "4px", padding: "0.2rem 0.5rem" },
  addTeamRow: { display: "flex", alignItems: "center", gap: "0.3rem" },

  // Inputs
  input: { backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "6px", color: "#cdd6f4", fontSize: "0.875rem", padding: "0.5rem 0.75rem", outline: "none", boxSizing: "border-box" },
  inputSmall: { backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "6px", color: "#cdd6f4", fontSize: "0.8rem", padding: "0.35rem 0.55rem", outline: "none", boxSizing: "border-box" },
  select: { cursor: "pointer", appearance: "auto" },

  // Misc
  emptyHint: { color: "#cdd6f4", fontSize: "0.85rem", fontStyle: "italic", margin: "0.25rem 0" },

  // Divisions strip
  chipRow: { display: "flex", flexWrap: "wrap", gap: "0.5rem" },
  divChip: { backgroundColor: "#18265b", border: "1px solid #cba6f7", borderRadius: "20px", color: "#cba6f7", padding: "0.3rem 0.9rem", fontSize: "0.85rem", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "0.4rem" },
  chipOrder: { color: "#cdd6f4", fontSize: "0.72rem" },

  // Phase cards
  phaseCard: { backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "10px", marginBottom: "1rem", overflow: "hidden" },
  phaseHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.7rem 1rem", borderBottom: "1px solid #313244" },
  phaseHeaderRR: { backgroundColor: "#161b2a" },
  phaseHeaderKO: { backgroundColor: "#211419" },
  phaseHeaderLeft: { display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" },
  phaseOrder: { color: "#cdd6f4", fontSize: "0.78rem", fontFamily: "monospace" },
  phaseName: { color: "#cdd6f4", fontWeight: 600, fontSize: "0.9rem" },
  phaseBadge: { borderRadius: "4px", padding: "0.15rem 0.5rem", fontSize: "0.72rem", fontWeight: 600 },
  phaseBadgeRR: { backgroundColor: "#1a2a3a", color: "#89b4fa", border: "1px solid #2a4a6a" },
  phaseBadgeKO: { backgroundColor: "#2a1a1f", color: "#f38ba8", border: "1px solid #5a2a30" },

  phaseStatusEmAndamento: { borderRadius: "4px", padding: "0.15rem 0.5rem", fontSize: "0.72rem", fontWeight: 600, backgroundColor: "#1a2e1f", color: "#a6e3a1", border: "1px solid #2a4a2f", cursor: "pointer" },
  phaseStatusFinalizado: { borderRadius: "4px", padding: "0.15rem 0.5rem", fontSize: "0.8rem", fontWeight: 600, backgroundColor: "#18265b", color: "#cdd6f4", border: "1px solid #45475a", cursor: "pointer" },

  phaseBody: { padding: "0.85rem 1rem" },

  // Groups grid
  groupsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.65rem" },
  groupCard: { backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "8px", padding: "0.7rem" },
  groupHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" },
  groupName: { color: "#cdd6f4", fontWeight: 600, fontSize: "0.875rem" },
  groupCount: { color: "#cdd6f4", fontSize: "0.72rem" },

  // Teams
  teamsList: { display: "flex", flexWrap: "wrap", gap: "0.3rem", minHeight: "1.5rem" },
  teamChip: { backgroundColor: "#18265b", border: "1px solid #45475a", borderRadius: "4px", color: "#cdd6f4", padding: "0.15rem 0.45rem", fontSize: "0.75rem" },
  emptyTeams: { color: "#cdd6f4", fontSize: "0.75rem", fontStyle: "italic" },

  // Matches
  matchDivider: { borderTop: "1px solid #313244", margin: "0.6rem 0 0.4rem" },
  matchSectionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" },
  matchSectionTitle: { color: "#cdd6f4", fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" },
  btnManageMatches: { display: "block", marginTop: "0.4rem", textAlign: "center" as const, textDecoration: "none", background: "none", border: "1px solid #45475a", borderRadius: "5px", color: "#89b4fa", fontSize: "0.78rem", fontWeight: 600, padding: "0.35rem 0.5rem", cursor: "pointer" },
  btnDeleteGroup: { background: "none", border: "none", color: "#f38ba8", fontSize: "0.75rem", cursor: "pointer", padding: "0 0.1rem", lineHeight: 1, opacity: 0.7 },
  btnDeletePhase: { background: "none", border: "none", color: "#f38ba8", fontSize: "0.8rem", cursor: "pointer", padding: "0 0.15rem", lineHeight: 1, opacity: 0.8 },
  matchList: { display: "flex", flexDirection: "column", gap: "0.2rem", marginBottom: "0.25rem" },
  matchRow: { display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.73rem", overflow: "hidden" },
  matchRoundLabel: { color: "#cdd6f4", fontFamily: "monospace", fontSize: "0.68rem", flexShrink: 0 },
  matchVs: { color: "#cdd6f4", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  matchScore: { color: "#a6e3a1", fontWeight: 700, fontFamily: "monospace", fontSize: "0.73rem", flexShrink: 0 },
  matchDateLabel: { color: "#cdd6f4", fontSize: "0.68rem", flexShrink: 0 },
  matchForm: { marginTop: "0.4rem" },
  // Tabs
  editionCard: { backgroundColor: "#18265b", border: "1px solid #313244", borderRadius: "8px", padding: "1rem 1.25rem" },
  editionRow: { display: "flex", flexWrap: "wrap" as const, gap: "1.25rem", marginBottom: "1rem" },
  editionField: { display: "flex", flexDirection: "column" as const, gap: "0.4rem", flex: 1, minWidth: "180px" },
  editionLabel: { fontSize: "0.78rem", fontWeight: 700, color: "#cdd6f4", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  editionActions: { display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" as const },
  tabBar: { display: "flex", gap: "0", marginTop: "1.25rem", borderBottom: "1px solid #313244" },
  tab: { background: "none", border: "none", color: "#ffffff", fontSize: "0.875rem", fontWeight: 500, padding: "0.5rem 1.1rem 0.6rem", cursor: "pointer", borderBottom: "2px solid transparent", marginBottom: "-1px" },
  tabActive: { color: "#cba6f7", borderBottom: "2px solid #cba6f7", fontWeight: 700 },
  // Registration table
  regTh: { padding: "0.6rem 1rem", textAlign: "left", color: "#ffffff", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #313244", backgroundColor: "#18265b", whiteSpace: "nowrap" } as React.CSSProperties,
  regTd: { padding: "0.65rem 1rem", color: "#cdd6f4", fontSize: "0.875rem", verticalAlign: "middle" } as React.CSSProperties,
};

function regBadgeStyle(status: string): React.CSSProperties {
  const bg = status === "approved" ? "#a6e3a1" : status === "rejected" ? "#f38ba8" : "#f9e2af";
  return { display: "inline-block", padding: "0.15rem 0.5rem", borderRadius: "4px",
    fontSize: "0.75rem", fontWeight: 600, backgroundColor: bg, color: "#18265b" };
}
