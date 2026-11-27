# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: a platform to play games online and compete for the highest score (README is in Spanish). Next.js app with a game library, an in-browser canvas player, per-game leaderboards and a global Hall of Fame, backed by Supabase. Four games are implemented: Asteroides, Tetris, Arkanoid and Snake.

The project follows Spec Driven Design, based on `/spec` and `/spec-impl`, using the skills from https://github.com/Klerith/fernando-skills (installed with `npx skills@latest add Klerith/fernando-skills`; pinned in `skills-lock.json`). Prefer writing/consulting a spec in `specs/` before implementing features. Each spec has a `Status` (`Borrador` → `Aprobado` → `Implementado`); `/spec-impl` only runs on approved specs.

## Commands

```bash
npm run dev      # dev server (http://localhost:3000)
npm run build    # production build
npm start        # serve production build
npm run lint     # eslint (flat config in eslint.config.mjs; no path arg = whole project)
npm run format   # prettier --write .
```

There is no test runner configured.

## Stack and conventions

- Next.js 16.4.6 (App Router, `app/` directory), React 19.3, TypeScript (strict), Tailwind CSS v4 via `@tailwindcss/turbopack` (no `postcss.config`; theme tokens are declared in `app/globals.css` with `@theme inline`).
- Supabase (`@supabase/ssr`, `@supabase/supabase-js`) for data; Resend for the contact form.
- Path alias `@/*` maps to the repo root.
- Prettier config in `.prettierrc.json` (double quotes, semicolons, trailing commas, `printWidth` 100).
- **This Next.js version has breaking changes from what you may know** (see `AGENTS.md`). Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, `04-community`) and heed deprecation notices.
- `AGENTS.md` is auto-written by `next dev`; commit it rather than removing it.
- UI copy is in Spanish; the visual style is neon arcade (tokens `--cyan`, `--magenta`, `--yellow`, `--green`, `--gold/silver/bronze`, pixel + mono fonts in `app/globals.css`).

## Environment variables

Copy `.env.template` to `.env.local` (never commit it):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase connection (inlined at build time; restart `npm run dev` after changing them). Never put the `service_role` key here.
- `SUPABASE_DB_PASSWORD`: database password (local use only).
- `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`: contact form (server only, never `NEXT_PUBLIC_`).

## Architecture

### Routes (`app/`)

| Route                | Purpose                                                                              |
| -------------------- | ------------------------------------------------------------------------------------ |
| `/`                  | Home / landing                                                                       |
| `/biblioteca`        | Game library (async fetch of games from Supabase) see `references\implemented-games.md`                                  |
| `/juegos/[id]`       | Game detail page + leaderboard                                                       |
| `/juegos/[id]/jugar` | Player (`GamePlayer` + `GameCanvas`); `actions.ts` has the `saveScore` server action |
| `/salon`             | Hall of Fame (global top scores)                                                     |
| `/acerca`            | About + contact form (`actions.ts` sends the email via Resend)                       |
| `/acceso`            | Sign-in / sign-up form (client-side session only for now)                            |

### Data layer (Supabase)

- Tables: `games` and `scores`; view `games_with_stats` (adds `best` and `entries`). Types live in `lib/supabase/database.types.ts`.
- Clients: `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (Server Components / Server Actions).
- `lib/games-db.ts` (`getGames`, `getGame`) and `lib/scores.ts` (`getTopScores`, `getTopScoresGlobal`) are server-only. Leaderboard order: score desc, ties won by whoever got there first.
- `saveScore` validates on the server (name 1–10 chars, non-negative integer score, game must exist). `user_id` is `null` for now: there is no real auth yet; the session (`lib/session.tsx`) lives in `localStorage` read through `useSyncExternalStore`.
- Supabase MCP server is configured in `.mcp.json` (use it for schema inspection and migrations).

### Game engine contract

Every game is an isolated TypeScript module under `lib/games/<id>/` (typically `constants.ts`, `engine.ts`, plus `entities.ts`, `sprites.ts`, `levels.ts` or `board.ts` as needed) that draws on an **800×600 canvas**.

- `lib/game-engine.ts` defines the contract: `createEngine(canvas, events) => GameEngine`. The engine emits `onScore`, `onLives`, `onLevel`, `onGameOver`, `onRestart` (and `onLines`, Tetris only) and exposes `pause`, `resume`, `restart`, `endGame`, `destroy` (must cancel `requestAnimationFrame` and remove every listener).
- `lib/games/registry.ts` maps a game id to its lazily imported engine (`GAME_ENGINES`) and holds per-game HUD metadata (`GAME_META`: `initialLives`, `lines`; default is 3 lives, no lines). Ids not in the registry fall back to the simulated player.
- Sprites and sounds go in `public/games/<id>/` (e.g. `arkanoid/`, `snake/`); load `Image`s inside `createEngine`.
- Each game also needs a row in the `games` table, a CSS cover (`cover-<id>` in `app/globals.css`) and its spec in `specs/`.

### Implemented games

| Game       | Spec                           | Notes                                                       |
| ---------- | ------------------------------ | ----------------------------------------------------------- |
| Asteroides | `specs/05-asteroides-juego.md` | First engine; defined the engine contract                   |
| Tetris     | `specs/07-tetris-juego.md`     | 1 life, shows LINES stat                                    |
| Arkanoid   | `specs/08-arkanoid-juego.md`   | Sprite sheet, levels, sound effects                         |
| Snake      | `specs/09-snake-juego.md`      | Built from scratch (no reference code), 1 life, fruit atlas |

Other specs: `01` UI screens MVP, `02` home, `03` about + Resend contact, `04` Supabase connection, `06` games table + leaderboard.

## Reference material

- `references/templates/`: original HTML/JSX design templates for the screens.
- `references/started-games/`: starter code for porting (`02-asteroids`, `03-tetris`, `04-arkanoid`).
- `references/source-assets/`: raw assets for from-scratch games (e.g. `snake-assets`).
- `demos/`: standalone demo components.

## Skills and tooling

Project skills live in `.claude/skills/` (copies of `spec` and `spec-impl` also in `.agents/skills/`):

- `/spec <description>`: designs a spec section by section, asking clarifying questions first. Writes to `specs/`.
- `/spec-impl <spec>`: implements an **approved** spec.
- `/add-game <references/started-games folder or description>`: writes the spec for porting or creating a game (engine, registry, `games` row, cover, leaderboard). Writes no code; run `/spec-impl` afterwards. Ships `integration-checklist.md`, `porting-guide.md` and `spec-template.md`.
- `/frontend-design`: see below.

Hook (`.claude/settings.json`): after every `Write|Edit|MultiEdit`, `.claude/hooks/format-and-lint.mjs` runs Prettier and ESLint on the touched file (skips `node_modules`, `.next`, `references`, `.claude`).

Playwright MCP is used for visual checks; save screenshots in `.playwright-screenshots/`.

## Skill

Usa siempre /frontend-design para diseñar la interfaz de usuario.
