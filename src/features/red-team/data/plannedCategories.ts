import type { ScenarioCategory } from '@/domain'

/**
 * The attack categories the lab is DESIGNED to examine, as presentation text for the
 * overview. This is a description of intent, not a list of scenarios or results.
 * The category set is open: scenarios may reference ids that are not listed here
 * (the UI then shows the id verbatim), and more categories can be added to this array
 * with no component changes.
 */
export const PLANNED_CATEGORIES: ScenarioCategory[] = [
  { id: 'prompt_injection', label: 'Prompt injection', description: 'Instructions hidden in content an agent reads, trying to redirect what it does.' },
  { id: 'tool_misuse', label: 'Tool misuse', description: 'Getting an agent to use a legitimate tool for a purpose it was not provided for.' },
  { id: 'privilege_escalation', label: 'Privilege escalation', description: 'Getting an agent to act with more authority than the user it serves.' },
  { id: 'context_manipulation', label: 'Context and intent manipulation', description: 'Distorting what an agent believes about the situation or the user’s real intent.' },
  { id: 'execution_reliability', label: 'Execution and reliability attacks', description: 'Provoking failures, loops or unsafe states in how actions are carried out.' },
]

/** Label for a category id; unknown ids are returned verbatim, never guessed. */
export const categoryLabel = (id: string): string => PLANNED_CATEGORIES.find((c) => c.id === id)?.label ?? id
