/**
 * Short, general statements of what each kind of attack puts at risk for an organisation.
 * Descriptive context only: they are NOT findings about any agent, and they say nothing
 * about whether an attack succeeded or was blocked. Unknown categories simply have none.
 */
const RISK: Record<string, string> = {
  prompt_injection: 'Hostile text in a document or message can redirect an agent that trusts it, turning routine work into data disclosure or unwanted actions.',
  tool_misuse: 'A legitimate tool used for the wrong purpose can change or expose records the task never needed.',
  privilege_escalation: 'An agent acting with more authority than the person it serves can reach data and actions that person was never cleared for.',
  data_exfiltration: 'Sensitive information sent outside approved destinations leaves the organisation’s control and cannot be recalled.',
  unauthorized_action: 'State-changing actions taken without the required approval bypass the checks an organisation relies on.',
  context_manipulation: 'An agent misled about the situation or the user’s intent can make confident but wrong decisions.',
  execution_reliability: 'Failures, loops or unsafe states can interrupt operations or leave work half-done.',
}

export const categoryRisk = (categoryId: string): string | null => RISK[categoryId] ?? null
