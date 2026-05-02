import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { clearAuthToken, getAuthToken, setAuthToken as persistToken } from "../shared/lib/auth";

type AuthContextValue = {
  token: string | null;
  /** Persist to localStorage and refresh route guards immediately. */
  login: (token: string) => void;
  /** Clear storage and session so protected routes redirect to /auth */
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getAuthToken());

  const login = useCallback((t: string) => {
    persistToken(t);
    setToken(t);
  }, []);

  const logout = useCallback(() => {
    clearAuthToken();
    setToken(null);
  }, []);

  const value = useMemo(() => ({ token, login, logout }), [token, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
