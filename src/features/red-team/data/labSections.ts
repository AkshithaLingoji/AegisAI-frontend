export interface LabSection {
  id: string
  label: string
  description: string
  /** `available` only when a real page exists. Everything else is shown as upcoming and is not linked. */
  status: 'available' | 'upcoming'
}

export const LAB_SECTIONS: LabSection[] = [
  { id: 'overview', label: 'Overview', description: 'What the lab is for and whether anything is connected. You are here.', status: 'available' },
  { id: 'catalogue', label: 'Scenario Catalogue', description: 'Browse the adversarial scenarios by category.', status: 'upcoming' },
  { id: 'execution', label: 'Execution', description: 'Start a scenario and follow its progress.', status: 'upcoming' },
  { id: 'results', label: 'Results and Evaluation', description: 'See whether each attack was attempted, detected, blocked or successful.', status: 'upcoming' },
  { id: 'evidence', label: 'Evidence', description: 'Inspect the records behind a result.', status: 'upcoming' },
  { id: 'reports', label: 'Reports', description: 'Review and export reports of completed runs.', status: 'upcoming' },
]
