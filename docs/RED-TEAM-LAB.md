# Red-Team Lab: frontend foundation

The Red-Team Lab is a standalone adversarial-testing workbench whose backend is a **separate experimental subsystem built by another developer**. This document covers the frontend only: the foundation (Patch 3) and the Scenario Catalogue. **Nothing here runs an attack, evaluates an outcome or talks to that backend.** The backend is not connected.

## What exists now

- **Routes and navigation:** a "Red-Team Lab" sidebar link (it stays active on every page below) and a small in-lab navigation (Overview, Scenario Catalogue). All Red-Team pages render inside `RedTeamLayout`, which applies the page-scoped dark theme (`redTeam.css`).

  | Route | Page |
  |---|---|
  | `/red-team` | Overview |
  | `/red-team/scenarios` | Scenario Catalogue (`?q=` search text, `?category=` filter) |
  | `/red-team/scenarios/:scenarioId` | Scenario detail |
- **Overview page** (`src/features/red-team/RedTeamOverviewPage.tsx`): purpose, why adversarial testing matters, the separate-subsystem note, the attack categories the lab is designed to examine, a live **connection and data** panel, and a list of the six lab sections. *Overview* and *Scenario Catalogue* are available and linked; *Execution, Results and Evaluation, Evidence* and *Reports* are shown as **Upcoming** and are not links or empty pages.
- **No statistics.** The page shows only what a service reports. With the mock it says there are illustrative demonstration entries and no executions; with the backend selected it says "BACKEND NOT CONNECTED" and shows the failure.
- **Data-driven categories.** The overview renders an array (`data/plannedCategories.ts`). Scenarios reference categories by an open string id; unknown ids are shown verbatim. There is no component per category or per scenario, and no fixed number of either.

## Scenario Catalogue

Browse, search and inspect scenario **definitions**. Nothing here runs a scenario.

- **List** (`ScenarioCataloguePage`): one card per scenario from `useRedTeamScenarios()`, showing title (or ID), ID, attack category, description, expected secure behaviour and data provenance (`Mock demonstration data` or `Reported by backend`).
- **Search**: case-insensitive, every term must match, over title, ID, description and category (id and label; `_` and `-` are ignored). It deliberately does not search the input or expected behaviour. Logic: `catalogue/scenarioFilter.ts`.
- **Category filters**: built from the categories of the scenarios actually returned, with counts, so a new category needs no code. Labels come from `data/plannedCategories.ts`; an unknown category id is shown verbatim. Search text and filter live in the URL, so a view is shareable and survives going to a detail page and back.
- **Detail** (`ScenarioDetailPage`): identity (ID, category, provenance), description, the input exactly as supplied (text in a `<pre>`, or structured fields with nested values as JSON plus a raw-JSON disclosure), the expected secure behaviour, and an explicit "Execution: none recorded" panel. Input is rendered as inert text, never as markup or run.
- **Expected behaviour is not a result.** It is drawn dashed and labelled *Specification, not a result*; the execution panel says no run, outcome, evidence or score exists. The page shows no severity, risk rating, score, count of executions or pass/fail figure, because the frontend has none from a source.
- **States**: loading; empty (source returned none); no search results (with *Clear search and filters*); not found (detail); backend unavailable (`NotConnectedError`: no demonstration data is shown and the mock is never substituted); and a generic error that lists any `invalid-data` issues, with *Try again*.
- **Red-Team vs Guided Tasks.** Guided Tasks demonstrates normal workflows (FIN-01, HLT-01) and one adversarial walkthrough (FIN-02 Injected Payroll Export). The catalogue is only for adversarial scenario definitions and does not list, copy or modify any Guided Task. Assurance (policy decisions) and Reports (comparisons and evidence) are separate modules.

The mock supplies five clearly marked `demo-*` entries, one per category (prompt injection, tool misuse, privilege escalation, data exfiltration, unauthorized actions). They are illustrative so the interface can be shown; they are **not the Red-Team library** and none has been executed.

## Structure (follows the existing layering)

| Layer | Location | Role |
|---|---|---|
| Domain models | `src/domain/redTeam.ts` | Provisional frontend types |
| Service contract | `src/services/contracts/redTeam.ts` | `RedTeamService`, `RedTeamServiceError` |
| Transport guess + mapping | `src/services/redTeam/{transport,mapping}.ts` | The only code that reads raw backend-shaped JSON |
| Mock adapter | `src/services/mock/redTeam.ts` | Demonstration only |
| Backend adapter | `src/services/backend/redTeam.ts` | Placeholder: reports "not connected" |
| Feature UI | `src/features/red-team/` | Layout, pages, components, hooks, presentation data, `redTeam.css` |

