import type { CreateEngine } from "@/lib/game-engine";
// Asocia el id de un juego con la carga diferida de su motor.
// Los ids que no están aquí siguen usando la simulación actual.
export const GAME_ENGINES: Record<string, () => Promise<{ createEngine: CreateEngine }>> = {};
