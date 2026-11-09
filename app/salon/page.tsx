import { Suspense } from "react";
import HallOfFame from "@/components/hall-of-fame";
import { getGames } from "@/lib/games-db";
import { getTopScores } from "@/lib/scores";
export default function SalonPage() {
  return (
    <Suspense fallback={<div className="av-hall pixel">CARGANDO_</div>}>
      <Salon />
    </Suspense>
  );
}
async function Salon() {
  const games = await getGames();
  // Se leen los top 12 de todos los juegos en el servidor: cambiar de pestaña no hace peticiones.
  const entries = await Promise.all(
    games.map(async (g) => ({
      id: g.id,
      title: g.title,
      rows: await getTopScores(g.id, 12),
    })),
  );
  return <HallOfFame entries={entries} />;
}
