import type { Championship } from "@domain/entities/Championship";
import { authHeaders } from "../authHeaders";
import type { ChampionshipDetail, GroupDetail, PhaseDetail, SiblingEdition, StandingEntry, TopScorerItem } from "@domain/entities/ChampionshipDetail";
import type { CreateChampionshipPayload, ChampionshipRepository } from "@domain/repositories/ChampionshipRepository";

export class ApiChampionshipRepository implements ChampionshipRepository {
  constructor(private readonly baseUrl: string) {}

  private _standingsByGroupId = new Map<string, StandingEntry[]>();

  async listAll(): Promise<Championship[]> {
    const [champsResp, citiesResp, sportsResp, teamsResp] = await Promise.all([
      fetch(`${this.baseUrl}/championships`),
      fetch(`${this.baseUrl}/cities`),
      fetch(`${this.baseUrl}/sports`),
      fetch(`${this.baseUrl}/teams`),
    ]);
    if (!champsResp.ok) {
      throw new Error(`Falha ao buscar campeonatos: ${champsResp.status}`);
    }
    type ApiChamp = {
      id: string; name: string; nickname: string | null;
      city_id: string; sport_id: string;
      scope: string; level: string | null; league_id: string | null;
      division: string | null;
    };
    type ApiEdition = {
      id: string; championship_id: string; year: number;
      status: string;
      champion_team_id: string | null; runner_up_team_id: string | null;
    };
    const champs = await champsResp.json() as ApiChamp[];
    const cityMap = new Map<string, string>();
    if (citiesResp.ok) {
      const cities = await citiesResp.json() as Array<{ id: string; name: string }>;
      for (const c of cities) cityMap.set(c.id, c.name);
    }
    const sportMap = new Map<string, string>();
    if (sportsResp.ok) {
      const sports = await sportsResp.json() as Array<{ id: string; name: string }>;
      for (const s of sports) sportMap.set(s.id, s.name);
    }
    const teamNameMap = new Map<string, string>();
    if (teamsResp.ok) {
      const teams = await teamsResp.json() as Array<{ id: string; name: string }>;
      for (const t of teams) teamNameMap.set(t.id, t.name);
    }

    // Fetch editions for all championships in parallel
    const editionResults = await Promise.all(
      champs.map((c) =>
        fetch(`${this.baseUrl}/championships/${c.id}/editions`)
          .then((r) => r.ok ? r.json() as Promise<ApiEdition[]> : Promise.resolve([] as ApiEdition[]))
          .catch(() => [] as ApiEdition[])
      )
    );

    // Flatten: one Championship item per edition (all sharing the same series id)
    const result: Championship[] = [];
    for (let i = 0; i < champs.length; i++) {
      const c = champs[i];
      const editions = editionResults[i] as ApiEdition[];
      const base = {
        id: c.id,
        name: c.name,
        nickname: c.nickname,
        city_id: c.city_id,
        city_name: cityMap.get(c.city_id) ?? "–",
        sport_id: c.sport_id,
        sport_name: sportMap.get(c.sport_id) ?? "–",
        scope: c.scope,
        level: c.level,
        league_id: c.league_id ?? null,
        division: c.division ?? null,
      };
      if (editions.length === 0) {
        result.push({ ...base, edition_id: null, year: 0, champion_team_id: null, runner_up_team_id: null, champion_team_name: null, runner_up_team_name: null });
      } else {
        for (const edition of editions) {
          result.push({
            ...base,
            edition_id: edition.id,
            year: edition.year,
            champion_team_id: edition.champion_team_id ?? null,
            runner_up_team_id: edition.runner_up_team_id ?? null,
            champion_team_name: edition.champion_team_id ? (teamNameMap.get(edition.champion_team_id) ?? null) : null,
            runner_up_team_name: edition.runner_up_team_id ? (teamNameMap.get(edition.runner_up_team_id) ?? null) : null,
          });
        }
      }
    }
    return result;
  }

