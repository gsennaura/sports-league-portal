import type { MatchRepository } from "@domain/repositories/MatchRepository";
import type { MatchEvent, MatchEventPayload, MatchEventUpdatePayload } from "@domain/entities/MatchEvent";

export class AddMatchEvent {
  constructor(private readonly repository: MatchRepository) {}

  async execute(matchId: string, payload: MatchEventPayload): Promise<MatchEvent> {
    return this.repository.addMatchEvent(matchId, payload);
  }
}

export class AnnulMatchEvent {
  constructor(private readonly repository: MatchRepository) {}

  async execute(matchId: string, eventId: string): Promise<void> {
    return this.repository.annulMatchEvent(matchId, eventId);
  }
}

export class UpdateMatchEvent {
  constructor(private readonly repository: MatchRepository) {}

  async execute(matchId: string, eventId: string, payload: MatchEventUpdatePayload): Promise<MatchEvent> {
    return this.repository.updateMatchEvent(matchId, eventId, payload);
  }
}
