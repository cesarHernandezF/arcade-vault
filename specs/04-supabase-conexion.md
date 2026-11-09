# SPEC 04 — Supabase: conexión con Next.js

> **Status:** Implementado
> **Depends on:** SPEC 01
> **Date:** 2026-11-09
> **Objective:** Establecer la conexión entre el proyecto de Supabase `inhsoqbbpjvlsxslljdr` y la app de Next.js mediante las dependencias oficiales, las variables de entorno y los clientes de navegador y de servidor, sin crear nada en la base de datos.

---

## Por qué existe esta spec

El proyecto de Supabase ya está conectado a Claude Code por MCP (`.mcp.json`), pero la app de Next.js no sabe que existe: no tiene dependencias, variables de entorno ni clientes. Esta spec deja esa conexión lista y verificada para que las specs siguientes (autenticación, puntuaciones) se limiten a usarla.

Es deliberadamente mínima. No crea tablas, columnas, políticas ni migraciones, y no cambia ninguna pantalla ni el comportamiento de la app.

---

## Scope

**In:**

- Dependencias `@supabase/supabase-js` y `@supabase/ssr`.
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, documentadas en `.env.template` y con valores reales en `.env.local`.
- Cliente de navegador en `lib/supabase/client.ts`.
- Cliente de servidor en `lib/supabase/server.ts`, para Server Components, Server Actions y Route Handlers.
- Comprobación de que la URL y la clave responden.

**Out of scope (para specs futuras):**

- Cualquier cambio en la base de datos: tablas, columnas, índices, políticas RLS, triggers, funciones y migraciones. No se crea el directorio `supabase/`.
- Tipos generados de la base de datos (no hay esquema que tipar).
- Autenticación: registro, inicio de sesión, `lib/session.tsx` y `components/auth-form.tsx` no se tocan. La sesión sigue en `localStorage` (`av_user`).
- `proxy.ts` para refrescar la sesión (solo tiene sentido con autenticación).
- Puntuaciones y Salón de la Fama en base de datos: `av_scores` en `components/game-player.tsx` no se toca.
- Ningún cambio visual ni nueva ruta.
- Tests automatizados (el proyecto no tiene test runner).

---

## Data model

Esta feature no introduce estructuras de datos ni toca la base de datos. Solo agrega configuración y dos funciones de acceso:

```ts
// lib/supabase/client.ts — para Client Components
export function createClient(): SupabaseClient;

// lib/supabase/server.ts — para código que corre en el servidor
export async function createClient(): Promise<SupabaseClient>;
```

Variables de entorno (públicas por diseño; la publishable key está pensada para el navegador y la protege RLS):

