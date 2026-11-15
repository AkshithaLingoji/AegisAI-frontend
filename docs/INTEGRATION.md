# Integration plan

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
