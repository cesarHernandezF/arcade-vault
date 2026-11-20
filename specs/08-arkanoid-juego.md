# SPEC 08 — Juego Arkanoid en la plataforma

> **Status:** Aprobado
> **Depends on:** SPEC 05, SPEC 06, SPEC 07
> **Date:** 2026-11-20
> **Objective:** Adaptar el Arkanoid de `references/started-games/04-arkanoid` como módulo TypeScript aislado dentro del canvas 800×600, con sus sprites y sonidos, registrarlo y sembrarlo en `games` para que tenga ficha, jugar, guardado de puntuaciones y leaderboard.

---

## Por qué existe esta spec

Arkanoid es el tercer juego real de la plataforma (tras Asteroides, SPEC 05, y Tetris, SPEC 07) y el primero con assets: un spritesheet PNG y dos efectos de sonido. El original (`game.js`, 268 líneas, más `levels.js` y `assets/spritesheet.js`) es JavaScript plano con globals, tres `<script>` cargados en orden, `document.getElementById`, un `Audio` global y listeners en `document` y en el canvas que nunca se quitan. Se porta con el mismo patrón que Asteroides y Tetris (`lib/games/<id>/`): estado en el closure, ciclo de vida explícito y contrato `GameEngine`/`GameEvents`.

Inventario del original:

- **Canvas:** 800×600, sin canvas extra. Es el tamaño del contrato actual: no hay brecha de tamaño.
- **Controles:** `ArrowLeft`/`ArrowRight` (paleta a 400 px/s) y ratón (`mousemove` sobre el canvas, con el escalado CSS compensado). `KeyP` y `Escape` pausan. En la pausa, 5 botones dibujados en el canvas (`click`) saltan a cualquier nivel.
- **Vidas:** 3. Al caer la pelota se descuenta una; con 0 el estado pasa a `gameover`. La pelota se recoloca sobre la paleta y se mueve de inmediato (no hay saque).
- **Niveles:** 5, definidos en `levels.js` (parrilla 10×6, pirámide, ajedrez, filas con huecos, marco con cruz). La velocidad de la pelota es `[200, -300] × speed` con `speed` en `1.00, 1.10, 1.21, 1.33, 1.46`. Al romper el último bloque se pasa al siguiente nivel; tras el 5 el estado pasa a `win`.
- **Puntuación:** 10 puntos por bloque. Un solo bloque por frame; la colisión solo invierte `vy`.
- **Paleta:** el código dibuja 81×14 px (`paddle.w = 81`) aunque el sprite mide 162×14 y el `CLAUDE.md` del original dice 162. Manda el código.
- **HUD y overlays:** todo va dibujado en el canvas: `Score`, `Nivel` y una pelota por vida (solo mientras se juega), y overlays de `GAME OVER`, `¡Completaste el juego!` y pausa. No hay DOM.
- **Assets:** `assets/spritesheet-breakout.png` (30 KB), `ball-bounce.mp3` y `break-sound.mp3`. El spritesheet se copia a un canvas offscreen al cargar y el bucle arranca al terminar la carga. Cada sonido se reproduce con `cloneNode().play()`.
- **Animación:** al romper un bloque, explosión de 4 frames del spritesheet durante `EXPLOSION_DURATION = 150` ms.
- **Reinicio:** no existe (hay que recargar la página).

Brechas con el contrato actual y su resolución:

| Brecha                                                 | Resolución                                                                                                                                                                                                                                   |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canvas 800×600                                         | Ninguna: coincide con el contrato.                                                                                                                                                                                                           |
| 3 vidas                                                | Ninguna: `DEFAULT_GAME_META` ya es `{ initialLives: 3, lines: false }`. Arkanoid no entra en `GAME_META`.                                                                                                                                    |
| Assets (sprites y sonido)                              | Archivos en `public/games/arkanoid/`; el motor los carga dentro de `createEngine`, arranca el bucle al terminar la carga y `destroy()` detiene el audio y descarta las cargas pendientes (checklist, sección 6). Sin extensión del contrato. |
| Ratón                                                  | Listener `mousemove` sobre el propio canvas que recibe `createEngine`, quitado en `destroy()`. Sin extensión del contrato.                                                                                                                   |
| Pausa con `KeyP`/`Escape` y selector de nivel dibujado | Se eliminan: la pausa es de React (decisión cerrada de SPEC 05).                                                                                                                                                                             |
| Fin de partida por victoria                            | `onGameOver(score)` también al completar el nivel 5; el modal de React es el mismo.                                                                                                                                                          |
| Sin reinicio                                           | Tecla `Enter` en game over o victoria (como Tetris, SPEC 07), más "JUGAR DE NUEVO" de React.                                                                                                                                                 |
| Pestaña GLOBAL del Salón                               | Ya existe desde SPEC 07: Arkanoid entra sin cambios.                                                                                                                                                                                         |

