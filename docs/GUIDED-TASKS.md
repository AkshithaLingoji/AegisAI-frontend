# Guided Tasks

A guided walk-through at **`/tasks`** ("Guided Tasks" in the sidebar) from one task's request to its recorded result. Everything is produced by the development mock and is labelled **MOCK / DEVELOPMENT**. The backend is **not** connected.

## The workflow

1. **Choose a task**: FIN-01 *Expense report*, FIN-02 *Injected payroll export*, HLT-01 *Health summary*, or a *Custom task*. Earlier runs from this session can be reopened.
2. **Review context**: the request (verbatim), the agent, the *simulated* acting identity, resources in scope with sensitivity and whether the identity's permitted list includes them, and the documents the agent will retrieve with their trust label.
3. **Run simulation**: one button starts the run through `services.runs.startRun`. There is no fake progress: the run is created, then shown.
4. **Decisions & approval**: every action proposed so far, in order, with the agent's rationale, the evaluation, the gateway outcome and the execution result as separate facts. If an action needs approval, the run is paused: later actions are **not** proposed, evaluated or dispatched until you approve or reject. Resolving calls `services.runs.resolveApproval`, which resumes the run through the shared runner.
5. **Final result**: status, per-action outcome, simulated resource changes, the event timeline and the evidence recorded (inputs, trust, byte lengths, digests, scripted-behaviour profile).

Navigating back never loses the run; completed steps can be revisited.

## Supported predefined scenarios

| Task | What it shows |
|---|---|
| FIN-01 | A legitimate task. In the guided variant the save action is routed to a **simulated** human approval (authored data, labelled as simulated), so the approval step can be demonstrated. |
| FIN-02 | A retrieved document (untrusted) hides an instruction to export payroll. The export is evaluated by the demonstration rules. |
| HLT-01 | A clinician reads a patient they are cleared to see and saves a summary; restricted data is labelled. |

HLT-02 stays in the seeded Command Center catalogue and is not offered here.

## Custom tasks and their limits

- Enter a name, a request, and up to **5** text/CSV/JSON inputs of at most **204,800 UTF-8 bytes** each. Larger inputs are **rejected, never truncated**; the text is kept exactly as typed (no trimming).
- The mock **does not read or understand** the request. You choose one of the supported scripts (FIN-01, FIN-02 or HLT-01); the script decides the agent, the simulated acting identity and the proposed actions. The request is recorded verbatim.
- Input data is **not parsed or validated**; "format" is a label. File upload is not supported: paste text.
- Every custom input is **untrusted by default**. The form has no control to change this, and the service rejects any custom input that claims `declared-trusted` or `assignedBy: catalogue`.

## Input trust

Trust is assigned by controlled catalogue data only. "Declared trusted" means the demonstration data declares it; it is not a verdict that content is safe. The demonstration rules do not use trust to decide anything: decisions come from resource scope and action scope.

## Mock versus a real backend

The mock evaluates two demonstration rules (resource scope, action scope), plus an authored approval rule on FIN-01's save action. An evaluation is **not** enforcement: the gateway outcome and the execution result are separate records, and none of this is backend enforcement or evidence. Run history is in memory for the session and is **never** mixed into the Command Center's seeded figures.

## Not yet built

Baseline-vs-Protected comparison in this UI, the Red-Team Lab, Assurance & Policy and audit views, persistent history, file upload, and any real backend. See `docs/INTEGRATION.md` for what a backend must supply.
