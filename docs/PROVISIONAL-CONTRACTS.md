# Provisional contracts

**Status: PROVISIONAL.** These TypeScript types in `src/domain/` were written without the backend repository. They are working shapes for building the UI, not agreed integration contracts. Do not treat any field name, enum value or semantic as final.

| Required interface | Type | File |
|---|---|---|
| Agent | `Agent` | `identity.ts` |
| Authenticated principal | `AuthenticatedPrincipal` | `identity.ts` |
| User task | `UserTask` | `task.ts` |
| Action proposal | `ActionProposal` | `task.ts` |
| Resource metadata | `ResourceMetadata` | `task.ts` |
| Policy evaluation | `PolicyEvaluation` | `enforcement.ts` |
| Gateway result | `GatewayResult` | `enforcement.ts` |
| Execution event | `ExecutionEvent` | `evidence.ts` |
| Audit record | `AuditRecord` | `evidence.ts` |
| Experiment result | `ExperimentResult` (+ `ResourceStateChange`) | `experiment.ts` |
| Benchmark result | `BenchmarkResult` | `experiment.ts` |

## Conventions that protect backend semantics

- Vocabulary fields (decision, outcome, kind, sensitivity…) use `Extensible<…>`: known values for convenience, but any string is allowed and the UI must display unknown values verbatim and never infer a meaning.
- Every evidence-bearing record carries `provenance.source` (`mock` | `backend`).
- `BenchmarkResult.metrics` must be derivable from the referenced `ExperimentResult` records. Aggregates are never stored independently.
- The UI must not change what allow/deny/blocked mean to suit a screen.

## Open questions for the backend owner

1. Final decision vocabulary and denial-reason codes for policy evaluation.
2. Gateway outcome values, and whether "modified" or "partial" outcomes exist.
3. How identity/scopes are represented, and how the permitted resource set is reported.
4. Whether before/after resource state is returned by the backend or must be read separately.
5. Identifier formats, timestamp format, and pagination for audit and event streams.
6. Whether baseline and protected runs are separate executions or one run with two conditions.
7. How the backend reports reachability (needed so **CONNECTED BACKEND** is only shown when true).


## Added in Phase 2

- `Scenario` (`src/domain/scenario.ts`) — PROVISIONAL. A scenario's id, title, domain, category, summary, user task and the resources it touches. Needed by the Command Center; the real backend contract may differ and no final shape is implied.

## Added in Phase 3

- `AgentTool` (`src/domain/tool.ts`) — PROVISIONAL. A capability an agent can invoke (action kind, reachable resources, a scope label, whether it is a simulation stand-in, optional destination). It describes what a tool *can* do, not whether anyone is permitted to use it.
- `Agent.environment` — optional PROVISIONAL display field.
- `AgentsService.listTools()` — new method on the existing service interface; the backend adapter rejects with "not connected". The mock also adds two synthetic resources (Q3 budgets, Appointment schedule) and renames the health agent "Health Administration Agent".

> **Recovery note:** the section below is the original Phase 4 text, recovered verbatim from the session transcript. In this recovered source tree only `Policy`, `PolicyCondition`, `ContextIssue`, `EvaluationCase`, `PolicyDecisionKey`, the widened `PolicyEvaluation.decision` and `UserTask.intent` exist. `AssuranceService`, the mock assurance data and the Assurance page could not be recovered (see `recovery/RECOVERY-MANIFEST.md`).

## Added in Phase 4 (Assurance & Policy Center)

All PROVISIONAL, none implies a backend endpoint or final security semantics.

- `Policy`, `PolicyCondition` (`src/domain/policy.ts`) — a *demonstration* policy shown in the registry: id, name, description, category, version, status, applicability, plain-language conditions with an expected decision, the reason codes it is credited for, last-updated information. There is no authoring and no execution.
- `PolicyDecisionKey` — `ALLOW | DENY | REQUIRE_APPROVAL | DEFER`. `PolicyEvaluation.decision` now also lists `require_approval` and `defer` as known spellings. The UI normalises case and separators for these four only; any other value (including the existing `escalate`) is shown verbatim and counted as "other".
- `ContextIssue` — something missing, incomplete or contradictory in the context an action was assessed with (`kind`, `field`, `explanation`).
- `EvaluationCase` — a standalone, evaluation-only demonstration case (task, proposal, evaluation, retrieved context, issues). It has **no gateway result and nothing was executed**. It exists only so REQUIRE_APPROVAL and DEFER can be inspected; the mock engine's recorded runs only ever produce allow and deny.
- `UserTask.intent?` — optional `{ resourceIds, actionKinds }`: what the request concerns, as annotated by the demonstration data. It is the basis for the intent-action comparison. Omitted = "not recorded".
- `AssuranceService` (`listPolicies`, `listEvaluationCases`) — a new service on `AegisServices`. The backend adapter rejects with "not connected". Run evaluations are *not* served here; they continue to come from `ExperimentsService`.

## Open integration questions (Phase 4)

1. **Decision vocabulary.** Are the four decisions spelled `ALLOW | DENY | REQUIRE_APPROVAL | DEFER` on the wire? What does the existing `escalate` map to, if anything?
2. **Where do evaluations live?** Today they are nested in `ExperimentResult.policyEvaluations`. Is there a stand-alone evaluation resource (needed for history that spans runs, and for evaluations made outside an experiment)?
3. **Intent.** Does the backend produce a structured representation of user intent (subject resources, operations), or must the UI derive the comparison itself? The UI currently only compares against `UserTask.intent` and never infers intent from the prompt text.
4. **Missing / contradictory context.** Who produces `ContextIssue`s — the evaluation itself (the DEFER reason) or a separate context service? The UI shows what it is given and does not detect gaps.
5. **Policy registry.** Is there a read API for policies with version, status and last-updated information? Are conditions available in a human-readable form, or only as rules? How do an evaluation and a policy version link (the UI credits policies by reason code in the mock)?
6. **Approval.** Is a REQUIRE_APPROVAL evaluation followed by an approval record? The UI shows no approve/reject controls and invents none.
7. **Classification vs access.** Is `sensitivity` the data classification, and are the values `public | internal | confidential | restricted`? Access is derived from the principal's permitted list; the real model may differ.
8. **Gateway/execution link.** Is a gateway result guaranteed per evaluation, and is "resource actually changed" reported separately from the gateway outcome?