---

## Scope

**In:**

- Motor en `lib/games/arkanoid/` (`constants.ts`, `levels.ts`, `sprites.ts`, `engine.ts`) que implementa el contrato `GameEngine`/`GameEvents`. No hay `entities.ts`: el original no tiene clases.
- Assets copiados de `references/started-games/04-arkanoid/assets/` a `public/games/arkanoid/` (`spritesheet-breakout.png`, `sounds/ball-bounce.mp3`, `sounds/break-sound.mp3`).
- Registro en `GAME_ENGINES` (`lib/games/registry.ts`), una línea.
- Migración `seed_game_arkanoid`: una fila en `games`, sin filas en `scores`.
- Clase de portada `.cover-arkanoid` en `app/globals.css` (bloques neón de colores, paleta y pelota, diseñada con `/frontend-design`).
- Canvas interno 800×600 con HUD y overlays propios (doble HUD, como SPEC 05): `Score`, `Nivel` y pelotas de vida, overlay `GAME OVER` y overlay de victoria.
- Los 5 niveles de `levels.js`, las velocidades por nivel, las 3 vidas, los 10 puntos por bloque, la física y la animación de explosión sin cambiar valores.
- Sonido dentro del motor: rebote (paredes y paleta) y rotura de bloque.
- Control con teclado (`ArrowLeft`/`ArrowRight`) y ratón (`mousemove` sobre el canvas).
- Victoria al romper todos los bloques del nivel 5: el motor emite `onGameOver(score)` una sola vez.
- Tecla `Enter` en game over o victoria para reiniciar desde el canvas.

**Out of scope (para specs futuras):**

- Controles táctiles. En móvil el juego se ve pero no se puede jugar.
- Control de volumen, silencio o música de fondo.
- Pausa con `KeyP`/`Escape` y el selector "Saltar al nivel" del original.
- Cambiar la jugabilidad, los sprites, los niveles, la velocidad o la puntuación del original (saque manual, power-ups, bloques resistentes, ángulo de rebote según el punto de la paleta).
- Pausa automática al perder el foco, anti-trampas y validación del puntaje.
- Cambios a Asteroides, a Tetris, al contrato (`lib/game-engine.ts`), a `GamePlayer`, `GameCanvas`, al Salón, al esquema de Supabase y a `references/`.
- Tests automatizados (el proyecto no tiene test runner).

---

## Data model

### Fila de `games`

