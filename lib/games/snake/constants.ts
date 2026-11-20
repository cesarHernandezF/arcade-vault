// Dimensiones del canvas (contrato de la plataforma)
export const CANVAS_W = 800;
export const CANVAS_H = 600;
// Tablero
export const CELL = 40;
export const COLS = 20; // 20 × 40 = 800
export const ROWS = 14; // 14 × 40 = 560
export const HUD_H = 40; // franja superior; el tablero empieza en y = 40
// Serpiente
export const INITIAL_LENGTH = 3;
export const INITIAL_LIVES = 1;
export const START_HEAD = { col: 10, row: 7 };
// Ritmo y progresión
export const STEP_MS_BASE = 150; // ms entre pasos en el nivel 1
export const STEP_MS_DECREMENT = 10; // ms menos por nivel
export const STEP_MS_MIN = 60; // se alcanza en el nivel 10
export const FRUITS_PER_LEVEL = 5; // level = floor(fruits / 5) + 1
export const POINTS_PER_FRUIT = 10;
export const INPUT_QUEUE_MAX = 2; // giros en cola
export const MAX_DT = 50; // ms
// Assets
export const SPRITESHEET_SRC = "/games/snake/fruits.png";
export const FRUIT_MAX_SIZE = 36; // la fruta cabe en 36 px dentro de la celda de 40
// Estilo del canvas
export const BOARD_COLOR_A = "#0a1a14";
export const BOARD_COLOR_B = "#0d2119";
export const SNAKE_BODY = "#00ff88";
export const SNAKE_HEAD = "#b6ffd8";
export const HUD_FONT = "bold 18px monospace";
export const HUD_PAD = 12;
export const OVERLAY_BG = "rgba(0, 0, 0, 0.6)";
export const OVERLAY_TITLE_FONT = "bold 48px monospace";
export const OVERLAY_SCORE_FONT = "22px monospace";
export const OVERLAY_HINT_FONT = "16px monospace";
export const READY_FONT = "bold 24px monospace";
// Textos
export const READY_TEXT = "PULSA UNA FLECHA PARA EMPEZAR";
export const GAME_OVER_TEXT = "GAME OVER";
export const WIN_TEXT = "¡TABLERO COMPLETO!";
export const RESTART_HINT = "ENTER PARA REINICIAR";
