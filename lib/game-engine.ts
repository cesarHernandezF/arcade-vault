// Eventos que el motor emite hacia React
export interface GameEvents {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  onRestart: () => void; // reinicio iniciado desde el canvas (Espacio o Enter); no se emite en restart()
  onLines?: (lines: number) => void; // solo Tetris
}
// Acciones que React puede ordenar al motor
export interface GameEngine {
  pause(): void;
  resume(): void;
  restart(): void;
  endGame(): void;
  destroy(): void; // cancela requestAnimationFrame y quita todos los listeners
}
export type CreateEngine = (canvas: HTMLCanvasElement, events: GameEvents) => GameEngine;