| Columna    | Valor                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`       | `arkanoid`                                                                                                                                                                                                                                                                                                                                                                                         |
| `title`    | `ARKANOID`                                                                                                                                                                                                                                                                                                                                                                                         |
| `short`    | `Mueve la paleta, rebota la pelota y rompe todos los bloques.`                                                                                                                                                                                                                                                                                                                                     |
| `long`     | `El clásico rompebloques. Mueve la paleta con el ratón o con las flechas para que la pelota no caiga y destruye los bloques de cada nivel. Son cinco niveles con patrones distintos (parrilla, pirámide, ajedrez, huecos y marco con cruz) y la pelota gana un 10 % de velocidad en cada uno. Tienes tres vidas: si la pelota cae, pierdes una. Supera los cinco niveles para completar el juego.` |
| `category` | `ARCADE`                                                                                                                                                                                                                                                                                                                                                                                           |
| `cover`    | `cover-arkanoid`                                                                                                                                                                                                                                                                                                                                                                                   |
| `color`    | `yellow`                                                                                                                                                                                                                                                                                                                                                                                           |

### Contrato y registro

El contrato no cambia. Registro (`lib/games/registry.ts`, se añade una línea a `GAME_ENGINES`; `GAME_META` no se toca):

```ts
export const GAME_ENGINES = {
  asteroides: () => import("@/lib/games/asteroides/engine"),
  tetris: () => import("@/lib/games/tetris/engine"),
  arkanoid: () => import("@/lib/games/arkanoid/engine"),
};
```

Archivos de assets servidos desde `public/`:

```
public/games/arkanoid/spritesheet-breakout.png
public/games/arkanoid/sounds/ball-bounce.mp3
public/games/arkanoid/sounds/break-sound.mp3
```

### Constantes del juego (copiadas de `game.js`, `levels.js` y `spritesheet.js` sin cambiar valores)

- Canvas 800×600. `PADDLE_SPEED = 400`; paleta `{ y: 560, w: 81, h: 14 }`, centrada al empezar; pelota `{ w: 16, h: 16 }`.
- Bloques: `BLOCK_COLS = 10`, `BLOCK_ROWS = 6`, `BLOCK_W = 64`, `BLOCK_H = 24`, `BLOCKS_ORIGIN_X = (800 - 10 * 64) / 2`, `BLOCKS_ORIGIN_Y = 80`.
- Pelota: `BASE_BALL_VX = 200`, `BASE_BALL_VY = -300`, multiplicados por `speed` del nivel. Se coloca centrada sobre la paleta (`y = paddle.y - ball.h`).
- Niveles (`levels.ts`, mismos patrones que `levels.js`): `speed` `1.00, 1.10, 1.21, 1.33, 1.46` con 60, 40, 30, 39 y 39 bloques (208 en total).
- Puntuación: 10 por bloque; máximo posible 2.080. Vidas: 3.
- Explosión: `EXPLOSION_DURATION = 150` ms, 4 frames por color; `gray` reutiliza los frames de `red`.
- Sprites (`sprites.ts`): coordenadas `SPRITES` y `EXPLOSION_FRAMES` de `spritesheet.js`. Se dibuja la `Image` directamente, sin la copia a canvas offscreen del original (el resultado visual es el mismo).
- Overlays y HUD del canvas: los textos y tipografías de `drawOverlay` y `draw` (`bold 64px monospace`, `bold 18px monospace`, fondo `rgba(0, 0, 0, 0.6)`).

Reglas de juego (del original, sin cambios): la pelota rebota en las paredes izquierda, derecha y superior; rebota en la paleta solo si baja (`vy > 0`) y toca su cara superior (hasta `paddle.h + 8` px); al chocar con un bloque lo destruye, suma 10, invierte `vy` y se procesa un solo bloque por frame; si `ball.y > canvas.height` se pierde una vida.

Textos nuevos del canvas (únicos valores nuevos, solo de interfaz): `ENTER PARA REINICIAR` bajo `GAME OVER` y bajo `¡Completaste el juego!`, y `PUNTAJE: <n>` en ambos overlays, con el mismo estilo que Tetris.

Convenciones:

- Estado en el closure de `createEngine`, sin `window` ni `document` al cargar el módulo, sin React (checklist de integración). `Audio`, `Image` y `document.createElement` solo se usan dentro de `createEngine`.
- Listeners de teclado (`keydown`, `keyup`) en `window`, con handlers con nombre quitados en `destroy()`; `mousemove` sobre `canvas`, también quitado. `preventDefault()` en `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `Space` y `Enter`; el `keydown` ignora eventos cuyo `target` sea `INPUT`, `TEXTAREA`, `BUTTON` o `SELECT`.
- `mousemove` convierte `clientX` a coordenadas del canvas con `canvas.width / rect.width` (el CSS escala el canvas) y mueve la paleta solo mientras el estado es `playing` y no hay pausa.
- `Enter` reinicia solo en `gameover` o `win` y si `!e.repeat`; `Space` no reinicia.
- El bucle usa `requestAnimationFrame` con `dt` limitado a 50 ms (Asteroides y Tetris lo hacen igual). Es la única desviación del original, y solo afecta tras pausas o pestañas en segundo plano.
- Eventos solo cuando el valor cambia: `onScore`, `onLives`, `onLevel`. `onGameOver(score)` una sola vez al perder la última vida, al completar el nivel 5 o con `endGame()`.
- Al crearse y en cada reinicio (`restart()` y `Enter`) el motor emite el estado inicial de forma incondicional: `onScore(0)`, `onLives(3)`, `onLevel(1)`. En `Enter`, `onRestart()` se emite antes que ese estado. No se emite `onLines`.
- `restart()` deja puntaje 0, 3 vidas, nivel 1 con el patrón del nivel 1, paleta centrada, explosiones vacías, teclas limpias y estado `playing`.
- `endGame()` pasa a `gameover` y emite `onGameOver(score)` una sola vez; si el estado ya es `gameover` o `win` no hace nada y no toca las vidas.
- `pause()` congela `update` y `draw` y limpia las teclas; `resume()` reinicia `lastTime` para que no haya un salto de `dt`. En pausa no suena nada nuevo.
- El bucle solo arranca cuando el spritesheet termina de cargar. El motor emite el estado inicial al crearse, sin esperar la carga. Si la carga se cancela por `destroy()`, el callback no hace nada.
- Sonido: `cloneNode().play()` como el original, con el rechazo de la promesa capturado (el navegador puede bloquear el audio hasta el primer gesto). `destroy()` pausa los clones en reproducción y descarta los que lleguen después.
- Se dibuja un último frame con el overlay al terminar (el original ya lo dibuja en `draw`, que sigue corriendo).

