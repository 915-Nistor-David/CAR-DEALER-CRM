import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { authService } from "../services/authService";

interface Props {
  children: ReactNode;
  // Daca e setat, doar rolurile din lista au acces — restul sunt trimisi pe board.
  requiredRole?: string[];
}

export default function ProtectedRoute({ children, requiredRole }: Props) {
  if (!authService.isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  if (requiredRole && !requiredRole.includes(authService.getRole())) {
    return <Navigate to="/board" replace />;
  }
  return <>{children}</>;
}
