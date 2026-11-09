import type { CreateEngine, GameEngine, GameEvents } from "@/lib/game-engine";
import {
  H,
  INITIAL_ASTEROIDS,
  INITIAL_LIVES,
  POINTS,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  W,
} from "./constants";
import { Asteroid, Bullet, dist, Keys, Particle, PowerUp, rand, Ship } from "./entities";
type State = "playing" | "dead" | "gameover";
const GAME_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"];
const IGNORED_TARGETS = ["INPUT", "TEXTAREA", "BUTTON", "SELECT"];
export const createEngine: CreateEngine = (
  canvas: HTMLCanvasElement,
  events: GameEvents,
): GameEngine => {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
  // ── Estado (vive en el closure) ────────────────────────────────────────────
  const keys: Keys = {};
  const justPressed: Keys = {};
  let ship = new Ship();
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];
  let powerUps: PowerUp[] = [];
  let score = 0;
  let lives = INITIAL_LIVES;
  let level = 1;
  let state: State = "playing";
  let deadTimer = 0;
  let powerUpSpawned = false;
  let killsSinceSpawn = 0;
  let paused = false;
  let destroyed = false;
  let rafId: number | null = null;
  let lastTime: number | null = null;
  // ── Input ──────────────────────────────────────────────────────────────────
  const isIgnoredTarget = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    return !!t && IGNORED_TARGETS.includes(t.tagName);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (isIgnoredTarget(e)) return;
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    if (paused) return;
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keys[e.code] = false;
  };
  function pressed(code: string) {
    const val = justPressed[code];
    justPressed[code] = false;
    return val;
  }
  function clearInput() {
    for (const k of Object.keys(keys)) keys[k] = false;
    for (const k of Object.keys(justPressed)) justPressed[k] = false;
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
  function setLevel(v: number) {
    if (v === level) return;
    level = v;
    events.onLevel(level);
  }
  // ── Lógica ─────────────────────────────────────────────────────────────────
  function spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }
  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    state = "playing";
    setScore(0);
    setLives(INITIAL_LIVES);
    setLevel(1);
    spawnAsteroids(INITIAL_ASTEROIDS);
  }
  function nextLevel() {
    setLevel(level + 1);
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }
  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }
  function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    setLives(lives - 1);
    if (lives <= 0) {
      state = "gameover";
      events.onGameOver(score);
    } else {
      state = "dead";
      deadTimer = 2;
    }
  }
  function restartFromCanvas() {
    initGame();
    events.onRestart();
  }
  function update(dt: number) {
    if (state === "gameover") {
      if (pressed("Space")) restartFromCanvas();
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      return;
    }
    if (state === "dead") {
      deadTimer -= dt;
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        state = "playing";
        ship.reset();
      }
      return;
    }
    // Disparar
    if (pressed("Space")) {
      bullets.push(...ship.tryShoot());
    }
    ship.update(dt, keys);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));
    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);
    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }
    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    let gained = 0;
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          gained += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= 5;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    if (gained > 0) setScore(score + gained);
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);
    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }
    // Nivel completado
    if (asteroids.length === 0) nextLevel();
  }
  // ── Dibujo ─────────────────────────────────────────────────────────────────
  function drawLifeIcon(x: number, y: number) {
    ctx!.save();
    ctx!.translate(x, y);
    ctx!.rotate(-Math.PI / 2);
    ctx!.strokeStyle = "#fff";
    ctx!.lineWidth = 1.2;
    ctx!.lineJoin = "round";
    ctx!.beginPath();
    ctx!.moveTo(9, 0);
    ctx!.lineTo(-6, -5);
    ctx!.lineTo(-3, 0);
    ctx!.lineTo(-6, 5);
    ctx!.closePath();
    ctx!.stroke();
    ctx!.restore();
  }
  function drawHUD(c: CanvasRenderingContext2D) {
    c.fillStyle = "#fff";
    c.font = "15px monospace";
    c.textAlign = "left";
    c.fillText(`SCORE  ${score}`, 14, 26);
    c.textAlign = "center";
    c.fillText(`NIVEL ${level}`, W / 2, 26);
    for (let i = 0; i < lives; i++) drawLifeIcon(W - 16 - i * 22, 18);
    if (ship.tripleShot > 0) {
      c.textAlign = "left";
      c.fillStyle = "#0ff";
      c.fillText(`3x  ${ship.tripleShot.toFixed(1)}s`, 14, 46);
    }
  }
  function drawOverlay(c: CanvasRenderingContext2D, title: string, sub: string) {
    c.textAlign = "center";
    c.fillStyle = "#fff";
    c.font = "bold 46px monospace";
    c.fillText(title, W / 2, H / 2 - 18);
    c.font = "18px monospace";
    c.fillStyle = "rgba(255,255,255,0.65)";
    c.fillText(sub, W / 2, H / 2 + 22);
  }
  function draw() {
    const c = ctx!;
    c.fillStyle = "#000";
    c.fillRect(0, 0, W, H);
    particles.forEach((p) => p.draw(c));
    asteroids.forEach((a) => a.draw(c));
    powerUps.forEach((p) => p.draw(c));
    bullets.forEach((b) => b.draw(c));
    ship.draw(c);
    drawHUD(c);
    if (state === "gameover")
      drawOverlay(c, "GAME OVER", `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
  }
  // ── Bucle principal ────────────────────────────────────────────────────────
  function loop(ts: number) {
    rafId = null;
    if (destroyed || paused) return;
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    update(dt);
    draw();
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
  window.addEventListener("keyup", onKeyUp);
  // Estado inicial hacia React (no depende de constantes propias de React)
  events.onScore(score);
  events.onLives(lives);
  events.onLevel(level);
  initGame();
  draw();
  startLoop();
  // ── API pública ────────────────────────────────────────────────────────────
  return {
    pause() {
      if (paused || destroyed) return;
      paused = true;
      stopLoop();
      clearInput();
    },
    resume() {
      if (!paused || destroyed) return;
      paused = false;
      clearInput();
      startLoop(); // reinicia lastTime: sin salto de dt
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
      window.removeEventListener("keyup", onKeyUp);
    },
  };
};
