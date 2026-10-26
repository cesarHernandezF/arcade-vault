# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: a platform to play games online and compete for the highest score (README is in Spanish). The repo is currently a fresh Create Next App scaffold (`app/layout.tsx`, `app/page.tsx`, `app/globals.css`) with no game, scoring, or backend code yet.

The README states the project follows Spec Driven Design, based on `/spec` and `/spec-impl`, using the skills from https://github.com/Klerith/fernando-skills (installed with `npx skills@latest add Klerith/fernando-skills`). Prefer writing/consulting a spec before implementing features.

## Commands

```bash
npm run dev      # dev server (http://localhost:3000)
npm run build    # production build
npm start        # serve production build
npm run lint     # eslint (flat config in eslint.config.mjs; no path arg = whole project)
```

There is no test runner configured.

## Stack and conventions

- Next.js 16.4.3 (App Router, `app/` directory), React 19.3, TypeScript (strict), Tailwind CSS v4 via `@tailwindcss/turbopack` (no `postcss.config`; theme tokens are declared in `app/globals.css` with `@theme inline`).
- Path alias `@/*` maps to the repo root.
- **This Next.js version has breaking changes from what you may know** (see `AGENTS.md`). Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, `04-community`) and heed deprecation notices.
- `AGENTS.md` is auto-written by `next dev`; commit it rather than removing it.
