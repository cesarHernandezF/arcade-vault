# SPEC 01 — MVP visual: pantallas de Arcade Vault

> **Status:** Implementado
> **Depends on:** Ninguna (reutiliza los estilos y fuentes ya portados en `app/globals.css` y `app/layout.tsx`)
> **Date:** 2026-11-04
> **Objective:** Implementar en Next.js las 5 pantallas visuales de `references/templates` (Biblioteca, Detalle, Reproductor, Acceso y Salón de la Fama) con datos simulados y sin ningún juego real.

---

## Por qué existe esta spec

Las plantillas en `references/templates/*.jsx` son un prototipo de una sola página (React por CDN, ruteo por hash, estilos en `styles.css`). Esta spec lo traslada al stack real del proyecto (Next.js App Router, TypeScript, `app/globals.css`) para tener el esqueleto visual completo. Los juegos, el backend y la autenticación real quedan para specs posteriores.

Los estilos de `references/templates/styles.css` ya están portados a `app/globals.css`, y las fuentes (Press Start 2P, JetBrains Mono, Courier Prime) ya están cargadas con `next/font` en `app/layout.tsx`. Esta spec **no** vuelve a portar estilos; solo agrega o ajusta clases si falta alguna al comparar contra las plantillas.

---

## Scope

**In:**

- Layout global con `Nav` (con menú móvil) y `Footer` en todas las pantallas.
- Pantalla **Biblioteca** (`/`): hero, buscador por nombre, chips de categoría y grilla de tarjetas con efecto tilt y estado vacío "NO HAY RESULTADOS".
- Pantalla **Detalle** (`/juegos/[id]`): portada, etiquetas, descripción larga, tira de estadísticas, botones de acción y tabla "MEJORES PUNTUACIONES".
- Pantalla **Reproductor** (`/juegos/[id]/jugar`): HUD, pantalla CRT con arena decorativa, pausa, botón FIN y modal de fin de juego con guardado de puntuación. El puntaje es simulado.
- Pantalla **Acceso** (`/acceso`): pestañas Iniciar sesión / Crear cuenta, formulario, botón de invitado y botones sociales decorativos.
- Pantalla **Salón de la Fama** (`/salon`): pestañas por juego, podio top 3, tabla de 12 filas y fila "TU MEJOR MARCA" si hay sesión.
- Sesión falsa: `{ name }` en `localStorage` (clave `av_user`), sin validación.
- Datos simulados en TypeScript: catálogo de 8 juegos y generador determinista de puntuaciones (`seededScores`).
- Respuesta 404 para ids de juego inexistentes.

**Out of scope (para specs futuras):**

- Cualquier juego real (lógica, canvas, controles). El reproductor es solo un cascarón.
- Backend, base de datos, API de puntuaciones y ranking real.
- Autenticación real (OAuth con Google/GitHub, hash de contraseñas, cookies de sesión).
- Validación de formularios con mensajes de error.
- Lectura de las puntuaciones guardadas en `av_scores` (se escriben, pero ninguna pantalla las muestra).
- Tests automatizados (el proyecto no tiene test runner).
- Tweaks panel / modo editor de la plantilla (`.tw-*` en `styles.css`).

---

## Data model

```ts
// lib/games.ts
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type Accent = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;        // slug de URL, p. ej. "bloque-buster"
  title: string;     // "BLOQUE BUSTER"
  short: string;     // descripción corta (tarjeta)
  long: string;      // descripción larga (detalle)
  cat: Category;
  cover: string;     // clase CSS existente en globals.css, p. ej. "cover-bricks"
  color: Accent;     // decide el color del botón JUGAR en la tarjeta
  best: number;      // mejor puntuación global (simulada)
  plays: string;     // "12.4K"
}

export const GAMES: Game[];                               // los 8 juegos de data.jsx
export const CATS: readonly ["TODOS", ...Category[]];     // filtros de la biblioteca

// lib/scores.ts
export interface ScoreRow { rank: number; name: string; score: number; date: string } // date: "DD/MM/2026"
export function seededScores(seed: number, count?: number): ScoreRow[];  // determinista, ordenado desc

// lib/session.tsx
export interface SessionUser { name: string }   // MAYÚSCULAS, máx. 10 caracteres
// Contexto React: { user: SessionUser | null, login(u), signOut() }
```

Persistencia en `localStorage`:

- `av_user`: `SessionUser` serializado en JSON. Se elimina al cerrar sesión.
- `av_scores`: arreglo JSON de `{ game, score, name, at }`. Solo escritura en este MVP.

Convenciones:

- Los datos de `GAMES` y las semillas de `seededScores` se copian de `references/templates/data.jsx` sin cambiar valores, para que las pantallas coincidan con el prototipo.
- Semillas: detalle `id.length * 17 + 3` con 10 filas; salón `id.length * 23 + 7` con 12 filas.
- Los números se formatean con `toLocaleString("es-ES")`.
- La sesión se lee de `localStorage` dentro de `useEffect` para evitar errores de hidratación. Antes de leerla, la UI se renderiza como sin sesión.

---

## Implementation plan

0. Antes de escribir código, leer en `node_modules/next/dist/docs/01-app` las guías de layouts y páginas, rutas dinámicas (`params` asíncrono), `notFound`, `generateStaticParams` y Client Components. Esta versión de Next tiene cambios incompatibles.
1. Crear `lib/games.ts` y `lib/scores.ts` con los datos y funciones del modelo, copiados de `data.jsx` y tipados. Prueba manual: `npm run lint` sin errores.
2. Crear `lib/session.tsx` (Client Component con `SessionProvider` y `useSession`) y `components/nav.tsx`, `components/footer.tsx`. Prueba manual: con `npm run dev`, el nav y el footer se ven en `/`, con enlaces a `/` y `/salon`, el botón "Iniciar Sesión" y el menú móvil (hamburguesa) bajo 840 px.
3. Modificar `app/layout.tsx`: envolver `children` en `SessionProvider`, renderizar `Nav`, `<main className="av-main">{children}</main>` y `Footer`. Se conservan los divs `av-bg`, `av-noise` y `#root`. Prueba manual: el fondo neón, el nav y el footer aparecen en todas las rutas.
4. Crear `components/game-card.tsx` (Client Component con efecto tilt) y `components/library.tsx` (Client Component con buscador y chips). Reemplazar `app/page.tsx` por la Biblioteca. Prueba manual: filtrar por texto y categoría; una búsqueda sin coincidencias muestra "NO HAY RESULTADOS".
5. Crear `app/juegos/[id]/page.tsx` (Server Component) con `generateStaticParams` y `notFound()`. Incluye `components/leaderboard.tsx` para "MEJORES PUNTUACIONES". Prueba manual: tocar una tarjeta lleva a `/juegos/bloque-buster`; `/juegos/xyz` muestra 404.
6. Crear `app/salon/page.tsx` y `components/hall-of-fame.tsx` (Client Component con pestañas, podio, tabla y fila "TU MEJOR MARCA"). Prueba manual: cambiar de pestaña actualiza podio y tabla.
7. Crear `app/acceso/page.tsx` y `components/auth-form.tsx`. Envío: `login({ name })` y `router.push("/")`. Invitado: `signOut()` y `router.push("/")`. Prueba manual: entrar con "px_kai" muestra "PX_KAI ▾" en el nav y sobrevive a recargar.
8. Crear `app/juegos/[id]/jugar/page.tsx` y `components/game-player.tsx` (Client Component: HUD, pausa, FIN, modal, guardado en `av_scores`). Prueba manual: el puntaje sube solo, PAUSA lo detiene, FIN abre el modal y GUARDAR PUNTUACIÓN muestra "PUNTUACIÓN GUARDADA_".
9. Comparar cada pantalla contra `references/templates/Arcade Vault.html` abierto en el navegador, y agregar a `app/globals.css` cualquier clase faltante. Ejecutar `npm run lint` y `npm run build`.

---

## Acceptance criteria

