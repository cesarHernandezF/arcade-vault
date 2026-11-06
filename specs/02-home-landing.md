# SPEC 02 — Home: landing page de Arcade Vault

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-11-06
> **Objective:** Implementar en Next.js la landing page (Home) de `references/templates/home-about/home.jsx` en `/`, mover la Biblioteca a `/biblioteca` y agregar el enlace "Inicio" al nav.

---

## Por qué existe esta spec

El SPEC 01 dejó la Biblioteca en `/` y no incluyó la pantalla de Inicio del prototipo. La carpeta `references/templates/home-about/` agrega esa landing (hero, beneficios, vista previa de juegos, estadísticas, actividad, precios y CTA final) y una pantalla "Acerca de". Esta spec cubre **solo la landing**. Al convertirla en la página de entrada, la Biblioteca debe cambiar de ruta, lo que toca enlaces existentes.

Los estilos del Home no están en `app/globals.css`: viven en `references/templates/home-about/styles.css`. Esta spec porta solo las clases del Home.

---

## Scope

**In:**

- Pantalla **Home** en `/` con 7 bloques: hero con siluetas flotantes, "¿POR QUÉ ARCADE VAULT?" (4 tarjetas), "JUEGOS DISPONIBLES AHORA" (6 mini-tarjetas), franja de estadísticas, "ACTIVIDAD EN VIVO" (últimas puntuaciones y top de jugadores), "PRECIOS" (tarjeta + 3 preguntas frecuentes) y CTA final.
- Mover la Biblioteca de `/` a `/biblioteca`.
- Actualizar todos los enlaces que hoy apuntan a `/` esperando la Biblioteca.
- Nav (escritorio y panel móvil): nuevo enlace "Inicio" a `/`. "Biblioteca" pasa a `/biblioteca`.
- Animación de aparición al hacer scroll (`.reveal`) con soporte a `prefers-reduced-motion`.
- Portar a `app/globals.css` las clases del Home.
- Textos y datos del Home copiados tal cual del prototipo, en `lib/home.ts`.

**Out of scope (para specs futuras):**

- Pantalla "Acerca de" y su formulario de contacto (`about.jsx`). El nav **no** muestra el enlace "Acerca de" hasta que exista esa spec.
- Cualquier dato real: el ticker de últimas puntuaciones y el top de jugadores son estáticos y no leen `av_scores` ni un backend.
- Actualización en vivo o animación de datos del ticker (solo la entrada escalonada de filas del prototipo).
- Pestaña "Crear cuenta" preseleccionada al llegar desde el Home a `/acceso`: los CTAs enlazan a `/acceso` sin parámetros.
- Cambios al catálogo `GAMES`, a las pantallas de Detalle, Reproductor, Acceso y Salón (salvo el enlace `/` → `/biblioteca`).
- SEO avanzado (Open Graph, sitemap) y analítica.
- Tests automatizados (el proyecto no tiene test runner).

---

## Data model

```ts
// lib/home.ts — datos estáticos copiados de home.jsx sin cambiar valores
export type Accent = "cyan" | "magenta" | "yellow" | "green"; // reutilizar el de lib/games.ts

export type FeatureIconKind = "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";

export interface Feature { icon: FeatureIconKind; title: string; desc: string; color: Accent }
export interface HomeStat { n: string; unit: string; sub: string }
export interface RecentScore { player: string; game: string; score: number; when: string; color: Accent }
export interface TopPlayer { rank: number; player: string; score: number }
export interface FaqItem { q: string; a: string }

export const FEATURES: Feature[];            // 4 elementos
export const HOME_STATS: HomeStat[];         // 3 elementos: "12+", "MILES", "GLOBAL"
export const RECENT_SCORES: RecentScore[];   // 7 elementos
export const TOP_PLAYERS: TopPlayer[];       // 5 elementos
export const PRICING_PERKS: string[];        // 6 elementos
export const FAQ: FaqItem[];                 // 3 elementos
```

