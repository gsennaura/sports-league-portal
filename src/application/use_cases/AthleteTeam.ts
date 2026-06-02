import type { AthleteTeamHistory } from "@domain/entities/Athlete";
import type { AthleteRepository, AddAthleteToTeamPayload } from "@domain/repositories/AthleteRepository";

export class AddAthleteToTeam {
  constructor(private readonly repository: AthleteRepository) {}

  execute(athleteId: string, payload: AddAthleteToTeamPayload): Promise<AthleteTeamHistory> {
    return this.repository.addToTeam(athleteId, payload);
  }
}

export class RemoveAthleteFromTeam {
  constructor(private readonly repository: AthleteRepository) {}

  execute(athleteId: string, historyId: string, endDate: string): Promise<AthleteTeamHistory> {
    return this.repository.removeFromTeam(athleteId, historyId, { end_date: endDate });
  }
}

export class GetAthleteTeamHistory {
  constructor(private readonly repository: AthleteRepository) {}

  execute(athleteId: string): Promise<AthleteTeamHistory[]> {
    return this.repository.listTeamHistory(athleteId);
  }
}

export class GetTeamAthletes {
  constructor(private readonly repository: AthleteRepository) {}

  execute(teamId: string, activeOnly = false): Promise<AthleteTeamHistory[]> {
    return this.repository.listByTeam(teamId, activeOnly);
  }
}
