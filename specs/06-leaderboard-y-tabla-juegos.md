# SPEC 06 — Tabla de juegos y leaderboard en Supabase

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 04, SPEC 05
> **Date:** 2026-11-09
> **Objective:** Crear en Supabase las tablas `games` y `scores` (sin datos falsos, con `user_id` nulo) y migrar a ellas la biblioteca, el Home, la ficha, la página de jugar, el guardado de puntuaciones y el Salón de la Fama, eliminando el catálogo local `GAMES` y `seededScores`.

---

## Por qué existe esta spec

SPEC 04 dejó la conexión con Supabase lista pero sin tablas (`list_tables` devuelve `[]`). Esta es la primera spec que toca el esquema y la primera que lee y escribe datos reales.

Hoy el catálogo vive en `lib/games.ts` (8 juegos, 7 de ellos simulaciones), los rankings son falsos (`seededScores` en `lib/scores.ts`) y el modal de fin de partida guarda en `localStorage` (`av_scores`), así que ninguna puntuación llega a nadie más. Esta spec hace que Supabase sea la única fuente de juegos y puntuaciones.

El usuario decidió borrar los datos locales ahora: la tabla `games` guarda solo los juegos que existen de verdad, hoy únicamente `asteroides`. Las siete simulaciones (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`) y su código de simulación desaparecen de la app. Esto reemplaza lo que SPEC 05 decía sobre `rocas` y las otras simulaciones.

La tabla `scores` arranca **vacía**: mientras no haya puntuaciones reales, las pantallas muestran un mensaje, no datos inventados.

La spec es amplia a propósito: el usuario pidió una sola spec para el leaderboard y la tabla de juegos. Toca cinco áreas (base de datos, catálogo, guardado, ficha y Salón), por eso el plan va en pasos pequeños que dejan la app funcional en cada uno.

---

## Scope

**In:**

- Tabla `games` en el esquema `public`, sembrada solo con `asteroides`. Solo lectura: no hay UI ni políticas para editar juegos.
- Tabla `scores` con `user_id` opcional (siempre nulo por ahora) y clave foránea a `games`. Sin filas de seed.
- Vista `games_with_stats` (`security_invoker`) que agrega `best` (puntaje máximo) y `entries` (número de puntuaciones) a cada juego.
- RLS activo en ambas tablas: `SELECT` público en las dos e `INSERT` anónimo en `scores` solo con `user_id` nulo. Sin `UPDATE` ni `DELETE`.
- Migraciones aplicadas con `mcp__supabase__apply_migration`.
- Tipos generados en `lib/supabase/database.types.ts` y clientes de `lib/supabase/` tipados con `Database`.
- Lecturas en el servidor: `getGames()`, `getGame(id)` y `getTopScores(gameId, limit)`.
- `/biblioteca` y el Home leen los juegos de Supabase y muestran solo los que hay en `games`.
- Ficha `/juegos/[id]` y página de jugar `/juegos/[id]/jugar` leen el juego de Supabase y devuelven 404 si no existe. La ficha muestra el top 10 real con estado vacío.
- Eliminar el array `GAMES` de `lib/games.ts` y `seededScores` de `lib/scores.ts`. `lib/games.ts` conserva solo los tipos y `CATS`.
- Eliminar de `components/game-player.tsx` la simulación (puntaje aleatorio, arena decorativa, nivel calculado) y el guardado en `av_scores`.
- Server Action `saveScore` en `app/juegos/[id]/jugar/actions.ts` que inserta la puntuación e invalida la caché de las pantallas que la muestran.
- Guardado desde el modal con el nombre que la persona escribe en el campo, con estados de error y reintento, y recordatorio del nombre en `localStorage` (`av_player_name`).
- Salón de la Fama `/salon`: una pestaña por cada juego de `games` (hoy solo ASTEROIDES), con top 12 real, podio con los puestos existentes y estado vacío. Se elimina la fila "TU MEJOR MARCA".

**Out of scope (para specs futuras):**

- Autenticación real y escribir `user_id`. La columna existe y queda en nulo.
- Editar, crear o borrar juegos desde la UI, y políticas de escritura en `games`.
- Pestaña GLOBAL en el Salón (ranking de todos los juegos): se agrega cuando entre el segundo juego.
- Página `/juegos` con tabla de juegos y enlace en el nav: la lista de juegos es `/biblioteca`.
- Fila "TU MEJOR MARCA" del Salón: se elimina y volverá con la autenticación.
- Limpiar el CSS que queda sin uso (`.game-arena`, portadas `.cover-*` de los juegos eliminados).
- Datos de ejemplo en `scores` o cualquier respaldo con datos falsos.
- Usar el nombre de `av_user` como nombre de la puntuación de forma automática, o guardar al terminar la partida sin que la persona confirme.
- Anti-trampas, rate limiting y validación del puntaje contra el motor.
- Paginación, filtros por periodo, Realtime.
- Una pantalla de error propia cuando Supabase no responde.
- Tests automatizados (el proyecto no tiene test runner).

---

## Data model

### `games`

```sql
create table public.games (
  id         text primary key,                 -- mismo id que GAME_ENGINES
  title      text not null,
  short      text not null,
  long       text not null,
  category   text not null check (category in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover      text not null,                    -- clase CSS de la portada, p. ej. 'cover-asteroides'
  color      text not null check (color in ('cyan','magenta','yellow','green')),
  created_at timestamptz not null default now()
);
```

Seed: una sola fila, `asteroides`, con los valores actuales de `lib/games.ts` (`ASTEROIDES`, `short`, `long`, `SHOOTER`, `cover-asteroides`, `cyan`).

### `scores`

```sql
create table public.scores (
  id          bigint generated always as identity primary key,
  game_id     text not null references public.games (id) on delete cascade,
  user_id     uuid references auth.users (id) on delete set null,   -- opcional: hoy siempre null
  player_name text not null check (char_length(player_name) between 1 and 10),
  score       integer not null check (score >= 0),
  created_at  timestamptz not null default now()
);

create index scores_game_top_idx on public.scores (game_id, score desc, created_at);
```

Sin seed: la tabla empieza vacía y solo se llena con partidas reales.

### Vista `games_with_stats`

```sql
create view public.games_with_stats with (security_invoker = true) as
select g.*, max(s.score) as best, count(s.id)::integer as entries
from public.games g
left join public.scores s on s.game_id = g.id
group by g.id;
```

### RLS

```sql
alter table public.games  enable row level security;
alter table public.scores enable row level security;

create policy "games_select_public"  on public.games  for select to anon, authenticated using (true);
create policy "scores_select_public" on public.scores for select to anon, authenticated using (true);
create policy "scores_insert_anonymous" on public.scores
  for insert to anon, authenticated with check (user_id is null);
-- Sin políticas de INSERT/UPDATE/DELETE en games ni de UPDATE/DELETE en scores: quedan denegadas.
```

### Código de acceso

```ts
// lib/games.ts — solo tipos; se elimina el array GAMES
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type Accent = "cyan" | "magenta" | "yellow" | "green";
export const CATS = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const;
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: string;
  color: Accent;
  best: number | null; // puntaje máximo; null si no hay puntuaciones
  entries: number; // número de puntuaciones guardadas (reemplaza a `plays`)
}

// lib/games-db.ts
export async function getGames(): Promise<Game[]>; // orden: created_at asc
export async function getGame(id: string): Promise<Game | null>;

// lib/scores.ts — se elimina seededScores
export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}
export async function getTopScores(gameId: string, limit?: number): Promise<ScoreRow[]>; // limit = 10

