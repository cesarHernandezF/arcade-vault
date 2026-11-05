"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface SessionUser {
  name: string; // MAYÚSCULAS, máx. 10 caracteres
}

interface SessionContextValue {
  user: SessionUser | null;
  login: (u: SessionUser) => void;
  signOut: () => void;
}

const STORAGE_KEY = "av_user";

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  // Antes de leer localStorage la UI se renderiza como sin sesión (evita errores de hidratación).
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SessionUser | null;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (parsed && typeof parsed.name === "string") setUser(parsed);
      }
    } catch {
      // localStorage bloqueado o JSON inválido: seguimos sin sesión.
    }
  }, []);

  const login = useCallback((u: SessionUser) => {
    setUser(u);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } catch {}
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const value = useMemo(() => ({ user, login, signOut }), [user, login, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return ctx;
}
