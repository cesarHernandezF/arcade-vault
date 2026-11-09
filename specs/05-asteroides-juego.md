# SPEC 05 — Juego Asteroides en la plataforma

> **Status:** Implementado
> **Depends on:** SPEC 01
> **Date:** 2026-11-09
> **Objective:** Adaptar el juego Asteroides de `references/started-games/02-asteroids` como un módulo TypeScript aislado que se dibuja en su propio canvas dentro del marco CRT de `/juegos/asteroides/jugar` y notifica a React puntaje, vidas, nivel y fin de partida mediante callbacks, mientras React controla la pausa, el reinicio y el fin.

---

## Por qué existe esta spec

`components/game-player.tsx` hoy es una simulación genérica: suma puntos aleatorios con un `setInterval` y dibuja una arena decorativa de CSS. Ningún juego es real. Esta spec incorpora el primer juego jugable y, con él, define el contrato que usarán los siguientes (Tetris, Arkanoid): cada juego vive aislado en su carpeta, dibuja en su propio canvas y habla con React solo mediante un contrato de eventos.

El código original (`game.js`, 510 líneas) es JavaScript plano con variables globales, `document.getElementById` y listeners en `window` que nunca se quitan. No se puede montar, pausar ni destruir limpiamente desde un componente de React, así que se porta a TypeScript con ciclo de vida explícito. La jugabilidad no cambia.

Asteroides es un juego **nuevo** con id `asteroides`. No reemplaza ni modifica la entrada `rocas` del catálogo, que sigue con la simulación actual.

---

## Scope

**In:**

- Nueva entrada `asteroides` en `GAMES` (`lib/games.ts`) y clase de portada `.cover-asteroides` en `app/globals.css`.
- Contrato genérico de motores de juego en `lib/game-engine.ts`: `GameEngine`, `GameEvents` y `CreateEngine`.
- Registro `lib/games/registry.ts` que asocia un id de juego con la carga diferida de su motor. Los ids que no están en el registro siguen usando la simulación actual.
- Motor de Asteroides portado a `lib/games/asteroides/` (`constants.ts`, `entities.ts`, `engine.ts`): nave, balas, asteroides que se dividen, partículas, power-up `3x`, niveles y vidas, con las mismas constantes y reglas de `game.js`.
- Canvas interno de 800×600 con su propio HUD y overlay "GAME OVER" tal como en el original (doble HUD: el del canvas y el de la plataforma).
- Componente cliente `components/game-canvas.tsx` que monta el motor en un `<canvas>`, conecta los callbacks y lo destruye al desmontar.
- Integración en `components/game-player.tsx`: cuando el id está en el registro, el canvas reemplaza a la arena decorativa dentro de `.crt-screen` y el HUD de la plataforma muestra puntaje, vidas y nivel reales.
- Pausa controlada por React: el botón PAUSA / REANUDAR llama a `engine.pause()` y `engine.resume()`.
- Botón FIN: llama a `engine.endGame()`; el motor pasa a game over y emite `onGameOver`, que abre el modal de la plataforma.
- Reinicio desde el modal ("JUGAR DE NUEVO", llama a `engine.restart()`) y desde el canvas con Espacio en game over (el motor emite `onRestart` y React resetea su estado y cierra el modal).
- Escalado del canvas por CSS al ancho del marco CRT, manteniendo 4:3 (la resolución interna sigue siendo 800×600).
- Controles solo de teclado: `ArrowLeft`, `ArrowRight`, `ArrowUp` y `Space`.
- Guardar puntuación como hoy en `localStorage` (`av_scores`) con `game: "asteroides"`.

**Out of scope (para specs futuras):**

- Controles táctiles. En móvil el juego se ve pero no se puede jugar.
- Guardar puntuaciones en Supabase o leerlas en el Salón de la Fama. La conexión existe desde SPEC 04, pero `av_scores` no se toca.
- Cambios a la entrada `rocas`, a las otras seis simulaciones o a sus textos.
- Cambiar la jugabilidad, el aspecto vectorial blanco, la paleta o la velocidad del juego original.
- Sonido y música.
- OVNIs y cualquier mecánica que el juego original no tenga.
- Pausa automática al perder el foco de la pestaña (el original solo limita `dt` a 50 ms).
- Tests automatizados (el proyecto no tiene test runner).
- Portar Tetris (`03-tetris`) y Arkanoid (`04-arkanoid`). Cada uno va en su propia spec y reutiliza el contrato de esta.
- Tabla de clasificación de `/juegos/asteroides` con datos reales: sigue usando `seededScores`.

