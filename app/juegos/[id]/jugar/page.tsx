import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getGame } from "@/lib/games-db";
import { GAME_ENGINES } from "@/lib/games/registry";
import GamePlayer from "@/components/game-player";
export default function JugarPage({ params }: PageProps<"/juegos/[id]/jugar">) {
  return (
    <Suspense fallback={<div className="av-player pixel">CARGANDO_</div>}>
      <Player params={params} />
    </Suspense>
  );
}
async function Player({ params }: { params: PageProps<"/juegos/[id]/jugar">["params"] }) {
  const { id } = await params;
  const game = await getGame(id);
  // Invariante: todo juego de `games` debe tener su motor en GAME_ENGINES.
  if (!game || !(game.id in GAME_ENGINES)) notFound();
  return <GamePlayer game={game} />;
}
