# Plantilla de spec de juego

Rellena todo lo que está entre `<...>` con datos reales. Elimina las notas en cursiva. Mismos encabezados y estados que SPEC 05 y 06.

````markdown
# SPEC NN — Juego <TÍTULO> en la plataforma

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06<, SPEC XX si usa extensiones del contrato>
> **Date:** <fecha de la sesión>
> **Objective:** <Una frase: adaptar/crear el juego <TÍTULO> como módulo aislado, registrarlo y sembrarlo en `games` para que tenga ficha, jugar, guardado de puntuaciones y leaderboard.>

---

## Por qué existe esta spec

<Qué juego es, de dónde viene (carpeta de `references/started-games/` o idea nueva), qué aporta al catálogo y qué brechas del contrato tiene.>

---

## Scope

**In:**

- Motor en `lib/games/<id>/` (`constants.ts`, `entities.ts`, `engine.ts`) que implementa el contrato `GameEngine`/`GameEvents`.
- Registro en `GAME_ENGINES` (`lib/games/registry.ts`).
- Migración `seed_game_<id>`: una fila en `games`, sin filas en `scores`.
- Clase de portada `.cover-<id>` en `app/globals.css`.
- <Extensiones retrocompatibles del contrato, si aplican.>
- <Reglas, controles, HUD y overlays propios del juego.>

**Out of scope (para specs futuras):**

- <Controles táctiles, sonido, mecánicas nuevas, pestaña GLOBAL del Salón (si no entra), anti-trampas, etc.>
- Cambios al resto de juegos y a `references/`.
- Tests automatizados (el proyecto no tiene test runner).

---

## Data model

### Fila de `games`

| Columna | Valor |
| --- | --- |
| `id` | `<id>` |
| `title` | `<TÍTULO>` |
| `short` | `<texto corto>` |
| `long` | `<texto largo>` |
| `category` | `<ARCADE|PUZZLE|SHOOTER|VERSUS>` |
| `cover` | `cover-<id>` |
| `color` | `<cyan|magenta|yellow|green>` |

### Contrato y registro

<Fragmento del registro y, si hay extensiones (`GAME_META`: tamaño de canvas, vidas, assets), su tipo exacto.>

### Constantes del juego

<Constantes copiadas del original sin cambiar valores, o las reglas definidas para un juego nuevo.>

Convenciones:

- <Las de `integration-checklist.md` que apliquen: closure, destroy, teclas, emisión de eventos, doble HUD.>

---

## Implementation plan

0. Antes de escribir código, leer en `node_modules/next/dist/docs/01-app` las guías de Client Components y carga diferida, y revisar `lib/games/asteroides/engine.ts`, `lib/games/registry.ts`, `components/game-canvas.tsx` y `components/game-player.tsx`. Confirmar con `mcp__supabase__list_tables` que `games` y `scores` existen y con `select id from games` los juegos actuales.
1. Agregar `.cover-<id>` en `app/globals.css` (diseñada con `/frontend-design`). Prueba manual: la clase no cambia las demás portadas.
2. <Si aplica> Introducir la extensión del contrato (`GAME_META`, vidas opcionales, assets) en `lib/games/registry.ts`, `components/game-canvas.tsx` y `components/game-player.tsx`. Prueba manual: `/juegos/asteroides/jugar` sigue igual (800×600, 3 vidas, HUD sincronizado).
3. Portar las constantes y entidades a `lib/games/<id>/constants.ts` y `entities.ts`. Prueba manual: `npm run lint` sin errores.
4. Crear `lib/games/<id>/engine.ts` con `createEngine(canvas, events)` y el ciclo de vida completo. Prueba manual: `npm run lint` y `npm run build` sin errores.
5. Registrar `<id>` en `GAME_ENGINES` y aplicar la migración `seed_game_<id>` con `mcp__supabase__apply_migration`. Prueba manual: `select id from games` incluye `<id>`; `/biblioteca` muestra su tarjeta con `—` como mejor puntuación; `/juegos/<id>/jugar` es jugable.
6. Verificar en el navegador con Playwright (capturas en `.playwright-screenshots/`) `/biblioteca`, `/juegos/<id>`, `/juegos/<id>/jugar` y `/salon` a 1280 px y 375 px, y una partida completa con guardado. Borrar con `mcp__supabase__execute_sql` las filas de prueba de `scores` y ejecutar `npm run lint` y `npm run build`.

