# Integration plan

> **Accuracy note (Patch 1).** The sections below that mention an `assurance` service, `Policy`/`EvaluationCase` types or the Assurance & Policy Center describe **Phase 4 work that is not in the recovered source** (only exact reference material is kept under `recovery/`). `src/services/contracts/` currently contains `system`, `agents`, `scenarios`, `resources`, `experiments` and `audit`. Treat the Phase 4 text as a plan, not as existing code. Phase 4 will be rebuilt after the guided workflow, on the shared `RunRecord`.


When the AegisAI backend becomes available:

1. **Inspect** its API contracts.
2. **Compare** them with `src/domain/` and `src/services/contracts/`; record mismatches in a table.
3. **Get approval** for any contract change before editing types. Do not silently reshape backend security semantics to fit the UI.
4. **Implement adapters** in `src/services/backend/`, one service at a time, mapping backend payloads to the reconciled domain types.
5. **Replace mocks incrementally:** the source is selected per build via `VITE_AEGIS_SOURCE`; a session never mixes sources.
6. **Preserve the UI:** screens depend only on `src/services/contracts`, so they should not change.
7. **Test:** run the unit, e2e and accessibility suites against both sources. `tests/e2e/backend-mode.spec.ts` already asserts that an unreachable backend is reported honestly.

## Rules already enforced

- ESLint blocks UI imports of `services/mock` and `services/backend`.
- `getSourceInfo()` on the backend adapter must reject when the backend can't be reached; the badge shows **CONNECTED BACKEND** only on success.
- No fallback from backend to mock.

## Service interfaces that need backend integration

All services are defined in `src/services/contracts/` and composed as `AegisServices`. **Every backend adapter is currently unavailable.** In `src/services/backend/`, `getSourceInfo()` and each method below reject with `NotConnectedError`, and the UI shows that failure instead of falling back to mock data. No endpoint, URL path or payload format is implied by anything here: the method names are the frontend's own seam, not a backend API.

| Service | Methods | Types returned (all PROVISIONAL) | Used by | Backend adapter |
|---|---|---|---|---|
| `system` | `getSourceInfo()` | `SourceInfo` | Source badge (every page) | unavailable |
| `agents` | `listAgents()`, `listPrincipals()` | `Agent`, `AuthenticatedPrincipal` | Command Center, Agent Operations, Assurance | unavailable |
| `agents` | `listTools()` (added in Phase 3) | `AgentTool` | Agent Operations | unavailable |
| `scenarios` | `listScenarios()` | `Scenario` | Command Center, Agent Operations, Assurance | unavailable |
| `resources` | `listResources()` | `ResourceMetadata` | Command Center, Agent Operations, Assurance | unavailable |
| `experiments` | `listExperiments()` | `ExperimentResult` (nests proposals, policy evaluations, gateway results, events, resource changes) | Command Center, Agent Operations, Assurance | unavailable |
| `audit` | `listAuditRecords()` | `AuditRecord` | Agent Operations | unavailable |
| `assurance` (added in Phase 4) | `listPolicies()`, `listEvaluationCases()` | `Policy`, `EvaluationCase` | Assurance & Policy Center | unavailable |

### The Assurance service

```ts
interface AssuranceService {
  listPolicies(): Promise<Policy[]>
  listEvaluationCases(): Promise<EvaluationCase[]>
}
```

- Policy **evaluations that belong to a recorded run** are not served here. They stay nested in `ExperimentResult.policyEvaluations`, served by `ExperimentsService`.
- `listEvaluationCases()` exists only so that the REQUIRE_APPROVAL and DEFER decisions can be inspected in the mock. Each case has no gateway result and nothing was executed. If the backend exposes evaluations as their own resource, this method and the "case" concept may be replaced, not extended.

### Provisional types added for Assurance (`src/domain/policy.ts`)

| Type | What it is | Notes |
|---|---|---|
| `Policy` | A *demonstration* policy shown in the registry: id, name, description, category, version, status, applicability, conditions, reason codes, last-updated information, `demonstration: true` | No authoring and no execution exist in the frontend. |
| `PolicyCondition` | One plain-language condition (`when`) and the decision it leads to (`then`), with an optional reason code | Reason codes are how the mock credits a policy for an evaluation. A real link between an evaluation and a policy version is an open question. |
| `ContextIssue` | Something missing, incomplete or contradictory in the context an action was assessed with | The UI displays issues it is given; it does not detect them. |
| `EvaluationCase` | A standalone evaluation: task, proposal, evaluation, retrieved context, context issues, simulation id | Evaluation-only; see above. |

Related additions to existing types: `PolicyEvaluation.decision` now lists `require_approval` and `defer` alongside `allow`, `deny` and `escalate`; `UserTask.intent` is an optional `{ resourceIds, actionKinds }` annotation used for the intent-action comparison; `Agent.environment` and `AgentTool` came with Phase 3. Field-by-field notes are in `docs/PROVISIONAL-CONTRACTS.md`.