- [ ] `npm run lint` termina sin errores ni advertencias.
- [ ] `npm run build` termina sin errores.
- [ ] La consola del navegador no muestra errores de hidratación en ninguna de las 5 rutas.
- [ ] `/` muestra las 8 tarjetas de juego.
- [ ] En `/`, escribir "caída" en el buscador deja solo la tarjeta CAÍDA.
- [ ] En `/`, el chip SHOOTER deja exactamente 2 tarjetas (INVASORES y ROCAS).
- [ ] En `/`, buscar "zzz" muestra el texto "NO HAY RESULTADOS".
- [ ] Hacer clic en una tarjeta o en su botón JUGAR navega a `/juegos/<id>`.
- [ ] `/juegos/serpentina` muestra el título, la descripción larga, las 3 estadísticas y 10 filas de puntuaciones.
- [ ] `/juegos/no-existe` devuelve la página 404 de Next.
- [ ] En `/juegos/serpentina`, "JUGAR AHORA" navega a `/juegos/serpentina/jugar` y "VOLVER AL VAULT" navega a `/`.
- [ ] En el reproductor, el puntaje aumenta con el tiempo, PAUSA lo detiene y muestra "EN PAUSA", y REANUDAR lo retoma.
- [ ] En el reproductor, SALIR navega a `/juegos/<id>`.
- [ ] En el reproductor, FIN abre el modal "FIN DEL JUEGO" con la puntuación final.
- [ ] GUARDAR PUNTUACIÓN agrega un elemento a `localStorage["av_scores"]` y muestra "PUNTUACIÓN GUARDADA_".
- [ ] JUGAR DE NUEVO reinicia puntaje, vidas y nivel y cierra el modal.
- [ ] En `/acceso`, la pestaña "CREAR CUENTA" muestra el campo de correo y la pestaña "INICIAR SESIÓN" lo oculta.
- [ ] Enviar el formulario con usuario "px_kai" guarda `{"name":"PX_KAI"}` en `localStorage["av_user"]` y navega a `/`.
- [ ] Tras iniciar sesión, el nav muestra "PX_KAI ▾" y sigue mostrándolo después de recargar.
- [ ] Hacer clic en "PX_KAI ▾" elimina `av_user` y el nav vuelve a mostrar "Iniciar Sesión".
- [ ] "JUGAR COMO INVITADO" deja `av_user` vacío y navega a `/`.
- [ ] En `/salon`, hay un chip por cada uno de los 8 juegos y cambiar de chip cambia el podio y la tabla.
- [ ] En `/salon`, la tabla tiene 12 filas, y las 3 primeras tienen los estilos oro, plata y bronce.
- [ ] En `/salon`, la fila "TU MEJOR MARCA" aparece solo con sesión iniciada.
- [ ] Recargar `/salon` o `/juegos/caida` produce los mismos nombres y puntuaciones (datos deterministas).
- [ ] Bajo 840 px de ancho, el nav oculta los enlaces y muestra la hamburguesa, que abre y cierra el panel móvil.
- [ ] El footer con el texto "© 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0" aparece en las 5 rutas.

---

## Decisions

- **Sí:** rutas reales del App Router (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/acceso`, `/salon`). Dan URLs compartibles y aprovechan Next.js.
- **No:** replicar el ruteo por hash en una sola página. Es una solución del prototipo y no escala.
- **Sí:** sesión falsa en `localStorage` (`av_user`), igual que el prototipo. Es suficiente para el MVP visual y se reemplaza por autenticación real en otra spec.
- **No:** validación de formularios ni mensajes de error. Se agrega cuando haya un backend que los motive.
- **Sí:** el reproductor es un cascarón con puntaje simulado y guardado en `av_scores`. Define el contenedor (HUD, CRT, modal) donde se montarán los juegos reales.
- **No:** reproductor estático sin simulación. Perdería la forma de probar pausa, fin de juego y modal.
- **Sí:** reutilizar los estilos ya portados en `app/globals.css` con los mismos nombres de clase de las plantillas. Máxima fidelidad visual y menor riesgo.
- **No:** reescribir con utilidades Tailwind. Mucho más trabajo y riesgo de divergir del diseño.
- **Sí:** datos y `seededScores` copiados sin cambios. Las pantallas coinciden con el prototipo y son reproducibles.
- **Sí:** leer la sesión en `useEffect`. Evita errores de hidratación porque el servidor no ve `localStorage`.
- **Sí:** Detalle y Acceso como Server Components siempre que se pueda; solo lo interactivo es Client Component.
- **No:** el contador "CRÉDITOS · 03" del nav se mantiene fijo y decorativo, sin lógica.

---

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| Next.js 16 tiene cambios incompatibles (por ejemplo, `params` asíncrono en rutas dinámicas) | El paso 0 obliga a leer las guías en `node_modules/next/dist/docs/` antes de escribir código. |
| Errores de hidratación por leer `localStorage` o usar `Math.random` en el render | La sesión se lee en `useEffect`. El puntaje aleatorio solo se usa dentro de un `setInterval` en un efecto. |
| `localStorage` bloqueado (modo privado) | Todo acceso va dentro de `try/catch`. Si falla, la app sigue funcionando sin persistir. |
| Clases de la plantilla ausentes en `globals.css` | El paso 9 compara contra el HTML de referencia y agrega las que falten. |

---

## What is **not** in this spec

- Ningún juego real: ni lógica, ni canvas, ni controles.
- Backend, API ni base de datos.
- Autenticación real ni OAuth.
- Validación de formularios.
- Pantalla o lectura de las puntuaciones guardadas en `av_scores`.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propia spec.