  async getDetail(champId: string, editionId?: string | null): Promise<ChampionshipDetail> {
    // Step 1: fetch championship base + editions list in parallel
    const [champResp, editionsResp] = await Promise.all([
      fetch(`${this.baseUrl}/championships/${champId}`),
      fetch(`${this.baseUrl}/championships/${champId}/editions`),
    ]);

    if (!champResp.ok) throw new Error(`Campeonato não encontrado: ${champResp.status}`);

    const champ = await champResp.json() as {
      id: string; name: string; nickname: string | null;
      scope: string; level: string | null; league_id: string | null;
      division: string | null;
    };

    // Editions now include champion/runner-up team names from backend
    type ApiEdition = {
      id: string; year: number; status: string;
      champion_team_id: string | null; runner_up_team_id: string | null;
      champion_team_name: string | null; runner_up_team_name: string | null;
    };
    let resolvedYear = 0;
    let resolvedEditionId: string | null = editionId ?? null;
    let resolvedChampionTeamId: string | null = null;
    let resolvedRunnerUpTeamId: string | null = null;
    let allEditions: ApiEdition[] = [];
    if (editionsResp.ok) {
      allEditions = await editionsResp.json() as ApiEdition[];
      let activeEdition: ApiEdition | undefined;
      if (editionId) {
        activeEdition = allEditions.find((e) => e.id === editionId);
      } else {
        activeEdition = allEditions.find((e) => e.status === "ongoing") ?? (allEditions.length > 0 ? allEditions.reduce((a, b) => b.year > a.year ? b : a) : undefined);
      }
      if (activeEdition) {
        resolvedYear = activeEdition.year;
        resolvedEditionId = activeEdition.id;
        resolvedChampionTeamId = activeEdition.champion_team_id;
        resolvedRunnerUpTeamId = activeEdition.runner_up_team_id;
      }
    }

    // Step 2: fetch phases + standings using RESOLVED edition ID — sempre edition-specific
    const phasesUrl = resolvedEditionId
      ? `${this.baseUrl}/championships/${champId}/editions/${resolvedEditionId}/phases`
      : `${this.baseUrl}/championships/${champId}/phases`;
    const standingsUrl = resolvedEditionId
      ? `${this.baseUrl}/championships/${champId}/editions/${resolvedEditionId}/standings`
      : `${this.baseUrl}/championships/${champId}/standings`;
    const [phasesResp, standingsResp] = await Promise.all([
      fetch(phasesUrl),
      fetch(standingsUrl),
    ]);

    if (!phasesResp.ok) throw new Error(`Falha ao buscar fases: ${phasesResp.status}`);

    const phases = await phasesResp.json() as Array<{ id: string; name: string; phase_type: string; order: number; status: string }>;

    // Build standings index + pre-aggregate overall standings
    type ApiStandingEntry = {
      team_id: string; team_name: string; matches_played: number; wins: number;
      draws: number; losses: number; goals_for: number; goals_against: number;
      goal_difference: number; points: number;
    };
    type ApiStandingsResponse = Array<{ phase: { id: string }; groups: Array<{ group: { id: string }; standings: ApiStandingEntry[] }> }>;
    const standingsByGroupId = new Map<string, StandingEntry[]>();
    const overallTotals = new Map<string, StandingEntry>();
    if (standingsResp.ok) {
      const standingsData = await standingsResp.json() as ApiStandingsResponse;
      for (const phaseStandings of standingsData) {
        for (const gs of phaseStandings.groups) {
          standingsByGroupId.set(gs.group.id, gs.standings.map((s) => ({ ...s, club_logo_url: null })));
          for (const s of gs.standings) {
            const existing = overallTotals.get(s.team_id);
            if (!existing) {
              overallTotals.set(s.team_id, { ...s, club_logo_url: null });
            } else {
              existing.matches_played += s.matches_played;
              existing.wins += s.wins;
              existing.draws += s.draws;
              existing.losses += s.losses;
              existing.goals_for += s.goals_for;
              existing.goals_against += s.goals_against;
              existing.goal_difference += s.goal_difference;
              existing.points += s.points;
            }
          }
        }
      }
    }
    // Cache standings for lazy-loaded phases
    this._standingsByGroupId = standingsByGroupId;

    // Determine active phase: highest-order em_andamento, else highest-order finalizado, else highest-order overall
    const sortedByOrderDesc = [...phases].sort((a, b) => (b.order ?? 0) - (a.order ?? 0));
    const ongoingPhases = sortedByOrderDesc.filter((p) => p.status === "em_andamento");
    const activePhase =
      ongoingPhases.length > 0
        ? ongoingPhases[0]
        : sortedByOrderDesc.find((p) => p.status === "finalizado") ?? sortedByOrderDesc[0] ?? null;

    // RawGroupDetail now includes logo_url (teams), venue_name, home/away logos (matches) from backend
    type RawGroupDetail = {
      id: string; name: string;
      teams: Array<{ team_id: string; team_name: string; logo_url: string | null }>;
      matches: Array<{
        id: string; round_number: number; home_team_id: string; away_team_id: string;
        home_score: number | null; away_score: number | null;
        home_penalty_score: number | null; away_penalty_score: number | null;
        match_date: string | null; venue_id: string | null; venue_name: string | null;
        status: string; home_club_logo_url: string | null; away_club_logo_url: string | null;
      }>;
    };

    const parseGroups = (rawGroups: RawGroupDetail[]): GroupDetail[] =>
      rawGroups.map((g) => {
        const teamLogoMap = new Map(g.teams.map((t) => [t.team_id, t.logo_url ?? null]));
        return {
          id: g.id,
          name: g.name,
          teams: g.teams.map((t) => ({ id: t.team_id, name: t.team_name, club_logo_url: t.logo_url ?? null })),
          standings: (standingsByGroupId.get(g.id) ?? []).map((s) => ({
            ...s,
            club_logo_url: teamLogoMap.get(s.team_id) ?? null,
          })),
          matches: g.matches.map((m) => ({ ...m })),
        };
      });

    // Only load groups-detail for the active phase; others get groups_loaded: false
    const activePhaseLogoMap = new Map<string, string | null>();
    const phasesWithGroups: PhaseDetail[] = await Promise.all(
      phases.map(async (phase) => {
        const base = { id: phase.id, name: phase.name, phase_type: phase.phase_type, phase_order: phase.order ?? 0, status: phase.status ?? "em_andamento" };
        if (activePhase?.id !== phase.id) {
          return { ...base, groups: [], groups_loaded: false };
        }
        const resp = await fetch(`${this.baseUrl}/phases/${phase.id}/groups-detail`);
        if (!resp.ok) return { ...base, groups: [], groups_loaded: true };
        const rawGroups = await resp.json() as RawGroupDetail[];
        // Collect logos from active phase for overall standings
        for (const g of rawGroups) {
          for (const t of g.teams) {
            if (t.logo_url) activePhaseLogoMap.set(t.team_id, t.logo_url);
          }
        }
        return { ...base, groups: parseGroups(rawGroups), groups_loaded: true };
      })
    );

    // Enrich overall standings with logos from active phase
    const overall_standings = [...overallTotals.values()].map((s) => ({
      ...s,
      club_logo_url: activePhaseLogoMap.get(s.team_id) ?? null,
    }));

    const sibling_editions: SiblingEdition[] = allEditions
      .map((e) => ({
        edition_id: e.id,
        year: e.year,
        champion_team_id: e.champion_team_id,
        champion_team_name: e.champion_team_name ?? null,
        runner_up_team_id: e.runner_up_team_id,
        runner_up_team_name: e.runner_up_team_name ?? null,
      }))
      .sort((a, b) => b.year - a.year);

    return {
      id: champ.id,
      name: champ.name,
      nickname: champ.nickname ?? null,
      year: resolvedYear,
      scope: champ.scope,
      level: champ.level ?? null,
      division: champ.division ?? null,
      league_id: champ.league_id ?? null,
      champion_team_id: resolvedChampionTeamId,
      runner_up_team_id: resolvedRunnerUpTeamId,
      phases: phasesWithGroups,
      overall_standings,
      sibling_editions,
      top_scorers: [],  // loaded lazily via getTopScorers
    };
  }