---

## Implementation plan

0. Antes de escribir código, leer en `node_modules/next/dist/docs/01-app` las guías de Client Components, de carga diferida (`import()` dinámico) y de archivos estáticos en `public/`, y revisar `lib/games/tetris/engine.ts`, `lib/games/asteroides/engine.ts`, `lib/games/registry.ts`, `components/game-canvas.tsx` y `components/game-player.tsx`. Confirmar con `mcp__supabase__list_tables` que `games` y `scores` existen y con `select id from games` que están `asteroides` y `tetris`, y anotar `select count(*) from scores`.
1. Agregar `.cover-arkanoid` en `app/globals.css` (diseñada con `/frontend-design`: fondo oscuro, filas de bloques neón con los colores del original, paleta y pelota, SVG inline como `.cover-tetris`). Prueba manual: la clase no cambia las demás portadas.
2. Copiar los tres assets a `public/games/arkanoid/` con `cp`, sin modificar `references/`. Prueba manual: con `npm run dev`, `/games/arkanoid/spritesheet-breakout.png` y los dos `.mp3` responden 200.
3. Portar las constantes a `lib/games/arkanoid/constants.ts`, los 5 niveles a `lib/games/arkanoid/levels.ts` (misma generación de bloques que `levels.js`) y el spritesheet a `lib/games/arkanoid/sprites.ts` (`SPRITES`, `EXPLOSION_FRAMES`, carga de la `Image` y `drawSprite`/`drawFrame` que reciben `ctx` y la imagen por parámetro). Prueba manual: `npm run lint` sin errores.
4. Crear `lib/games/arkanoid/engine.ts` con `createEngine(canvas, events)`: estado en el closure, carga de assets, bucle con `dt` limitado, teclado y ratón, física, explosiones, sonido, HUD y overlays del canvas, y `pause`, `resume`, `restart`, `endGame` y `destroy`. Prueba manual: `npm run lint` y `npm run build` sin errores.
5. Registrar `arkanoid` en `GAME_ENGINES` y aplicar la migración `seed_game_arkanoid` con `mcp__supabase__apply_migration` en el mismo paso. Prueba manual: `select id from games` incluye `arkanoid`; `/biblioteca` muestra su tarjeta con `—` como mejor puntuación; `/juegos/arkanoid` carga la ficha; `/juegos/arkanoid/jugar` es jugable y `/salon` muestra la pestaña ARKANOID.
6. Verificar en el navegador con Playwright (capturas en `.playwright-screenshots/`) `/biblioteca`, `/juegos/arkanoid`, `/juegos/arkanoid/jugar` y `/salon` a 1280 px y 375 px, y una partida completa con guardado. Insertar puntuaciones de prueba de `arkanoid` junto a las de otro juego para comprobar GLOBAL, y borrarlas con `mcp__supabase__execute_sql`. Ejecutar `npm run lint` y `npm run build`.

---

## Acceptance criteria

### Base de datos

- [ ] `select id from games` incluye `arkanoid` con `cover = 'cover-arkanoid'`, `category = 'ARCADE'` y `color = 'yellow'`.
- [ ] `select count(*) from scores where game_id = 'arkanoid'` devuelve 0 tras aplicar la migración.
- [ ] No existe el directorio `supabase/` ni archivos `.sql` nuevos en el repo.

### Juego