`AegisServices` gained a `redTeam` member. Components call hooks, hooks call `services.redTeam`; components never call `fetch`, see raw backend JSON or import mock/backend code (ESLint already enforces the last point).

## Frontend models (PROVISIONAL, not the backend schema)

`ScenarioDefinition` (id, `categoryId`, description, `ScenarioInput`, `ExpectedBehavior`), `ScenarioCategory`, `ScenarioExecutionRequest`, `ScenarioExecutionStatus`, `ScenarioResult`, `AttackOutcome`, `EvidenceRecord`, `ReportReference`, `ReportExport`, `BackendConnectionStatus`.

Kept deliberately apart:

- **Definition** (what a scenario is) / **request** (asking for one run) / **status** (lifecycle) / **result** (evaluation) / **evidence**.
- **Execution lifecycle**: `pending | running | completed | failed`. It says nothing about the attack. A `completed` execution can have a successful attack; `failed` means the test infrastructure failed. A terminal status does not imply a result exists (`resultAvailable`).
- **Attack outcome**, as three exclusive shapes so the six concepts cannot collapse into one status:
  - `evaluated`: four independent findings, `attempted`, `detected`, `blocked`, `successful`, each `yes | no | unknown`. None implies another (an attack can be detected and still succeed).
  - `unknown`: the evaluator could not decide (with a reason).
  - `infrastructure_failure`: the harness failed, so no attack was evaluated (with a reason).

## Services and adapters

`RedTeamService` (the catalogue uses `getConnectionStatus`, `listScenarios` and `getScenario` only): `getConnectionStatus`, `listScenarios`, `getScenario`, `startExecution` (returns a **status**, never a result), `getExecutionStatus`, `getExecutionResult`, `listExecutions`, `listReports`, `getReport`, `exportReport`. These are the frontend's own seam; **no endpoint, URL or payload is implied or invented.**

- **Mock** (`VITE_AEGIS_SOURCE=mock`): five clearly labelled *illustrative* scenarios (ids `demo-…`), written in the provisional transport shape and passed through the same mapper a real adapter would use. It has **no runner or evaluator by design**: `startExecution` and `exportReport` reject with `not-supported`, status/result/report lookups with `not-found`, and history and reports are empty. Nothing is faked.
- **Backend** (`VITE_AEGIS_SOURCE=backend`): `getConnectionStatus` answers `not_connected` (as a status, not data); every other operation rejects with `NotConnectedError`. **There is no fallback to mock data.** The overview shows the failure.
- Mapping (`mapScenario`, `mapExecutionStatus`, `mapResult`, `mapReport`) validates the fields the frontend needs, throws one `RedTeamServiceError('invalid-data')` listing every problem, never defaults a required field, and never treats a *missing* finding as "no". It translates what a source reports; it makes no security judgement.

## Provisional integration assumptions (need the backend developer's confirmation)

1. Scenario field names follow the assignment's conceptual structure: `scenario_id`, `category`, `description`, `input`, `expected_behavior` (+ optional `title`). The real schema may differ or add fields; only `mapping.ts` and `transport.ts` should need to change.
2. `category` is an id (or an object with one); the category set is open.
3. `input` is text or an object; `expected_behavior` is text or an object with a `summary`.
4. Execution fields (`execution_id`, `status`, `requested_at`, `started_at`, `finished_at`, `error`, `result_available`) and lifecycle values are guesses. Whether execution is synchronous, asynchronous or polled is unknown.
5. Outcome findings are reported as `true | false | null`, with an explicit `unknown` and `infrastructure_failure` status. The real evaluation model may differ.
6. Evidence and report shapes, export formats (JSON and Markdown assumed) and whether export is a download or an inline body are unknown.
7. Authentication, CORS, transport and how "connected" is determined are undecided.

## What the backend developer must supply

The scenario library; execution and the lifecycle; attack evaluation and the four findings; evidence; result and report endpoints and their JSON/Markdown export; a way to report connection health; and the official schema, so the frontend mapping can be adjusted.

## Left for future patches

Execution UI and timeline, Results and Evaluation views, Evidence viewer, Report viewer and export UI, the real backend adapter, and the full scenario library.