---

## Data model

Contrato genérico que implementa cada juego (`lib/game-engine.ts`):

```ts
// Eventos que el motor emite hacia React
export interface GameEvents {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  onRestart: () => void; // reinicio iniciado desde el canvas (Espacio); no se emite en restart()
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
```

Registro (`lib/games/registry.ts`):

```ts
export const GAME_ENGINES: Record<string, () => Promise<{ createEngine: CreateEngine }>> = {
  asteroides: () => import("@/lib/games/asteroides/engine"),
};
```

Nueva entrada de catálogo (`lib/games.ts`, al final de `GAMES`; el Home muestra solo `GAMES.slice(0, 6)`, no cambia):

```ts
{
  id: "asteroides",
  title: "ASTEROIDES",
  short: "Rota, propulsa y dispara para pulverizar asteroides.",
  long: "...", // redactado en la implementación a partir del juego: nave, asteroides que se dividen, power-up 3x
  cat: "SHOOTER",
  cover: "cover-asteroides",
  color: "cyan",
  best: 0,
  plays: "0",
}
```

Constantes del juego (copiadas de `game.js` sin cambiar valores): canvas 800×600; asteroides con tamaños 1, 2 y 3 (`RADII [0, 16, 30, 50]`, `SPEEDS [0, 85, 55, 32]`, `POINTS [0, 100, 50, 20]`); 3 vidas; `POWERUP_DROP_CHANCE` 0.15, `POWERUP_DURATION` 5, `POWERUP_TTL` 12, `TRIPLE_SPREAD` 0.18; 4 asteroides en el nivel 1 y `3 + nivel` en los siguientes.

Convenciones:

- Cada juego vive en `lib/games/<id>/` y solo se importa desde `lib/games/registry.ts`. Ningún juego importa a otro.
- El motor no usa variables globales ni `document`/`window` al cargar el módulo; el estado vive en el closure de `createEngine`. Así no rompe el render en el servidor.
- El motor no importa React. Solo conoce `HTMLCanvasElement` y `GameEvents`.
- Al crearse, el motor emite el estado inicial (`onScore(0)`, `onLives(3)`, `onLevel(1)`) para que React no dependa de constantes propias.
- Los listeners de teclado van en `window` y se quitan en `destroy()`. Se llama `preventDefault()` en `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown` y `Space` para que la página no se desplace. Se ignoran los eventos cuyo `target` sea `INPUT`, `TEXTAREA`, `BUTTON` o `SELECT`, de modo que escribir las iniciales en el modal no dispara ni reinicia el juego.
- `pause()` congela `update` y `draw` y limpia `keys` y `justPressed`; `resume()` reinicia `lastTime` para que no haya un salto de `dt`.
- `endGame()` pasa el estado a `gameover` y emite `onGameOver(score)` una sola vez; si ya está en `gameover` no hace nada. `onGameOver` también se emite cuando se pierde la última vida.
- `restart()` reinicia el juego sin emitir `onRestart`; Espacio en `gameover` reinicia y sí lo emite.
- `GamePlayer` es el dueño del estado de React (`score`, `lives`, `level`, `paused`, `over`, `saved`). Para los juegos del registro no corre el `setInterval` simulado y el nivel viene de `onLevel`.
- `GameCanvas` guarda los callbacks en una `ref` para que el motor siempre llame a los más recientes sin recrearse en cada render.
- El motor se recrea solo cuando cambia el `id` del juego.

---

## Implementation plan

