import { createClient } from "@/lib/supabase/server";
export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/YYYY"
  game?: string; // título del juego; solo en GLOBAL
}
function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}
// Top de un juego: orden por puntaje desc y, en empate, gana quien llegó primero.
// Solo se puede llamar desde Server Components o Server Actions.
export async function getTopScores(gameId: string, limit = 10): Promise<ScoreRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("player_name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data.map((row, i) => ({
    rank: i + 1,
    name: row.player_name,
    score: row.score,
    date: formatDate(row.created_at),
  }));
}

// Top global: todos los juegos mezclados por puntaje bruto, con el título del juego.
// Mismo orden que getTopScores. Solo se puede llamar desde Server Components o Server Actions.
export async function getTopScoresGlobal(limit = 12): Promise<ScoreRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("player_name, score, created_at, games(title)")
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data.map((row, i) => {
    const g = row.games as { title: string } | { title: string }[] | null;
    return {
      rank: i + 1,
      name: row.player_name,
      score: row.score,
      date: formatDate(row.created_at),
      game: (Array.isArray(g) ? g[0]?.title : g?.title) ?? "",
    };
  });
}