## Added in the guided-workflow groundwork (Patch 1)

All **PROVISIONAL**, additive, and not backend contracts. Nothing here changes an existing type.

**`RunRecord`** (`src/domain/run.ts`) is the canonical generic run model; `ExperimentResult` is now a *derived* view produced by `toExperimentResult(run)` (`src/lib/runs`). It keeps proposals, decisions, gateway results and execution results as four separate records: an `allow` decision is never evidence that an action ran. The run `status` (`awaiting_approval` | `completed`) describes progress only; each action keeps its own `ExecutionResult` (`ran` | `not_run` | `failed`), so a run can complete with failed actions.

**Approvals are append-only.** An `ApprovalRequest` is written once and never edited; a later `ApprovalResolution` and an `approval_resolved` event are appended. "Pending" is derived (a request without a resolution). The approval step is simulated.

**`TaskDefinition` / `TaskInput`** (`src/domain/taskDefinition.ts`) describe reusable tasks (catalogue or custom). Configured inputs are editable; a run stores immutable `RunInputSnapshot`s of exactly what the agent received (exact content, byte length, SHA-256 content digest, trust metadata). Content is never trimmed, normalised or truncated; it must be valid text and at most 204,800 UTF-8 bytes per input, at most 5 inputs per task (violations are errors, not truncation). User-provided and retrieved content is `untrusted` by default; `declared-trusted` can only come from catalogue data and is not a verdict. **Enforced:** `snapshotInputs(inputs, origin)` rejects (does not silently downgrade) any custom input that claims `declared-trusted` or `assignedBy: 'catalogue'`, and the runner rejects a task that labels itself `catalogue` unless it is a known controlled catalogue definition with exactly that definition's inputs.

**Digests.** State and input digests are SHA-256 over a canonical serialisation (sorted keys, no whitespace, strings untouched). SHA-256 is implemented synchronously (`src/lib/runs/sha256.ts`) and cross-checked against Web Crypto in tests, so no weaker fallback exists. Digests support deterministic comparison only; they are not signatures and give no tamper evidence.

**`RunGroup`** links a Baseline and a Protected run. `deriveComparison` returns `comparable: false` unless: the group's `initialStateDigest` and `inputsDigest` match BOTH runs; each run's recorded digests match its own recorded state and inputs (recomputed); task, agent and simulated acting identity match; both runs are `completed` (a run awaiting approval is not comparable); and the proposals are identical in sequence, kind, target, summary, canonical parameters and agent. Every figure is counted from the two records.

**Approval ordering.** A run pauses at an action that requires approval; later actions are not proposed, decided, dispatched or run until the request is resolved, then the simulated agent continues in plan order (it can pause again). `resolveApproval` therefore needs the run's simulation profile and rejects a mismatched profile or a resolution time before the run's last event. A rejected action simply has no effect on later state.

**Simulation profiles** (`SimulationProfile`, mock engine only) decide what the scripted agent proposes. They are intentionally outside the shared `TaskDefinition`; a backend would ignore them. The mock never interprets the request text.

Open question for the backend owner: how a real `RunRecord` would represent the approval flow, the per-action execution result, and the state snapshots (see `docs/INTEGRATION.md`).

## Added in Guided Tasks (Patch 2)

All **PROVISIONAL**; none is a backend contract.

- **`TasksService`** — `listTasks(): GuidedTaskOption[]` (`task`, plain-language `objective`, `includesApproval`) and mock-only `listSimulationScenarios(): SimulationScenarioOption[]`.
- **`RunsService`** — `startRun`, `resolveApproval`, `getRun`, `listRuns`, returning `RunRecord`. Runs started here use the Protected path. A custom task also names a simulation scenario (mock only).
- **`RunServiceError`** — `code` (`invalid-input` | `invalid-request` | `unknown-run` | `unknown-approval-request` | `already-resolved` | `conflict`), `message`, `issues[]`.
- **Catalogue inputs.** Catalogue tasks now carry the documents the scripted agent retrieves as `TaskInput`s with catalogue-assigned trust (FIN-02's document is `untrusted`, the others `declared-trusted` by the demonstration data). The seeded experiments are unchanged (golden digest guard).
- **Controlled definitions.** The mock service starts catalogue runs from its own definition, never the caller's copy, and fixes the agent and simulated identity of custom tasks from the chosen script.

## Added in the Red-Team Lab foundation (Patch 3)

All **PROVISIONAL**; none is the Red-Team backend's schema. See `docs/RED-TEAM-LAB.md`.

- **`src/domain/redTeam.ts`**: scenario, request, execution status (lifecycle), attack outcome (`evaluated` with four independent findings | `unknown` | `infrastructure_failure`), evidence, report and connection-status types.
- **`RedTeamService`** and **`RedTeamServiceError`** (`not-supported`, `not-found`, `not-available`, `invalid-data`).
- **`src/services/redTeam/transport.ts`**: a guess at backend JSON (`scenario_id`, `category`, `description`, `input`, `expected_behavior`, ...). Confirm every name.
