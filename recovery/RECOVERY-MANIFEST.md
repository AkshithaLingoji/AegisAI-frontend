# Recovery manifest — AegisAI frontend

This tree is a **recovered source tree, not the original repository**. There is no `.git` directory; the original history and commit `59ead4d` are NOT restored.

## Base
Phases 1–3 as replayed from recorded tool calls (`aegisai-frontend-PARTIAL-no-git-no-phase4.zip`, kept unchanged). A copy of the replayed fidelity check: `simulate.ts` matches the byte-for-byte dump the original session recorded.

## Phase 4 — recovered EXACTLY (verbatim from recorded command output)
| File | Status in this tree |
|---|---|
| `src/domain/policy.ts` (68 lines) | restored, compiled |
| `src/features/assurance/decisions.tsx` (54 lines) | restored, compiled |
| `src/features/assurance/AssurancePage.tsx` (136) | exact, but kept in `recovery/phase4-exact/not-compiled/` (imports unrecovered files) |
| `src/features/assurance/selection.ts` (35) | exact, in not-compiled/ |
| `src/features/assurance/useAssurance.ts` (24) | exact, in not-compiled/ |
| `src/services/contracts/assurance.ts` (11) | exact, in not-compiled/ (not wired: no mock implementation) |
| `src/components/ui/tones.test.ts` | already in base (original heredoc); passes now |
| Diffs to existing files: `enforcement.ts` decision union, `task.ts` `UserTask.intent`, `fixtures.ts` FIN/HLT intent, `domain/index.ts` export | applied |
| Docs: Phase 4 section of PROVISIONAL-CONTRACTS.md | applied (with a recovery note); original text also in `phase4-exact/` |

## Phase 4 — PARTIAL
- `src/features/assurance/model.ts`: lines 1–176 exact (types, `normaliseDecision`, `DECISION_ORDER`). In `src/` only the type/decision part (lines 1–~153) is kept so it compiles; full 176-line prefix in not-compiled/. `buildAssuranceModel` and aggregates (~240 lines) are missing except scattered lines.
- `InspectorSection.tsx`: lines 1–22, 108–135 only.  `VerificationSection.tsx`: a few lines.  `AssurancePage.test.tsx`: lines 1–40, 150–185, 210–222 plus grep hits.
- `src/services/mock/engine/assurance.ts` (296 lines): first ~30 lines (POL-SCOPE-001 in full, start of POL-ACTION-001) only.
- `tests/e2e/assurance.spec.ts` (86 lines): test titles only.
- Exact diffs for `navigation.ts` (Assurance `to: '/assurance'`), `routes.tsx`, `app.test.tsx`, `backend/index.ts`, `contracts/index.ts`, `mock/index.ts` are recorded in `phase4-exact/existing-file-diffs.txt` but NOT applied, because they would import files that do not exist.

## Phase 4 — UNRECOVERABLE (no recorded content)
`OverviewSection`, `RegistrySection`, `IdentitySection`, `HistorySection`, `ContextSection`, `VerificationSection` (bodies), `fields.tsx`, `model.test.ts`, most of `AssurancePage.test.tsx`, the remaining mock assurance data (policies, evaluation cases), the Phase 4 e2e spec, the Phase 4 colour patches' target files. Phase 4 was written before the recorded part of the session began.

## Consequence
The Assurance & Policy page is **not present and not navigable** (sidebar still shows it as planned). The app is Phases 1–3 + semantic-red tokens.

## Other
- `recovery/screenshots-from-transcript/` — 20 screenshots embedded in the transcript, including the original Phase 4 UI (`15`–`18`). Reference only.
- `recovery/phase4-fragments/` — the original ten fragments, untouched.
- The transcript also records early Phase 5 work; it was NOT used.
