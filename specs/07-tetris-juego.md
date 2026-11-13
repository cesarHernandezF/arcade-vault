# SPEC 07 — Juego Tetris en la plataforma

> **Status:** Aprobado
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-11-13
> **Objective:** Adaptar el Tetris de `references/started-games/03-tetris` como módulo TypeScript aislado dentro del canvas 800×600, registrarlo y sembrarlo en `games` para que tenga ficha, jugar, guardado de puntuaciones y leaderboard, y añadir la pestaña GLOBAL al Salón de la Fama.

---

## Por qué existe esta spec

Tetris es el segundo juego real de la plataforma (el primero es Asteroides, SPEC 05). El original (`game.js`, 332 líneas) es JavaScript plano con globals, `document.getElementById`, un segundo `<canvas>` para la pieza siguiente, un panel DOM (SCORE, LINES, LEVEL), un overlay DOM para PAUSA y GAME OVER, un botón de tema claro/oscuro y un listener de teclado en `document` que nunca se quita. Se porta con el mismo patrón que Asteroides (`lib/games/asteroides/`): estado en el closure, ciclo de vida explícito y contrato `GameEngine`/`GameEvents`.

Inventario del original:

- **Canvas:** tablero 300×600 (`COLS 10`, `ROWS 20`, `BLOCK 30`) y canvas de vista previa 120×120.
- **Controles:** `ArrowLeft`/`ArrowRight` (mover), `ArrowUp` o `KeyX` (rotar con wall kicks `[0, -1, 1, -2, 2]`), `ArrowDown` (soft drop), `Space` (hard drop), `KeyP` (pausa). Solo teclado.
- **Vidas:** no tiene; el juego termina cuando una pieza nueva colisiona al aparecer.
- **Niveles:** `level = floor(lines / 10) + 1`; `dropInterval = max(100, 1000 - (level - 1) * 90)` ms.
- **Puntuación:** `[0, 100, 300, 500, 800][líneas] × nivel`, hard drop +2 por celda, soft drop +1 por fila.
- **Piezas:** el código genera **8** (I, O, T, S, Z, J, L y la `N` "tuerca" hueca de 3×3), aunque el README habla de 7.
- **HUD y overlays:** viven en el DOM; el tablero, la pieza fantasma y la vista previa van en canvas.
- **Extras:** tema claro/oscuro en `localStorage` (`tetris-theme`); sin assets ni sonido.

Brechas con el contrato actual y su resolución:

| Brecha                                         | Resolución                                                                                     |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Canvas 300×600 + canvas NEXT y panel DOM       | Un solo canvas 800×600: tablero centrado y panel dibujado a los lados. No cambia el marco CRT. |
| Una sola vida (la plataforma asume 3)          | `GAME_META.tetris.initialLives = 1` (extensión del contrato).                                  |
| LINES no existe en la plataforma               | Evento opcional `onLines` y stat LINES opcional en `GamePlayer` (extensión del contrato).      |
| Pausa con `KeyP`, tema claro/oscuro            | Se eliminan: la pausa es de React (SPEC 05).                                                   |
| Reinicio con botón DOM                         | Tecla `Enter` dentro del canvas (Espacio es hard drop y se pulsa en ráfaga).                   |
| Pestaña GLOBAL del Salón, pendiente en SPEC 06 | Entra en esta spec.                                                                            |

---

## Scope

**In:**

