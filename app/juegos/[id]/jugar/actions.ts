"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
export type SaveScoreResult = { ok: true } | { ok: false; error: string };
const GENERIC_ERROR = "NO SE PUDO GUARDAR LA PUNTUACIÓN. INTÉNTALO DE NUEVO.";
export async function saveScore(
  gameId: string,
  playerName: string,
  score: number,
): Promise<SaveScoreResult> {
  // Validación en el servidor: la acción es un punto de entrada no confiable.
  if (typeof gameId !== "string" || gameId.length === 0) {
    return { ok: false, error: GENERIC_ERROR };
  }
  const name = typeof playerName === "string" ? playerName.trim() : "";
  if (name.length < 1 || name.length > 10) {
    return { ok: false, error: "ESCRIBE UN NOMBRE DE 1 A 10 CARACTERES." };
  }
  if (!Number.isInteger(score) || score < 0) {
    return { ok: false, error: "LA PUNTUACIÓN NO ES VÁLIDA." };
  }
  try {
    const supabase = await createClient();
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("id")
      .eq("id", gameId)
      .maybeSingle();
    if (gameError) throw gameError;
    if (!game) return { ok: false, error: GENERIC_ERROR };
    // user_id queda nulo: todavía no hay autenticación (la política RLS lo exige).
    const { error } = await supabase
      .from("scores")
      .insert({ game_id: gameId, player_name: name, score, user_id: null });
    if (error) throw error;
  } catch (err) {
    console.error("[scores] No se pudo guardar la puntuación:", err);
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath("/biblioteca");
  revalidatePath("/salon");
  revalidatePath(`/juegos/${gameId}`);
  return { ok: true };
}
