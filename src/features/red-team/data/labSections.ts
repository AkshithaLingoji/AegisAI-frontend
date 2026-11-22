export interface LabSection {
  id: string
  label: string
  description: string
  /** `available` only when a real page exists. Everything else is shown as upcoming and is not linked. */
  status: 'available' | 'upcoming'
  /** Route of the page; only meaningful (and only used) when `status` is `available`. */
  to?: string
}

export const LAB_SECTIONS: LabSection[] = [
  { id: 'overview', label: 'Overview', description: 'What the lab is for and whether anything is connected.', status: 'available', to: '/red-team' },
  { id: 'catalogue', label: 'Scenario Catalogue', description: 'Browse, search and inspect the adversarial scenarios. Nothing here runs them.', status: 'available', to: '/red-team/scenarios' },
  { id: 'configuration', label: 'Experiment Configuration', description: 'Choose a scenario, target agent, resources and Baseline, Protected or Paired mode, then review. Nothing is started.', status: 'available', to: '/red-team/configure' },
  { id: 'execution', label: 'Execution', description: 'Start a scenario and follow its progress.', status: 'upcoming' },
  { id: 'results', label: 'Results and Evaluation', description: 'See whether each attack was attempted, detected, blocked or successful.', status: 'upcoming' },
  { id: 'evidence', label: 'Evidence', description: 'Inspect the records behind a result.', status: 'upcoming' },
  { id: 'reports', label: 'Reports', description: 'Review and export reports of completed runs.', status: 'upcoming' },
]
