import type { AthleteChampionshipRegistration } from "@domain/entities/Athlete";
import type {
  ChampionshipRegistrationRepository,
  RegisterInChampionshipPayload,
  UpdateRegistrationStatusPayload,
} from "@domain/repositories/ChampionshipRegistrationRepository";

export class GetAthleteChampionshipRegistrations {
  constructor(private readonly repository: ChampionshipRegistrationRepository) {}

  execute(athleteId: string): Promise<AthleteChampionshipRegistration[]> {
    return this.repository.listByAthlete(athleteId);
  }
}

export class RegisterAthleteChampionship {
  constructor(private readonly repository: ChampionshipRegistrationRepository) {}

  execute(
    editionId: string,
    payload: RegisterInChampionshipPayload,
  ): Promise<AthleteChampionshipRegistration> {
    return this.repository.register(editionId, payload);
  }
}

export class UpdateChampionshipRegistration {
  constructor(private readonly repository: ChampionshipRegistrationRepository) {}

  execute(
    editionId: string,
    regId: string,
    payload: UpdateRegistrationStatusPayload,
  ): Promise<AthleteChampionshipRegistration> {
    return this.repository.updateStatus(editionId, regId, payload);
  }
}

export class CancelChampionshipRegistration {
  constructor(private readonly repository: ChampionshipRegistrationRepository) {}

  execute(editionId: string, regId: string): Promise<void> {
    return this.repository.cancel(editionId, regId);
  }
}

export class ListEditionRegistrations {
  constructor(private readonly repository: ChampionshipRegistrationRepository) {}

  execute(
    editionId: string,
    teamId?: string,
  ): Promise<AthleteChampionshipRegistration[]> {
    return this.repository.listByEdition(editionId, teamId);
  }
}

export class GetEligibleAthletes {
  constructor(private readonly repository: ChampionshipRegistrationRepository) {}

  execute(editionId: string, teamId: string): Promise<string[]> {
    return this.repository.listEligibleAthleteIds(editionId, teamId);
  }
}

export class CheckAthleteMatchEvents {
  constructor(private readonly repository: ChampionshipRegistrationRepository) {}

  execute(
    editionId: string,
    athleteId: string,
  ): Promise<{ has_events: boolean; event_count: number }> {
    return this.repository.checkAthleteMatchEvents(editionId, athleteId);
  }
}
