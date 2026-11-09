import { createBrowserClient } from "@supabase/ssr";
// Cliente de Supabase para Client Components (código que corre en el navegador).
// createBrowserClient ya es singleton: llamar a createClient() varias veces
// devuelve siempre la misma instancia.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
