import { Suspense } from "react";
import Library from "@/components/library";
import { getGames } from "@/lib/games-db";
export default function BibliotecaPage() {
  return (
    <Suspense fallback={<div className="pixel">CARGANDO_</div>}>
      <BibliotecaGames />
    </Suspense>
  );
}
async function BibliotecaGames() {
  const games = await getGames();
  return <Library games={games} />;
}
