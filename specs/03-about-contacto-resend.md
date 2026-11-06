# SPEC 03 — Acerca de y formulario de contacto con Resend

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-11-06
> **Objective:** Implementar en Next.js la pantalla "Acerca de" de `references/templates/home-about/about.jsx` en `/acerca`, con su formulario de contacto enviando el mensaje por correo mediante Resend desde un Server Action.

---

## Por qué existe esta spec

SPEC 02 dejó la pantalla "Acerca de" y su formulario fuera de alcance y no enlazó `/acerca` para evitar un 404. Esta spec la cierra: porta la pantalla tal como está en el prototipo y convierte el envío simulado (`setSent(...)` sin enviar nada) en un envío real de correo con Resend.

Los estilos de Acerca de no están en `app/globals.css`: viven en `references/templates/home-about/styles.css` (`.about-*`, `.highlight*`, `.contact-*`, `.terminal-success`, `.term-*`, `.shake`). SPEC 02 portó solo las clases del Home; esta spec porta las de Acerca de. `.reveal`, `.kicker`, `.field`, `.fade-in` y `RevealObserver` ya existen y se reutilizan.

---

## Scope

**In:**

- Pantalla **Acerca de** en `/acerca`, idéntica al template: hero "ACERCA DE ARCADE VAULT" con misión y 3 tarjetas destacadas con ícono, divisor de píxeles animado y sección "CONTÁCTANOS" con 3 indicadores (RESPUESTA EN 24-48H, SUGERENCIAS BIENVENIDAS, SIN SPAM, JAMÁS).
- Formulario con NOMBRE, CORREO ELECTRÓNICO y MENSAJE, botón "▶ ENVIAR MENSAJE", animación `shake` si faltan campos y pantalla de éxito estilo terminal "VAULT-OS // TERMINAL" con "ENVIAR OTRO MENSAJE".
- Envío real de correo con **Resend** desde un **Server Action**. El correo llega a `CONTACT_TO_EMAIL`, con el correo del visitante en `Reply-To`.
- Validación en el servidor (campos obligatorios, formato de correo, longitudes máximas) y campo honeypot anti-bot.
- Estado de error estilo terminal cuando el envío falla; el formulario conserva lo escrito.
- Nav (escritorio y panel móvil): nuevo enlace "Acerca de" a `/acerca`, después de "Salón de la Fama".
- Variables de entorno `RESEND_API_KEY`, `CONTACT_TO_EMAIL` y `CONTACT_FROM_EMAIL`, documentadas en `.env.example`.
- Portar a `app/globals.css` las clases de Acerca de.

**Out of scope (para specs futuras):**

- Límite de tasa (rate limiting) por IP o por sesión. Requiere almacenamiento (memoria compartida o Redis).
- Guardar los mensajes en base de datos o mostrarlos en alguna pantalla.
- Correo de confirmación al visitante.
- Dominio propio verificado en Resend. Se usa `onboarding@resend.dev` por defecto, configurable por variable de entorno.
- CAPTCHA (Turnstile, reCAPTCHA).
- Plantilla HTML del correo: se envía texto plano.
- Autocompletar el nombre con la sesión (`av_user`).
- Mensajes de error de validación por campo; solo hay `shake` y un mensaje general de error.
- Tests automatizados (el proyecto no tiene test runner).

---

## Data model

```ts
// lib/about.ts — datos estáticos copiados de about.jsx sin cambiar valores
export type Accent = "cyan" | "magenta" | "yellow" | "green"; // reutilizar el de lib/games.ts
export type HighlightIconKind = "HEART" | "BROWSER" | "PLANT";

export interface Highlight { icon: HighlightIconKind; text: string; color: Accent }

export const HIGHLIGHTS: Highlight[];      // 3 elementos
export const CONTACT_TIPS: { text: string; led: "" | "y" | "m" }[]; // 3 elementos

// lib/contact.ts — validación pura, usada por el Server Action
export const CONTACT_LIMITS = { name: 60, email: 254, msg: 2000 } as const;

export interface ContactInput { name: string; email: string; msg: string }

export type ContactResult =
  | { status: "idle" }
  | { status: "success"; name: string }
  | { status: "error"; message: string };

export function validateContact(raw: Record<string, unknown>):
  | { ok: true; value: ContactInput }
  | { ok: false };
```

