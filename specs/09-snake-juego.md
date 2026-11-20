# SPEC 09 — Juego Snake en la plataforma

> **Status:** Aprobado
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, SPEC 08
> **Date:** 2026-11-20
> **Objective:** Crear el juego Snake (sin código de referencia) como módulo TypeScript aislado dentro del canvas 800×600, con las frutas de `references/source-assets/snake-assets`, registrarlo y sembrarlo en `games` para que tenga ficha, jugar, guardado de puntuaciones y leaderboard.

---

## Por qué existe esta spec

Snake es el cuarto juego de la plataforma (tras Asteroides, SPEC 05; Tetris, SPEC 07; y Arkanoid, SPEC 08) y el primero que se crea desde cero: no hay carpeta en `references/started-games/`. Lo único que existe son los sprites de frutas en `references/source-assets/snake-assets/snake-assets/`:

- `fruits.png`: hoja de 3790×442 px, 585 KB, fondo transparente, con tres filas de frutas (realista, pixel-art y fotográfica).
- `sprites.js`: mapa `window.SPRITE_ATLAS` con 22 recortes `{ x, y, w, h }` de la **fila central** (la pixel-art, `y = 136`, alto 160 px). Los nombres son identificadores del atlas, no descripciones fiables del dibujo.

Como no hay original, esta spec define las reglas, la puntuación, los niveles y la condición de fin (la guía de portado lo exige para juegos desde cero). Se sigue el patrón de `lib/games/arkanoid/` (assets en `public/games/<id>/`, carga de `Image` dentro de `createEngine`, bucle que arranca al terminar la carga) y el de Tetris para una sola vida (`GAME_META`).

Brechas con el contrato actual y su resolución:

| Brecha                         | Resolución                                                                                                                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canvas 800×600                 | Ninguna: coincide con el contrato. Tablero de 20×14 celdas de 40 px más una franja de HUD de 40 px arriba (20×40 = 800; 40 + 14×40 = 600).                                                          |
| 1 vida (la plataforma asume 3) | `GAME_META.snake = { initialLives: 1 }`. La extensión `GAME_META` ya existe desde SPEC 07: solo se añade una entrada.                                                                               |
| Sin stat LINES                 | Ninguna: `lines` queda en `false` por defecto.                                                                                                                                                      |
| Assets (sprites)               | `public/games/snake/fruits.png`; el motor lo carga dentro de `createEngine`, arranca el bucle al terminar la carga y `destroy()` descarta el callback pendiente (checklist, sección 6). Sin sonido. |
| Reinicio                       | Tecla `Enter` en game over (como Tetris y Arkanoid) y "JUGAR DE NUEVO" de React.                                                                                                                    |
| Pestaña GLOBAL del Salón       | Ya existe desde SPEC 07: Snake entra sin cambios.                                                                                                                                                   |
| Portada                        | Ya existe una clase `.cover-snake` huérfana en `app/globals.css` (prototipo anterior, sin uso en `games`). Se rediseña en esa misma clase en vez de crear otra.                                     |

---

## Scope

**In:**

- Motor en `lib/games/snake/` (`constants.ts`, `sprites.ts`, `engine.ts`) que implementa el contrato `GameEngine`/`GameEvents`. No hay `entities.ts`: la serpiente y la fruta son datos simples dentro del closure.
- Asset copiado de `references/source-assets/snake-assets/snake-assets/fruits.png` a `public/games/snake/fruits.png`.
- Registro en `GAME_ENGINES` (una línea) y una entrada `snake` en `GAME_META` (`lib/games/registry.ts`).
- Migración `seed_game_snake`: una fila en `games`, sin filas en `scores`.
- Portada: rediseño de `.cover-snake` en `app/globals.css` (serpiente neón verde y una fruta, diseñada con `/frontend-design`).
- Canvas interno 800×600 con HUD y overlays propios (doble HUD, como SPEC 05): franja superior con `Score` y `Nivel`, y overlays de espera, `GAME OVER` y tablero completo.
- Reglas de la sección "Data model": tablero 20×14, muros letales, choque con el propio cuerpo, una vida, 10 puntos por fruta, nivel cada 5 frutas con velocidad creciente.
- Fruta aleatoria entre las 22 del atlas, dibujada con el sprite.
- Control con teclado: flechas y WASD.
- Tecla `Enter` en game over para reiniciar desde el canvas.