- Motor en `lib/games/tetris/` (`constants.ts`, `board.ts`, `engine.ts`) que implementa el contrato `GameEngine`/`GameEvents`.
- Registro en `GAME_ENGINES` (`lib/games/registry.ts`).
- Migración `seed_game_tetris`: una fila en `games`, sin filas en `scores`.
- Clase de portada `.cover-tetris` en `app/globals.css` (bloques neón magenta/cyan, diseñada con `/frontend-design`).
- Extensión retrocompatible del contrato: `GAME_META` (`initialLives`, `lines`) en `lib/games/registry.ts`, `onLines` opcional en `GameEvents`, y su uso en `components/game-canvas.tsx` y `components/game-player.tsx`.
- Canvas interno 800×600 con HUD y overlay propios (doble HUD, como SPEC 05): panel izquierdo con SCORE, LINES y LEVEL; tablero 300×600 centrado; panel derecho con NEXT y la lista de controles; overlay "GAME OVER".
- Las 8 piezas del código original, wall kicks, pieza fantasma, soft drop, hard drop y las fórmulas de puntuación, nivel y velocidad sin cambiar valores.
- Una sola vida: al topar la pila el motor emite `onLives(0)` y `onGameOver`.
- Tecla `Enter` en game over para reiniciar desde el canvas.
- Pestaña GLOBAL en `/salon`: top 12 mezclado de todos los juegos por puntaje bruto, con columna JUEGO, mediante `getTopScoresGlobal` en `lib/scores.ts`.

**Out of scope (para specs futuras):**

- Controles táctiles. En móvil el juego se ve pero no se puede jugar.
- Sonido y música.
- Pausa con `KeyP` y el botón de tema claro/oscuro del original.
- Cambiar la jugabilidad, los colores de las piezas o el sistema de puntuación del original.
- Métrica de ranking normalizada entre juegos (puntos por puesto, suma de mejores marcas): GLOBAL usa el puntaje bruto.
- Pausa automática al perder el foco, anti-trampas y validación del puntaje.
- Cambios a Asteroides, al esquema de Supabase y a `references/`.
- Tests automatizados (el proyecto no tiene test runner).

---

## Data model

### Fila de `games`

| Columna    | Valor                                                                                                                                                                                                                                                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`       | `tetris`                                                                                                                                                                                                                                                                                                                                                      |
| `title`    | `TETRIS`                                                                                                                                                                                                                                                                                                                                                      |
| `short`    | `Encaja las piezas, completa líneas y sobrevive. Ojo con la tuerca.`                                                                                                                                                                                                                                                                                          |
| `long`     | `El clásico de bloques que caen sobre un tablero de 10×20. Mueve y rota las piezas, completa filas para limpiarlas y sube de nivel cada 10 líneas mientras la caída se acelera. Cuenta con pieza fantasma, caída instantánea y una pieza extra, la tuerca hueca, que complica el encaje. Solo tienes una vida: si la pila toca el techo, la partida termina.` |
| `category` | `PUZZLE`                                                                                                                                                                                                                                                                                                                                                      |
| `cover`    | `cover-tetris`                                                                                                                                                                                                                                                                                                                                                |
| `color`    | `magenta`                                                                                                                                                                                                                                                                                                                                                     |

### Contrato y registro

Extensión de `lib/game-engine.ts` (campo opcional, Asteroides no lo emite):

```ts
export interface GameEvents {
  // ...los cinco eventos actuales sin cambios
  onLines?: (lines: number) => void; // solo Tetris
}
```

Extensión de `lib/games/registry.ts`:

```ts
export interface GameMeta {
  initialLives: number; // vidas con las que arranca el HUD de la plataforma
  lines: boolean; // muestra el stat LINES en el HUD de la plataforma
}
export const DEFAULT_GAME_META: GameMeta = { initialLives: 3, lines: false };
export const GAME_META: Record<string, Partial<GameMeta>> = {
  tetris: { initialLives: 1, lines: true },
};
export const GAME_ENGINES = {
  asteroides: () => import("@/lib/games/asteroides/engine"),
  tetris: () => import("@/lib/games/tetris/engine"),
};
```

`GamePlayer` resuelve `{ ...DEFAULT_GAME_META, ...GAME_META[game.id] }`. `GameCanvas` reenvía `onLines` con `eventsRef.current.onLines?.(l)`. El canvas sigue siendo 800×600 para todos los juegos.

Extensión de `lib/scores.ts`:

```ts
export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
  game?: string; // título del juego; solo en GLOBAL
}
export async function getTopScoresGlobal(limit?: number): Promise<ScoreRow[]>; // limit = 12
```

`getTopScoresGlobal` lee `scores` con el título de `games` (relación por clave foránea), ordena por `score desc, created_at asc` y mapea `game` al título.

### Constantes del juego (copiadas de `game.js` sin cambiar valores)

- Tablero: `COLS = 10`, `ROWS = 20`, `BLOCK = 30`; `LINE_SCORES = [0, 100, 300, 500, 800]`.
- Colores por tipo de pieza: `#4dd0e1` (I), `#ffd54f` (O), `#ba68c8` (T), `#81c784` (S), `#e57373` (Z), `#90caf9` (J), `#ffb74d` (L), `#9e9e9e` (N).
- Piezas: matrices de `PIECES` del original (I 4×4, O 2×2, T/S/Z/J/L 3×3, N 3×3 hueca). La pieza nueva es `floor(random * 8) + 1`.
- Caída: `dropInterval` inicial 1000 ms; `max(100, 1000 - (level - 1) * 90)`; nivel `floor(lines / 10) + 1`.
- Fantasma: `globalAlpha = 0.2`. Rejilla `#22222e` (valor del tema oscuro del original) con `lineWidth = 0.5`; fondo del tablero `#0f0f17`.
- Una vida (`INITIAL_LIVES = 1`).