Este spec no agrega persistencia. Reutiliza `GAMES` de `lib/games.ts` (`GAMES.slice(0, 6)` alimenta las mini-tarjetas).

Convenciones:

- Los valores de `lib/home.ts` se copian de `home.jsx` sin editar, incluido "12+ JUEGOS" aunque el catálogo tenga 8 juegos.
- Los números se formatean con `toLocaleString("es-ES")`, igual que en SPEC 01.
- Cada botón con `navigate(...)` del prototipo pasa a ser un `Link` de `next/link` con las clases `btn` originales.
- Mapa de destinos: EXPLORAR JUEGOS, VER TODOS LOS JUEGOS e INSERTAR MONEDA → `/biblioteca`. CREAR CUENTA y EMPEZAR GRATIS → `/acceso`. VER SALÓN → `/salon`. Cada mini-tarjeta → `/juegos/<id>`.

---

## Implementation plan

0. Antes de escribir código, leer en `node_modules/next/dist/docs/01-app` las guías de `Link`, Server y Client Components, y layouts/páginas. Esta versión de Next tiene cambios incompatibles.
1. Crear `lib/home.ts` con los tipos y constantes del modelo. Prueba manual: `npm run lint` sin errores.
2. Mover la Biblioteca. Crear `app/biblioteca/page.tsx` que renderiza `Library`. Cambiar a `/biblioteca` los enlaces de `app/juegos/[id]/page.tsx` (VOLVER AL VAULT), `components/auth-form.tsx` (los dos `router.push`), `components/game-player.tsx` (botón del modal) y `components/hall-of-fame.tsx`. Prueba manual: `/biblioteca` muestra las 8 tarjetas y esos cuatro enlaces llevan ahí. `/` sigue mostrando la Biblioteca hasta el paso 6.
3. Actualizar `components/nav.tsx`: agregar "Inicio" (`/`) antes de "Biblioteca" (`/biblioteca`) en el nav y en el panel móvil. "Inicio" está activo solo con `pathname === "/"`. "Biblioteca" está activo con `/biblioteca` y `/juegos/*`. El logo sigue enlazando a `/`. Prueba manual: el resaltado del enlace activo es correcto en `/`, `/biblioteca`, `/juegos/caida` y `/salon`.
4. Portar a `app/globals.css` las clases del Home desde `references/templates/home-about/styles.css`: hero y siluetas (`.home-*`, `.silo`, `.hero-*`), cabeceras de sección (`.section-*`, `.kicker`), tarjetas de beneficios (`.feature-*`, `.ft-*`), `.mini-*`, estadísticas (`.stat*`, `.home-stats`), actividad (`.activity-*`, `.ac-*`, `.ticker`, `.tick-row`, `.tk-*`, `.top-*`, `.tp-*`, `.lb-link`), precios (`.pricing-*`, `.price-card`, `.pc-*`, `.faq-*`), CTA final (`.home-final`, `.final-*`) y `.reveal`/`.reveal.in`, con sus `@media` y `@keyframes`. **No** portar clases de Acerca de (`.about-*`, `.highlight-row`, `.contact-*`). Agregar `@media (prefers-reduced-motion: reduce)` que deje `.reveal` visible sin transición. Prueba manual: `npm run lint` y `npm run dev` siguen funcionando y las demás pantallas no cambian.
5. Crear los componentes estáticos (Server Components): `components/floating-silhouettes.tsx` (las 8 siluetas SVG), `components/feature-icon.tsx` (los 4 íconos) y `components/mini-card.tsx` (mini-tarjeta como `Link` a `/juegos/<id>`). Crear `components/reveal-observer.tsx` (Client Component que no renderiza nada y agrega la clase `in` a los `.reveal` con `IntersectionObserver`, umbral 0.12). Prueba manual: `npm run lint` sin errores.
6. Reemplazar `app/page.tsx` por el Home con el hero y la sección "¿POR QUÉ ARCADE VAULT?", más `RevealObserver`. Prueba manual: `/` muestra el hero con sus dos CTAs y las 4 tarjetas de beneficios, que aparecen al hacer scroll.
7. Agregar a `app/page.tsx` la sección "JUEGOS DISPONIBLES AHORA" (6 `MiniCard` y el botón VER TODOS LOS JUEGOS) y la franja de estadísticas. Prueba manual: tocar una mini-tarjeta lleva a su Detalle.
8. Agregar la sección "ACTIVIDAD EN VIVO": tarjeta "ÚLTIMAS PUNTUACIONES" (7 filas) y tarjeta "TOP JUGADORES · HOY" (5 filas con barra y enlace VER SALÓN). Prueba manual: las filas 1, 2 y 3 del top tienen estilos de oro, plata y bronce.
9. Agregar las secciones "PRECIOS" (tarjeta, 6 beneficios, sello FREE PLAY y 3 preguntas) y el CTA final. Prueba manual: los tres CTAs de esta parte navegan a donde indica el mapa de destinos.
10. Comparar `/` contra `references/templates/home-about/arcade-vault-standalone.html` en el navegador a 1280 px y a 375 px, y corregir las clases que falten en `app/globals.css`. Ejecutar `npm run lint` y `npm run build`.

