import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
// Cliente de Supabase para Client Components (código que corre en el navegador).
// createBrowserClient ya es singleton: llamar a createClient() varias veces
// devuelve siempre la misma instancia.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
