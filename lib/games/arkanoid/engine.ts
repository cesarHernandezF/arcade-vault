import type { CreateEngine, GameEngine, GameEvents } from "@/lib/game-engine";
import {
  BALL_H,
  BALL_W,
  BASE_BALL_VX,
  BASE_BALL_VY,
  BLOCKS_ORIGIN_X,
  BLOCKS_ORIGIN_Y,
  BLOCK_H,
  BLOCK_W,
  BOUNCE_SOUND_SRC,
  BREAK_SOUND_SRC,
  EXPLOSION_DURATION,
  EXPLOSION_FRAME_COUNT,
  GAME_OVER_TEXT,
  H,
  HUD_FONT,
  HUD_LIFE_SIZE,
  HUD_LIFE_SPACING,
  HUD_PAD,
  INITIAL_LIVES,
  MAX_DT,
  MAX_LEVEL,
  OVERLAY_BG,
  OVERLAY_HINT_FONT,
  OVERLAY_SCORE_FONT,
  OVERLAY_TITLE_FONT,
  OVERLAY_WIN_FONT,
  PADDLE_BOUNCE_TOLERANCE,
  PADDLE_H,
  PADDLE_SPEED,
  PADDLE_W,
  PADDLE_Y,
  POINTS_PER_BLOCK,
  RESTART_HINT,
  SPRITESHEET_SRC,
  W,
  WIN_TEXT,
} from "./constants";
import { LEVELS, type BlockColor } from "./levels";
import { EXPLOSION_FRAMES, SPRITES, drawFrame, drawSprite, loadSpritesheet } from "./sprites";
type State = "playing" | "gameover" | "win";
interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  alive: boolean;
}
interface Explosion {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  elapsed: number; // ms
}
type Key = "ArrowLeft" | "ArrowRight";
const GAME_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "Enter"];
const IGNORED_TARGETS = ["INPUT", "TEXTAREA", "BUTTON", "SELECT"];
export const createEngine: CreateEngine = (
  canvas: HTMLCanvasElement,
  events: GameEvents,
): GameEngine => {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
  const c: CanvasRenderingContext2D = ctx;
  // ── Estado (vive en el closure) ────────────────────────────────────────────
  const paddle = { x: 0, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
  const ball = { x: 0, y: 0, w: BALL_W, h: BALL_H, vx: BASE_BALL_VX, vy: BASE_BALL_VY };
  const keys: Record<Key, boolean> = { ArrowLeft: false, ArrowRight: false };
  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let score = 0;
  let lives = INITIAL_LIVES;
  let level = 1;
  let state: State = "playing";
  let paused = false;
  let destroyed = false;
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let sheet: HTMLImageElement | null = null;
  // ── Sonido ─────────────────────────────────────────────────────────────────
  const bounceSound = new Audio(BOUNCE_SOUND_SRC);
  const breakSound = new Audio(BREAK_SOUND_SRC);
  const activeClones = new Set<HTMLAudioElement>();
  function play(sound: HTMLAudioElement) {
    if (destroyed || paused) return;
    const clone = sound.cloneNode() as HTMLAudioElement;
    const release = () => {
      activeClones.delete(clone);
      clone.removeEventListener("ended", release);
    };
    activeClones.add(clone);
    clone.addEventListener("ended", release);
    // El navegador puede bloquear el audio hasta el primer gesto del usuario.
    clone.play().catch(release);
  }
  // ── Emisión de eventos (solo cuando el valor cambia) ───────────────────────
  function setScore(v: number) {
    if (v === score) return;
    score = v;
    events.onScore(score);
  }
  function setLives(v: number) {
    if (v === lives) return;
    lives = v;
    events.onLives(lives);
  }
  // ── Lógica ─────────────────────────────────────────────────────────────────
  function placeBall() {
    const speed = LEVELS[level - 1].speed;
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * speed;
    ball.vy = BASE_BALL_VY * speed;
  }
  function loadLevel(n: number) {
    level = n;
    blocks = LEVELS[n - 1].blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    explosions = [];
    placeBall();
  }
  function collideAABB(b: Block) {
    return (
      ball.x < b.x + b.w && ball.x + ball.w > b.x && ball.y < b.y + b.h && ball.y + ball.h > b.y
    );
  }
  // Estado inicial: se emite de forma incondicional (React ya pudo reiniciar su estado).
  function initGame() {
    score = 0;
    lives = INITIAL_LIVES;
    state = "playing";
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
    paddle.x = (W - paddle.w) / 2;
    loadLevel(1);
    events.onScore(score);
    events.onLives(lives);
    events.onLevel(level);
  }
  function restartFromCanvas() {
    events.onRestart();
    initGame();
  }
  function loseLife() {
    if (lives - 1 <= 0) {
      state = "gameover";
      setLives(0);
      events.onGameOver(score);
    } else {
      setLives(lives - 1);
      placeBall();
    }
  }
  function update(dtSec: number) {
    if (state !== "playing") return;
    if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dtSec);
    if (keys.ArrowRight) paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dtSec);
    ball.x += ball.vx * dtSec;
    ball.y += ball.vy * dtSec;
    // Paredes izquierda, derecha y superior
    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
      play(bounceSound);
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
      play(bounceSound);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
      play(bounceSound);
    }
    // Paleta: solo si la pelota baja
    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + PADDLE_BOUNCE_TOLERANCE
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
      play(bounceSound);
    }
    // Bloques: uno por frame
    for (const block of blocks) {
      if (!block.alive) continue;
      if (!collideAABB(block)) continue;
      block.alive = false;
      explosions.push({
        x: block.x,
        y: block.y,
        w: block.w,
        h: block.h,
        color: block.color,
        elapsed: 0,
      });
      setScore(score + POINTS_PER_BLOCK);
      ball.vy = -ball.vy;
      play(breakSound);
      if (blocks.every((b) => !b.alive)) {
        if (level < MAX_LEVEL) {
          const next = level + 1;
          loadLevel(next);
          events.onLevel(next);
        } else {
          state = "win";
          events.onGameOver(score);
        }
      }
      break;
    }
    // Explosiones
    for (const exp of explosions) exp.elapsed += dtSec * 1000;
    explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);
    // Pelota perdida (no aplica si el último bloque ya terminó la partida)
    if (state === "playing" && ball.y > H) loseLife();
  }
  // ── Input ──────────────────────────────────────────────────────────────────
  const onKeyDown = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && IGNORED_TARGETS.includes(t.tagName)) return;
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    if (paused || destroyed) return;
    if (state !== "playing") {
      if (e.code === "Enter" && !e.repeat) restartFromCanvas();
      return;
    }
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") keys[e.code] = true;
  };
  // keyup siempre se procesa para no dejar teclas atascadas
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") keys[e.code] = false;
  };
  const onMouseMove = (e: MouseEvent) => {
    if (destroyed || paused || state !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    paddle.x = Math.max(0, Math.min(W - paddle.w, mouseX - paddle.w / 2));
  };
  // ── Dibujo ─────────────────────────────────────────────────────────────────
  function drawOverlay(title: string, font: string) {
    c.fillStyle = OVERLAY_BG;
    c.fillRect(0, 0, W, H);
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "#fff";
    c.font = font;
    c.fillText(title, W / 2, H / 2 - 20);
    c.font = OVERLAY_SCORE_FONT;
    c.fillStyle = "rgba(255,255,255,0.8)";
    c.fillText(`PUNTAJE: ${score}`, W / 2, H / 2 + 40);
    c.font = OVERLAY_HINT_FONT;
    c.fillStyle = "rgba(255,255,255,0.65)";
    c.fillText(RESTART_HINT, W / 2, H / 2 + 72);
  }
  function draw() {
    c.globalAlpha = 1;
    c.fillStyle = "#000";
    c.fillRect(0, 0, W, H);
    if (!sheet) return;
    for (const b of blocks)
      if (b.alive) drawSprite(c, sheet, SPRITES.blocks[b.color], b.x, b.y, b.w, b.h);
    for (const exp of explosions) {
      const frameIndex = Math.min(
        Math.floor((exp.elapsed / EXPLOSION_DURATION) * EXPLOSION_FRAME_COUNT),
        EXPLOSION_FRAME_COUNT - 1,
      );
      drawFrame(c, sheet, EXPLOSION_FRAMES[exp.color][frameIndex], exp.x, exp.y, exp.w, exp.h);
    }
    drawSprite(c, sheet, SPRITES.paddle, paddle.x, paddle.y, paddle.w, paddle.h);
    drawSprite(c, sheet, SPRITES.ball, ball.x, ball.y, ball.w, ball.h);
    if (state === "playing") {
      c.fillStyle = "#fff";
      c.font = HUD_FONT;
      c.textBaseline = "top";
      c.textAlign = "left";
      c.fillText(`Score: ${score}`, HUD_PAD, HUD_PAD);
      c.textAlign = "center";
      c.fillText(`Nivel: ${level}`, W / 2, HUD_PAD);
      for (let i = 0; i < lives; i++) {
        const bx = W - HUD_PAD - (lives - i) * (HUD_LIFE_SIZE + HUD_LIFE_SPACING);
        drawSprite(c, sheet, SPRITES.ball, bx, HUD_PAD, HUD_LIFE_SIZE, HUD_LIFE_SIZE);
      }
    }
    if (state === "gameover") drawOverlay(GAME_OVER_TEXT, OVERLAY_TITLE_FONT);
    if (state === "win") drawOverlay(WIN_TEXT, OVERLAY_WIN_FONT);
  }
  // ── Bucle principal ────────────────────────────────────────────────────────
  function loop(ts: number) {
    rafId = null;
    if (destroyed || paused) return;
    const dt = lastTime === null ? 0 : Math.min(ts - lastTime, MAX_DT);
    lastTime = ts;
    update(dt / 1000);
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
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("mousemove", onMouseMove);
  initGame();
  draw();
  // El bucle solo arranca cuando el spritesheet termina de cargar.
  const cancelLoad = loadSpritesheet(
    SPRITESHEET_SRC,
    (img) => {
      if (destroyed) return;
      sheet = img;
      draw();
      if (!paused) startLoop();
    },
    () => console.error("No se pudo cargar el spritesheet de Arkanoid"),
  );
  // ── API pública ────────────────────────────────────────────────────────────
  return {
    pause() {
      if (paused || destroyed) return;
      paused = true;
      keys.ArrowLeft = false;
      keys.ArrowRight = false;
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
      if (destroyed || state !== "playing") return;
      state = "gameover";
      events.onGameOver(score);
      if (paused) draw();
    },
    destroy() {
      destroyed = true;
      stopLoop();
      cancelLoad();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousemove", onMouseMove);
      activeClones.forEach((clone) => clone.pause());
      activeClones.clear();
    },
  };
};