- [ ] `/juegos/arkanoid/jugar` muestra el canvas dentro de `.crt-screen`, con resolución interna 800×600, a ancho completo del marco CRT y sin errores al cargar el spritesheet.
- [ ] Los tres archivos de `public/games/arkanoid/` responden HTTP 200 y son idénticos byte a byte a los de `references/started-games/04-arkanoid/assets/`.
- [ ] El canvas muestra la parrilla de 10×6 bloques del nivel 1, la paleta centrada de 81×14 px, la pelota sobre ella y su HUD (`Score`, `Nivel` y 3 pelotas de vida) a la vez que el HUD de la plataforma.
- [ ] `ArrowLeft`/`ArrowRight` mueven la paleta a 400 px/s sin desplazar la página, y no la sacan de los bordes del canvas.
- [ ] Mover el ratón sobre el canvas centra la paleta bajo el cursor, también con el canvas escalado por CSS (1280 px y 375 px de ancho).
- [ ] La pelota rebota en las paredes izquierda, derecha y superior, y en la paleta solo cuando baja.
- [ ] Romper un bloque suma exactamente 10 puntos, lo hace desaparecer con la animación de explosión de 4 frames y reproduce el sonido de rotura.
- [ ] El rebote en paredes y paleta reproduce el sonido de rebote.
- [ ] Al romper el último bloque de un nivel aparece el siguiente patrón (pirámide, ajedrez, huecos, marco con cruz) con 40, 30, 39 y 39 bloques, la pelota vuelve a la paleta y su velocidad pasa a ×1,10, ×1,21, ×1,33 y ×1,46.
- [ ] El HUD de la plataforma muestra `PUNTUACIÓN`, `VIDAS` y `NIVEL` y coincide con el del canvas; no muestra el stat `LINES`.
- [ ] La partida arranca con 3 `♥` en el HUD de la plataforma desde el primer render y baja a 2 al caer la pelota.
- [ ] Al caer la pelota con vidas restantes, esta vuelve a la paleta con la velocidad del nivel actual y el nivel no cambia.
- [ ] Al perder la tercera vida el canvas muestra `GAME OVER`, `PUNTAJE: <n>` y `ENTER PARA REINICIAR`, el HUD pasa a `—` en vidas y se abre el modal "FIN DEL JUEGO" con el puntaje final del canvas.
- [ ] Al romper el último bloque del nivel 5 el canvas muestra `¡Completaste el juego!`, se abre el modal con el puntaje final del canvas (máximo 2.080) y no se emite un segundo game over.
- [ ] PAUSA congela pelota, paleta, explosiones y puntaje y no deja sonar nada nuevo; REANUDAR continúa sin que la pelota salte.
- [ ] Con el juego en pausa, las flechas y el movimiento del ratón no mueven la paleta, y al reanudar no queda ninguna tecla atascada.
- [ ] El botón FIN lleva el canvas a `GAME OVER` y abre el modal con el puntaje actual; pulsarlo dos veces no emite un segundo game over.
- [ ] "JUGAR DE NUEVO" deja puntaje 0, 3 vidas y nivel 01 en el HUD y en el canvas, y arranca una partida con el patrón del nivel 1.
- [ ] `Enter` en el game over o la victoria del canvas reinicia el juego y React cierra el modal y resetea el estado; `Space` no reinicia y mantener `Enter` pulsado no reinicia dos veces.
- [ ] Escribir las iniciales en el campo del modal, incluido un espacio, no mueve la paleta ni reinicia el juego.
- [ ] Salir y volver a entrar crea una partida nueva, sin listeners duplicados ni `requestAnimationFrame` activos (una pulsación de `ArrowLeft` mueve la paleta a una sola velocidad y un rebote suena una sola vez).
- [ ] Tras desmontar la pantalla no queda ningún sonido ni listener del motor activo (incluido `mousemove` en el canvas).
- [ ] Las teclas `P` y `Escape` no tienen efecto en el juego y no existe selector de nivel.

### Leaderboard y Salón

- [ ] "GUARDAR PUNTUACIÓN" inserta en `scores` una fila con `game_id = 'arkanoid'`, `user_id` nulo y el puntaje del modal.
- [ ] La puntuación aparece en `/juegos/arkanoid`, en la pestaña ARKANOID de `/salon` y en la tarjeta de `/biblioteca` sin reiniciar el servidor.
- [ ] Sin puntuaciones, la ficha de Arkanoid y su pestaña del Salón muestran `SÉ EL PRIMERO EN ENTRAR AL SALÓN DE LA FAMA`.
- [ ] `/salon` muestra las pestañas GLOBAL (primera y activa por defecto), ASTEROIDES, TETRIS y ARKANOID.
- [ ] Con una puntuación de `arkanoid` guardada, GLOBAL la lista con la columna JUEGO igual a `ARKANOID`, ordenada con las demás por puntaje descendente.

