import type { Club } from "@domain/entities/Club";
import type { ClubRepository } from "@domain/repositories/ClubRepository";
import type { ClubLeagueRegistration, LeagueRepository } from "@domain/repositories/LeagueRepository";

export interface ClubWithRegistration {
  club: Club;
  registration: ClubLeagueRegistration | null;
  isRegistered: boolean;
}

export interface ManageClubLeagueRegistrationsResult {
  clubsWithStatus: ClubWithRegistration[];
}

export interface SaveClubLeagueRegistrationsPayload {
  leagueId: string;
  toAdd: string[];         // club_ids a filiar
  toRemove: string[];      // reg_ids a desfiliard
}

export class ManageClubLeagueRegistrations {
  constructor(
    private readonly leagueRepo: LeagueRepository,
    private readonly clubRepo: ClubRepository,
  ) {}

  async getPageData(leagueId: string): Promise<ManageClubLeagueRegistrationsResult> {
    const [allClubs, registrations] = await Promise.all([
      this.clubRepo.listAll(),
      this.leagueRepo.listClubsInLeague(leagueId),
    ]);

    const regMap = new Map<string, ClubLeagueRegistration>();
    for (const reg of registrations) {
      regMap.set(reg.club_id, reg);
    }

    const clubsWithStatus: ClubWithRegistration[] = allClubs
      .map((club) => ({
        club,
        registration: regMap.get(club.id) ?? null,
        isRegistered: regMap.has(club.id),
      }))
      .sort((a, b) => (a.club.name ?? "").localeCompare(b.club.name ?? "", "pt-BR"));

    return { clubsWithStatus };
  }

  async save(payload: SaveClubLeagueRegistrationsPayload): Promise<{ errors: string[] }> {
    const errors: string[] = [];

    await Promise.all([
      ...payload.toAdd.map((clubId) =>
        this.leagueRepo
          .registerClubInLeague(payload.leagueId, clubId)
          .catch((e: Error) => errors.push(`Clube ${clubId}: ${e.message}`))
      ),
      ...payload.toRemove.map((regId) =>
        this.leagueRepo
          .removeClubFromLeague(payload.leagueId, regId)
          .catch((e: Error) => errors.push(`Registro ${regId}: ${e.message}`))
      ),
    ]);

    return { errors };
  }
}