Este spec no agrega persistencia: el mensaje no se guarda, solo se envía.

Variables de entorno (solo servidor, nunca `NEXT_PUBLIC_`):

| Variable | Obligatoria | Uso |
| -------- | ----------- | --- |
| `RESEND_API_KEY` | Sí | Clave de la API de Resend |
| `CONTACT_TO_EMAIL` | Sí | Destinatario de los mensajes |
| `CONTACT_FROM_EMAIL` | No | Remitente. Por defecto `onboarding@resend.dev` |

Convenciones:

- Los textos y datos se copian de `about.jsx` sin editar (incluido "HECHO CON ❤️ PARA JUGADORES").
- Correo enviado: `from` = `Arcade Vault <CONTACT_FROM_EMAIL>`, `to` = `CONTACT_TO_EMAIL`, `replyTo` = correo del visitante, `subject` = `[Arcade Vault] Mensaje de <NOMBRE>`, cuerpo en `text` (nunca HTML). Se eliminan saltos de línea del nombre antes de usarlo en el asunto.
- Honeypot: campo `website` oculto con CSS y `tabIndex={-1}`, `autoComplete="off"`. Si llega con valor, el Server Action responde `success` sin llamar a Resend.
- El `shake` del cliente se mantiene (campos vacíos tras `trim()`); el servidor valida de nuevo y no confía en el cliente.
- Cada fallo (variables ausentes, Resend devuelve `error`, excepción de red) devuelve `{ status: "error", message }` con un texto genérico; el detalle va a `console.error` en el servidor, nunca al navegador.

---

## Implementation plan

0. Antes de escribir código, leer en `node_modules/next/dist/docs/01-app` las guías de Server Actions y mutaciones (`'use server'`, `useActionState`, formularios), Client Components y variables de entorno. Esta versión de Next tiene cambios incompatibles. Consultar también la documentación vigente de Resend para Next.js (`resend.emails.send` devuelve `{ data, error }`).
1. Instalar la dependencia: `npm install resend`. Crear `.env.example` con las tres variables (sin valores reales) y agregar `!.env.example` a `.gitignore`, porque `.env*` lo ignora. Prueba manual: `.env.example` aparece en `git status` y `.env.local` no.
2. Crear `lib/about.ts` (`HIGHLIGHTS`, `CONTACT_TIPS`) y `lib/contact.ts` (`CONTACT_LIMITS`, tipos, `validateContact`: aplica `trim`, exige los tres campos, formato de correo y longitudes máximas). Prueba manual: `npm run lint` sin errores.
3. Crear `app/acerca/actions.ts` con `"use server"` y `sendContactMessage(prev, formData): Promise<ContactResult>`. Orden: honeypot → `validateContact` → comprobar variables de entorno → `resend.emails.send` → devolver `success` o `error`. Prueba manual: con `.env.local` configurado, `npm run lint` y `npm run dev` arrancan sin errores.
4. Portar a `app/globals.css` las clases de Acerca de desde `references/templates/home-about/styles.css`: `.about-*`, `.highlight*`, `.hl-*`, `.div-bar`, `.div-pixels` con `@keyframes pxblink`, `.contact-*`, `.tip*`, `.shake` con `@keyframes shake`, `.terminal-success`, `.term-*`, `.line`, `.caret`, con sus `@media`. Agregar `.terminal-error` (misma estructura que `.terminal-success` con borde y texto en `--magenta`) y `.hp-field` (honeypot fuera de pantalla). Revisar selectores existentes antes de portar y no sobrescribir los de SPEC 01 y 02. Prueba manual: `npm run lint` y las demás pantallas no cambian.
5. Crear `components/highlight-icon.tsx` (Server Component con los 3 íconos SVG de `HighlightIcon`).
6. Crear `components/contact-form.tsx` (Client Component con `useActionState`): campos controlados, `shake` si hay campos vacíos (y no llama al Server Action), botón deshabilitado con texto "ENVIANDO…" mientras `pending`, pantalla de éxito estilo terminal con `¡GRACIAS, <NOMBRE EN MAYÚSCULAS>.` y botón "ENVIAR OTRO MENSAJE" que limpia el formulario, y bloque `.terminal-error` si falla. Prueba manual: `npm run lint` sin errores.
7. Crear `app/acerca/page.tsx` (Server Component): hero con `HIGHLIGHTS`, divisor y sección de contacto con `ContactForm`, más `RevealObserver` y `metadata.title`. Prueba manual: `/acerca` se ve igual que el template y `.reveal` aparece al hacer scroll.
8. Actualizar `components/nav.tsx`: agregar "Acerca de" (`/acerca`) en el nav y en el panel móvil, activo con `pathname.startsWith("/acerca")`. Prueba manual: el resaltado es correcto en `/acerca` y no cambia en las demás rutas.
9. Verificación end-to-end con una `RESEND_API_KEY` real en `.env.local`: enviar un mensaje desde `/acerca`, comprobar que llega a `CONTACT_TO_EMAIL` con `Reply-To` correcto, y probar los casos de fallo (clave inválida, variable ausente, honeypot lleno, correo mal formado). Comparar `/acerca` contra `references/templates/home-about/arcade-vault-standalone.html` a 1280 px y a 375 px, y corregir clases faltantes. Ejecutar `npm run lint` y `npm run build`.

