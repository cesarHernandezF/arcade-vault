import type { CreateEngine } from "@/lib/game-engine";
// Asocia el id de un juego con la carga diferida de su motor.
// Los ids que no están aquí siguen usando la simulación actual.
// Metadatos de plataforma por juego. Los juegos que no están en GAME_META usan DEFAULT_GAME_META.
export interface GameMeta {
  initialLives: number; // vidas con las que arranca el HUD de la plataforma
  lines: boolean; // muestra el stat LINES en el HUD de la plataforma
}
export const DEFAULT_GAME_META: GameMeta = { initialLives: 3, lines: false };
export const GAME_META: Record<string, Partial<GameMeta>> = {
  tetris: { initialLives: 1, lines: true },
};
export const GAME_ENGINES: Record<string, () => Promise<{ createEngine: CreateEngine }>> = {
  asteroides: () => import("@/lib/games/asteroides/engine"),
  tetris: () => import("@/lib/games/tetris/engine"),
};
