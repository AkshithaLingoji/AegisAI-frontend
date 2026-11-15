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