---

## Acceptance criteria

### Base de datos

- [ ] `select id from games` incluye `<id>` con `cover = 'cover-<id>'`, `category` y `color` válidos.
- [ ] `select count(*) from scores where game_id = '<id>'` devuelve 0 tras aplicar la migración.
- [ ] No existe el directorio `supabase/` ni archivos `.sql` nuevos en el repo.

### Juego

- [ ] `/juegos/<id>/jugar` muestra el canvas dentro de `.crt-screen` y el juego es jugable con <controles>.
- [ ] <Reglas y puntuación verificables del juego.>
- [ ] El HUD de la plataforma (puntuación, vidas si aplica, nivel) coincide con el del canvas.
- [ ] PAUSA congela el motor y las teclas de juego no hacen nada en pausa.
- [ ] FIN lleva al game over y abre el modal con el puntaje actual, sin emitir un segundo game over al pulsarlo dos veces.
- [ ] "JUGAR DE NUEVO" y la tecla de reinicio en el canvas reinician el juego y el estado de React.
- [ ] Escribir en el campo del modal no dispara el juego.
- [ ] Salir y volver crea una partida nueva, sin listeners duplicados ni `requestAnimationFrame` activos.

### Leaderboard

- [ ] "GUARDAR PUNTUACIÓN" inserta en `scores` una fila con `game_id = '<id>'`, `user_id` nulo y el puntaje del modal.
- [ ] La puntuación aparece en `/juegos/<id>`, `/salon` (pestaña del juego) y en la tarjeta de `/biblioteca` sin reiniciar el servidor.
- [ ] Sin puntuaciones, la ficha y la pestaña del Salón muestran `SÉ EL PRIMERO EN ENTRAR AL SALÓN DE LA FAMA`.

### Regresiones

- [ ] Asteroides y los demás juegos siguen jugables y sin cambios visibles (`git diff` no toca sus archivos).
- [ ] `references/started-games/` no tiene cambios en `git diff`.
- [ ] <Un criterio por cada extensión del contrato que compruebe que sigue funcionando el comportamiento anterior.>

### Calidad

- [ ] A 375 px de ancho `/juegos/<id>` y `/juegos/<id>/jugar` no tienen scroll horizontal.
- [ ] Sin errores ni advertencias de hidratación en la consola.
- [ ] Tras la verificación, el conteo de `scores` vuelve al valor previo (filas de prueba borradas).
- [ ] `npm run lint` y `npm run build` terminan sin errores ni advertencias.

---

## Decisions

- **Sí:** <decisión> — <por qué>.
- **No:** <alternativa descartada> — <por qué>.
- **Sí:** doble HUD (el canvas conserva el suyo y la plataforma muestra el suyo). Cerrado en SPEC 05.
- **Sí:** el juego solo se añade como fila de `games` sembrada por migración; `games` sigue siendo solo lectura. Cerrado en SPEC 06.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Fila en `games` sin motor en `GAME_ENGINES` (o al revés) | Registro y migración en el mismo paso; la página de jugar devuelve 404 si falta el motor. |
| Doble montaje de Strict Mode duplica bucles o listeners | `destroy()` cancela `requestAnimationFrame` y quita listeners; un criterio lo verifica. |
| <Riesgos propios: assets, rendimiento, extensión del contrato> | <Mitigación> |

---

## What is **not** in this spec

- <Lista explícita de lo que queda fuera.>

Cada uno de estos puntos, si se aborda, va en su propia spec.
````
