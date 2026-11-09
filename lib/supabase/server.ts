import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
// Cliente de Supabase para código que corre en el servidor: Server Components,
// Server Actions y Route Handlers. Se crea en cada petición (nunca como variable
// global) porque necesita las cookies de esa petición.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll se llamó desde un Server Component, donde no se pueden
            // escribir cookies. Se ignora: el refresco de sesión lo hará un
            // proxy cuando haya autenticación (fuera de esta spec).
          }
        },
      },
    },
  );
}
