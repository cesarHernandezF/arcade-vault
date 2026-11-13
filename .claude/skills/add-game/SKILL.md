---
name: add-game
description: Crea la spec para portar o crear un juego nuevo e integrarlo en Arcade Vault (motor aislado, registro, fila en `games`, portada y leaderboard). El juego puede venir de `references/started-games/` o ser nuevo. No escribe código; la implementación la hace /spec-impl.
disable-model-invocation: true
argument-hint: '<carpeta de references/started-games (p. ej. 03-tetris) o descripción del juego>'
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(git status:*), mcp__supabase__list_tables
---

# /add-game — Spec para añadir un juego a la plataforma

## Contexto de sesión

Fecha de hoy (úsala en la cabecera de la spec, nunca la adivines):
!`date +%F`

Specs existentes:
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ no existe"`

Juegos de referencia disponibles:
!`ls references/started-games/ 2>/dev/null || echo "No hay references/started-games/"`

Motores registrados hoy:
!`cat lib/games/registry.ts`

---

Este skill produce **una spec** (`specs/NN-<id>-juego.md`, estado `Borrador`) que describe cómo portar o crear un juego e integrarlo con el motor, el registro, la tabla `games` y el leaderboard de Supabase. **No escribes código ni tocas la base de datos.** Cuando la spec esté aprobada, el usuario ejecuta `/spec-impl`.

Responde en el idioma del prompt inicial (normalmente español). La spec se escribe en el mismo idioma y con los mismos encabezados y estados que SPEC 05 y SPEC 06.

Archivos del skill (mismo directorio que este archivo):

- `integration-checklist.md`: invariantes de la plataforma y extensiones retrocompatibles del contrato.
- `porting-guide.md`: cómo pasar un `game.js` de JavaScript plano a módulo TypeScript.
- `spec-template.md`: estructura de la spec con el plan y los criterios base.

## Fase 1 — Contexto

1. Lee `CLAUDE.md`, `specs/05-asteroides-juego.md`, `specs/06-leaderboard-y-tabla-juegos.md` y, si existe, la spec de juego más reciente (para copiar convenciones).
2. Lee `lib/game-engine.ts`, `lib/games/registry.ts`, `components/game-canvas.tsx`, `components/game-player.tsx` y el motor de referencia `lib/games/asteroides/engine.ts`. Si ya hubo extensiones del contrato (`GAME_META`, etc.), son parte del contrato actual: no las vuelvas a proponer.
3. **Lee el skill `/spec` como referencia obligatoria, antes de escribir cualquier archivo de especificación:** `.claude/skills/spec/SKILL.md` (filosofía, fases, reglas duras y guardado) y `.claude/skills/spec/template.md` (estructura de la spec). No lo ejecutes: úsalo como la fuente de las reglas de redacción y guardado de specs. Si el skill `/spec` no existe en esa ruta, detente y avísale al usuario.
4. Lee `integration-checklist.md`, `porting-guide.md` y `spec-template.md`. Estos archivos **añaden** el contenido específico de juegos sobre la estructura de `/spec`; si hay conflicto entre `spec-template.md` y `.claude/skills/spec/template.md`, manda la estructura de `/spec` y se conserva el contenido de juego.
4. Opcional: `mcp__supabase__list_tables` (solo lectura) para confirmar que `games` y `scores` existen.

Si `$ARGUMENTS` viene vacío, pide una descripción del juego en **una frase** (o el nombre de una carpeta de referencia).

## Fase 2 — Origen del juego

**Caso A: viene de `references/started-games/`.** `$ARGUMENTS` coincide con una carpeta por nombre completo (`03-tetris`), número (`03`) o slug (`tetris`). Lee `README.md`, `CLAUDE.md`, `index.html`, `game.js` y los auxiliares (`style.css`, `levels.js`, `assets/**/*.js`; lista `assets/` sin abrir binarios). Construye un **inventario**:

- Resolución del canvas y canvas extra (preview, minimapas).
- Controles (teclado, ratón, táctil).
- Vidas, niveles, puntuación y condición de fin de partida.
- HUD y overlays: ¿viven en el DOM o en el canvas?
- Globals, listeners en `window`/`document`, `setInterval`/`setTimeout`, dependencias de `document.getElementById`.
- Assets (imágenes, sonidos), scripts múltiples y su orden de carga.

**Caso B: juego nuevo.** No hay inventario previo; sale de las preguntas de la Fase 4 (reglas, puntuación, vidas, niveles, fin de partida, controles).

Nunca modifiques `references/`.