---

## Acceptance criteria

- [ ] `npm run lint` termina sin errores ni advertencias.
- [ ] `npm run build` termina sin errores.
- [ ] La consola del navegador no muestra errores de hidratación en `/` ni en `/biblioteca`.
- [ ] `/` muestra el título "EL ARCADE CLÁSICO ESTÁ DE VUELTA" y los botones "EXPLORAR JUEGOS" y "CREAR CUENTA".
- [ ] En `/`, "EXPLORAR JUEGOS" navega a `/biblioteca` y "CREAR CUENTA" navega a `/acceso`.
- [ ] `/biblioteca` muestra las 8 tarjetas de juego, el buscador y los chips de categoría.
- [ ] En `/biblioteca`, el chip SHOOTER deja exactamente 2 tarjetas y buscar "zzz" muestra "NO HAY RESULTADOS".
- [ ] En `/`, la sección "¿POR QUÉ ARCADE VAULT?" muestra 4 tarjetas con sus íconos.
- [ ] En `/`, "JUEGOS DISPONIBLES AHORA" muestra exactamente 6 mini-tarjetas, las 6 primeras de `GAMES`, y cada una navega a `/juegos/<id>`.
- [ ] En `/`, "VER TODOS LOS JUEGOS →" navega a `/biblioteca`.
- [ ] En `/`, la franja de estadísticas muestra "12+", "MILES" y "GLOBAL".
- [ ] En `/`, "ÚLTIMAS PUNTUACIONES" muestra 7 filas y "TOP JUGADORES · HOY" muestra 5, con NEONFOX en primer lugar y "312.840" como su puntuación.
- [ ] En `/`, "VER SALÓN →" navega a `/salon`.
- [ ] En `/`, la sección "PRECIOS" muestra "$0", 6 beneficios y 3 preguntas.
- [ ] En `/`, "EMPEZAR GRATIS →" navega a `/acceso` e "INSERTAR MONEDA →" navega a `/biblioteca`.
- [ ] El nav muestra "Inicio", "Biblioteca" y "Salón de la Fama", y **no** muestra "Acerca de".
- [ ] El enlace "Inicio" está activo solo en `/`, y "Biblioteca" está activo en `/biblioteca` y en `/juegos/caida`.
- [ ] El logo del nav navega a `/`.
- [ ] En `/juegos/serpentina`, "VOLVER AL VAULT" navega a `/biblioteca`.
- [ ] Tras iniciar sesión o entrar como invitado en `/acceso`, la app navega a `/biblioteca`.
- [ ] En el modal de fin de juego del reproductor, el botón de salida navega a `/biblioteca`.
- [ ] En `/salon`, el botón que antes llevaba a la Biblioteca navega a `/biblioteca`.
- [ ] Al hacer scroll en `/`, las secciones con `.reveal` pasan de invisibles a visibles (clase `in`).
- [ ] Con `prefers-reduced-motion: reduce` activado, todas las secciones de `/` son visibles al cargar, sin transición.
- [ ] Bajo 840 px de ancho, el panel móvil del nav incluye "Inicio" y "Biblioteca".
- [ ] A 375 px de ancho, `/` no tiene scroll horizontal y las grillas de beneficios, mini-tarjetas, actividad y precios colapsan a 1 o 2 columnas.
- [ ] Ninguna ruta de `app/` ni de `components/` contiene la palabra "Acerca" ni un enlace a `/acerca`.