### Regresiones

- [ ] `/juegos/asteroides/jugar` y `/juegos/tetris/jugar` siguen igual: canvas 800×600, vidas iniciales de cada uno (3 y 1), HUD sincronizado y `LINES` solo en Tetris.
- [ ] `git diff` solo toca `app/globals.css` (portada), `lib/games/registry.ts` (una línea en `GAME_ENGINES`), `lib/games/arkanoid/`, `public/games/arkanoid/` y `specs/`; no toca `lib/game-engine.ts`, `components/`, `lib/games/asteroides/`, `lib/games/tetris/` ni `references/`.
- [ ] `/biblioteca` y el Home muestran las tarjetas de ASTEROIDES, TETRIS y ARKANOID, y el filtro `ARCADE` muestra solo ARKANOID.

### Calidad

- [ ] A 375 px de ancho `/juegos/arkanoid`, `/juegos/arkanoid/jugar` y `/salon` no tienen scroll horizontal.
- [ ] Sin errores ni advertencias de hidratación en la consola en `/biblioteca`, `/juegos/arkanoid`, `/juegos/arkanoid/jugar` y `/salon`.
- [ ] Tras la verificación, `select count(*) from scores` vuelve al valor anotado en el paso 0 (filas de prueba borradas).
- [ ] `npm run lint` termina sin errores ni advertencias.
- [ ] `npm run build` termina sin errores.

---

## Decisions

- **Sí:** id `arkanoid`, título `ARKANOID`, categoría `ARCADE`, color `yellow`. Lo definió el usuario; cyan y magenta ya los usan Asteroides y Tetris.
- **Sí:** sonido dentro del motor, con los dos mp3 del original. Lo definió el usuario: es parte de la experiencia del juego y la checklist ya define cómo cargar assets sin extender el contrato.
- **No:** dejar el sonido para otra spec. El juego quedaría más plano y habría que volver a tocar el motor.
- **Sí:** control con ratón y teclado, con `mousemove` sobre el propio canvas. Lo definió el usuario: conserva la jugabilidad del original y no requiere eventos nuevos hacia React.
- **No:** solo teclado. Es más simple, pero cambia cómo se juega el original.
- **Sí:** copiar los assets a `public/games/arkanoid/` en vez de importarlos desde `references/`. La checklist lo pide y `references/` no se toca ni se sirve; el coste es duplicar 50 KB.
- **No:** importar los assets con el bundler desde `references/`. Ata la app a una carpeta de referencia que puede cambiar.
- **Sí:** eliminar `KeyP`/`Escape` y el selector "Saltar al nivel". La pausa es de React (decisión cerrada de SPEC 05) y un overlay con botones dibujados en el canvas no cabe en ese modelo; además el selector permitía saltar la progresión y contaminar el ranking.
- **No:** mantener el selector con otra interfaz. Es una mecánica de depuración del original, no de juego.
- **Sí:** la victoria emite `onGameOver(score)` y abre el mismo modal. Hay un solo camino para terminar la partida y el puntaje (máximo 2.080) se guarda como cualquier otro.
- **Sí:** `Enter` reinicia desde el canvas y `Space` no. Es la regla de Tetris (SPEC 07); una sola regla para los juegos nuevos. El original no tenía reinicio, así que es una adición necesaria para la plataforma.
- **Sí:** mostrar `PUNTAJE` y `ENTER PARA REINICIAR` en los overlays del canvas. Sin la pista el jugador no sabría que el reinicio existe; es el único texto nuevo.
- **Sí:** `dt` limitado a 50 ms, como Asteroides y Tetris. Evita que una pestaña en segundo plano lance la pelota a través de bloques; a la velocidad máxima (≈ 438 px/s) un paso de 50 ms recorre 22 px, menos que el alto de un bloque (24 px).
- **Sí:** arrancar el bucle al terminar la carga del spritesheet, como el original, pero emitir el estado inicial al crearse. Así el HUD de React no espera a la carga.
- **Sí:** dibujar la `Image` directamente, sin la copia a canvas offscreen del original. Mismo resultado y menos código con `document` fuera de `createEngine`.
- **Sí:** ancho de paleta 81 px (el del código), no 162 (el del sprite ni el del `CLAUDE.md` del original). La regla es copiar el código sin cambiar valores.
- **Sí:** el saque inmediato de la pelota, un bloque por frame y la inversión de `vy` en colisiones, como el original. No se cambia la sensación de juego.
- **Sí:** sin extensión del contrato ni de `GAME_META`. Los valores por defecto (800×600, 3 vidas) ya cubren a Arkanoid.
- **Sí:** la pestaña GLOBAL no se toca. SPEC 07 la dejó implementada y solo necesita que la fila exista.
- **Sí:** doble HUD (el canvas conserva el suyo y la plataforma muestra el suyo). Cerrado en SPEC 05.
- **Sí:** React controla la pausa y el FIN; el motor solo expone `pause()`, `resume()` y `endGame()`. Cerrado en SPEC 05.
- **Sí:** el juego solo se añade como fila de `games` sembrada por migración; `games` sigue siendo solo lectura. Cerrado en SPEC 06.
- **Sí:** la portada de bloques neón se diseña con `/frontend-design` en el paso 1.