## Open contract questions for the backend teammate

These must be resolved, and any resulting contract change approved, before adapters are written. The full wording is in `docs/PROVISIONAL-CONTRACTS.md` ("Open integration questions (Phase 4)").

1. **Decision vocabulary.** Are the four decisions spelled `ALLOW | DENY | REQUIRE_APPROVAL | DEFER` on the wire, and what does the existing `escalate` map to? (The UI normalises case and separators for those four only and shows anything else verbatim as "Other".)
2. **Where evaluations live.** Is there a stand-alone evaluation resource, needed for history across runs and for evaluations made outside an experiment?
3. **Intent.** Does the backend provide structured user intent, or must the UI derive it? The UI only compares against `UserTask.intent` and never infers intent from prompt text.
4. **Missing or contradictory context.** Who produces `ContextIssue`s: the evaluation itself or a separate context step?
5. **Policy registry.** Is there a read API for policies with version, status and last-updated information, and are conditions available in human-readable form? How is an evaluation linked to a policy version?
6. **Approval.** Is a REQUIRE_APPROVAL evaluation followed by an approval record? The UI shows no approve or reject controls and invents none.
7. **Classification vs access.** Is `sensitivity` the data classification with the values `public | internal | confidential | restricted`? Access is currently derived from the principal's permitted-resource list; the real model may differ.
8. **Gateway and execution.** Is a gateway result guaranteed per evaluation, and is "the resource actually changed" reported separately from the gateway outcome?

Also to confirm for Phase 3 data: how agent tools are described by the backend (`AgentTool`, `listTools()`), and whether agent status and environment are reported at all (the UI labels status "Simulated").

## Moving into the main repository

`src/` is self-contained. Copy it with `src/domain` (after reconciliation), keep `src/services/contracts` as the seam, and drop `src/services/mock` and `src/features/foundation` if they aren't wanted there.

## Backend integration guide for the guided workflow (Patch 2 status)

**Status: nothing here is verified against a real backend.** The method names below are the frontend's own seam, not a backend API. No endpoint, URL path, payload encoding, authentication scheme or status code is implied. Patch 1 added the domain types and a pure mock run engine. **Patch 2 adds the `tasks` and `runs` service contracts (`src/services/contracts/tasks.ts`), their mock implementation, backend adapters that reject with `NotConnectedError`, and the `/tasks` Guided Tasks UI**, which depends only on those contracts. The method names are listed here so the backend teammate can plan.

### Verified in the current code
- UI code cannot import `services/mock` or `services/backend` (ESLint `no-restricted-imports`; the only non-service importers are two unit tests that build mock services). Nothing under `src/domain` or `src/lib` imports from `src/services`.
- Patch 1's run engine lives entirely in `src/services/mock/engine/run`. UI code is only allowed to see the shared types (`src/domain`) and the pure helpers (`src/lib/runs`: canonicalisation, digests, input validation, `toExperimentResult`, `deriveComparison`), none of which know about the mock engine or its simulation profiles.
- Source selection is one build-time switch (`VITE_AEGIS_SOURCE=mock|backend`). An invalid value throws at startup. In backend mode every adapter rejects with `NotConnectedError`; there is no fallback path to mock data (covered by `tests/e2e/backend-mode.spec.ts`).
- Configuration: only `VITE_AEGIS_SOURCE` and `VITE_AEGIS_BACKEND_URL`, both in `.env.example`, which contains no URL, path or secret. `.env*` files other than `.env.example` are git-ignored. `VITE_` variables are embedded in the browser bundle, so **never put secrets in them**.

### Logical operations the frontend uses (service methods added in Patch 2; names provisional)

Service methods: `tasks.listTasks()`, `tasks.listSimulationScenarios()` (mock only), `runs.startRun({ task, simulationScenarioId? })`, `runs.resolveApproval({ runId, requestId, outcome, note? })`, `runs.getRun(runId)`, `runs.listRuns()`. Refused operations throw `RunServiceError` with a `code` (`invalid-input`, `invalid-request`, `unknown-run`, `unknown-approval-request`, `already-resolved`, `conflict`) and an `issues` list; unreachable backends throw `NotConnectedError`. The UI also reads `resources.listResources()`, `agents.listAgents()` and `agents.listPrincipals()`.

| Logical operation | Input | Returns | Mock today | Needs real backend |
|---|---|---|---|---|
| list task catalogue | none | `TaskDefinition[]` | built-in catalogue (FIN-01, FIN-02, HLT-01, HLT-02) | yes, or the frontend keeps the catalogue |
| start run | `TaskDefinition` (inputs already validated) and the execution path | `RunRecord` (or `RunRecord` pair + `RunGroup` for Baseline vs Protected) | scripted by a mock-only `SimulationProfile` | **yes: this is the real agent/policy/gateway work** |
| get / list runs | run id | `RunRecord` | in-memory only, lost on reload | yes, if history must persist |
| resolve approval | run id, approval request id, `approved` or `rejected`, optional note | the updated `RunRecord` | append-only simulation, resumes the paused plan | yes: identity, authority and audit of the human decision |
| validate / snapshot inputs | `TaskInput[]` | `RunInputSnapshot[]` | frontend helper (200 KB/input, 5 inputs) | the backend must enforce the same limits independently |