---

## Decisions

- **Sí:** Home en `/` y Biblioteca en `/biblioteca`. La landing es la puerta de entrada natural y el nav del prototipo distingue "Inicio" de "Biblioteca".
- **No:** dejar la Biblioteca en `/` con un ancla o poner el Home en `/inicio`. Mezcla dos pantallas o deja la landing fuera de la raíz.
- **Sí:** los criterios de SPEC 01 que dicen "en `/`" sobre la Biblioteca ahora se verifican en `/biblioteca`. SPEC 01 no se edita porque su estado es Implementado; esta spec es la que lo supera en ese punto.
- **Sí:** tras iniciar sesión o entrar como invitado, se navega a `/biblioteca`, que es el destino que tenía `/` en SPEC 01. Así no cambia el flujo que el usuario ya conoce.
- **Sí:** dejar "Acerca de" fuera de esta spec y sin enlace en el nav. Evita un enlace roto; el enlace se agrega junto con su pantalla.
- **No:** enlazar a `/acerca` ya. Llevaría a un 404.
- **Sí:** copiar textos y datos del prototipo en `lib/home.ts`, incluido "12+ JUEGOS". Es copy de marketing y mantiene la fidelidad visual, igual que SPEC 01 con `data.jsx`.
- **No:** derivar el conteo de `GAMES.length` ni generar el ticker y el top desde `seededScores`. Se aleja del diseño y suma lógica no pedida.
- **Sí:** `.reveal` con `IntersectionObserver` en un Client Component pequeño que no renderiza nada, y `@media (prefers-reduced-motion: reduce)` en CSS. La página sigue siendo Server Component y el efecto es accesible.
- **No:** convertir la página completa en Client Component solo para la animación.
- **Sí:** botones de navegación como `Link` con clases `btn`, no `<button onClick>`. Permite prefetch, clic central y rutas accesibles.
- **Sí:** portar solo las clases del Home. Las de Acerca de se portan en su propia spec.
- **Sí:** el contador "CRÉDITOS · 03" del nav sigue fijo y decorativo, como en SPEC 01.

---

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| Un enlace a `/` que debía ir a la Biblioteca se queda sin actualizar | El paso 2 lista los cuatro archivos y el criterio de aceptación verifica cada flujo. Revisar con `grep` los `"/"` restantes antes de cerrar. |
| `.reveal` deja el contenido en `opacity: 0` si el JS falla o está desactivado | Con `prefers-reduced-motion` ya queda visible por CSS. Agregar `@media (scripting: none)` con el mismo override en el paso 4. |
| `IntersectionObserver` no dispara en secciones ya visibles al cargar | El observador se registra en `useEffect` y revisa los elementos al montar; el umbral de 0.12 cubre secciones parcialmente visibles. |
| Clases del Home ausentes en `globals.css` o en conflicto con las existentes (`.blink`, `.kicker`) | El paso 10 compara contra el HTML de referencia. Revisar los selectores existentes antes de portar y no sobrescribir los de SPEC 01. |
| Next.js 16 tiene cambios incompatibles | El paso 0 obliga a leer las guías en `node_modules/next/dist/docs/` antes de escribir código. |

---

## What is **not** in this spec

- Pantalla "Acerca de" ni formulario de contacto, ni su enlace en el nav.
- Datos reales en el ticker o el top de jugadores.
- Cambios a las pantallas de Detalle, Reproductor, Acceso y Salón, salvo actualizar un enlace.
- Pestaña "Crear cuenta" preseleccionada desde el Home.
- SEO avanzado y analítica.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propia spec.
