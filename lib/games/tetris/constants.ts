// Constantes copiadas de references/started-games/03-tetris/game.js sin cambiar valores.
export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;
export const LINE_SCORES = [0, 100, 300, 500, 800];
export const INITIAL_LIVES = 1;
export const INITIAL_DROP_INTERVAL = 1000; // ms
export const MIN_DROP_INTERVAL = 100; // ms
export const DROP_STEP = 90; // ms menos por nivel
export const LINES_PER_LEVEL = 10;
export const WALL_KICKS = [0, -1, 1, -2, 2];
export const PIECE_TYPES = 8;
// Índice por tipo de pieza: 1 I, 2 O, 3 T, 4 S, 5 Z, 6 J, 7 L, 8 N (tuerca)
export const COLORS: (string | null)[] = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - pale blue
  "#ffb74d", // L - orange
  "#9e9e9e", // N - tuerca (gris metálico)
];
export const PIECES: (number[][] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];
export const GHOST_ALPHA = 0.2;
// Tema oscuro del original (style.css)
export const GRID_COLOR = "#22222e";
export const BOARD_BG = "#0f0f17";
// ── Maquetación del canvas 800×600 (valores nuevos) ──────────────────────────
export const W = 800;
export const H = 600;
export const BOARD_X = (W - COLS * BLOCK) / 2; // 250
export const BOARD_Y = 0;
export const LEFT_PANEL_X = 16;
export const RIGHT_PANEL_X = BOARD_X + COLS * BLOCK + 16; // 566
export const NEXT_BLOCK = 30;
