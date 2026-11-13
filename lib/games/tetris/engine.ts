import type { CreateEngine, GameEngine, GameEvents } from "@/lib/game-engine";
import {
  clearLines,
  collide,
  createBoard,
  dropIntervalForLevel,
  ghostY,
  levelForLines,
  merge,
  randomPiece,
  tryRotate,
  type Board,
  type Piece,
} from "./board";
import {
  BLOCK,
  BOARD_BG,
  BOARD_X,
  BOARD_Y,
  COLORS,
  COLS,
  GHOST_ALPHA,
  GRID_COLOR,
  H,
  INITIAL_DROP_INTERVAL,
  INITIAL_LIVES,
  LEFT_PANEL_X,
  LINE_SCORES,
  NEXT_BLOCK,
  RIGHT_PANEL_X,
  ROWS,
  W,
} from "./constants";
type State = "playing" | "gameover";
const GAME_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "Enter"];
const IGNORED_TARGETS = ["INPUT", "TEXTAREA", "BUTTON", "SELECT"];
const MAX_DT = 50; // ms
const CONTROLS = ["← →   MOVER", "↑ / X  ROTAR", "↓     BAJAR", "ESPACIO  CAER"];
export const createEngine: CreateEngine = (
  canvas: HTMLCanvasElement,
  events: GameEvents,
): GameEngine => {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
  const c: CanvasRenderingContext2D = ctx;
  // ── Estado (vive en el closure) ────────────────────────────────────────────
  let board: Board = createBoard();
  let current: Piece = randomPiece();
  let next: Piece = randomPiece();
  let score = 0;
  let lines = 0;
  let level = 1;
  let lives = INITIAL_LIVES;
  let dropInterval = INITIAL_DROP_INTERVAL;
  let dropAccum = 0;
  let state: State = "playing";
  let paused = false;
  let destroyed = false;
  let rafId: number | null = null;
  let lastTime: number | null = null;
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
  function setLines(v: number) {
    if (v === lines) return;
    lines = v;
    events.onLines?.(lines);
  }
  // ── Lógica ─────────────────────────────────────────────────────────────────
  function gameOver() {
    if (state === "gameover") return;
    state = "gameover";
    lives = 0;
    events.onLives(0);
    events.onGameOver(score);
  }
  function spawn() {
    current = next;
    next = randomPiece();
    if (collide(board, current.shape, current.x, current.y)) gameOver();
  }
  function lockPiece() {
    merge(board, current);
    const cleared = clearLines(board);
    if (cleared) {
      // La puntuación usa el nivel anterior a las líneas recién limpiadas, como el original.
      setScore(score + (LINE_SCORES[cleared] || 0) * level);
      setLines(lines + cleared);
      setLevel(levelForLines(lines));
      dropInterval = dropIntervalForLevel(level);
    }
    spawn();
  }
  function stepDown() {
    if (!collide(board, current.shape, current.x, current.y + 1)) current.y++;
    else lockPiece();
  }
  function softDrop() {
    if (!collide(board, current.shape, current.x, current.y + 1)) {
      current.y++;
      setScore(score + 1);
    } else {
      lockPiece();
    }
  }
  function hardDrop() {
    const gy = ghostY(board, current);
    setScore(score + (gy - current.y) * 2);
    current.y = gy;
    lockPiece();
  }
  // Estado inicial: se emite de forma incondicional (React ya pudo reiniciar su estado).
  function initGame() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    lives = INITIAL_LIVES;
    dropInterval = INITIAL_DROP_INTERVAL;
    dropAccum = 0;
    state = "playing";
    next = randomPiece();
    spawn();
    events.onScore(score);
    events.onLives(lives);
    events.onLevel(level);
    events.onLines?.(lines);
  }
  function restartFromCanvas() {
    events.onRestart();
    initGame();
  }
  function update(dt: number) {
    if (state !== "playing") return;
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      stepDown();
    }
  }
  // ── Input ──────────────────────────────────────────────────────────────────
  const onKeyDown = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && IGNORED_TARGETS.includes(t.tagName)) return;
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    if (paused || destroyed) return;
    if (state === "gameover") {
      if (e.code === "Enter" && !e.repeat) {
        restartFromCanvas();
      }
      return;
    }
    switch (e.code) {
      case "ArrowLeft":
        if (!collide(board, current.shape, current.x - 1, current.y)) current.x--;
        break;
      case "ArrowRight":
        if (!collide(board, current.shape, current.x + 1, current.y)) current.x++;
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate(board, current);
        break;
      case "Space":
        hardDrop();
        break;
    }
  };
  // ── Dibujo ─────────────────────────────────────────────────────────────────
  function drawBlock(x: number, y: number, type: number, size: number, alpha = 1) {
    if (!type) return;
    c.globalAlpha = alpha;
    c.fillStyle = COLORS[type] as string;
    c.fillRect(x + 1, y + 1, size - 2, size - 2);
    c.fillStyle = "rgba(255,255,255,0.12)";
    c.fillRect(x + 1, y + 1, size - 2, 4);
    c.globalAlpha = 1;
  }
  function drawBoard() {
    c.fillStyle = BOARD_BG;
    c.fillRect(BOARD_X, BOARD_Y, COLS * BLOCK, ROWS * BLOCK);
    c.strokeStyle = GRID_COLOR;
    c.lineWidth = 0.5;
    for (let col = 1; col < COLS; col++) {
      c.beginPath();
      c.moveTo(BOARD_X + col * BLOCK, BOARD_Y);
      c.lineTo(BOARD_X + col * BLOCK, BOARD_Y + ROWS * BLOCK);
      c.stroke();
    }
    for (let row = 1; row < ROWS; row++) {
      c.beginPath();
      c.moveTo(BOARD_X, BOARD_Y + row * BLOCK);
      c.lineTo(BOARD_X + COLS * BLOCK, BOARD_Y + row * BLOCK);
      c.stroke();
    }
    for (let r = 0; r < ROWS; r++)
      for (let col = 0; col < COLS; col++)
        drawBlock(BOARD_X + col * BLOCK, BOARD_Y + r * BLOCK, board[r][col], BLOCK);
    const gy = ghostY(board, current);
    for (let r = 0; r < current.shape.length; r++)
      for (let col = 0; col < current.shape[r].length; col++)
        if (current.shape[r][col])
          drawBlock(
            BOARD_X + (current.x + col) * BLOCK,
            BOARD_Y + (gy + r) * BLOCK,
            current.shape[r][col],
            BLOCK,
            GHOST_ALPHA,
          );
    for (let r = 0; r < current.shape.length; r++)
      for (let col = 0; col < current.shape[r].length; col++)
        drawBlock(
          BOARD_X + (current.x + col) * BLOCK,
          BOARD_Y + (current.y + r) * BLOCK,
          current.shape[r][col],
          BLOCK,
        );
  }
  function drawStat(label: string, value: string, y: number) {
    c.textAlign = "left";
    c.fillStyle = "rgba(255,255,255,0.55)";
    c.font = "13px monospace";
    c.fillText(label, LEFT_PANEL_X, y);
    c.fillStyle = "#fff";
    c.font = "bold 28px monospace";
    c.fillText(value, LEFT_PANEL_X, y + 34);
  }
  function drawLeftPanel() {
    drawStat("SCORE", score.toLocaleString("es-ES"), 60);
    drawStat("LINES", String(lines), 160);
    drawStat("LEVEL", String(level), 260);
  }
  function drawRightPanel() {
    const boxX = RIGHT_PANEL_X + 30;
    const boxY = 80;
    c.textAlign = "left";
    c.fillStyle = "rgba(255,255,255,0.55)";
    c.font = "13px monospace";
    c.fillText("NEXT", RIGHT_PANEL_X, 60);
    c.fillStyle = BOARD_BG;
    c.fillRect(boxX, boxY, 4 * NEXT_BLOCK, 4 * NEXT_BLOCK);
    c.strokeStyle = GRID_COLOR;
    c.lineWidth = 1;
    c.strokeRect(boxX, boxY, 4 * NEXT_BLOCK, 4 * NEXT_BLOCK);
    const shape = next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    for (let r = 0; r < shape.length; r++)
      for (let col = 0; col < shape[r].length; col++)
        drawBlock(
          boxX + (offX + col) * NEXT_BLOCK,
          boxY + (offY + r) * NEXT_BLOCK,
          shape[r][col],
          NEXT_BLOCK,
        );
    c.fillStyle = "rgba(255,255,255,0.55)";
    c.font = "13px monospace";
    c.fillText("CONTROLES", RIGHT_PANEL_X, 260);
    c.fillStyle = "rgba(255,255,255,0.8)";
    CONTROLS.forEach((line, i) => c.fillText(line, RIGHT_PANEL_X, 290 + i * 24));
  }
  function drawOverlay() {
    const cx = BOARD_X + (COLS * BLOCK) / 2;
    c.fillStyle = "rgba(0,0,0,0.72)";
    c.fillRect(BOARD_X, BOARD_Y, COLS * BLOCK, ROWS * BLOCK);
    c.textAlign = "center";
    c.fillStyle = "#fff";
    c.font = "bold 36px monospace";
    c.fillText("GAME OVER", cx, H / 2 - 18);
    c.font = "18px monospace";
    c.fillStyle = "rgba(255,255,255,0.8)";
    c.fillText(`PUNTAJE: ${score}`, cx, H / 2 + 20);
    c.font = "14px monospace";
    c.fillStyle = "rgba(255,255,255,0.65)";
    c.fillText("ENTER PARA REINICIAR", cx, H / 2 + 52);
  }
  function draw() {
    c.globalAlpha = 1;
    c.fillStyle = "#000";
    c.fillRect(0, 0, W, H);
    drawBoard();
    drawLeftPanel();
    drawRightPanel();
    if (state === "gameover") drawOverlay();
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
    if (rafId !== null || destroyed) return;
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
  startLoop();
  // ── API pública ────────────────────────────────────────────────────────────
  return {
    pause() {
      if (paused || destroyed) return;
      paused = true;
      stopLoop();
    },
    resume() {
      if (!paused || destroyed) return;
      paused = false;
      startLoop(); // reinicia lastTime: sin salto de dt, dropAccum no acumula la pausa
    },
    restart() {
      if (destroyed) return;
      initGame();
      if (paused) draw();
    },
    endGame() {
      if (destroyed || state === "gameover") return;
      state = "gameover";
      events.onGameOver(score);
      if (paused) draw();
    },
    destroy() {
      destroyed = true;
      stopLoop();
      window.removeEventListener("keydown", onKeyDown);
    },
  };
};
