import { Navigate } from "react-router-dom";
import { useAuth } from "@presentation/context/AuthContext";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  role?: "admin" | "full_admin" | "athlete" | "any";
}

export function ProtectedRoute({ children, role = "admin" }: Props) {
  const { isAdmin, isAthlete, isLeagueAdmin, user, loading } = useAuth();
  if (loading) return null;

  if (role === "admin" && !isAdmin && !isLeagueAdmin) return <Navigate to="/login" replace />;
  if (role === "full_admin" && !isAdmin) return <Navigate to="/login" replace />;
  if (role === "athlete" && !isAthlete && !isAdmin) return <Navigate to="/login" replace />;
  if (role === "any" && !user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
