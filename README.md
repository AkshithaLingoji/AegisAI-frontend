# AegisAI Frontend

Standalone frontend for AegisAI, built **without access to the backend repository**. All data comes through service interfaces; today those are served by a clearly labelled development mock.

> **Status:** Phase 3 (Agent Operations) of 8 — recovered source, see `recovery/RECOVERY-MANIFEST.md` (Phase 4 UI not recovered). See `docs/INTEGRATION.md` for the plan to connect the real backend.

## Run it

Requirements: **Node `^20.19.0` or `>=22.12.0`** (Vite 8) and **pnpm 10** (`corepack enable` or `npm i -g pnpm`). No backend, secrets or machine-specific paths are needed for the default mock mode.

```bash
git clone <repository-url> && cd <repository-folder>
pnpm install --frozen-lockfile
cp .env.example .env.local   # optional: the default is VITE_AEGIS_SOURCE=mock
pnpm dev                     # http://localhost:5173
```

**Windows (PowerShell):** `corepack enable` can fail with `EPERM` on some installations. Use this instead, which needs no global install:

```powershell
git clone <repository-url>; cd <repository-folder>
corepack pnpm@10 install --frozen-lockfile
Copy-Item .env.example .env.local   # optional: the default is VITE_AEGIS_SOURCE=mock
corepack pnpm@10 dev                # http://localhost:5173
```

The other commands in the table below work the same way as `corepack pnpm@10 <command>`.

Before running the browser tests once: `pnpm exec playwright install chromium` (or set `CHROME_PATH` to an installed Chrome).

| Command | Purpose |
|---|---|
| `pnpm dev` | Dev server (mock source by default) |
| `pnpm build` | Typecheck + production build |
| `pnpm typecheck` / `pnpm lint` | Static checks (lint also enforces the service-isolation rule) |
| `pnpm test` | Unit + component tests (Vitest) |
| `pnpm test:e2e` | Browser tests (Playwright; its own Chromium by default, or `CHROME_PATH=<chrome>`; `PW_NO_SANDBOX=1` only for containers/CI) |
| `pnpm screenshots` | Regenerates `docs/screenshots/` at desktop and mobile sizes |

## Data source

Set `VITE_AEGIS_SOURCE` (see `.env.example`):

- `mock` (default): deterministic synthetic data. The UI shows **MOCK / DEVELOPMENT** and a "Demonstration data" banner.
- `backend`: real adapters, configured with `VITE_AEGIS_BACKEND_URL` (no URL is hard-coded anywhere). **Not implemented yet**, so the UI shows **BACKEND UNAVAILABLE** and an explanation. It never falls back to mock data and never claims **CONNECTED BACKEND** unless the backend was actually reached.

## Architecture

```
src/
  domain/       PROVISIONAL types (not backend contracts)
  services/
    contracts/  interfaces: the only thing UI code may depend on
    mock/       deterministic synthetic implementations  (private)
    backend/    real-backend adapters                    (private)
    index.ts    the single place that picks mock vs backend
  state/        Zustand (UI state only) + TanStack Query hooks
  components/   ui/ (design system), layout/, evidence/, demo/, brand/
  features/     one folder per module
                  foundation/       design-system gallery            (Phase 1)
                  command-center/   overview of runs and outcomes    (Phase 2)
                  agent-operations/ agents, tools, resources, tasks  (Phase 3)
                  assurance/        policies, context, decisions     (Phase 4)
  app/          router, providers, navigation
  config/       env parsing
```

ESLint forbids importing `services/mock` or `services/backend` from anywhere outside `src/services`.

## Scope

This project does not implement policy evaluation, identity/authorization, gateway enforcement, agent execution, resource access control or benchmark calculation. Mock behaviour is demonstration logic only and must never be presented as backend security evidence.

## Visual identity

"Soft Premium Tech", dark-first. Exact palette (defined once in `src/styles/index.css`): Midnight `#171923`, Slate `#24283A`, Lavender `#A99AF7`, Sky blue `#8CC8F5`, Mint `#9DD9C0`, Dusty rose `#F1B5C1`, Soft peach `#F0CB91`, Cloud `#E8EAF2`. Lavender is the brand colour; sky, mint and peach carry information, success and simulated/caution; dusty rose is a decorative pastel. **Denied and blocked states use a separate semantic status red** (`red` `#EF7777` for icons, borders and bars; `red-pale` `#FCE4E4` for text on red-tinted surfaces; `red-deep` `#C94C4C` for emphasis edges, never small text on dark surfaces, where it is only ~3.2:1). It is not one of the eight brand colours and is never used for REQUIRE_APPROVAL or DEFER. Components take a `Tone` (`tint` on `Card`, `iconTone` on `CardHeader`, tones on `Badge`/`StatePanel`/`Timeline`) so new screens inherit the palette automatically.