  async loadPhaseGroups(phaseId: string): Promise<GroupDetail[]> {
    const resp = await fetch(`${this.baseUrl}/phases/${phaseId}/groups-detail`);
    if (!resp.ok) return [];
    type RawGroup = {
      id: string; name: string;
      teams: Array<{ team_id: string; team_name: string; logo_url: string | null }>;
      matches: Array<{
        id: string; round_number: number; home_team_id: string; away_team_id: string;
        home_score: number | null; away_score: number | null;
        home_penalty_score: number | null; away_penalty_score: number | null;
        match_date: string | null; venue_id: string | null; venue_name: string | null;
        status: string; home_club_logo_url: string | null; away_club_logo_url: string | null;
      }>;
    };
    const rawGroups = await resp.json() as RawGroup[];
    return rawGroups.map((g) => {
      const teamLogoMap = new Map(g.teams.map((t) => [t.team_id, t.logo_url ?? null]));
      return {
        id: g.id,
        name: g.name,
        teams: g.teams.map((t) => ({ id: t.team_id, name: t.team_name, club_logo_url: t.logo_url ?? null })),
        standings: (this._standingsByGroupId.get(g.id) ?? []).map((s) => ({
          ...s,
          club_logo_url: teamLogoMap.get(s.team_id) ?? null,
        })),
        matches: g.matches.map((m) => ({ ...m })),
      };
    });
  }

  async getTopScorers(champId: string, editionId: string): Promise<TopScorerItem[]> {
    const resp = await fetch(`${this.baseUrl}/championships/${champId}/editions/${editionId}/top-scorers`);
    if (!resp.ok) return [];
    return resp.json() as Promise<TopScorerItem[]>;
  }

  async create(payload: CreateChampionshipPayload): Promise<Championship> {
    const response = await fetch(`${this.baseUrl}/championships`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(detail.detail ?? `Erro ao criar campeonato: ${response.status}`);
    }
    const raw = await response.json() as {
      id: string; name: string; nickname: string | null;
      city_id: string; sport_id: string; year: number;
      scope: string; level: string | null; league_id: string | null;
      division: string | null; champion_team_id: string | null; runner_up_team_id: string | null;
    };
    return { ...raw, edition_id: null, city_name: "", sport_name: "", champion_team_name: null, runner_up_team_name: null };
  }

  async updatePodium(id: string, championTeamId: string | null, runnerUpTeamId: string | null): Promise<Championship> {
    const response = await fetch(`${this.baseUrl}/championships/${id}/podium`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ champion_team_id: championTeamId, runner_up_team_id: runnerUpTeamId }),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(detail.detail ?? `Erro ao salvar pódio: ${response.status}`);
    }
    const raw = await response.json() as {
      id: string; name: string; nickname: string | null;
      city_id: string; sport_id: string; year: number;
      scope: string; level: string | null; league_id: string | null;
      division: string | null; champion_team_id: string | null; runner_up_team_id: string | null;
    };
    return { ...raw, edition_id: null, city_name: "", sport_name: "", champion_team_name: null, runner_up_team_name: null };
  }
}
