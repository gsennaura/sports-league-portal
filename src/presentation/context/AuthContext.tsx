import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiAuthRepository, type AuthUser, type DirigenteProfile, type LeagueAdminProfile } from "@infrastructure/repositories/ApiAuthRepository";

const TOKEN_KEY = "auth_token";
const authRepo = new ApiAuthRepository();

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAdmin: boolean;
  isAthlete: boolean;
  isDirigente: boolean;
  isLeagueAdmin: boolean;
  dirigenteProfiles: DirigenteProfile[];
  leagueAdminProfiles: LeagueAdminProfile[];
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);
  const [dirigenteProfiles, setDirigenteProfiles] = useState<DirigenteProfile[]>([]);
  const [leagueAdminProfiles, setLeagueAdminProfiles] = useState<LeagueAdminProfile[]>([]);

  // On mount, restore session from stored token
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) { setLoading(false); return; }
    Promise.all([
      authRepo.me(stored),
      authRepo.getDirigenteProfiles(stored),
      authRepo.getLeagueAdminProfiles(stored),
    ])
      .then(([u, profiles, leagueProfiles]) => {
        setUser(u);
        setToken(stored);
        setDirigenteProfiles(profiles);
        setLeagueAdminProfiles(leagueProfiles);
      })
      .catch(() => { localStorage.removeItem(TOKEN_KEY); setToken(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    const { access_token } = await authRepo.login(email, password);
    const [me, profiles, leagueProfiles] = await Promise.all([
      authRepo.me(access_token),
      authRepo.getDirigenteProfiles(access_token),
      authRepo.getLeagueAdminProfiles(access_token),
    ]);
    localStorage.setItem(TOKEN_KEY, access_token);
    setToken(access_token);
    setUser(me);
    setDirigenteProfiles(profiles);
    setLeagueAdminProfiles(leagueProfiles);
    return me;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setDirigenteProfiles([]);
    setLeagueAdminProfiles([]);
  }, []);

  const isAdmin = user?.role === "full_admin";
  // isAthlete uses has_athlete_profile so it stays true even if users.role
  // was promoted to league_admin after an athlete was assigned as league admin.
  const isAthlete = user?.has_athlete_profile === true || user?.role === "athlete";
  const isDirigente = dirigenteProfiles.some((p) => p.is_active);
  const isLeagueAdmin = leagueAdminProfiles.some((p) => p.is_active);

  return (
    <AuthContext.Provider value={{ user, token, isAdmin, isAthlete, isDirigente, isLeagueAdmin, dirigenteProfiles, leagueAdminProfiles, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