| Variable                               | Obligatoria | Uso                                                           |
| -------------------------------------- | ----------- | ------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Sí          | URL del proyecto (`https://inhsoqbbpjvlsxslljdr.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sí          | Clave de tipo `publishable` (`sb_publishable_...`)            |

Convenciones:

- Ambos clientes usan `@supabase/ssr` (`createBrowserClient` y `createServerClient`).
- El cliente de servidor usa `cookies()` de `next/headers` y se crea en cada petición, nunca como variable global.
- La clave `service_role` y la clave `anon` heredada no se usan ni se guardan en el repo.
- `SUPABASE_DB_PASSWORD` ya existe en `.env.template` y esta spec no la usa.
- Los clientes no se importan desde ninguna pantalla en esta spec. La conexión se verifica sin agregar código a la app.

---

## Implementation plan

0. Antes de escribir código, leer en `node_modules/next/dist/docs/01-app` las guías de variables de entorno, Client Components y la API de `cookies` (esta versión de Next tiene cambios incompatibles). Consultar con `mcp__supabase__search_docs` la guía vigente de `@supabase/ssr` para Next.js App Router: `createBrowserClient`, `createServerClient` y manejo de cookies.
1. Instalar las dependencias: `npm install @supabase/supabase-js @supabase/ssr`. Prueba manual: ambas aparecen en `dependencies` de `package.json`.
2. Agregar las dos variables vacías a `.env.template` con un comentario, y sus valores reales a `.env.local`. Obtener la URL con `mcp__supabase__get_project_url` y la clave de tipo `publishable` con `mcp__supabase__get_publishable_keys`. Prueba manual: `git status` muestra `.env.template` modificado y `.env.local` ausente.
3. Crear `lib/supabase/client.ts` con `createClient()` basado en `createBrowserClient`. Prueba manual: `npm run lint` sin errores.
4. Crear `lib/supabase/server.ts` con `createClient()` asíncrono basado en `createServerClient` y `cookies()`. Prueba manual: `npm run lint` sin errores.
5. Verificar la conexión con un script temporal fuera del repo (en el directorio scratchpad): leer las dos variables de `.env.local` y pedir `GET <URL>/auth/v1/health` con la cabecera `apikey`. Prueba manual: responde HTTP 200. Después ejecutar `npm run lint` y `npm run build`, y borrar el script temporal.

---

## Acceptance criteria

- [ ] `package.json` lista `@supabase/supabase-js` y `@supabase/ssr` en `dependencies`.
- [ ] `lib/supabase/client.ts` y `lib/supabase/server.ts` existen y cada uno exporta `createClient`.
- [ ] `.env.template` lista `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sin valores.
- [ ] `.env.local` contiene ambas variables con valores reales y no aparece en `git status`.
- [ ] `GET <NEXT_PUBLIC_SUPABASE_URL>/auth/v1/health` con la `apikey` publishable responde HTTP 200.
- [ ] Ningún archivo del repo ni variable de entorno contiene la clave `service_role`.
- [ ] `mcp__supabase__list_tables` sigue devolviendo `tables: []` para el esquema `public`.
- [ ] No existe el directorio `supabase/` ni ningún archivo `.sql` nuevo.
- [ ] `lib/session.tsx`, `components/auth-form.tsx` y `components/game-player.tsx` no tienen cambios en `git diff`.
- [ ] `npm run lint` termina sin errores ni advertencias.
- [ ] `npm run build` termina sin errores.
- [ ] `npm run dev` carga `/`, `/biblioteca`, `/acceso` y `/salon` sin errores en la consola del navegador y sin cambios visibles.

---

## Decisions

- **Sí:** limitar esta spec a la conexión. Es lo que se pidió: nada de tablas, campos ni cambios de base de datos. La autenticación y las puntuaciones van en specs aparte.
- **No:** la tabla `profiles`, el trigger y la migración que planteaba el borrador anterior de esta spec. Quedan descartados por decisión del usuario.
- **Sí:** `@supabase/ssr` junto con `@supabase/supabase-js`. Es la integración oficial para el App Router y guarda la sesión en cookies, lo que permitirá usarla en el servidor más adelante sin migrar nada.
- **No:** `@supabase/supabase-js` solo. Guarda la sesión en `localStorage` y obligaría a cambiar de cliente cuando haya autenticación en el servidor.
- **Sí:** crear los dos clientes (navegador y servidor) ahora. Son archivos cortos y dejan la conexión completa; las specs siguientes solo los importan.
- **No:** `proxy.ts` en esta spec. Existe para refrescar la sesión y, sin autenticación, solo añadiría una ejecución en cada petición.
- **Sí:** publishable key (`sb_publishable_...`). Es el formato vigente. La clave `anon` heredada sigue activa en el proyecto pero no se usa.
- **No:** `service_role` en el proyecto de Next.js. Da acceso total saltándose RLS y no hace falta para conectar.
- **Sí:** verificar la conexión con una petición a `/auth/v1/health`. Funciona con un proyecto sin tablas y no crea nada.
- **No:** agregar una ruta o botón de prueba a la app. Dejaría código de diagnóstico en producción.
- **No:** generar tipos con `generate_typescript_types`. Sin esquema el resultado estaría vacío. Se generan cuando exista la primera tabla.

---

## Risks

| Riesgo                                                                                                        | Mitigación                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Las variables `NEXT_PUBLIC_*` se incrustan al compilar: cambiarlas exige reiniciar `npm run dev` o recompilar | Documentarlo en el comentario de `.env.template`.                                                                                                       |
| La publishable key queda visible en el navegador                                                              | Es lo esperado. La protege RLS, y hoy no hay tablas expuestas. Cada tabla futura debe crearse con RLS activo.                                           |
| La clave se pega por error en un archivo versionado                                                           | `.env*` está en `.gitignore`; solo `.env.template` entra al repo y va sin valores. Un criterio verifica `git status`.                                   |
| El endpoint `/auth/v1/health` cambia o exige otra cabecera                                                    | Si no responde 200, comprobar la URL y la clave con `mcp__supabase__get_project_url` y `mcp__supabase__get_publishable_keys` antes de culpar al código. |
| Next.js 16 tiene cambios incompatibles en `cookies()` y variables de entorno                                  | El paso 0 obliga a leer las guías en `node_modules/next/dist/docs/` antes de escribir código.                                                           |

---

## What is **not** in this spec

- Tablas, columnas, políticas, triggers, migraciones ni el directorio `supabase/`.
- Autenticación real ni cambios en `lib/session.tsx` o `components/auth-form.tsx`.
- Puntuaciones ni Salón de la Fama en base de datos.
- `proxy.ts`, tipos generados ni cambios visuales.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propia spec.