0. Antes de escribir código, leer en `node_modules/next/dist/docs/01-app` las guías de Client Components y de carga diferida (`import()` dinámico) y revisar en `app/globals.css` las reglas `.crt`, `.crt-screen`, `.crt-content` y `.game-arena`. Esta versión de Next tiene cambios incompatibles. Revisar también `components/library.tsx` y `components/hall-of-fame.tsx` para confirmar que no asumen una lista fija de juegos.
1. Agregar la entrada `asteroides` al final de `GAMES` en `lib/games.ts` y la clase `.cover-asteroides` en `app/globals.css` (distinta de `.cover-rocas`: fondo negro, contornos poligonales blancos y una nave triangular). Prueba manual: `asteroides` aparece en `/biblioteca`, en `/salon` y en `/juegos/asteroides`; `/juegos/asteroides/jugar` abre con la simulación actual y `rocas` no cambia.
2. Crear `lib/game-engine.ts` con `GameEvents`, `GameEngine` y `CreateEngine`, y `lib/games/registry.ts` con `GAME_ENGINES` vacío. Prueba manual: `npm run lint` sin errores.
3. Portar las constantes y las clases de `game.js` a `lib/games/asteroides/constants.ts` y `lib/games/asteroides/entities.ts` (`Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`). Los métodos `draw` reciben `ctx` y `Ship.update` recibe `keys` como parámetros en lugar de usar globales. Prueba manual: `npm run lint` sin errores.
4. Crear `lib/games/asteroides/engine.ts` con `createEngine(canvas, events)`: estado en el closure, bucle `requestAnimationFrame` con `dt` limitado a 50 ms, HUD y overlay del canvas, y `pause`, `resume`, `restart`, `endGame` y `destroy`. Emitir los eventos del contrato en cada cambio de puntaje, vidas, nivel, game over y reinicio por Espacio. Prueba manual: `npm run lint` y `npm run build` sin errores.
5. Registrar `asteroides` en `GAME_ENGINES` y crear `components/game-canvas.tsx` (Client Component): crea el `<canvas width={800} height={600}>`, importa el motor con `GAME_ENGINES[id]()` dentro de un `useEffect`, lo destruye en la limpieza (compatible con el doble montaje de React Strict Mode) y expone el motor al padre. Agregar en `app/globals.css` la clase del canvas (ancho 100 % del `.crt-screen`, `aspect-ratio: 4 / 3`). Prueba manual: `npm run lint` sin errores.
6. Integrar en `components/game-player.tsx`: si `GAME_ENGINES[game.id]` existe, renderizar `GameCanvas` en lugar de `.game-arena` y no ejecutar el `setInterval` simulado; conectar `onScore`, `onLives`, `onLevel`, `onGameOver` (abre el modal) y `onRestart` (resetea `score`, `lives`, `paused`, `over` y `saved`); un `useEffect` sobre `paused` llama a `pause()` / `resume()`; FIN llama a `endGame()`; "JUGAR DE NUEVO" resetea el estado de React y llama a `restart()`; los botones del HUD llaman a `blur()` tras el clic para no capturar Espacio. Los juegos fuera del registro conservan el comportamiento actual. Prueba manual: `/juegos/asteroides/jugar` es jugable con el HUD de la plataforma sincronizado; `/juegos/rocas/jugar` sigue con la simulación.
7. Verificar en el navegador con Playwright (capturas en `.playwright-screenshots/`): partida completa hasta game over con ambas vías de reinicio, pausa, FIN, guardar puntuación, navegar fuera y volver a entrar, y las vistas a 1280 px y a 375 px. Ejecutar `npm run lint` y `npm run build`.

---

## Acceptance criteria