// app/juegos/[id]/jugar/actions.ts
export type SaveScoreResult = { ok: true } | { ok: false; error: string };
export async function saveScore(
  gameId: string,
  playerName: string,
  score: number,
): Promise<SaveScoreResult>;
```

`getGames` y `getGame` leen la vista `games_with_stats` y mapean `category` a `cat`.

Textos de estado vacío:

- Sin puntuaciones (ficha y pestañas del Salón): `SÉ EL PRIMERO EN ENTRAR AL SALÓN DE LA FAMA`.
- Mejor puntuación sin datos (tarjeta de la biblioteca y "Mejor global" de la ficha): `—`.
- "Partidas" de la ficha se renombra "Puntuaciones" y muestra `entries`.

Convenciones:

- `rank` se calcula por posición (1..n) tras ordenar por `score desc, created_at asc` (el empate lo gana quien llegó primero). `date` se formatea `DD/MM/YYYY` desde `created_at`.
- Las lecturas usan `createClient` de `lib/supabase/server.ts` y solo se llaman desde Server Components o Server Actions. Si una consulta falla, la función lanza el error.
- Invariante: todo juego de `games` debe tener su motor en `GAME_ENGINES` y viceversa. La página de jugar devuelve 404 si el juego existe en `games` pero no en el registro.
- `saveScore` valida en el servidor: `playerName` recortado de 1 a 10 caracteres, `score` entero mayor o igual a 0, y `gameId` presente en `games`. Inserta con `user_id` nulo. Devuelve `{ ok: false, error }` en vez de lanzar. Tras insertar invalida la caché de `/biblioteca`, `/salon` y `/juegos/[id]` con la API vigente de esta versión de Next.
- Nombre del modal: lo que la persona escribe en el campo es lo que se guarda. El valor inicial del campo es, en este orden, el nombre recordado en `localStorage.av_player_name`, el de la sesión (`av_user`) o `INVITADO`. El nombre solo se escribe en `av_player_name` cuando la persona editó el campo y el guardado terminó bien. Se lee tras el montaje (como `lib/session.tsx`) y toda lectura y escritura de `localStorage` va en `try/catch`.
- El Salón no usa el cliente de navegador de Supabase: `/salon` es un Server Component que lee los top 12 de todos los juegos y los pasa por props a `components/hall-of-fame.tsx`.
- Las tablas y la vista se crean solo mediante migraciones de Supabase. No se crea el directorio `supabase/` ni archivos `.sql` en el repo.
- La clave `service_role` no se usa ni se guarda en el proyecto.
- Los cambios visibles (estados vacíos, mensaje de error del modal, tarjetas con `—`) se diseñan con el skill `/frontend-design` y reutilizan las clases existentes antes de crear CSS nuevo.

---

## Implementation plan

0. Antes de escribir código, leer en `node_modules/next/dist/docs/01-app` las guías de Server Actions, de obtención de datos en Server Components, de `Suspense`/`cookies()`, de rutas dinámicas sin `generateStaticParams` y de invalidación de caché (esta versión de Next tiene cambios incompatibles), y revisar `next.config.ts`. Consultar con `mcp__supabase__search_docs` la guía vigente de RLS, vistas con `security_invoker` y consultas con `supabase-js`. Confirmar con `mcp__supabase__list_tables` que `public` sigue vacío.
1. Aplicar la migración `create_games_table` (tabla, RLS, política `SELECT` y seed de `asteroides`). Prueba manual: `select id from games` devuelve solo `asteroides`; `mcp__supabase__get_advisors` (security) no reporta RLS desactivado en `games`.
2. Aplicar la migración `create_scores_table` (tabla, índice, RLS y políticas `SELECT` e `INSERT` anónimo; sin seed) y la migración `create_games_with_stats_view`. Prueba manual: `select count(*) from scores` devuelve 0, `select id, best, entries from games_with_stats` devuelve `asteroides` con `best` nulo y `entries` 0, y `get_advisors` no reporta RLS desactivado ni vistas `security definer`.
3. Generar los tipos con `mcp__supabase__generate_typescript_types` en `lib/supabase/database.types.ts` y tipar `createClient` de `lib/supabase/client.ts` y `lib/supabase/server.ts` con `Database`. Prueba manual: `npm run lint` y `npm run build` sin errores.
4. Crear `lib/games-db.ts` con `getGames()` y `getGame(id)`, ampliar `Game` en `lib/games.ts` con `best` y `entries` (por ahora `GAMES` conserva valores para no romper), y agregar `getTopScores` a `lib/scores.ts`. Prueba manual: `npm run lint` sin errores.
5. Migrar `/biblioteca` y el Home: `app/biblioteca/page.tsx` lee `getGames()` y pasa `games` por props a `components/library.tsx`; `app/page.tsx` usa `getGames()` en lugar de `GAMES.slice(0, 6)`; `components/game-card.tsx` muestra `—` cuando `best` es nulo. Prueba manual: `/biblioteca` y `/` muestran solo la tarjeta de Asteroides y la búsqueda y los filtros siguen funcionando.
6. Migrar la ficha: `app/juegos/[id]/page.tsx` usa `getGame(id)` (404 si no existe) y `getTopScores(id)`, quita `generateStaticParams`, muestra "Puntuaciones" y "Mejor global" desde `entries` y `best`, y `components/leaderboard.tsx` gana el estado vacío. Prueba manual: `/juegos/asteroides` muestra el estado vacío y `/juegos/rocas` muestra la pantalla 404.
7. Migrar la página de jugar: `app/juegos/[id]/jugar/page.tsx` usa `getGame(id)` y devuelve 404 si el id no está en `GAME_ENGINES`; en `components/game-player.tsx` eliminar la simulación (`setInterval`, `.game-arena`, nivel calculado, `hasEngine`) y el guardado en `av_scores`, dejando el modal con el botón sin efecto real hasta el paso siguiente. Prueba manual: `/juegos/asteroides/jugar` sigue siendo jugable con el HUD sincronizado.
8. Crear `app/juegos/[id]/jugar/actions.ts` con `saveScore` y conectarlo al botón del modal: nombre escrito en el campo, "GUARDANDO_" mientras espera, mensaje de error con reintento si falla, lectura inicial de `av_player_name` y escritura tras un guardado correcto con el campo editado. Prueba manual: terminar una partida, escribir un nombre y guardar crea una fila en `scores`, aparece en `/juegos/asteroides` sin reiniciar el servidor, y en la partida siguiente el campo ya trae ese nombre.
9. Reescribir `/salon`: `app/salon/page.tsx` pasa a Server Component que lee `getGames()` y `getTopScores(id, 12)` por juego y los entrega por props a `components/hall-of-fame.tsx`, que muestra una pestaña por juego, el podio solo con los puestos existentes, el estado vacío y sin la fila "TU MEJOR MARCA". Prueba manual: `/salon` muestra solo la pestaña ASTEROIDES, vacía o con las filas guardadas en el paso 8.
10. Eliminar el array `GAMES` de `lib/games.ts` (se conservan `Category`, `Accent`, `CATS` y `Game`) y `seededScores` de `lib/scores.ts`, y quitar los imports sin uso. Prueba manual: `git grep -n "GAMES\b\|seededScores"` no devuelve usos, y `npm run lint` y `npm run build` sin errores.
11. Verificar en el navegador con Playwright (capturas en `.playwright-screenshots/`) `/`, `/biblioteca`, `/juegos/asteroides`, `/juegos/asteroides/jugar` y `/salon` a 1280 px y a 375 px, y una partida completa con guardado. Insertar tres puntuaciones de prueba para comprobar el orden y el podio. Rechazar con la publishable key un `UPDATE`, un `DELETE` y un `INSERT` con `user_id` no nulo. Borrar con `mcp__supabase__execute_sql` todas las filas de prueba. Ejecutar `npm run lint` y `npm run build`.

---

## Acceptance criteria

### Base de datos

- [ ] `mcp__supabase__list_tables` (esquema `public`) devuelve `games` y `scores`, ambas con RLS activo, y existe la vista `games_with_stats`.
- [ ] `select id from games` devuelve exactamente una fila: `asteroides`, con `cover = 'cover-asteroides'`.
- [ ] `games.category` y `games.color` rechazan valores fuera de los tipos `Category` y `Accent`.
- [ ] Tras aplicar las migraciones, `select count(*) from scores` devuelve 0: no hay filas de seed.
- [ ] Insertar en `scores` con un `game_id` inexistente, con `score` negativo, con `player_name` vacío o con más de 10 caracteres falla.
- [ ] Borrar un juego de `games` borra sus filas de `scores` (`on delete cascade`).
- [ ] `games_with_stats` devuelve `best` igual al puntaje máximo y `entries` igual al número de filas de `scores` de cada juego, y `best` nulo sin puntuaciones.
- [ ] `GET <URL>/rest/v1/games_with_stats` y `GET <URL>/rest/v1/scores` con la publishable key responden HTTP 200.
- [ ] `POST <URL>/rest/v1/scores` con la publishable key y `user_id` nulo responde HTTP 201.
- [ ] `POST <URL>/rest/v1/scores` con la publishable key y un `user_id` no nulo responde HTTP 401, 403 o 400 y no inserta nada.
- [ ] `PATCH` y `DELETE` sobre `scores`, y cualquier `POST`, `PATCH` o `DELETE` sobre `games`, con la publishable key, no modifican ninguna fila.
- [ ] `mcp__supabase__get_advisors` (security) no reporta tablas sin RLS ni vistas `security definer` en `games`, `scores` o `games_with_stats`.
- [ ] No existe el directorio `supabase/` ni archivos `.sql` nuevos en el repo.
- [ ] `lib/supabase/database.types.ts` existe y `createClient` de ambos clientes está tipado con `Database`.

### Catálogo desde Supabase

- [ ] `git grep -n "GAMES\b"` y `git grep -n "seededScores"` en `app/`, `components/` y `lib/` no devuelven usos.
- [ ] `lib/games.ts` exporta `Category`, `Accent`, `CATS` y `Game`, y no contiene ningún juego.
- [ ] `/biblioteca` muestra únicamente la tarjeta de `ASTEROIDES`, con `—` como mejor puntuación mientras `scores` esté vacía.
- [ ] La búsqueda y los filtros de categoría de `/biblioteca` siguen funcionando: buscar `zzz` o elegir `PUZZLE` muestra "NO HAY RESULTADOS".
- [ ] El Home muestra en "JUEGOS DISPONIBLES AHORA" solo `ASTEROIDES`.
- [ ] `/juegos/asteroides` carga con la portada, el título y el texto largo de la tabla `games`.
- [ ] `/juegos/rocas`, `/juegos/rocas/jugar` y un id inexistente muestran la pantalla 404 (con `noindex`). El estado HTTP es 200 porque `notFound()` corre dentro de `<Suspense>` con la respuesta ya en streaming (ver Decisions).
- [ ] `/juegos` (sin id) devuelve 404 y `components/nav.tsx` no tiene cambios en `git diff`.
- [ ] La ficha muestra "Puntuaciones" con el valor de `entries` y "Mejor global" con `best` o `—`.
- [ ] `components/game-player.tsx` no contiene la simulación ni referencias a `av_scores`, y `.game-arena` ya no se renderiza.
- [ ] `/juegos/asteroides/jugar` sigue siendo jugable con el canvas y el HUD de la plataforma sincronizado (SPEC 05).

### Guardado y nombre

- [ ] Al terminar una partida, "GUARDAR PUNTUACIÓN" inserta en `scores` una fila con `game_id = 'asteroides'`, `user_id` nulo, el texto escrito en el campo del modal y el puntaje final igual al del modal.
- [ ] Con la sesión `av_user` iniciada como `ANA` y el campo editado a `LUIS`, la fila guardada tiene `player_name = 'LUIS'`.
- [ ] Tras guardar con el campo editado a `LUIS`, `localStorage.av_player_name` vale `LUIS`.
- [ ] En la partida siguiente, y tras recargar la página, el campo del modal aparece relleno con `LUIS` y basta pulsar "GUARDAR PUNTUACIÓN" para guardar.
- [ ] Sin `av_player_name` y con sesión `ANA`, el campo aparece con `ANA`; sin ninguno de los dos, con `INVITADO`. Si no se edita el campo, `av_player_name` no se escribe.
- [ ] Si el guardado falla, `av_player_name` no se escribe.
- [ ] Con `localStorage` bloqueado, el modal sigue funcionando y guarda en Supabase.
- [ ] Tras guardar, el modal muestra "PUNTUACIÓN GUARDADA_" y el botón desaparece; pulsarlo dos veces seguidas no crea dos filas.
- [ ] Si el guardado falla (por ejemplo sin red), el modal muestra un mensaje de error, el botón sigue activo y un reintento posterior puede guardar.
- [ ] Un nombre vacío o solo con espacios no se guarda y muestra un error.
- [ ] La puntuación guardada aparece en `/juegos/asteroides`, `/salon` y en la tarjeta de `/biblioteca` (mejor puntuación) sin reiniciar el servidor.

### Leaderboard y Salón

- [ ] Con `scores` vacía, `/juegos/asteroides` muestra `SÉ EL PRIMERO EN ENTRAR AL SALÓN DE LA FAMA` en MEJORES PUNTUACIONES, sin errores en la consola.
- [ ] Con tres puntuaciones de prueba de `asteroides` (500, 900 y 700), la ficha las lista como #01 `900`, #02 `700` y #03 `500`, con fechas `DD/MM/YYYY`.
- [ ] Un empate de puntaje lo gana la puntuación guardada primero.
- [ ] `/salon` muestra una sola pestaña, ASTEROIDES, sin pestaña GLOBAL ni pestañas de otros juegos.
- [ ] Con `scores` vacía, `/salon` muestra el estado vacío, sin podio ni errores.
- [ ] Con las tres puntuaciones de prueba, `/salon` muestra el podio con 900, 700 y 500 y la tabla con las tres filas.
- [ ] `/salon` no rompe con 1 o 2 filas (podio solo con los puestos existentes).
- [ ] `/salon` no muestra la fila "TU MEJOR MARCA" y cambiar de pestaña no hace peticiones al navegador.

### Calidad

- [ ] A 375 px de ancho `/`, `/biblioteca`, `/juegos/asteroides` y `/salon` no tienen scroll horizontal.
- [ ] No hay errores ni advertencias de hidratación en la consola del navegador en `/`, `/biblioteca`, `/juegos/asteroides`, `/juegos/asteroides/jugar` y `/salon`.
- [ ] Ninguna ruta existente devuelve 500.
- [ ] Tras la verificación, `select count(*) from scores` vuelve a 0 (las filas de prueba se borraron).
- [ ] `npm run lint` termina sin errores ni advertencias.
- [ ] `npm run build` termina sin errores.

---

## Decisions

- **Sí:** una sola spec para leaderboard y tabla de juegos. Lo definió el usuario aunque toca cinco áreas; el plan se divide en pasos pequeños para compensarlo.
- **Sí:** `games` solo con `asteroides`. Lo definió el usuario: la tabla guarda las referencias de los juegos que existen de verdad.
- **Sí:** borrar los datos locales (`GAMES` y `seededScores`) en esta spec y cargar los juegos solo desde Supabase. Lo definió el usuario. Reemplaza la decisión anterior de dejar el estado híbrido.
- **Sí:** eliminar las siete simulaciones y su código en `GamePlayer`. Sin datos locales no hay juegos que simular, y sus puntajes aleatorios no deben entrar al ranking real. Esto reemplaza los criterios de SPEC 05 sobre `rocas` y las otras simulaciones.
- **No:** sembrar en `games` los siete juegos simulados. Tendrían una ficha y un ranking en base de datos sin un juego real detrás.
- **Sí:** `/biblioteca` es la lista de juegos, leyendo de `games`. Lo definió el usuario al revisar el plan de referencia.
- **No:** página `/juegos` con tabla ni enlace nuevo en el nav. Duplicaría a `/biblioteca`; reemplaza la decisión anterior.
- **Sí:** `games` es solo lectura. Lo definió el usuario: los juegos no se editan todavía. Sin UI ni políticas de escritura.
- **Sí:** columnas `long` y `cover` en `games`. Sin ellas la ficha y las tarjetas perderían el texto largo y la portada al borrar el catálogo local. `cover` guarda la clase CSS existente.
- **Sí:** `best` y `entries` calculados con la vista `games_with_stats` (`security_invoker`). Evita almacenar totales que se desincronizarían y respeta RLS.
- **No:** columnas `best` y `plays` almacenadas en `games`. Se desactualizarían con cada puntuación y no hay un recuento real de partidas.
- **Sí:** "Partidas" pasa a "Puntuaciones" (`entries`). Hoy solo se puede contar lo guardado, no las partidas jugadas.
- **Sí:** `scores(id, game_id, player_name, score, created_at)` más `user_id` opcional, siempre nulo. Lo definió el usuario: no se obliga a nadie a autenticarse por ahora.
- **No:** seed de puntuaciones ficticias ni respaldo con `seededScores`. Lo definió el usuario: los datos falsos confunden cuando el sistema ya es real.
- **Sí:** estado vacío `SÉ EL PRIMERO EN ENTRAR AL SALÓN DE LA FAMA`. Lo definió el usuario y invita a jugar en lugar de mostrar una tabla vacía.
- **Sí:** guardar el valor que la persona escribe en el campo del modal, tras confirmar con el botón. Lo definió el usuario.
- **No:** guardar automáticamente al terminar la partida, ni usar el nombre de `av_user` sin que la persona lo confirme o edite.
- **Sí:** recordar el nombre en `localStorage` (`av_player_name`) y rellenar el campo la próxima vez. Lo definió el usuario. Se escribe solo si editó el campo y el guardado salió bien, para no fijar `INVITADO` ni el nombre de sesión.
- **Sí:** `/salon` con una pestaña por juego de `games` y sin GLOBAL. Con un único juego, GLOBAL repetiría ASTEROIDES; se agrega cuando entre el segundo juego.
- **Sí:** `/salon` carga todo por servidor y pasa los top 12 por props. Cambiar de pestaña es instantáneo y no necesita el cliente de navegador de Supabase.
- **No:** fetch en el navegador al cambiar de pestaña. Agregaría estado de carga y lecturas desde el cliente sin beneficio con pocos juegos.
- **Sí:** INSERT anónimo en `scores` con `with check (user_id is null)`. Permite jugar sin cuenta y deja claro que una puntuación anónima nunca se atribuye a un usuario.
- **No:** `service_role` para insertar desde la Server Action. Saltaría RLS y no hace falta; la acción usa el cliente de servidor con la publishable key.
- **Sí:** Server Action `saveScore` en lugar de insertar desde el navegador. Centraliza la validación y permite invalidar la caché. Sigue el precedente de `app/acerca/actions.ts`.
- **No:** validar el puntaje contra el motor ni limitar peticiones. Cualquiera puede enviar un puntaje inventado con la publishable key; es el coste aceptado de jugar sin autenticación y se aborda en otra spec.
- **Sí:** `player_name` de 1 a 10 caracteres. Coincide con el límite de la sesión y del campo del modal.
- **Sí:** `games.id` de tipo `text` con los ids actuales. Las rutas `/juegos/[id]` y `GAME_ENGINES` ya los usan.
- **No:** `id uuid` más `slug`. Obliga a traducir entre ambos sin beneficio.
- **Sí:** quitar `generateStaticParams` de la ficha y de jugar. Hoy usa la lista local; leer la base de datos en tiempo de compilación exige un cliente sin `cookies()` y los ids nuevos quedarían fuera hasta recompilar.
- **Sí:** aceptar estado HTTP 200 con la pantalla 404 y `noindex` para ids desconocidos. Sin `generateStaticParams`, `params` es dato de runtime y la lectura va dentro de `<Suspense>`, así que Next ya envió el estado cuando `notFound()` se ejecuta. Se verificó en producción (`next start`). Lo definió el usuario durante la implementación; reemplaza el criterio de "devuelven 404".
- **Sí:** envolver `<Nav />` en `<Suspense>` en `app/layout.tsx` (con un `<nav className="av-nav">` vacío como fallback). Al quitar `generateStaticParams`, `usePathname()` pasa a ser dato de runtime y bloqueaba `npm run build`. `components/nav.tsx` no cambia. Lo definió el usuario durante la implementación.
- **Sí:** `lib/session.tsx` lee la sesión con `useSyncExternalStore` dentro de `useSession` (snapshot de servidor `null`), en lugar de un `useEffect` en el Provider. Al envolver `<Nav />` en `<Suspense>`, `Nav` se hidrata después de que el Provider ya cargó el usuario y el HTML del servidor no coincidía (error de hidratación con sesión iniciada). Leer el store en cada consumidor evita el desajuste. La API de `useSession` no cambia. Lo definió el usuario durante la implementación.
- **Sí:** `lib/games.ts` se conserva solo con tipos y `CATS`. `lib/home.ts`, `lib/about.ts` y las tarjetas importan `Accent` y `Game` de ahí; moverlos obligaría a tocar archivos sin relación.
- **Sí:** eliminar la fila "TU MEJOR MARCA". Se calculaba como `rows[5].score - 2400` y con filas reales no tiene sentido ni es segura con menos de 6 filas. Vuelve con la autenticación.
- **Sí:** migraciones con `apply_migration` sin crear `supabase/`. Mantiene la decisión de SPEC 04.
- **Sí:** generar tipos ahora. SPEC 04 lo aplazó hasta que existiera la primera tabla.
- **Sí:** desempate por `created_at` ascendente. Quien alcanzó primero el puntaje queda por encima.

---

## Risks

| Riesgo                                                                                                               | Mitigación                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La app entera (Home, biblioteca, ficha, Salón) depende de Supabase: si no responde, esas pantallas fallan            | Se acepta por ahora: las lecturas lanzan el error y Next muestra su pantalla de error. Una pantalla de error propia queda fuera de alcance.                           |
| Cualquiera puede insertar puntajes falsos con la publishable key (INSERT anónimo)                                    | Decisión aceptada por jugar sin autenticación. `check` de rango en `player_name` y `score >= 0`, y `with check (user_id is null)`. Anti-trampas queda para otra spec. |
| Se agrega un juego a `games` sin motor en `GAME_ENGINES`, o al revés                                                 | Invariante documentada; la página de jugar devuelve 404 si falta el motor. Cada juego nuevo agrega su fila a `games` y su entrada al registro en la misma spec.       |
| Las pantallas muestran datos viejos tras guardar por la caché de Next                                                | `saveScore` invalida `/biblioteca`, `/salon` y `/juegos/[id]`; un criterio comprueba que la puntuación aparece sin reiniciar. El paso 0 confirma la API vigente.      |
| Quitar `generateStaticParams` o leer con `cookies()` en el Home y la biblioteca puede hacer fallar `npm run build`   | El paso 0 obliga a leer las guías de Next 16 y las páginas envuelven la lectura en `Suspense`. Los pasos 5, 6 y 7 se verifican con `npm run build`.                   |
| La vista `games_with_stats` podría saltarse RLS si se crea como `security definer`                                   | Se crea con `security_invoker = true`; un criterio y `get_advisors` lo verifican.                                                                                     |
| Borrar `GAMES` deja errores de tipos o imports rotos en archivos poco visibles                                       | Los pasos 4 a 9 migran los consumidores uno a uno antes de borrar el array en el paso 10, y un criterio exige que `git grep` no encuentre usos.                       |
| Con un solo juego, los filtros de categoría de `/biblioteca` muestran categorías que siempre dan "NO HAY RESULTADOS" | Se acepta: los chips siguen siendo `CATS` y se ajustan cuando haya más juegos.                                                                                        |
| Leer `av_player_name` tras el montaje provoca un parpadeo del nombre o un error de hidratación                       | Se lee en un `useEffect`, como `lib/session.tsx`; el modal solo aparece tras terminar la partida, así que el valor ya está cargado. Un criterio revisa la consola.    |
| `localStorage` bloqueado rompe el guardado del nombre                                                                | Toda lectura y escritura va en `try/catch`; un criterio verifica que el modal sigue guardando en Supabase.                                                            |
| Las pruebas de verificación contaminan `scores` con filas de prueba                                                  | El paso 11 las borra con `execute_sql` y un criterio comprueba que el conteo vuelve a 0.                                                                              |
| El tipo generado queda desactualizado cuando cambie el esquema                                                       | Se regenera con `generate_typescript_types` en cada spec que modifique tablas.                                                                                        |
| Una migración aplicada con `apply_migration` no se revierte sola si falla a medias                                   | Cada migración es pequeña y atómica (una tabla o vista con su RLS y seed). Si falla, se corrige tras comprobar con `list_tables` qué quedó creado.                    |

---

## What is **not** in this spec

- Autenticación real ni escribir `user_id`.
- Editar, crear o borrar juegos, ni políticas de escritura en `games`.
- Pestaña GLOBAL en el Salón ni página `/juegos`.
- La fila "TU MEJOR MARCA" del Salón.
- Limpieza del CSS sin uso.
- Datos de ejemplo en `scores` ni respaldo con datos falsos.
- Anti-trampas, rate limiting y validación del puntaje.
- Pantalla de error propia cuando Supabase no responde.
- Paginación, filtros por periodo, Realtime y tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propia spec.