Diseño del canvas 800×600 (valores nuevos, solo de maquetación):

- Tablero en `x = 250..550`, `y = 0..600` (centrado: (800 − 300) / 2).
- Panel izquierdo (`x = 0..250`): SCORE, LINES, LEVEL con tipografía `monospace` como el HUD de Asteroides.
- Panel derecho (`x = 550..800`): NEXT (cuadrícula 4×4 de 30 px) y la lista de controles.
- Overlay de game over centrado sobre el tablero: `GAME OVER`, `PUNTAJE: <n>` y `ENTER PARA REINICIAR`.

Convenciones:

- Estado en el closure de `createEngine`, sin `window` ni `document` al cargar el módulo, sin React (checklist de integración).
- Listeners de teclado en `window`, handlers con nombre quitados en `destroy()`. `preventDefault()` en `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `Space` y `Enter`; se ignoran eventos cuyo `target` sea `INPUT`, `TEXTAREA`, `BUTTON` o `SELECT`.
- Las acciones de teclado reaccionan a cada `keydown`, incluida la repetición del navegador, como en el original (mantener `ArrowLeft` desplaza varias columnas). `Enter` en game over solo cuenta si `!e.repeat`.
- El bucle usa `requestAnimationFrame` con `dt` limitado a 50 ms (Asteroides lo hace igual) y `dropAccum` en ms. Es la única desviación del original, y solo afecta tras pausas o pestañas en segundo plano.
- Eventos solo cuando el valor cambia: `onScore`, `onLevel`, `onLines`. `onLives(0)` y `onGameOver(score)` al topar la pila (una sola vez).
- Al crearse y en cada reinicio (`restart()` y `Enter`) el motor emite el estado inicial de forma incondicional: `onScore(0)`, `onLives(1)`, `onLevel(1)`, `onLines(0)`. En `Enter`, `onRestart()` se emite antes que ese estado.
- `endGame()` (botón FIN) pasa a `gameover` y emite `onGameOver(score)` una sola vez, sin tocar las vidas.
- `pause()` congela `update` y `draw` y limpia las teclas; `resume()` reinicia `lastTime` y `dropAccum` no acumula el tiempo en pausa.
- Se dibuja un último frame con el overlay al terminar (el original no lo dibuja).

---

## Implementation plan

0. Antes de escribir código, leer en `node_modules/next/dist/docs/01-app` las guías de Client Components y de carga diferida (`import()` dinámico), y revisar `lib/games/asteroides/engine.ts`, `lib/games/registry.ts`, `components/game-canvas.tsx`, `components/game-player.tsx`, `components/hall-of-fame.tsx` y `app/salon/page.tsx`. Confirmar con `mcp__supabase__list_tables` que `games` y `scores` existen y con `select id from games` que solo está `asteroides`.
1. Agregar `.cover-tetris` en `app/globals.css` (diseñada con `/frontend-design`: fondo oscuro, pila de tetrominos magenta/cyan y una tuerca, SVG inline como `.cover-asteroides`). Prueba manual: la clase no cambia las demás portadas.
2. Introducir la extensión del contrato: `onLines` opcional en `lib/game-engine.ts`; `GameMeta`, `DEFAULT_GAME_META` y `GAME_META` en `lib/games/registry.ts` (con `GAME_META` solo con `tetris`); reenvío de `onLines` en `components/game-canvas.tsx`; en `components/game-player.tsx`, vidas iniciales y `resetState` desde `GAME_META`, estado `lines` y stat LINES condicionado a `meta.lines`. Prueba manual: `/juegos/asteroides/jugar` sigue igual (800×600, 3 vidas, HUD sin LINES, sincronizado) y `npm run lint` sin errores.
3. Portar las constantes a `lib/games/tetris/constants.ts` y la lógica pura del tablero (`createBoard`, `randomPiece`, `collide`, `rotateCW`, `tryRotate`, `merge`, `clearLines`, `ghostY`) a `lib/games/tetris/board.ts`, pasando el tablero y la pieza por parámetro en lugar de globals. Prueba manual: `npm run lint` sin errores.
4. Crear `lib/games/tetris/engine.ts` con `createEngine(canvas, events)`: estado en el closure, bucle con `dropAccum`, entrada, dibujo del tablero, fantasma, panel izquierdo, NEXT y controles, overlay de game over, y `pause`, `resume`, `restart`, `endGame` y `destroy`. Prueba manual: `npm run lint` y `npm run build` sin errores.
5. Registrar `tetris` en `GAME_ENGINES` y aplicar la migración `seed_game_tetris` con `mcp__supabase__apply_migration` en el mismo paso. Prueba manual: `select id from games` incluye `tetris`; `/biblioteca` muestra su tarjeta con `—` como mejor puntuación; `/juegos/tetris` carga la ficha; `/juegos/tetris/jugar` es jugable y `/salon` muestra la pestaña TETRIS.
6. Agregar `getTopScoresGlobal` a `lib/scores.ts`; en `app/salon/page.tsx` añadir la entrada `GLOBAL` (primera pestaña, top 12 mezclado); en `components/hall-of-fame.tsx` mostrar la columna JUEGO solo cuando las filas traen `game`. Prueba manual: `/salon` muestra GLOBAL, ASTEROIDES y TETRIS, con el estado vacío mientras `scores` esté vacía.
7. Verificar en el navegador con Playwright (capturas en `.playwright-screenshots/`) `/biblioteca`, `/juegos/tetris`, `/juegos/tetris/jugar` y `/salon` a 1280 px y 375 px, y una partida completa con guardado. Insertar puntuaciones de prueba de `asteroides` y `tetris` para comprobar GLOBAL, y borrarlas con `mcp__supabase__execute_sql`. Ejecutar `npm run lint` y `npm run build`.

---

## Acceptance criteria

### Base de datos

- [ ] `select id from games` incluye `tetris` con `cover = 'cover-tetris'`, `category = 'PUZZLE'` y `color = 'magenta'`.
- [ ] `select count(*) from scores where game_id = 'tetris'` devuelve 0 tras aplicar la migración.
- [ ] No existe el directorio `supabase/` ni archivos `.sql` nuevos en el repo.

### Juego

- [ ] `/juegos/tetris/jugar` muestra el canvas dentro de `.crt-screen`, con resolución interna 800×600, el tablero 10×20 centrado y los paneles a los lados.
- [ ] `ArrowLeft`/`ArrowRight` mueven la pieza, `ArrowUp` y `KeyX` la rotan en sentido horario, `ArrowDown` baja una fila y `Space` la deja caer al instante, sin desplazar la página.
- [ ] Una rotación que choca contra una pared se desplaza `-1`, `+1`, `-2` o `+2` columnas si cabe, y se descarta si no.
- [ ] La pieza fantasma se dibuja con opacidad 0,2 en la posición donde aterrizará la pieza actual.
- [ ] El canvas muestra la pieza siguiente en NEXT, y esa pieza es la que aparece después de fijar la actual.
- [ ] Aparecen las 8 piezas, incluida la tuerca `N` (3×3 hueca, gris).
- [ ] Soft drop suma 1 punto por fila y hard drop 2 puntos por celda recorrida.
- [ ] Limpiar 1, 2, 3 y 4 líneas a la vez suma 100, 300, 500 y 800 multiplicado por el nivel.
- [ ] El nivel sube a 2 al llegar a 10 líneas y el intervalo de caída pasa de 1000 ms a 910 ms; nunca baja de 100 ms.
- [ ] El HUD de la plataforma muestra `PUNTUACIÓN`, `VIDAS`, `NIVEL` y `LINES`, y coincide con el panel del canvas (puntaje, líneas y nivel).
- [ ] La partida arranca con 1 vida y el HUD de la plataforma muestra un solo `♥` desde el primer render hasta el primer evento del motor.
- [ ] Cuando una pieza nueva colisiona al aparecer, el canvas muestra "GAME OVER" y `ENTER PARA REINICIAR`, el HUD pasa a `—` en vidas y se abre el modal "FIN DEL JUEGO" con el puntaje final del canvas.
- [ ] PAUSA congela la pieza, el temporizador de caída y el puntaje; REANUDAR continúa sin que la pieza salte varias filas.
- [ ] Con el juego en pausa, las teclas de juego no mueven, rotan ni sueltan la pieza.
- [ ] El botón FIN lleva el canvas a "GAME OVER" y abre el modal con el puntaje actual; pulsarlo dos veces no emite un segundo game over.
- [ ] "JUGAR DE NUEVO" deja puntaje 0, 1 vida, nivel 01 y LINES 0 en el HUD y en el canvas, y arranca una partida con tablero vacío.
- [ ] `Enter` en el game over del canvas reinicia el juego y React cierra el modal y resetea el estado; `Space` en game over no reinicia.
- [ ] Escribir las iniciales en el campo del modal, incluido un espacio, no mueve ni suelta piezas.
- [ ] Salir y volver a entrar crea una partida nueva, sin listeners duplicados ni `requestAnimationFrame` activos (una pulsación de `ArrowLeft` mueve una sola columna).
- [ ] La tecla `P` y un botón de tema no tienen efecto en el juego.

### Leaderboard y Salón

- [ ] "GUARDAR PUNTUACIÓN" inserta en `scores` una fila con `game_id = 'tetris'`, `user_id` nulo y el puntaje del modal.
- [ ] La puntuación aparece en `/juegos/tetris`, en la pestaña TETRIS de `/salon` y en la tarjeta de `/biblioteca` sin reiniciar el servidor.
- [ ] Sin puntuaciones, la ficha de Tetris y las pestañas GLOBAL y TETRIS del Salón muestran `SÉ EL PRIMERO EN ENTRAR AL SALÓN DE LA FAMA`.
- [ ] `/salon` muestra tres pestañas, GLOBAL (primera y activa por defecto), ASTEROIDES y TETRIS.
- [ ] Con una puntuación de `asteroides` (500) y otra de `tetris` (1200), GLOBAL lista #01 `1.200` con JUEGO `TETRIS` y #02 `500` con JUEGO `ASTEROIDES`.
- [ ] GLOBAL muestra como máximo 12 filas, ordenadas por puntaje descendente y, en empate, gana quien guardó primero.
- [ ] Las pestañas ASTEROIDES y TETRIS no muestran columna JUEGO y cambiar de pestaña no hace peticiones al navegador.

### Regresiones

- [ ] `/juegos/asteroides/jugar` sigue igual: canvas 800×600, 3 vidas al empezar y tras reiniciar, HUD sincronizado y sin stat LINES.
- [ ] `git diff` no toca `lib/games/asteroides/` ni `references/started-games/`.
- [ ] Con las puntuaciones de prueba de un solo juego, las pestañas y la ficha de ese juego se ven igual que antes de esta spec.
- [ ] `/biblioteca` y el Home muestran las tarjetas de ASTEROIDES y TETRIS, y el filtro `PUZZLE` muestra solo TETRIS.

### Calidad

- [ ] A 375 px de ancho `/juegos/tetris`, `/juegos/tetris/jugar` y `/salon` no tienen scroll horizontal.
- [ ] Sin errores ni advertencias de hidratación en la consola en `/biblioteca`, `/juegos/tetris`, `/juegos/tetris/jugar` y `/salon`.
- [ ] Tras la verificación, `select count(*) from scores` vuelve al valor previo (filas de prueba borradas).
- [ ] `npm run lint` termina sin errores ni advertencias.
- [ ] `npm run build` termina sin errores.

---

## Decisions

- **Sí:** id `tetris`, categoría `PUZZLE`, color `magenta`. Lo definió el usuario; Asteroides ya usa `cyan`.
- **Sí:** un solo canvas 800×600 con el tablero centrado y el panel dibujado dentro. Lo definió el usuario; mantiene el marco CRT 4:3 y evita ampliar el contrato con tamaños de canvas.
- **No:** canvas nativo 300×600 con `GAME_META` de tamaño. Obligaba a cambiar el `aspect-ratio` del marco CRT para todos los juegos.
- **No:** segundo `<canvas>` para NEXT. La checklist pide dibujar los paneles extra en el canvas único.
- **Sí:** portar las 8 piezas del código, con la tuerca `N`. Lo definió el usuario; el README dice 7, pero la regla es copiar el código sin cambiar valores.
- **Sí:** una vida con `GAME_META.tetris.initialLives = 1`. Lo definió el usuario: todos los juegos tienen vidas y Tetris tiene una. El HUD sigue mostrando VIDAS y pasa a `—` al terminar.
- **No:** `lives: false` para ocultar el stat. El usuario quiere VIDAS visible en todos los juegos.
- **Sí:** `initialLives` en `GAME_META` en vez de la constante `INITIAL_LIVES = 3` de `GamePlayer`. Sin ella el HUD mostraría 3 corazones al montar y tras reiniciar desde React, que resetea antes de que el motor emita.
- **Sí:** emitir el estado inicial de forma incondicional en cada reinicio. El motor solo emite cambios, y tras `resetState` de React un valor igual no se reenviaría.
- **Sí:** LINES como stat extra de la plataforma (`onLines` opcional y `GAME_META.lines`). Lo definió el usuario. Es opcional para que Asteroides no cambie.
- **No:** convertir `GameEvents` en un diccionario genérico de stats. Sobredimensiona el contrato para un único stat extra.
- **Sí:** `Enter` reinicia desde el canvas y `Space` no. Espacio es el hard drop y se pulsa en ráfaga: reiniciar sin querer al morir sería molesto.
- **No:** reinicio con Espacio tras un retardo. Añade una regla nueva con un temporizador que el original no tiene.
- **Sí:** quitar `KeyP` y el botón de tema. La pausa es de React (decisión cerrada de SPEC 05) y la plataforma no tiene tema claro.
- **No:** mantener `KeyP`. Exigiría un evento nuevo del motor hacia React para sincronizar la pausa.
- **Sí:** GLOBAL entra en esta spec, como pestaña primera y por defecto. Lo definió el usuario; SPEC 06 la dejó pendiente para el segundo juego.
- **Sí:** GLOBAL como top 12 mezclado por puntaje bruto con columna JUEGO. Lo definió el usuario: no inventa una métrica y reutiliza el orden de `getTopScores`.
- **No:** puntos por puesto ni suma de mejores marcas por nombre. Son métricas nuevas sobre nombres de texto libre (las puntuaciones son anónimas).
- **Sí:** `getTopScoresGlobal` en servidor y GLOBAL por props, como las demás pestañas. Cambiar de pestaña no hace peticiones.
- **Sí:** `dt` limitado a 50 ms con `dropAccum`, como Asteroides. Evita que una pestaña en segundo plano suelte la pieza varias filas de golpe; es la única desviación de reglas.
- **Sí:** reaccionar a cada `keydown`, incluida la repetición, como el original. No se cambia la sensación de juego.
- **Sí:** conservar los colores del original y su rejilla del tema oscuro (`#22222e`). Lo definió el usuario en SPEC 05 para Asteroides y aquí se aplica igual: no se rediseña.
- **Sí:** doble HUD (el canvas conserva el suyo y la plataforma muestra el suyo). Cerrado en SPEC 05.
- **Sí:** el juego solo se añade como fila de `games` sembrada por migración; `games` sigue siendo solo lectura. Cerrado en SPEC 06.
- **Sí:** la portada de bloques neón se diseña con `/frontend-design` en el paso 1.