- [ ] `npm run lint` termina sin errores ni advertencias.
- [ ] `npm run build` termina sin errores.
- [ ] La consola del navegador no muestra errores ni advertencias de hidratación en `/juegos/asteroides/jugar`.
- [ ] `GAMES` contiene una entrada con `id: "asteroides"` y `title: "ASTEROIDES"`, y la entrada `rocas` no tiene cambios en `git diff`.
- [ ] `asteroides` aparece en `/biblioteca`, en las pestañas de `/salon` y tiene ficha en `/juegos/asteroides` con su portada `cover-asteroides`.
- [ ] `/juegos/asteroides/jugar` muestra el canvas del juego dentro de `.crt-screen`, con fondo negro y nave en el centro, y sin la arena decorativa.
- [ ] El canvas tiene resolución interna 800×600 y se ve a ancho completo del marco CRT con proporción 4:3.
- [ ] `ArrowLeft` / `ArrowRight` giran la nave, `ArrowUp` propulsa y `Space` dispara, y la página no se desplaza al usarlas.
- [ ] El canvas muestra su HUD interno (`SCORE`, `NIVEL`, iconos de vidas y, con el power-up, `3x`) a la vez que el HUD de la plataforma está visible.
- [ ] Destruir un asteroide de tamaño 3, 2 y 1 suma 20, 50 y 100 puntos, y el valor del HUD de la plataforma coincide con el del HUD del canvas.
- [ ] El HUD de la plataforma muestra las vidas del motor: baja de 3 a 2 al chocar la nave.
- [ ] Al despejar todos los asteroides, el nivel del HUD de la plataforma pasa de `01` a `02` y coincide con "NIVEL 2" del canvas.
- [ ] PAUSA detiene el motor: asteroides, balas y temporizadores quedan quietos y el puntaje no cambia; REANUDAR continúa sin salto brusco.
- [ ] Con el juego en pausa, pulsar las teclas de juego no mueve ni dispara la nave.
- [ ] Al perder la última vida el canvas muestra "GAME OVER" y se abre el modal "FIN DEL JUEGO" con el puntaje final igual al del canvas.
- [ ] El botón FIN lleva el canvas a "GAME OVER" y abre el modal con el puntaje actual; pulsarlo dos veces no emite un segundo game over.
- [ ] "JUGAR DE NUEVO" cierra el modal, deja puntaje 0, 3 vidas y nivel 01, y el juego arranca de cero.
- [ ] Pulsar Espacio en el game over del canvas reinicia el juego y React cierra el modal y resetea puntaje, vidas y nivel (sin dejar el modal abierto).
- [ ] Escribir las iniciales en el campo del modal, incluido un espacio, no reinicia el juego ni dispara.
- [ ] "GUARDAR PUNTUACIÓN" agrega a `localStorage.av_scores` un registro con `game: "asteroides"` y el puntaje final.
- [ ] Salir con SALIR o VOLVER AL VAULT y volver a entrar crea una partida nueva, sin teclas atascadas ni listeners duplicados (una sola partida avanza y un disparo crea una sola bala).
- [ ] Tras desmontar la pantalla no queda ningún `requestAnimationFrame` ni listener de teclado del motor activo.
- [ ] `/juegos/rocas/jugar` y las otras seis rutas de juego siguen usando la simulación actual sin cambios visibles.
- [ ] A 375 px de ancho `/juegos/asteroides/jugar` no tiene scroll horizontal y el canvas escala al ancho disponible.
- [ ] `references/started-games/02-asteroids/` no tiene cambios en `git diff`.

---

## Decisions

