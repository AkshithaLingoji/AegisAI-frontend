# Red-Team Lab: frontend foundation

The Red-Team Lab is a standalone adversarial-testing workbench whose backend is a **separate experimental subsystem built by another developer**. This document covers only the frontend foundation (Patch 3). **Nothing here runs an attack, evaluates an outcome or talks to that backend.** The backend is not connected.

## What exists now

- **Route and navigation:** `/red-team`, with a "Red-Team Lab" sidebar link (it was a greyed "Phase 5" placeholder before).
- **Overview page** (`src/features/red-team/RedTeamOverviewPage.tsx`): purpose, why adversarial testing matters, the separate-subsystem note, the attack categories the lab is designed to examine, a live **connection and data** panel, and a list of the six lab sections. Only *Overview* is available; *Scenario Catalogue, Execution, Results and Evaluation, Evidence* and *Reports* are shown as **Upcoming** and are not links or empty pages.
- **No statistics.** The page shows only what a service reports. With the mock it says there are illustrative demonstration entries and no executions; with the backend selected it says "BACKEND NOT CONNECTED" and shows the failure.
- **Data-driven categories.** The overview renders an array (`data/plannedCategories.ts`). Scenarios reference categories by an open string id; unknown ids are shown verbatim. There is no component per category or per scenario, and no fixed number of either.

## Structure (follows the existing layering)

| Layer | Location | Role |
|---|---|---|
| Domain models | `src/domain/redTeam.ts` | Provisional frontend types |
| Service contract | `src/services/contracts/redTeam.ts` | `RedTeamService`, `RedTeamServiceError` |
| Transport guess + mapping | `src/services/redTeam/{transport,mapping}.ts` | The only code that reads raw backend-shaped JSON |
| Mock adapter | `src/services/mock/redTeam.ts` | Demonstration only |
| Backend adapter | `src/services/backend/redTeam.ts` | Placeholder: reports "not connected" |
| Feature UI | `src/features/red-team/` | Pages, components, hooks, presentation data |

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

`RedTeamService`: `getConnectionStatus`, `listScenarios`, `getScenario`, `startExecution` (returns a **status**, never a result), `getExecutionStatus`, `getExecutionResult`, `listExecutions`, `listReports`, `getReport`, `exportReport`. These are the frontend's own seam; **no endpoint, URL or payload is implied or invented.**

- **Mock** (`VITE_AEGIS_SOURCE=mock`): three clearly labelled *illustrative* scenarios (ids `demo-…`), written in the provisional transport shape and passed through the same mapper a real adapter would use. It has **no runner or evaluator by design**: `startExecution` and `exportReport` reject with `not-supported`, status/result/report lookups with `not-found`, and history and reports are empty. Nothing is faked.
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

Scenario Catalogue, Execution UI and timeline, Results and Evaluation views, Evidence viewer, Report viewer and export UI, the real backend adapter, and the full scenario library.