### What a real `RunRecord` must supply
- **Four separate records** per action: proposal, policy decision, gateway result (`dispatched`/`blocked`), execution result (`ran`/`not_run`/`failed`). A decision of ALLOW must never be inferred to mean execution.
- **Ordered execution.** When an action needs approval, the run pauses at that action: later actions are not proposed, decided or run until the request is resolved, and then continue in plan order. A real backend must preserve this ordering guarantee; the frontend never reorders.
- **Append-only approvals.** An `ApprovalRequest` is immutable; the resolution is a separate record plus an `approval_resolved` event; resolving twice is an error.
- **Evidence:** `initialState.digest`, `inputsDigest` and per-input `contentDigest`. If the backend computes digests it must use SHA-256 over the canonical serialisation in `src/lib/runs/canonical.ts` (or the contract must define another one); otherwise Baseline-vs-Protected comparison will correctly report "not comparable".
- **Trust:** `declared-trusted` / `assignedBy: catalogue` may only come from controlled catalogue data. The frontend rejects those claims on custom inputs, and the backend must as well; client-side checks are not a security boundary.
- **Provenance:** `source: 'backend'` runs must never carry a mock `simulation` note.

### Error handling the UI expects (provisional)
| Condition | Frontend behaviour | Backend must provide |
|---|---|---|
| backend unreachable / not implemented | `NotConnectedError`, explicit "backend unavailable" state, never mock data | a reachable base URL |
| invalid input (too large, too many, ill-formed text, trust claim) | `InputValidationError` with a list of messages; nothing truncated | the same rules, with machine-readable reasons |
| approval already resolved / unknown request | `ApprovalError` (`already-resolved`, `unknown-request`) | a distinguishable conflict / not-found result |
| run cannot be compared | `comparable: false` with reasons | digests as above |
| per-action execution failure | recorded as `failed`; the run can still complete | a failure reason per action |

### Mock-only capabilities (not to be presented as real)
Simulation profiles and scripted plans; the demo policy rules (`evaluateDemoRules`); simulated approval; sandbox state replay; in-memory run history; seeded timestamps. The mock never interprets the request text (`requestInterpreted: false`).

### Assumptions that need the backend teammate's confirmation
1. Whether the backend accepts a full task (request + inputs + selected resources + simulated acting identity) or a task id only.
2. Whether runs are synchronous or asynchronous, and how progress and the awaiting-approval state are reported (polling, streaming, or push).
3. Whether the backend owns run history, and for how long.
4. The decision vocabulary (see the Phase 4 questions above) and how `escalate` maps.
5. How identity is represented; the UI only shows a *simulated acting identity* and performs no authentication.
6. Who computes digests, and whether the SHA-256 + canonical-JSON scheme is acceptable.
7. Limits: 200 KB per input, 5 inputs, UTF-8 text only (text, CSV, JSON).
8. Whether the backend can provide a Baseline (no assurance layer) path at all.
9. Authentication of the browser to the backend, and CORS. Nothing is implemented for either.

### Integration blockers
- The backend contracts do not exist yet for the frontend to read; every adapter is a deliberate `NotConnectedError`.
- No cross-machine run has been performed: the backend was never reachable from this workspace, so compatibility is **unverified**.
- Auth/CORS and transport (REST vs streaming) are undecided.

### What the Guided Tasks UI needs from a backend (Patch 2)
- `startRun` must return a complete `RunRecord` that is *paused* at the first action needing approval (`status: awaiting_approval`, an `ApprovalRequest`, no later proposals, decisions, gateway results or executions). `resolveApproval` must return the updated record with the appended resolution and the resumed actions. The UI renders only what the record contains; it never computes a decision.
- `listSimulationScenarios()` has no backend equivalent: when it rejects, the UI disables the custom-task path and says why. A real backend would need its own way to choose behaviour for custom tasks (open question for the backend teammate).
- Catalogue and custom runs are started on the Protected path only; no Baseline run is started from this UI.
- Session history is the mock's in-memory map; a backend must say who owns run history and for how long.

### Red-Team Lab (Patch 3)
The Red-Team Lab frontend foundation adds a `redTeam` service (see `docs/RED-TEAM-LAB.md`). The backend adapter reports "not connected" and rejects every operation with `NotConnectedError`; nothing is invented about the Red-Team backend's endpoints, and the mock has no runner or evaluator. Backend-side mapping lives in `src/services/redTeam/mapping.ts`.
The Scenario Catalogue (`/red-team/scenarios`) reads scenarios only through `services.redTeam.listScenarios()` and `getScenario()`. In backend mode it shows "backend not connected" and never falls back to mock data. When the real backend adapter exists, only `src/services/backend/redTeam.ts` and the mapping should change.