- **Sí:** id `asteroides` y entrada nueva en el catálogo. Lo definió el usuario: este juego no es `rocas`, aunque ya exista un placeholder parecido.
- **No:** reutilizar o modificar `rocas`. Es otro juego en el catálogo y se queda con la simulación hasta que se decida otra cosa.
- **Sí:** portar `game.js` a un módulo TypeScript con ciclo de vida (`pause`, `resume`, `restart`, `endGame`, `destroy`). Permite que React controle el juego sin variables globales ni listeners huérfanos.
- **No:** iframe a un HTML estático en `public/`. El puntaje, las vidas y el fin de partida no llegarían a React sin `postMessage`.
- **No:** cargar `game.js` con `next/script`. Usa globals y no se puede destruir ni reiniciar al navegar entre pantallas.
- **Sí:** doble HUD. El canvas conserva su HUD y overlay propios y la plataforma muestra el suyo, sincronizado por callbacks. Lo pidió el usuario: el juego queda físicamente dentro del canvas y notifica a React.
- **No:** eliminar `drawHUD` ni el HUD interno del canvas para dejar a React como única capa de UI. El juego tiene su canvas, sus controles y su hub, y se mantienen; solo notifican a React. Decisión cerrada por el usuario, no se reabre.
- **Sí:** React controla la pausa (PAUSA / REANUDAR del contenedor existente); el juego solo expone `pause()` y `resume()`.
- **Sí:** el botón FIN llama a `engine.endGame()` y el modal se abre a partir de `onGameOver`. Hay un solo camino para terminar la partida, y el motor no sigue corriendo bajo el modal.
- **Sí:** reinicio por dos vías (modal de React y Espacio en el canvas). Para eso existe `onRestart`: si Espacio reinicia, React debe cerrar el modal y resetear su estado. El overlay del canvas conserva "ESPACIO PARA REINICIAR" porque esa vía funciona.
- **Sí:** contrato genérico `GameEngine` / `GameEvents` y registro por id. Mantiene cada juego aislado y deja la ruta `/juegos/[id]/jugar` como única y genérica; agregar un juego es agregar una carpeta y una línea al registro.
- **Sí:** carga diferida del motor con `import()`. Evita meter el código de cada juego en el bundle de las demás pantallas.
- **Sí:** los juegos fuera del registro conservan la simulación. Evita bloquear esta spec con la reescritura de los otros siete.
- **Sí:** ignorar eventos de teclado cuyo `target` sea `INPUT`, `TEXTAREA`, `BUTTON` o `SELECT`. Sin esto, escribir las iniciales o activar un botón con Espacio dispararía el juego.
- **Sí:** escalar el canvas por CSS manteniendo 4:3 y resolución interna 800×600. La física y las constantes originales no dependen del tamaño en pantalla.
- **No:** controles táctiles. Es otra spec; la ficha del juego ya dice "TECLADO / TÁCTIL" para todos los juegos y eso no se corrige aquí.
- **Sí:** conservar `av_scores` en `localStorage`. Guardar en Supabase requiere tablas y RLS, que van en su propia spec.
- **No:** pausa automática al perder foco. El original no la tiene y agregarla cambia el comportamiento.
- **Sí:** mantener la estética vectorial blanca del original. Es decisión del usuario no tocar el diseño del juego.
- **Sí:** copiar valores y reglas de `game.js` sin cambios. El objetivo es adaptar, no rediseñar.

---

## Risks

| Riesgo                                                                                                | Mitigación                                                                                                                       |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| React Strict Mode monta el efecto dos veces en desarrollo y deja dos bucles o dos juegos de listeners | `destroy()` cancela `requestAnimationFrame` y quita todos los listeners; un criterio verifica que un disparo crea una sola bala. |
| El módulo del motor usa `window` o `document` al cargarse y rompe el render en el servidor            | El motor solo se importa dentro de `useEffect`; no hay acceso a `window`/`document` fuera de `createEngine`.                     |
| Espacio y las flechas desplazan la página                                                             | `preventDefault()` en esas teclas, solo cuando el evento no viene de un campo o botón.                                           |
| Tras hacer clic en PAUSA el botón queda con el foco y el motor ignora Espacio                         | Los botones del HUD llaman a `blur()` tras el clic.                                                                              |
| Actualizar el estado de React en cada frame (puntaje, vidas) causa renders excesivos                  | El motor emite eventos solo cuando el valor cambia, nunca en cada frame.                                                         |
| `onRestart` por Espacio y "JUGAR DE NUEVO" desincronizan el estado de React y el del motor            | `restart()` desde React no emite `onRestart`; Espacio sí. Un criterio verifica ambas vías.                                       |
| `dt` grande al reanudar tras una pausa larga hace "saltar" asteroides y nave                          | `resume()` reinicia `lastTime` y el `dt` sigue limitado a 50 ms.                                                                 |
| Next.js 16 tiene cambios incompatibles en Client Components e importaciones dinámicas                 | El paso 0 obliga a leer las guías en `node_modules/next/dist/docs/` antes de escribir código.                                    |
| Añadir un 9.º juego rompe maquetación de la biblioteca o las pestañas del Salón de la Fama            | El paso 1 verifica `/biblioteca` y `/salon`; el Home no cambia porque solo muestra los 6 primeros.                               |

---

## What is **not** in this spec

- Controles táctiles ni vista jugable en móvil.
- Puntuaciones en base de datos, Salón de la Fama real ni clasificación real en la ficha del juego.
- Cambios a `rocas` o a las otras seis simulaciones.
- Cambios de jugabilidad, estética, sonido o nuevas mecánicas (OVNIs).
- Pausa automática al perder el foco.
- Los juegos Tetris y Arkanoid.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propia spec.
