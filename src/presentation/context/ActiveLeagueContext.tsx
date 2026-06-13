import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { League } from "@domain/entities/League";
import { listLeagues } from "@infrastructure/composition";
import { LEAGUE_ID } from "../../config";

interface ActiveLeagueContextValue {
  league: League | null;
  loading: boolean;
}

const ActiveLeagueContext = createContext<ActiveLeagueContextValue>({ league: null, loading: true });

export function ActiveLeagueProvider({ children }: { children: ReactNode }) {
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!LEAGUE_ID) { setLoading(false); return; }
    listLeagues
      .execute()
      .then((leagues) => {
        setLeague(leagues.find((l) => l.id === LEAGUE_ID) ?? null);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  return (
    <ActiveLeagueContext.Provider value={{ league, loading }}>
      {children}
    </ActiveLeagueContext.Provider>
  );
}

export function useActiveLeague() {
  return useContext(ActiveLeagueContext);
}