---

## Risks

| Riesgo                                                                                                | Mitigación                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fila en `games` sin motor en `GAME_ENGINES` (o al revés)                                              | Registro y migración en el mismo paso 5; la página de jugar devuelve 404 si falta el motor.                                                       |
| Doble montaje de Strict Mode duplica bucles o listeners                                               | `destroy()` cancela `requestAnimationFrame` y quita listeners; un criterio verifica que `ArrowLeft` mueve una columna.                            |
| La extensión del contrato rompe Asteroides (vidas, HUD)                                               | Los valores por defecto de `DEFAULT_GAME_META` equivalen al comportamiento actual; criterios de regresión comprueban 3 vidas y ausencia de LINES. |
| React resetea las vidas a `initialLives` y el motor no reenvía el valor y el HUD queda desincronizado | El motor emite el estado inicial de forma incondicional en cada reinicio; un criterio verifica 1 vida tras ambas vías de reinicio.                |
| Pulsar Espacio en ráfaga al morir reinicia o suelta una pieza en la partida siguiente                 | Espacio no reinicia; `Enter` sí y solo sin `e.repeat`.                                                                                            |
| La repetición de teclas del navegador hace que mantener `Space` suelte varias piezas seguidas         | Se mantiene el comportamiento del original; queda fuera de alcance cambiarlo.                                                                     |
| El texto en el canvas 800×600 se desborda en los paneles de 250 px                                    | Las posiciones se fijan en `constants.ts` y se verifican con capturas de Playwright a 1280 px y 375 px.                                           |
| GLOBAL lo domina Tetris (puntajes de miles frente a cientos de Asteroides)                            | Se acepta por ahora; la columna JUEGO deja claro el origen. Una métrica normalizada va en otra spec.                                              |
| `getTopScoresGlobal` depende del nombre de la relación entre `scores` y `games`                       | Los tipos generados (`database.types.ts`) ya contienen la clave foránea; el paso 6 confirma la consulta con `npm run build`.                      |
| Añadir un tercer chip activo en `/salon` rompe la maquetación de pestañas a 375 px                    | `.hall-tabs` ya usa `flex-wrap`; un criterio verifica que no hay scroll horizontal.                                                               |

---

## What is **not** in this spec

- Controles táctiles ni vista jugable en móvil.
- Sonido y música.
- La tecla `P` de pausa y el tema claro/oscuro del original.
- Cambios de jugabilidad, colores o puntuación del original.
- Una métrica de ranking normalizada entre juegos.
- Anti-trampas, rate limiting y pausa automática al perder el foco.
- Cambios a Asteroides, al esquema de Supabase y a `references/`.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propia spec.
