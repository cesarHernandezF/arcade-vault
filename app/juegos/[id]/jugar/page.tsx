import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GAMES } from "@/lib/games";
import GamePlayer from "@/components/game-player";

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export default function JugarPage({ params }: PageProps<"/juegos/[id]/jugar">) {
  return (
    <Suspense fallback={<div className="av-player pixel">CARGANDO_</div>}>
      <Player params={params} />
    </Suspense>
  );
}

async function Player({ params }: { params: PageProps<"/juegos/[id]/jugar">["params"] }) {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
