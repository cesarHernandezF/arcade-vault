import type { CreateEngine, GameEngine, GameEvents } from "@/lib/game-engine";
import {
  BOARD_COLOR_A,
  BOARD_COLOR_B,
  CANVAS_H,
  CANVAS_W,
  CELL,
  COLS,
  FRUITS_PER_LEVEL,
  GAME_OVER_TEXT,
  HUD_FONT,
  HUD_H,
  HUD_PAD,
  INITIAL_LENGTH,
  INITIAL_LIVES,
  INPUT_QUEUE_MAX,
  MAX_DT,
  OVERLAY_BG,
  OVERLAY_HINT_FONT,
  OVERLAY_SCORE_FONT,
  OVERLAY_TITLE_FONT,
  POINTS_PER_FRUIT,
  READY_FONT,
  READY_TEXT,
  RESTART_HINT,
  ROWS,
  SNAKE_BODY,
  SNAKE_HEAD,
  SPRITESHEET_SRC,
  START_HEAD,
  STEP_MS_BASE,
  STEP_MS_DECREMENT,
  STEP_MS_MIN,
  WIN_TEXT,
} from "./constants";
import { FRUITS, FRUIT_NAMES, drawFruit, loadSpritesheet } from "./sprites";
type State = "ready" | "playing" | "gameover" | "win";
type Dir = "up" | "down" | "left" | "right";
interface Cell {
  col: number;
  row: number;
}
const GAME_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "Enter"];
const IGNORED_TARGETS = ["INPUT", "TEXTAREA", "BUTTON", "SELECT"];
const KEY_TO_DIR: Record<string, Dir> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};
const VECTORS: Record<Dir, Cell> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};
const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };
export const createEngine: CreateEngine = (
  canvas: HTMLCanvasElement,
  events: GameEvents,
): GameEngine => {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
  const c: CanvasRenderingContext2D = ctx;
  // ── Estado (vive en el closure) ────────────────────────────────────────────
  let snake: Cell[] = []; // snake[0] es la cabeza
  let dir: Dir = "right";
  let queue: Dir[] = [];
  let fruit: Cell = { col: 0, row: 0 };
  let fruitName = FRUIT_NAMES[0];
  let fruitsEaten = 0;
  let score = 0;
  let lives = INITIAL_LIVES;
  let level = 1;
  let acc = 0; // ms acumulados hacia el siguiente paso
  let state: State = "ready";
  let paused = false;
  let destroyed = false;
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let sheet: HTMLImageElement | null = null;
  // ── Emisión de eventos (solo cuando el valor cambia) ───────────────────────
  function setScore(v: number) {
    if (v === score) return;
    score = v;
    events.onScore(score);
  }
  function setLevel(v: number) {
    if (v === level) return;
    level = v;
    events.onLevel(level);
  }
  // ── Lógica ─────────────────────────────────────────────────────────────────
  function stepMs() {
    return Math.max(STEP_MS_MIN, STEP_MS_BASE - (level - 1) * STEP_MS_DECREMENT);
  }
  function onSnake(col: number, row: number) {
    return snake.some((s) => s.col === col && s.row === row);
  }
  // Coloca una fruta nueva en una celda libre. Devuelve false si el tablero está lleno.
  function spawnFruit(): boolean {
    const free: Cell[] = [];
    for (let row = 0; row < ROWS; row++)
      for (let col = 0; col < COLS; col++) if (!onSnake(col, row)) free.push({ col, row });
    if (free.length === 0) return false;
    fruit = free[Math.floor(Math.random() * free.length)];
    // Sprite al azar, distinto del anterior
    const options = FRUIT_NAMES.filter((n) => n !== fruitName);
    fruitName = options[Math.floor(Math.random() * options.length)];
    return true;
  }
  // Estado inicial: se emite de forma incondicional (React ya pudo reiniciar su estado).
  function initGame() {
    score = 0;
    lives = INITIAL_LIVES;
    level = 1;
    fruitsEaten = 0;
    acc = 0;
    dir = "right";
    queue = [];
    state = "ready";
    snake = [];
    for (let i = 0; i < INITIAL_LENGTH; i++)
      snake.push({ col: START_HEAD.col - i, row: START_HEAD.row });
    spawnFruit();
    events.onScore(score);
    events.onLives(lives);
    events.onLevel(level);
  }
  function restartFromCanvas() {
    events.onRestart();
    initGame();
  }
  function endGame() {
    if (state === "gameover" || state === "win") return;
    state = "gameover";
    if (lives === 1) {
      lives = 0;
      events.onLives(0);
    }
    events.onGameOver(score);
  }
  function step() {
    if (queue.length > 0) dir = queue.shift() as Dir;
    const v = VECTORS[dir];
    const head = { col: snake[0].col + v.col, row: snake[0].row + v.row };
    if (head.col < 0 || head.col >= COLS || head.row < 0 || head.row >= ROWS) {
      endGame();
      return;
    }
    const ate = head.col === fruit.col && head.row === fruit.row;
    // Si no come, la cola libera su celda en este mismo paso.
    const bodyLen = ate ? snake.length : snake.length - 1;
    for (let i = 0; i < bodyLen; i++) {
      if (snake[i].col === head.col && snake[i].row === head.row) {
        endGame();
        return;
      }
    }
    snake.unshift(head);
    if (!ate) {
      snake.pop();
      return;
    }
    fruitsEaten++;
    setScore(score + POINTS_PER_FRUIT);
    setLevel(Math.floor(fruitsEaten / FRUITS_PER_LEVEL) + 1);
    if (!spawnFruit()) {
      state = "win";
      events.onGameOver(score);
    }
  }
  function update(dt: number) {
    if (state !== "playing") return;
    acc += dt;
    while (state === "playing" && acc >= stepMs()) {
      acc -= stepMs();
      step();
    }
  }
  // ── Input ──────────────────────────────────────────────────────────────────
  function turn(next: Dir) {
    if (queue.length >= INPUT_QUEUE_MAX) return;
    const ref = queue.length > 0 ? queue[queue.length - 1] : dir;
    if (next === ref || next === OPPOSITE[ref]) return;
    queue.push(next);
    if (state === "ready") state = "playing";
  }
  const onKeyDown = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && IGNORED_TARGETS.includes(t.tagName)) return;
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    if (paused || destroyed) return;
    if (state === "gameover" || state === "win") {
      if (e.code === "Enter" && !e.repeat) restartFromCanvas();
      return;
    }
    const next = KEY_TO_DIR[e.code];
    if (next) turn(next);
  };
  // ── Dibujo ─────────────────────────────────────────────────────────────────
  function cellX(col: number) {
    return col * CELL;
  }
  function cellY(row: number) {
    return HUD_H + row * CELL;
  }
  function drawHud() {
    c.fillStyle = "#000";
    c.fillRect(0, 0, CANVAS_W, HUD_H);
    c.fillStyle = "#fff";
    c.font = HUD_FONT;
    c.textBaseline = "middle";
    c.textAlign = "left";
    c.fillText(`Score: ${score}`, HUD_PAD, HUD_H / 2);
    c.textAlign = "right";
    c.fillText(`Nivel: ${level}`, CANVAS_W - HUD_PAD, HUD_H / 2);
  }
  function drawBoard() {
    for (let row = 0; row < ROWS; row++)
      for (let col = 0; col < COLS; col++) {
        c.fillStyle = (col + row) % 2 === 0 ? BOARD_COLOR_A : BOARD_COLOR_B;
        c.fillRect(cellX(col), cellY(row), CELL, CELL);
      }
  }
  function drawSnake() {
    for (let i = snake.length - 1; i >= 0; i--) {
      const s = snake[i];
      const isHead = i === 0;
      c.fillStyle = isHead ? SNAKE_HEAD : SNAKE_BODY;
      c.beginPath();
      c.roundRect(cellX(s.col) + 2, cellY(s.row) + 2, CELL - 4, CELL - 4, isHead ? 10 : 8);
      c.fill();
    }
    // Ojos: dos puntos en el lado hacia el que mira la cabeza
    const h = snake[0];
    const v = VECTORS[dir];
    const cx = cellX(h.col) + CELL / 2;
    const cy = cellY(h.row) + CELL / 2;
    const px = -v.row; // perpendicular a la dirección
    const py = v.col;
    c.fillStyle = "#04120d";
    for (const side of [-1, 1]) {
      c.beginPath();
      c.arc(cx + v.col * 7 + px * side * 7, cy + v.row * 7 + py * side * 7, 3, 0, Math.PI * 2);
      c.fill();
    }
  }
  function drawCenteredText(text: string, font: string, color: string, y: number) {
    c.font = font;
    c.fillStyle = color;
    c.fillText(text, CANVAS_W / 2, y);
  }
  function drawEndOverlay(title: string) {
    c.fillStyle = OVERLAY_BG;
    c.fillRect(0, 0, CANVAS_W, CANVAS_H);
    c.textAlign = "center";
    c.textBaseline = "middle";
    drawCenteredText(title, OVERLAY_TITLE_FONT, "#fff", CANVAS_H / 2 - 20);
    drawCenteredText(
      `PUNTAJE: ${score}`,
      OVERLAY_SCORE_FONT,
      "rgba(255,255,255,0.8)",
      CANVAS_H / 2 + 40,
    );
    drawCenteredText(RESTART_HINT, OVERLAY_HINT_FONT, "rgba(255,255,255,0.65)", CANVAS_H / 2 + 72);
  }
  function draw() {
    c.globalAlpha = 1;
    c.fillStyle = "#000";
    c.fillRect(0, 0, CANVAS_W, CANVAS_H);
    if (!sheet) return;
    drawBoard();
    drawFruit(c, sheet, FRUITS[fruitName], fruit.col, fruit.row);
    drawSnake();
    drawHud();
    if (state === "ready") {
      c.fillStyle = OVERLAY_BG;
      c.fillRect(0, CANVAS_H / 2 - 30, CANVAS_W, 60);
      c.textAlign = "center";
      c.textBaseline = "middle";
      drawCenteredText(READY_TEXT, READY_FONT, "#fff", CANVAS_H / 2);
    }
    if (state === "gameover") drawEndOverlay(GAME_OVER_TEXT);
    if (state === "win") drawEndOverlay(WIN_TEXT);
  }
  // ── Bucle principal ────────────────────────────────────────────────────────
  function loop(ts: number) {
    rafId = null;
    if (destroyed || paused) return;
    const dt = lastTime === null ? 0 : Math.min(ts - lastTime, MAX_DT);
    lastTime = ts;
    update(dt);
    draw(); // también dibuja el último frame con el overlay al terminar
    // update() puede haber disparado callbacks que pausan o destruyen el motor
    if (!destroyed && !paused) rafId = requestAnimationFrame(loop);
  }
  function startLoop() {
    if (rafId !== null || destroyed || !sheet) return;
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }
  function stopLoop() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }
  // ── Arranque ───────────────────────────────────────────────────────────────
  window.addEventListener("keydown", onKeyDown);
  initGame();
  draw();
  // El bucle solo arranca cuando fruits.png termina de cargar.
  const cancelLoad = loadSpritesheet(
    SPRITESHEET_SRC,
    (img) => {
      if (destroyed) return;
      sheet = img;
      draw();
      if (!paused) startLoop();
    },
    () => console.error("No se pudo cargar el spritesheet de frutas de Snake"),
  );
  // ── API pública ────────────────────────────────────────────────────────────
  return {
    pause() {
      if (paused || destroyed) return;
      paused = true;
      queue = [];
      stopLoop();
    },
    resume() {
      if (!paused || destroyed) return;
      paused = false;
      startLoop(); // reinicia lastTime: sin salto de dt
    },
    restart() {
      if (destroyed) return;
      initGame();
      if (paused) draw();
    },
    endGame() {
      if (destroyed) return;
      endGame();
      if (paused) draw();
    },
    destroy() {
      destroyed = true;
      stopLoop();
      cancelLoad();
      window.removeEventListener("keydown", onKeyDown);
    },
  };
};
