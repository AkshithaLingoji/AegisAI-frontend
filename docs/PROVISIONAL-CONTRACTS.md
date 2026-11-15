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
