"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

export interface SessionUser {
  name: string; // MAYÚSCULAS, máx. 10 caracteres
}

interface SessionContextValue {
  user: SessionUser | null;
  login: (u: SessionUser) => void;
  signOut: () => void;
}

const STORAGE_KEY = "av_user";

const SessionContext = createContext<Pick<SessionContextValue, "login" | "signOut"> | null>(null);

// La sesión vive en localStorage y se lee con useSyncExternalStore: durante la
// hidratación React usa el snapshot del servidor (sin sesión) y después pasa al
// valor real, incluso si el componente se hidrata tarde (p. ej. dentro de un
// <Suspense>). Así el HTML del servidor y el primer render del cliente coinciden.
const listeners = new Set<() => void>();
// Si localStorage está bloqueado, la sesión sigue funcionando solo en memoria.
let memoryRaw: string | null = null;
let storageBlocked = false;

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot(): string | null {
  if (storageBlocked) return memoryRaw;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    storageBlocked = true;
    return memoryRaw;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

function writeRaw(raw: string | null) {
  memoryRaw = raw;
  if (!storageBlocked) {
    try {
      if (raw === null) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, raw);
    } catch {
      storageBlocked = true;
    }
  }
  notify();
}

function parseUser(raw: string | null): SessionUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionUser | null;
    return parsed && typeof parsed.name === "string" ? parsed : null;
  } catch {
    return null; // JSON inválido: seguimos sin sesión.
  }
}

// El store se lee en cada consumidor (useSession) y no en el Provider: un componente
// que se hidrata tarde (dentro de <Suspense>) recibiría del contexto un valor ya
// actualizado y no coincidiría con el HTML del servidor.
const actions = { login, signOut };

function login(u: SessionUser) {
  writeRaw(JSON.stringify(u));
}

function signOut() {
  writeRaw(null);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  return <SessionContext.Provider value={actions}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const user = useMemo(() => parseUser(raw), [raw]);
  return useMemo(() => ({ user, login: ctx.login, signOut: ctx.signOut }), [user, ctx]);
}
