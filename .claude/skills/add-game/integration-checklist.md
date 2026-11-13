# Checklist de integración de un juego

Invariantes destiladas de SPEC 05 (motor) y SPEC 06 (base de datos y leaderboard). Toda spec de juego debe cumplirlas.

## 1. Motor (`lib/games/<id>/`)

Archivos: `constants.ts`, `entities.ts` (si hay clases) y `engine.ts`, que exporta `createEngine: CreateEngine` (`lib/game-engine.ts`).

- Estado en el closure de `createEngine`. Sin globals y sin acceder a `window`/`document` al cargar el módulo (rompería el render en servidor). No importa React.
- Solo conoce `HTMLCanvasElement` y `GameEvents`. Un juego nunca importa a otro y solo se importa desde `lib/games/registry.ts`.
- Al crearse emite el estado inicial (`onScore(0)`, `onLevel(1)` y `onLives(n)` si hay vidas).
- Emite eventos solo cuando el valor cambia, nunca en cada frame.
- Bucle con `requestAnimationFrame` y `dt` limitado (50 ms en Asteroides).
- `pause()` congela `update` y `draw` y limpia teclas pulsadas; `resume()` reinicia `lastTime`.
- `endGame()` pasa a `gameover` y emite `onGameOver(score)` una sola vez (idempotente). También se emite al perder la última vida o al terminar la condición de fin.
- `restart()` no emite `onRestart`; la tecla de reinicio en game over sí.
- `destroy()` cancela `requestAnimationFrame` y quita todos los listeners (handlers con nombre). Compatible con el doble montaje de React Strict Mode.
- Listeners de teclado en `window`; `preventDefault()` en las teclas de juego (flechas, Espacio); ignorar eventos con `target` `INPUT`, `TEXTAREA`, `BUTTON` o `SELECT`.
- Constantes y reglas del original sin cambiar valores (se adapta, no se rediseña).
- Doble HUD por defecto: el canvas conserva su HUD y overlay, y la plataforma muestra el suyo vía callbacks.

## 2. Registro

Una línea en `GAME_ENGINES` (`lib/games/registry.ts`):

```ts
<id>: () => import("@/lib/games/<id>/engine"),
```

Invariante: todo juego de `games` tiene su motor en `GAME_ENGINES` y viceversa. La página de jugar devuelve 404 si falta el motor.

## 3. Base de datos (Supabase)

- Migración `seed_game_<id>` con `mcp__supabase__apply_migration`:

```sql
insert into public.games (id, title, short, long, category, cover, color)
values ('<id>', '<TÍTULO>', '<short>', '<long>', '<ARCADE|PUZZLE|SHOOTER|VERSUS>', 'cover-<id>', '<cyan|magenta|yellow|green>');
```

- `games.id` es el mismo id que el registro y las rutas `/juegos/[id]`.
- Sin filas en `scores`. Sin datos falsos ni respaldo local.
- No se crea el directorio `supabase/` ni archivos `.sql` en el repo.
- No se regeneran tipos (`database.types.ts`) salvo que cambie el esquema.
- Si `get_advisors` o una lectura previa muestran algo raro, se anota; no se usa `service_role`.
- Orden de aplicación: registrar el motor y aplicar la migración en el mismo paso del plan (o motor primero), de modo que la invariante nunca deje un juego en `games` sin motor.

## 4. Portada

Clase `.cover-<id>` en `app/globals.css`, distinta de las existentes (`.cover-asteroides` es el patrón: fondo + `::after` con SVG inline). Se diseña con `/frontend-design` reutilizando las clases existentes antes de crear CSS nuevo.

## 5. Lo que ya funciona sin tocar

Ficha `/juegos/[id]`, `/juegos/[id]/jugar`, `GamePlayer`, `saveScore` (+ `revalidatePath`), leaderboard con estado vacío, `/biblioteca`, Home y la pestaña del juego en `/salon` leen `games` y `scores`. Una spec de juego solo los toca si introduce una extensión del contrato.

Al entrar el **segundo** juego: SPEC 06 dejó pendiente la pestaña GLOBAL del Salón; preguntar si entra en esa spec o en otra. Con varios juegos, los chips de categoría de `/biblioteca` dejan de dar "NO HAY RESULTADOS" solo para las categorías con juego.

## 6. Extensiones retrocompatibles del contrato

La primera spec que las necesite las introduce; las siguientes las reutilizan. Cada una lleva un criterio que verifica que Asteroides sigue igual (canvas 800×600, 3 vidas, HUD sincronizado).

| Brecha | Extensión |
| --- | --- |
| Canvas distinto de 800×600 (p. ej. Tetris 300×600) | `GAME_META` en `lib/games/registry.ts`: `Record<string, { width: number; height: number; lives?: boolean }>`, por defecto 800×600 y vidas. `GameCanvas` lee `width`/`height` y el CSS usa una variable para `aspect-ratio`. |
| Juego sin vidas | `lives: false` en `GAME_META`; `GamePlayer` oculta el stat de vidas (o muestra `—`). El motor no emite `onLives`. |
| Paneles extra (preview de la siguiente pieza, líneas) | Dibujarlos dentro del canvas único del motor, no en un segundo `<canvas>`. Un stat extra en el HUD de la plataforma solo si el usuario lo pide. |
| Assets (sprites, sonido) | Archivos en `public/games/<id>/`; el motor los carga con `Image`/`Audio` dentro de `createEngine` y arranca el bucle al terminar la carga; `destroy()` detiene audio y descarta callbacks de carga pendientes. |
| Táctil | Fuera de alcance salvo petición; la ficha sigue diciendo "TECLADO / TÁCTIL". |

## 7. Verificación estándar (pasos finales de toda spec)

1. Playwright a 1280 px y 375 px: `/biblioteca`, `/juegos/<id>`, `/juegos/<id>/jugar`, `/salon`. Capturas en `.playwright-screenshots/`.
2. Partida completa hasta game over, con las dos vías de reinicio, pausa y FIN.
3. Guardar la puntuación: aparece una fila en `scores` con `game_id = '<id>'` y `user_id` nulo, y se ve en la ficha, el Salón y la tarjeta de la biblioteca sin reiniciar el servidor.
4. Sin errores ni advertencias de hidratación en consola; sin scroll horizontal a 375 px.
5. Borrar con `mcp__supabase__execute_sql` las filas de prueba de `scores` (el conteo vuelve al valor previo).
6. `npm run lint` y `npm run build` sin errores.
7. `git diff` no toca `references/` ni los juegos existentes (salvo extensiones documentadas).
