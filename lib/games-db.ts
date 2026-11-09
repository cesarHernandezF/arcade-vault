import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { Accent, Category, Game } from "@/lib/games";
type GameStatsRow = Database["public"]["Views"]["games_with_stats"]["Row"];
// La vista marca todas las columnas como anulables y `category`/`color` como
// string (Postgres no expone los `check`). Las restricciones de la tabla
// garantizan los valores reales, por eso aquí se convierten a los tipos de la app.
function toGame(row: GameStatsRow): Game {
  return {
    id: row.id!,
    title: row.title!,
    short: row.short!,
    long: row.long!,
    cat: row.category as Category,
    cover: row.cover!,
    color: row.color as Accent,
    best: row.best,
    entries: row.entries ?? 0,
  };
}
// Solo se puede llamar desde Server Components o Server Actions.
export async function getGames(): Promise<Game[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games_with_stats")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map(toGame);
}
export async function getGame(id: string): Promise<Game | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games_with_stats")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toGame(data) : null;
}