---

## Acceptance criteria

- [ ] `npm run lint` termina sin errores ni advertencias.
- [ ] `npm run build` termina sin errores, aun sin `.env.local` (las variables se leen en tiempo de ejecución, no al compilar).
- [ ] La consola del navegador no muestra errores de hidratación en `/acerca`.
- [ ] `/acerca` muestra el título "ACERCA DE ARCADE VAULT", el párrafo de misión y 3 tarjetas destacadas con ícono.
- [ ] `/acerca` muestra la sección "CONTÁCTANOS" con 3 indicadores y los campos NOMBRE, CORREO ELECTRÓNICO y MENSAJE.
- [ ] El nav muestra "Inicio", "Biblioteca", "Salón de la Fama" y "Acerca de". "Acerca de" está activo solo en `/acerca`.
- [ ] Bajo 840 px de ancho, el panel móvil del nav incluye "Acerca de".
- [ ] Enviar el formulario con algún campo vacío (o solo espacios) activa la animación `shake` y no envía ningún correo ni llama al Server Action.
- [ ] Enviar un mensaje válido con `RESEND_API_KEY` y `CONTACT_TO_EMAIL` válidos hace llegar un correo a `CONTACT_TO_EMAIL`.
- [ ] El correo recibido tiene como asunto `[Arcade Vault] Mensaje de <NOMBRE>`, contiene nombre, correo y mensaje del visitante, y su `Reply-To` es el correo del visitante.
- [ ] Tras un envío exitoso se muestra la terminal con "MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, <NOMBRE EN MAYÚSCULAS>." y el botón "ENVIAR OTRO MENSAJE" devuelve el formulario vacío.
- [ ] Durante el envío el botón está deshabilitado y muestra "ENVIANDO…"; no se puede enviar dos veces el mismo mensaje con doble clic.
- [ ] Con una `RESEND_API_KEY` inválida o ausente se muestra el bloque de error en la terminal, el formulario conserva nombre, correo y mensaje, y el navegador no recibe la clave ni el detalle del error de Resend.
- [ ] Con `CONTACT_TO_EMAIL` ausente se muestra el mismo bloque de error y no se llama a Resend.
- [ ] Un correo mal formado (p. ej. `abc`) enviado al servidor se rechaza con el bloque de error y sin llamar a Resend.
- [ ] Un mensaje de más de 2000 caracteres, un nombre de más de 60 o un correo de más de 254 se rechaza en el servidor.
- [ ] Si el campo honeypot `website` llega con valor, el servidor responde éxito sin llamar a Resend (no llega ningún correo).
- [ ] Un nombre con saltos de línea no produce un asunto con saltos de línea.
- [ ] `RESEND_API_KEY` no aparece en el bundle del cliente ni en ninguna variable `NEXT_PUBLIC_*`.
- [ ] `.env.example` está versionado y `.env.local` no.
- [ ] A 375 px de ancho, `/acerca` no tiene scroll horizontal y `.highlight-row` y `.contact-grid` colapsan a 1 columna.
- [ ] Con `prefers-reduced-motion: reduce`, las secciones de `/acerca` son visibles al cargar.