---

## Risks

| Riesgo                                                                                    | Mitigación                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fila en `games` sin motor en `GAME_ENGINES` (o al revés)                                  | Registro y migración en el mismo paso 5; la página de jugar devuelve 404 si falta el motor.                                                                                   |
| Doble montaje de Strict Mode duplica bucles, listeners o sonidos                          | `destroy()` cancela `requestAnimationFrame`, quita los listeners de `window` y del canvas, y pausa el audio; un criterio verifica velocidad y sonido únicos.                  |
| Destruir el motor antes de que cargue el spritesheet deja un bucle o un callback huérfano | El callback de carga comprueba una bandera `destroyed` antes de arrancar el bucle; un criterio cubre salir y volver a entrar.                                                 |
| El spritesheet o un mp3 no cargan (ruta, `basePath`, red)                                 | Se usan rutas absolutas `/games/arkanoid/...` y el paso 2 comprueba el HTTP 200; si falla la imagen, se registra con `console.error` y el bucle no arranca, como el original. |
| El navegador bloquea `Audio.play()` hasta el primer gesto y lanza un rechazo sin capturar | Cada `play()` captura la promesa rechazada; el audio funciona desde la primera tecla o clic.                                                                                  |
| Los clones de `Audio` se acumulan en partidas largas                                      | Se retiran de la lista de activos al terminar (`ended`) y `destroy()` pausa los que queden.                                                                                   |
| El ratón se desalinea cuando el CSS escala el canvas                                      | Se usa `canvas.width / rect.width`, como el original; un criterio lo verifica a 1280 px y 375 px.                                                                             |
| Teclas atascadas tras pausar o perder el foco con una flecha pulsada                      | `pause()` limpia las teclas y `keyup` siempre se procesa; un criterio verifica que no hay teclas atascadas al reanudar.                                                       |
| El texto de overlay (`¡Completaste el juego!` en 64 px) se desborda del canvas            | Se verifica con captura de Playwright; si no cabe, se fija un tamaño menor en `constants.ts`.                                                                                 |
| Verificar la victoria exige completar los 5 niveles                                       | El paso 6 usa un script de Playwright que barre la paleta con el ratón sobre el canvas hasta ganar o perder, y se repite hasta ver la victoria.                               |
| Añadir un cuarto chip activo en `/salon` rompe la maquetación de pestañas a 375 px        | `.hall-tabs` ya usa `flex-wrap`; un criterio verifica que no hay scroll horizontal.                                                                                           |
| GLOBAL lo domina el juego de mayor puntaje bruto (Tetris, miles; Arkanoid, máximo 2.080)  | Se acepta, como en SPEC 07; la columna JUEGO deja claro el origen y una métrica normalizada va en otra spec.                                                                  |

---

## What is **not** in this spec

- Controles táctiles ni vista jugable en móvil.
- Volumen, silencio o música de fondo.
- La pausa con `P`/`Escape` y el selector "Saltar al nivel" del original.
- Cambios de jugabilidad, sprites, niveles, velocidad o puntuación del original.
- Anti-trampas, rate limiting y pausa automática al perder el foco.
- Cambios a Asteroides, Tetris, el contrato, `GamePlayer`, `GameCanvas`, el Salón, el esquema de Supabase y `references/`.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propia spec.
