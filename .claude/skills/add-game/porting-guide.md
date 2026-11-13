# Guía de portado: `game.js` → módulo TypeScript

Patrón de referencia: `lib/games/asteroides/` (`constants.ts`, `entities.ts`, `engine.ts`) portado desde `references/started-games/02-asteroids/game.js`. La jugabilidad no cambia: se copian constantes y reglas tal cual.

## Mapa de conversión

| Original (JS plano) | Módulo TS |
| --- | --- |
| Variables globales de estado | Variables dentro del closure de `createEngine` |
| `document.getElementById('canvas')` y `getContext` | Parámetro `canvas`; `ctx = canvas.getContext('2d')` dentro de `createEngine` |
| Constantes sueltas | `constants.ts` con `export const`, mismos valores |
| Clases o funciones de entidades | `entities.ts`; los `draw` reciben `ctx` y los `update` reciben `keys` u otros datos como parámetros |
| `addEventListener('keydown', e => ...)` anónimos | Handlers con nombre registrados en `window` y quitados en `destroy()` |
| `requestAnimationFrame(loop)` | Guardar el id; `destroy()` lo cancela. El `dt` se limita (50 ms) |
| `setInterval`/`setTimeout` | Evitarlos; si hay, guardar el id y limpiarlos en `destroy()` y en `pause()` |
| HUD en el DOM (`#score`, `#lives`, `#level`) | Se emite con `events.onScore/onLives/onLevel`; el canvas conserva su HUD dibujado (doble HUD) |
| Overlay de GAME OVER / PAUSA en el DOM | Overlay dibujado en el canvas (GAME OVER con su tecla de reinicio); la pausa visual la pone React |
| Varios `<script>` (`levels.js`, `spritesheet.js`) | Módulos importados solo desde el motor (`levels.ts`, `sprites.ts`); sin globals compartidos |
| `'use strict'` y `var` | Módulos ES, `const`/`let`, tipos estrictos |
| Reiniciar recargando o con una función global | `restart()` del motor, sin emitir `onRestart`; la tecla de reinicio en game over sí lo emite |

## Pasos

1. Inventario del original (resolución, controles, vidas/niveles, HUD, assets, globals).
2. Extraer `constants.ts` copiando valores sin cambiarlos.
3. Portar entidades a `entities.ts` pasando por parámetro lo que antes era global.
4. Escribir `createEngine(canvas, events)`: estado, `update`, `draw`, bucle, entrada, y `pause`, `resume`, `restart`, `endGame`, `destroy`.
5. Emitir estado inicial y eventos solo en cambios.
6. Comprobar: nada de `window`/`document` fuera de `createEngine`; un disparo/acción crea un solo efecto tras el doble montaje de Strict Mode; sin teclas atascadas tras `pause`.

## Cuándo preguntar

- ¿El HUD del original se queda dibujado en el canvas (por defecto) o solo se muestra el de la plataforma? SPEC 05 cerró el doble HUD para Asteroides; para juegos nuevos confírmalo.
- Sonido: dentro del motor (assets en `public/games/<id>/`) o fuera de alcance.
- Controles del original que usan ratón o táctil.
- Elementos fuera del canvas (preview, estadísticas): ver "Paneles extra" en `integration-checklist.md`.

## Juegos desde cero

Misma estructura de archivos y mismo contrato. La spec define reglas, puntuación, vidas, niveles y condición de fin explícitamente, porque no hay código original que lo documente. No se copian recursos de terceros.

## Prohibido

- Modificar `references/`.
- Cambiar jugabilidad, constantes o estética del original sin que la spec lo diga.
- Importar React o módulos de otros juegos desde el motor.