---

## Decisions

- **Sí:** Server Action para el envío. La API key queda en el servidor, no se expone un endpoint público y encaja con el App Router.
- **No:** Route Handler `POST /api/contacto`. Agrega una API pública que proteger y no hay otro consumidor.
- **Sí:** `onboarding@resend.dev` como remitente por defecto, configurable con `CONTACT_FROM_EMAIL`. Funciona sin verificar dominio. Limitación conocida: en ese modo Resend solo entrega al correo dueño de la cuenta, así que `CONTACT_TO_EMAIL` debe ser ese correo hasta verificar un dominio.
- **Sí:** destinatario en `CONTACT_TO_EMAIL`. Sin correos hardcodeados en el repo; el correo del visitante va en `Reply-To` para responder directo.
- **No:** correo fijo en el código. Obliga a editar y desplegar para cambiarlo.
- **Sí:** validación en el servidor, estado de error y honeypot. El prototipo siempre muestra éxito; con envío real puede fallar y el usuario debe saberlo.
- **No:** seguir el prototipo en solo mostrar éxito. Perdería mensajes sin avisar.
- **Sí:** mantener el `shake` en el cliente además de validar en el servidor. Conserva el comportamiento del template y el servidor no depende del cliente.
- **Sí:** límites de 60 / 254 / 2000 caracteres. Valores elegidos por esta spec (no vienen del template) para acotar abuso y tamaño del correo; se pueden ajustar en `CONTACT_LIMITS`.
- **Sí:** cuerpo del correo en texto plano. Evita inyección de HTML del contenido del visitante.
- **No:** rate limiting en esta spec. Requiere almacenamiento y decisiones de despliegue; va en su propia spec si el honeypot no basta.
- **No:** correo de confirmación al visitante. Duplica envíos y consume cuota sin que se haya pedido.
- **Sí:** ruta `/acerca`, el nombre que SPEC 02 ya reservaba. SPEC 02 dice que el nav no muestra "Acerca de" hasta que exista esta spec; esta spec lo supera en ese punto sin editar SPEC 02, que está Implementado.
- **Sí:** mensajes de error genéricos al navegador y detalle solo en `console.error` del servidor. No se filtran claves ni respuestas internas.
- **Sí:** reutilizar `.reveal`, `RevealObserver`, `.field` y `.kicker` ya portados.

---

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| `onboarding@resend.dev` solo entrega al dueño de la cuenta; con otro destinatario Resend devuelve error | Documentarlo en `.env.example` y en Decisions. Para producción, verificar un dominio y cambiar `CONTACT_FROM_EMAIL`. |
| Spam por bots que llaman al Server Action directamente | Honeypot, validación estricta y límites de longitud. Si no basta, spec futura de rate limiting o CAPTCHA. |
| Inyección de cabeceras vía el nombre en el asunto | Se eliminan los saltos de línea del nombre y el cuerpo va como texto plano. |
| Cuota gratuita de Resend agotada o servicio caído | El servidor devuelve `status: "error"` y el formulario conserva lo escrito para reintentar. |
| `.env.example` ignorado por `.env*` en `.gitignore` | El paso 1 agrega `!.env.example` y verifica con `git status`. |
| La clave se filtra al cliente al importar `resend` en un Client Component | `resend` solo se importa en `app/acerca/actions.ts` (`"use server"`); el criterio de aceptación verifica el bundle. |
| Next.js 16 tiene cambios incompatibles en Server Actions y formularios | El paso 0 obliga a leer las guías en `node_modules/next/dist/docs/` antes de escribir código. |
| Clases de Acerca de en conflicto con las existentes (`.line`, `.shake`, `.field`) | Revisar los selectores existentes en `globals.css` antes de portar y comparar contra el HTML de referencia en el paso 9. |

---

## What is **not** in this spec

- Rate limiting, CAPTCHA ni protección más allá del honeypot.
- Persistencia de mensajes ni pantalla para leerlos.
- Correo de confirmación al visitante ni plantilla HTML.
- Dominio propio verificado en Resend.
- Autocompletado con la sesión ni validación por campo con mensajes individuales.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propia spec.
