import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "@/api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while we verify the stored token

  // ── Restore session on mount ─────────────────────────────────────────────
  useEffect(() => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      setLoading(false);
      return;
    }
    // Verify token and fetch user profile
    api
      .get("/api/auth/me/")
      .then(({ data }) => setUser(data))
      .catch(() => {
        // Token invalid/expired – clear storage
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (username, password) => {
    const { data } = await api.post("/api/auth/login/", { username, password });

    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);

    // Fetch user profile right after login
    const { data: me } = await api.get("/api/auth/me/");
    setUser(me);

    return me;
  }, []);

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    const refresh = localStorage.getItem("refresh_token");
    try {
      if (refresh) {
        await api.post("/api/auth/logout/", { refresh });
      }
    } catch {
      // Ignore – we'll clear state anyway
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setUser(null);
    }
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Convenience hook ─────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