**Out of scope (para specs futuras):**

- Controles táctiles (swipe) y ratón. En móvil el juego se ve pero no se puede jugar.
- Sonido y música (no hay assets de audio).
- Frutas especiales, bonus, obstáculos, modo sin muros, varias vidas, velocidades por dificultad y power-ups.
- Pausa con una tecla del juego: la pausa es de React (decisión cerrada de SPEC 05).
- Pausa automática al perder el foco, anti-trampas y validación del puntaje.
- Sprites para la serpiente (se dibuja con formas del canvas) y animaciones de la fruta.
- Cambios a Asteroides, Tetris, Arkanoid, al contrato (`lib/game-engine.ts`), a `GamePlayer`, `GameCanvas`, al Salón, al esquema de Supabase y a `references/`.
- Tests automatizados (el proyecto no tiene test runner).

---

## Data model

### Fila de `games`

| Columna    | Valor                                                                                                                                                                                                                                                                                               |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`       | `snake`                                                                                                                                                                                                                                                                                             |
| `title`    | `SNAKE`                                                                                                                                                                                                                                                                                             |
| `short`    | `Come frutas, crece y no choques con el muro ni contigo mismo.`                                                                                                                                                                                                                                     |
| `long`     | `La serpiente de siempre en un tablero de 20×14. Guíala con las flechas o con WASD, come las frutas que aparecen al azar y crece con cada una. Cada cinco frutas subes de nivel y la serpiente se acelera. Solo tienes una vida: si chocas con el muro o con tu propio cuerpo, la partida termina.` |
| `category` | `ARCADE`                                                                                                                                                                                                                                                                                            |
| `cover`    | `cover-snake`                                                                                                                                                                                                                                                                                       |
| `color`    | `green`                                                                                                                                                                                                                                                                                             |

### Contrato y registro

El contrato no cambia. En `lib/games/registry.ts` se añade una línea a `GAME_ENGINES` y una entrada a `GAME_META` (`GameMeta` y `DEFAULT_GAME_META` no se tocan):

```ts
export const GAME_META: Record<string, Partial<GameMeta>> = {
  tetris: { initialLives: 1, lines: true },
  snake: { initialLives: 1 },
};
export const GAME_ENGINES = {
  // ...asteroides, tetris, arkanoid
  snake: () => import("@/lib/games/snake/engine"),
};
```

Asset servido desde `public/`:

```
public/games/snake/fruits.png
```

### Constantes del juego (`constants.ts`)

Valores nuevos definidos por esta spec (no hay original):

```ts
export const CANVAS_W = 800;
export const CANVAS_H = 600;
export const CELL = 40;
export const COLS = 20; // 20 × 40 = 800
export const ROWS = 14; // 14 × 40 = 560
export const HUD_H = 40; // franja superior; el tablero empieza en y = 40
export const INITIAL_LENGTH = 3;
export const STEP_MS_BASE = 150; // ms entre pasos en el nivel 1
export const STEP_MS_DECREMENT = 10; // ms menos por nivel
export const STEP_MS_MIN = 60; // se alcanza en el nivel 10
export const FRUITS_PER_LEVEL = 5; // level = floor(fruits / 5) + 1
export const POINTS_PER_FRUIT = 10;
export const INPUT_QUEUE_MAX = 2; // giros en cola
```

`sprites.ts` porta el atlas de `sprites.js` sin cambiar coordenadas ni nombres, como constante exportada `FRUITS` (22 entradas `{ x, y, w, h }`, todas con `y = 136` y `h = 160`), más la carga de la `Image` y una función `drawFruit(ctx, img, sprite, col, row)` que reciben `ctx` y la imagen por parámetro. Se usa `window.SPRITE_ATLAS` solo como fuente de los valores: el módulo no toca `window`.

### Reglas de juego

- **Tablero:** 20×14 celdas; coordenadas `{ col, row }` con origen arriba a la izquierda del tablero. Pixel de la celda: `x = col * 40`, `y = HUD_H + row * 40`.
- **Inicio:** la serpiente mide 3 celdas, con la cabeza en `{ col: 10, row: 7 }` y el cuerpo a su izquierda (`9` y `8`), mirando a la derecha. Estado `ready`: no se mueve hasta que el jugador pulse una dirección válida.
- **Movimiento:** un paso cada `max(STEP_MS_MIN, STEP_MS_BASE - (level - 1) * STEP_MS_DECREMENT)` ms, con acumulador de tiempo.
- **Giros:** `ArrowUp`/`KeyW`, `ArrowDown`/`KeyS`, `ArrowLeft`/`KeyA`, `ArrowRight`/`KeyD`. Una dirección opuesta a la última aceptada (o a la actual si la cola está vacía) o igual a ella se ignora. Se guardan hasta 2 giros en cola para poder girar dos veces entre pasos.
- **Primer movimiento:** en `ready`, la primera dirección válida (arriba, abajo o derecha; izquierda es la opuesta) pasa a `playing` y se aplica desde el siguiente paso.
- **Fruta:** aparece en una celda libre al azar, con un sprite al azar de los 22 del atlas distinto del anterior. Aparece una al empezar y otra cada vez que se come la actual.
- **Comer:** si la cabeza entra en la celda de la fruta, suma 10 puntos, la serpiente crece una celda (la cola no se retira en ese paso) y se cuenta una fruta.
- **Nivel:** `level = floor(fruits / 5) + 1`. Máximo práctico 56 (con 277 frutas).
- **Muerte:** la cabeza sale del tablero o entra en una celda del cuerpo. La celda que deja libre la cola en ese mismo paso cuenta como libre (salvo que se coma una fruta, porque entonces la cola no se retira). Al morir: `onLives(0)`, estado `gameover` y `onGameOver(score)`.
- **Tablero completo:** si tras comer no queda ninguna celda libre para la fruta (280 celdas), estado `win` y `onGameOver(score)`. Puntaje máximo posible: `(280 − 3) × 10 = 2.770`.
- **Sin vidas extra, sin reaparición.**

Textos y estilo del canvas (doble HUD, mismo estilo que Tetris y Arkanoid): franja superior con `Score: <n>` a la izquierda y `Nivel: <n>` a la derecha (`bold 18px monospace`); overlay de espera `PULSA UNA FLECHA PARA EMPEZAR` sobre el tablero en estado `ready`; overlay `GAME OVER` con `PUNTAJE: <n>` y `ENTER PARA REINICIAR`; overlay `¡TABLERO COMPLETO!` con los mismos dos textos; fondo `rgba(0, 0, 0, 0.6)`.

Convenciones:

- Estado en el closure de `createEngine`, sin `window` ni `document` al cargar el módulo, sin React (checklist de integración). `Image` solo se usa dentro de `createEngine`.
- Listeners de teclado (`keydown`) en `window`, con handler con nombre quitado en `destroy()`. `preventDefault()` en `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Space` y `Enter`; el `keydown` ignora eventos cuyo `target` sea `INPUT`, `TEXTAREA`, `BUTTON` o `SELECT`.
- `Enter` reinicia solo en `gameover` o `win` y si `!e.repeat`; `Space` no reinicia.
- El bucle usa `requestAnimationFrame` con `dt` limitado a 50 ms; los pasos de la serpiente salen de un acumulador (`while (acc >= stepMs)`).
- Eventos solo cuando el valor cambia: `onScore`, `onLevel`. `onLives` solo cambia de 1 a 0 al morir. `onGameOver(score)` una sola vez.
- Al crearse y en cada reinicio (`restart()` y `Enter`) el motor emite el estado inicial de forma incondicional: `onScore(0)`, `onLives(1)`, `onLevel(1)`. En `Enter`, `onRestart()` se emite antes que ese estado. No se emite `onLines`.
- `restart()` deja puntaje 0, nivel 1, serpiente inicial en `ready`, una fruta nueva, cola de giros vacía y acumulador en 0.
- `endGame()` pasa a `gameover` y emite `onGameOver(score)` una sola vez, también desde `ready`; si el estado ya es `gameover` o `win` no hace nada. Emite `onLives(0)` solo si la vida seguía en 1.
- `pause()` congela `update` y `draw` y vacía la cola de giros; `resume()` reinicia `lastTime` para que no haya un salto de `dt`.
- El bucle solo arranca cuando `fruits.png` termina de cargar. El motor emite el estado inicial al crearse, sin esperar la carga. Si `destroy()` se llama antes, el callback de carga no hace nada. Si la imagen falla, se registra con `console.error` y el bucle no arranca, como Arkanoid.
- Se dibuja un último frame con el overlay al terminar.

---

## Implementation plan

0. Antes de escribir código, leer en `node_modules/next/dist/docs/01-app` las guías de Client Components, de carga diferida (`import()` dinámico) y de archivos estáticos en `public/`, y revisar `lib/games/arkanoid/engine.ts`, `lib/games/tetris/engine.ts`, `lib/games/registry.ts`, `components/game-canvas.tsx` y `components/game-player.tsx`. Confirmar con `mcp__supabase__list_tables` que `games` y `scores` existen, con `select id from games` que están `asteroides`, `tetris` y `arkanoid`, y anotar `select count(*) from scores`.
1. Rediseñar `.cover-snake` en `app/globals.css` (diseñada con `/frontend-design`: fondo oscuro, serpiente verde neón por segmentos y una fruta, SVG inline como `.cover-arkanoid`). Prueba manual: la clase no cambia las demás portadas.
2. Copiar `fruits.png` a `public/games/snake/` con `cp`, sin modificar `references/`. Prueba manual: con `npm run dev`, `/games/snake/fruits.png` responde 200.
3. Crear `lib/games/snake/constants.ts` y `lib/games/snake/sprites.ts` (`FRUITS`, carga de la `Image`, `drawFruit`). Prueba manual: `npm run lint` sin errores.
4. Crear `lib/games/snake/engine.ts` con `createEngine(canvas, events)`: estado en el closure, carga del asset, bucle con `dt` limitado y acumulador de pasos, cola de giros, colisiones, fruta, HUD y overlays del canvas, y `pause`, `resume`, `restart`, `endGame` y `destroy`. Prueba manual: `npm run lint` y `npm run build` sin errores.
5. Registrar `snake` en `GAME_ENGINES`, añadir su entrada a `GAME_META` y aplicar la migración `seed_game_snake` con `mcp__supabase__apply_migration` en el mismo paso. Prueba manual: `select id from games` incluye `snake`; `/biblioteca` muestra su tarjeta con `—` como mejor puntuación; `/juegos/snake` carga la ficha; `/juegos/snake/jugar` es jugable (1 corazón en el HUD) y `/salon` muestra la pestaña SNAKE.
6. Verificar en el navegador con Playwright (capturas en `.playwright-screenshots/`) `/biblioteca`, `/juegos/snake`, `/juegos/snake/jugar` y `/salon` a 1280 px y 375 px, y una partida con guardado. Para comer frutas sin jugar a mano, un script de Playwright recorre el tablero con un ciclo hamiltoniano (barrido en zigzag por filas con la columna 0 como carril de vuelta) pulsando flechas al ritmo de los pasos; después se estrella contra el muro para terminar. Insertar puntuaciones de prueba de `snake` junto a las de otro juego para comprobar GLOBAL, y borrarlas con `mcp__supabase__execute_sql`. Ejecutar `npm run lint` y `npm run build`.

---

## Acceptance criteria

### Base de datos

- [ ] `select id from games` incluye `snake` con `cover = 'cover-snake'`, `category = 'ARCADE'` y `color = 'green'`.
- [ ] `select count(*) from scores where game_id = 'snake'` devuelve 0 tras aplicar la migración.
- [ ] No existe el directorio `supabase/` ni archivos `.sql` nuevos en el repo.

### Juego

- [ ] `/juegos/snake/jugar` muestra el canvas dentro de `.crt-screen`, con resolución interna 800×600, a ancho completo del marco CRT y sin errores al cargar `fruits.png`.
- [ ] `public/games/snake/fruits.png` responde HTTP 200 y es idéntico byte a byte a `references/source-assets/snake-assets/snake-assets/fruits.png`.
- [ ] Al entrar, el canvas muestra la franja de HUD (`Score: 0`, `Nivel: 1`), el tablero de 20×14 celdas, una serpiente de 3 celdas con la cabeza en la columna 10, fila 7, una fruta dibujada con su sprite y el texto `PULSA UNA FLECHA PARA EMPEZAR`, a la vez que el HUD de la plataforma.
- [ ] La serpiente no se mueve hasta pulsar una dirección válida; pulsar `ArrowLeft` en ese estado no hace nada.
- [ ] Flechas y WASD giran la serpiente sin desplazar la página; una dirección opuesta a la actual se ignora.
- [ ] Dos giros pulsados dentro del mismo paso se aplican en pasos consecutivos (cola de 2).
- [ ] Al nivel 1 la serpiente avanza una celda cada 150 ms (±1 frame).
- [ ] La fruta nunca aparece sobre la serpiente y su sprite sale de la fila de 22 del atlas.
- [ ] Comer una fruta suma exactamente 10 puntos, crece la serpiente una celda y aparece otra fruta.
- [ ] Al comer 5 frutas el nivel pasa a 2 (HUD de la plataforma y del canvas) y el paso baja a 140 ms; al nivel 10 el paso es 60 ms y no baja más.
- [ ] El HUD de la plataforma muestra `PUNTUACIÓN`, `VIDAS` y `NIVEL` y coincide con el del canvas; no muestra el stat `LINES`.
- [ ] La partida arranca con 1 `♥` en el HUD de la plataforma desde el primer render.
- [ ] Chocar con cualquiera de los cuatro muros termina la partida: el canvas muestra `GAME OVER`, `PUNTAJE: <n>` y `ENTER PARA REINICIAR`, el HUD pasa a `—` en vidas y se abre el modal "FIN DEL JUEGO" con el puntaje final del canvas.
- [ ] Chocar con el propio cuerpo termina la partida igual que el muro.
- [ ] `engine.ts` contiene la rama de tablero completo (`win`) que emite `onGameOver(score)` una sola vez y muestra `¡TABLERO COMPLETO!` (revisión de código; no se juega).
- [ ] PAUSA congela la serpiente, el acumulador y el puntaje; REANUDAR continúa sin que la serpiente avance varias celdas de golpe.
- [ ] Con el juego en pausa las flechas no giran la serpiente ni dejan giros en cola al reanudar.
- [ ] El botón FIN lleva el canvas a `GAME OVER` y abre el modal con el puntaje actual, también antes del primer movimiento; pulsarlo dos veces no emite un segundo game over.
- [ ] "JUGAR DE NUEVO" deja puntaje 0, 1 vida y nivel 01 en el HUD y en el canvas, y deja el juego en `ready` con una serpiente de 3 celdas.
- [ ] `Enter` en el game over del canvas reinicia el juego y React cierra el modal y resetea el estado; `Space` no reinicia y mantener `Enter` pulsado no reinicia dos veces.
- [ ] Escribir las iniciales en el campo del modal, incluido un espacio y las letras W, A, S y D, no mueve la serpiente ni reinicia el juego.
- [ ] Salir y volver a entrar crea una partida nueva, sin listeners duplicados ni `requestAnimationFrame` activos (la serpiente avanza a un solo ritmo tras el doble montaje de Strict Mode).
- [ ] Tras desmontar la pantalla no queda ningún listener del motor activo.

### Leaderboard y Salón

- [ ] "GUARDAR PUNTUACIÓN" inserta en `scores` una fila con `game_id = 'snake'`, `user_id` nulo y el puntaje del modal.
- [ ] La puntuación aparece en `/juegos/snake`, en la pestaña SNAKE de `/salon` y en la tarjeta de `/biblioteca` sin reiniciar el servidor.
- [ ] Sin puntuaciones, la ficha de Snake y su pestaña del Salón muestran `SÉ EL PRIMERO EN ENTRAR AL SALÓN DE LA FAMA`.
- [ ] `/salon` muestra las pestañas GLOBAL (primera y activa por defecto), ASTEROIDES, TETRIS, ARKANOID y SNAKE.
- [ ] Con una puntuación de `snake` guardada, GLOBAL la lista con la columna JUEGO igual a `SNAKE`, ordenada con las demás por puntaje descendente.

### Regresiones

- [ ] `/juegos/asteroides/jugar`, `/juegos/tetris/jugar` y `/juegos/arkanoid/jugar` siguen igual: canvas 800×600, vidas iniciales de cada uno (3, 1 y 3), HUD sincronizado y `LINES` solo en Tetris.
- [ ] `git diff` solo toca `app/globals.css` (`.cover-snake`), `lib/games/registry.ts` (una línea en `GAME_ENGINES` y una entrada en `GAME_META`), `lib/games/snake/`, `public/games/snake/` y `specs/`; no toca `lib/game-engine.ts`, `components/`, `lib/games/asteroides/`, `lib/games/tetris/`, `lib/games/arkanoid/` ni `references/`.
- [ ] `/biblioteca` y el Home muestran las tarjetas de ASTEROIDES, TETRIS, ARKANOID y SNAKE, y el filtro `ARCADE` muestra ARKANOID y SNAKE.

### Calidad

- [ ] A 375 px de ancho `/juegos/snake`, `/juegos/snake/jugar` y `/salon` no tienen scroll horizontal.
- [ ] Sin errores ni advertencias de hidratación en la consola en `/biblioteca`, `/juegos/snake`, `/juegos/snake/jugar` y `/salon`.
- [ ] Tras la verificación, `select count(*) from scores` vuelve al valor anotado en el paso 0 (filas de prueba borradas).
- [ ] `npm run lint` termina sin errores ni advertencias.
- [ ] `npm run build` termina sin errores.

---

## Decisions

- **Sí:** id `snake`, título `SNAKE`, categoría `ARCADE`, color `green`. Lo definió el usuario: es el nombre universal del juego (como `tetris` y `arkanoid`), coincide con el texto del Home y verde es el único color libre.
- **No:** id `serpiente`. Sigue la regla de ids en español, pero rompe con el nombre conocido y con el Home.
- **Sí:** una vida y muros letales. Lo definió el usuario: es la regla clásica y reutiliza `GAME_META.initialLives = 1` (SPEC 07) sin lógica de reaparición.
- **No:** tres vidas ni muros que atraviesan. Añaden reglas (reaparición, largo tras morir) o quitan la tensión del juego.
- **Sí:** fruta aleatoria de las 22 del atlas, 10 puntos fijos. Lo definió el usuario: usa todo el asset y no sesga el ranking GLOBAL con valores distintos.
- **No:** valor por rareza ni una fruta fija por nivel. El primero exige balance, el segundo desperdicia el atlas.
- **Sí:** nivel cada 5 frutas con paso de 150 ms que baja 10 ms por nivel hasta 60 ms. Lo definió el usuario (nivel cada 5 frutas); los valores de velocidad son una propuesta de esta spec, claramente jugable y con tope para que a 60 fps un paso nunca exceda un frame de `dt` limitado.
- **Sí:** flechas y WASD, sin táctil ni sonido. Lo definió el usuario: no hay assets de audio y el táctil va en otra spec (checklist).
- **Sí:** tablero 20×14 con franja de HUD de 40 px. El HUD no tapa celdas y el tablero llena el 800×600 sin extender el contrato; 14 filas porque 600 − 40 = 560 = 14 × 40.
- **No:** tablero 20×15 con el HUD dibujado encima. La serpiente pasaría por debajo del texto.
- **Sí:** estado `ready` hasta la primera dirección. Sin saque, la serpiente moriría contra el muro antes de que el jugador reaccione, y en la plataforma el juego arranca al entrar a la pantalla.
- **Sí:** cola de hasta 2 giros y bloqueo de la dirección opuesta. Sin la cola, dos giros rápidos se pierden; sin el bloqueo, un giro de 180° mataría al instante.
- **Sí:** la cola libera su celda en el mismo paso. Es la regla clásica y evita muertes que el jugador no entiende.
- **Sí:** serpiente dibujada con formas del canvas, sin sprites. El asset solo trae frutas y evita depender de más recursos de terceros.
- **Sí:** copiar `fruits.png` a `public/games/snake/` y portar `sprites.js` a `sprites.ts` sin cambiar coordenadas ni nombres. `references/` no se toca ni se sirve, y los nombres del atlas son identificadores (algunos no describen bien la fruta).
- **Sí:** `Enter` reinicia desde el canvas y `Space` no. Misma regla que Tetris y Arkanoid.
- **Sí:** `dt` limitado a 50 ms, como los demás motores. Con el acumulador, una pestaña en segundo plano no ejecuta ráfagas de pasos.
- **Sí:** redefinir la clase huérfana `.cover-snake` en vez de crear otra. Nada más la usa (verificado con búsqueda en el repo) y evita CSS duplicado.
- **Sí:** el tablero completo es victoria (`win`) con `onGameOver`. Es una condición alcanzable en teoría y debe terminar la partida, no dejar la fruta sin sitio.
- **Sí:** doble HUD (el canvas conserva el suyo y la plataforma muestra el suyo). Cerrado en SPEC 05.
- **Sí:** React controla la pausa y el FIN; el motor solo expone `pause()`, `resume()` y `endGame()`. Cerrado en SPEC 05.
- **Sí:** el juego solo se añade como fila de `games` sembrada por migración; `games` sigue siendo solo lectura. Cerrado en SPEC 06.
- **Sí:** la pestaña GLOBAL no se toca. SPEC 07 la dejó implementada y solo necesita que la fila exista.

---

## Risks

| Riesgo                                                                                                                                        | Mitigación                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Fila en `games` sin motor en `GAME_ENGINES` (o al revés)                                                                                      | Registro y migración en el mismo paso 5; la página de jugar devuelve 404 si falta el motor.                                               |
| Doble montaje de Strict Mode duplica bucles o listeners                                                                                       | `destroy()` cancela `requestAnimationFrame` y quita el listener; un criterio verifica un único ritmo de avance.                           |
| Destruir el motor antes de que cargue `fruits.png` deja un bucle huérfano                                                                     | El callback de carga comprueba una bandera `destroyed` antes de arrancar el bucle.                                                        |
| `fruits.png` no carga (ruta, `basePath`, red)                                                                                                 | Ruta absoluta `/games/snake/fruits.png`; el paso 2 comprueba el HTTP 200; si falla, `console.error` y el bucle no arranca, como Arkanoid. |
| La hoja pesa 585 KB y la serpiente arranca tarde en conexiones lentas                                                                         | Se carga solo al entrar en `/juegos/snake/jugar`, el HUD de React no espera, y el overlay de espera aparece al terminar la carga.         |
| Los sprites vienen de un tercero (el `sprites.js` cita The Spriters Resource, origen: el Snake de Google) y pueden tener restricciones de uso | El usuario los aportó para este proyecto; se anota aquí para que decida antes de publicar la plataforma. No se copian más recursos.       |
| Los nombres del atlas no coinciden con el dibujo (p. ej. `garlic`, `grapes2`)                                                                 | Se portan sin cambios y no se usan como texto visible; solo identifican el recorte.                                                       |
| Un recorte del atlas (110–170 px de ancho, 160 de alto) deforma la fruta al encajarla en la celda de 40 px                                    | `drawFruit` escala conservando la proporción dentro de la celda (alto ≤ 36 px, centrada); un criterio visual con captura lo verifica.     |
| Giros rápidos dentro de un mismo paso producen una vuelta de 180° mortal                                                                      | Cola de 2 giros validada contra la última dirección aceptada, no contra la actual.                                                        |
| Verificar comer frutas y subir de nivel a mano es lento                                                                                       | El paso 6 usa un script de Playwright con un ciclo hamiltoniano sobre el tablero.                                                         |
| El tablero completo (277 frutas) es inalcanzable en la verificación                                                                           | Se verifica por revisión de código (criterio explícito); no se simula.                                                                    |
| Añadir un quinto chip activo en `/salon` rompe la maquetación de pestañas a 375 px                                                            | `.hall-tabs` ya usa `flex-wrap`; un criterio verifica que no hay scroll horizontal.                                                       |
| GLOBAL lo domina el juego de mayor puntaje bruto (Snake llega como máximo a 2.770)                                                            | Se acepta, como en SPEC 07 y 08; la columna JUEGO deja claro el origen.                                                                   |

---

## What is **not** in this spec

- Controles táctiles, ratón o vista jugable en móvil.
- Sonido y música.
- Frutas especiales, bonus, obstáculos, modo sin muros, varias vidas, dificultades y power-ups.
- Pausa con una tecla del juego, pausa automática al perder el foco, anti-trampas y rate limiting.
- Sprites o animaciones para la serpiente.
- Cambios a Asteroides, Tetris, Arkanoid, el contrato, `GamePlayer`, `GameCanvas`, el Salón, el esquema de Supabase y `references/`.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propia spec.