## Fase 3 — Brechas con el contrato

Contrasta el inventario con el contrato actual usando `integration-checklist.md`. Lista cada brecha (canvas distinto de 800×600, sin vidas, paneles extra, assets, sonido, táctil) con la **extensión retrocompatible** que propone la checklist. Toda extensión debe dejar a Asteroides sin cambios y llevar un criterio de aceptación que lo compruebe.

## Fase 4 — Preguntas

Usa `AskUserQuestion` en bloques de 3 a 5, con tu recomendación primero. Pregunta solo lo que el código o el usuario no hayan resuelto:

- **Identidad:** `id` (kebab-case, en español, único y no presente en `GAME_ENGINES` ni en `games`), `title` en mayúsculas, `category` (`ARCADE|PUZZLE|SHOOTER|VERSUS`), `color` (`cyan|magenta|yellow|green`).
- **Textos:** `short` (una línea) y `long` (te ofreces a redactarlos a partir del juego).
- **Portada:** idea visual para `.cover-<id>` (se diseña después con `/frontend-design`).
- **Interfaz:** HUD y overlays propios (por defecto doble HUD como SPEC 05: el canvas conserva los suyos y React muestra el de la plataforma), sonido dentro o fuera, táctil fuera salvo petición.
- **Segundo juego en adelante:** pestaña GLOBAL del Salón (SPEC 06 la dejó pendiente para cuando entrara el segundo juego): ¿entra en esta spec o va en otra?
- **Juego nuevo:** reglas, puntuación, vidas, niveles, fin de partida y qué queda fuera.

No reabras decisiones cerradas de SPEC 05 y 06. Si surge algo grande (multijugador, táctil, anti-trampas), propón dejarlo fuera de alcance, en su propia spec.

Detente cuando puedas responder: ¿qué archivos aparecen o cambian?, ¿cuál es el primer y el último paso?, ¿cómo se verifica que está terminado?

## Fase 5 — Escribir la spec

1. Número: el mayor de `specs/` + 1, con dos dígitos. Slug: `<id>-juego` (p. ej. `07-tetris-juego.md`).
2. Rellena `spec-template.md` con datos reales: fecha de la sesión, `Status: Borrador`, `Depends on: SPEC 05, SPEC 06` (más las specs que introdujeron extensiones del contrato que uses). Verifica que cada spec referenciada exista en `specs/`.
3. Incluye siempre el plan base de la plantilla (portada, extensiones si aplican, constantes y entidades, motor, registro + migración `seed_game_<id>`, verificación con limpieza de `scores`) y los criterios base, más los propios del juego (puntuaciones, reglas, controles).
4. Cada criterio debe ser verificable; cada decisión, con su porqué.
5. Antes de guardar, vuelve a repasar la Fase 3 y la Fase 4 de `.claude/skills/spec/SKILL.md` y aplica sus reglas: cabecera con objetivo en una frase, alcance con el "no incluye" explícito, plan con pasos que dejan el sistema funcional, criterios booleanos verificables y decisiones tomadas y descartadas con su justificación. Evita sus errores comunes (criterios vagos, pasos fuera de alcance, nombres de archivo no confirmados).
6. Escribe el archivo sin pedir permiso (pregunta solo si ya existe), siguiendo los pasos de guardado de `/spec` (Fase 4): estado `Borrador` (nunca `Aprobado`) y fecha leída del contexto de sesión.
7. Siembra la configuración como lo hace `/spec`: si `specs/.spec-config.yml` **no existe**, créalo con el contenido por defecto que aparece en `.claude/skills/spec/SKILL.md` (`AutoCreateBranch: true`); si ya existe, no lo toques.
8. Cierra confirmando: ruta del archivo, estado `Borrador`, que debe revisarla y pasarla a `Aprobado`, si creaste `specs/.spec-config.yml`, y que luego ejecute `/spec-impl NN-slug`. **Detente ahí.**

## Reglas duras

- Nunca escribas la spec sin haber leído antes `.claude/skills/spec/SKILL.md` y `.claude/skills/spec/template.md` en esta sesión.
- Nada de código, migraciones aplicadas ni escrituras en Supabase; solo lectura y los archivos de especificación (`specs/NN-slug.md` y, si falta, `specs/.spec-config.yml`).
- Nunca modifiques `references/`.
- No inventes datos: sin puntuaciones de ejemplo en `scores`.
- No propongas implementar tras guardar la spec.
- No reabras: doble HUD, React controla pausa y FIN, `games` solo lectura, `saveScore` genérico, estados vacíos del leaderboard.
