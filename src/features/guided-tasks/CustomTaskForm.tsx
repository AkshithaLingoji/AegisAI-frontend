import { Plus, Trash2, TriangleAlert } from 'lucide-react'
import { Badge, Button, Card } from '@/components/ui'
import type { SimulationScenarioOption } from '@/services'
import { useGuidedStore } from '@/state/guidedStore'
import { MAX_INPUT_BYTES, MAX_INPUTS_PER_TASK, inputBytes, type DraftValidation } from './model'

const field = 'w-full rounded-xl border border-line-strong bg-raised px-4 py-3 text-sm text-fg placeholder:text-fg-subtle focus:border-lavender'

/**
 * Custom task entry. Every input is untrusted by default and there is deliberately no
 * control to change that. Nothing is parsed or interpreted: the text is stored as typed.
 */
export function CustomTaskForm({ scenarios, validation, showErrors }: { scenarios: SimulationScenarioOption[]; validation: DraftValidation; showErrors: boolean }) {
  const { draft, updateDraft, addInput, updateInput, removeInput } = useGuidedStore()

  return (
    <div className="space-y-6" data-custom-form>
      <Card className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="custom-name" className="text-sm font-semibold text-fg">Task name</label>
          <input id="custom-name" className={field} value={draft.name} onChange={(e) => updateDraft({ name: e.target.value })} placeholder="e.g. Quarterly expense check" />
        </div>
        <div className="space-y-2">
          <label htmlFor="custom-request" className="text-sm font-semibold text-fg">What should the agent do?</label>
          <textarea id="custom-request" rows={4} className={field} value={draft.request} onChange={(e) => updateDraft({ request: e.target.value })} aria-describedby="custom-request-help" placeholder="Describe the request in your own words." />
          <p id="custom-request-help" className="text-xs leading-relaxed text-fg-subtle">
            Kept exactly as you type it. The development mock does <strong>not</strong> read or understand this text; it is recorded with the run.
          </p>
        </div>
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-fg">Which scripted behaviour should the simulated agent follow?</legend>
          <p className="text-xs leading-relaxed text-fg-subtle">The mock cannot interpret requests, so you choose one of its supported scripts. It decides the agent, the simulated acting identity and the actions proposed.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {scenarios.map((s) => (
              <label key={s.id} className={`flex cursor-pointer flex-col gap-1.5 rounded-2xl border p-4 text-sm ${draft.scenarioId === s.id ? 'border-lavender bg-lavender/[0.14]' : 'border-line bg-raised/60 hover:bg-raised'}`}>
                <span className="flex items-center gap-2">
                  <input type="radio" name="custom-scenario" value={s.id} checked={draft.scenarioId === s.id} onChange={() => updateDraft({ scenarioId: s.id })} className="accent-[#A99AF7]" />
                  <span className="font-semibold text-fg">{s.label}</span>
                </span>
                <span className="text-xs leading-relaxed text-fg-muted">{s.description}</span>
                {s.includesApproval && <Badge tone="peach" className="self-start">Includes a simulated approval</Badge>}
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      <Card className="space-y-5">
        <div className="space-y-1">
          <h3 className="text-heading font-semibold text-fg">Input data (optional)</h3>
          <p className="text-sm leading-relaxed text-fg-muted">
            Paste text, CSV or JSON for the agent to receive. Up to {MAX_INPUTS_PER_TASK} inputs, {MAX_INPUT_BYTES.toLocaleString('en-GB')} bytes each. Larger inputs are rejected, never truncated.
            File upload is not supported; the format is a label only and nothing is parsed or validated.
          </p>
          <p className="flex items-center gap-2 text-sm text-rose"><TriangleAlert className="size-4" aria-hidden /> Everything you supply is treated as untrusted. This cannot be changed here.</p>
        </div>

        {draft.inputs.length === 0 && <p className="text-sm text-fg-subtle">No inputs added. The task will run with its request text only.</p>}

        <ul className="space-y-5">
          {draft.inputs.map((input, i) => {
            const bytes = inputBytes(input.content)
            const errs = validation.inputIssues[input.key] ?? []
            return (
              <li key={input.key} className="space-y-3 rounded-2xl border border-line bg-raised/50 p-4" data-draft-input>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-semibold text-fg">Input {i + 1}</p>
                  <Badge tone="rose">Untrusted by default</Badge>
                  <Button variant="ghost" className="ml-auto" onClick={() => removeInput(input.key)} leadingIcon={<Trash2 className="size-4" aria-hidden />} aria-label={`Remove input ${i + 1}`}>
                    Remove
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
                  <div className="space-y-1.5">
                    <label htmlFor={`${input.key}-label`} className="text-xs font-medium text-fg-muted">Label</label>
                    <input id={`${input.key}-label`} className={field} value={input.label} onChange={(e) => updateInput(input.key, { label: e.target.value })} placeholder={`Input ${i + 1}`} />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor={`${input.key}-format`} className="text-xs font-medium text-fg-muted">Format label</label>
                    <select id={`${input.key}-format`} className={field} value={input.format} onChange={(e) => updateInput(input.key, { format: e.target.value as 'text' | 'csv' | 'json' })}>
                      <option value="text">Text</option>
                      <option value="csv">CSV</option>
                      <option value="json">JSON</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor={`${input.key}-content`} className="text-xs font-medium text-fg-muted">Content</label>
                  <textarea id={`${input.key}-content`} rows={5} className={`${field} font-mono text-xs`} value={input.content} onChange={(e) => updateInput(input.key, { content: e.target.value })} aria-invalid={errs.length > 0} aria-describedby={`${input.key}-size`} />
                  <p id={`${input.key}-size`} className="text-xs tabular-nums text-fg-subtle">
                    {bytes === null ? 'Cannot be stored as UTF-8' : `${bytes.toLocaleString('en-GB')} / ${MAX_INPUT_BYTES.toLocaleString('en-GB')} bytes`}
                  </p>
                  {errs.map((m) => (
                    <p key={m} role="alert" className="text-sm font-medium text-red-pale">{m}</p>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
        <Button variant="secondary" onClick={addInput} disabled={draft.inputs.length >= MAX_INPUTS_PER_TASK} leadingIcon={<Plus className="size-4" aria-hidden />}>
          Add an input
        </Button>
        {draft.inputs.length >= MAX_INPUTS_PER_TASK && <p className="text-xs text-fg-subtle">The maximum of {MAX_INPUTS_PER_TASK} inputs has been reached.</p>}
      </Card>

      {showErrors && validation.issues.length > 0 && (
        <div role="alert" className="rounded-2xl border border-red/55 tint-red p-4 text-sm text-red-pale">
          <p className="font-semibold">Please fix the following before continuing:</p>
          <ul className="mt-1 list-disc pl-5">
            {validation.issues.map((m) => <li key={m}>{m}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
