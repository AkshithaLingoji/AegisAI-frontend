/**
 * Sample content for the component gallery ONLY.
 * This is not domain data and not an AegisAI scenario — it exists to show how
 * components look. Real scenario data comes from services, never from here.
 */

/** The exact brand palette. Hex values must match src/styles/index.css. */
export const brandPalette = [
  { name: 'Midnight', hex: '#171923', className: 'bg-midnight', textClass: 'text-cloud', role: 'Page backdrop' },
  { name: 'Slate', hex: '#24283A', className: 'bg-slate', textClass: 'text-cloud', role: 'Cards and sidebar' },
  { name: 'Lavender', hex: '#A99AF7', className: 'bg-lavender', textClass: 'text-midnight', role: 'Brand, primary actions, selection' },
  { name: 'Sky blue', hex: '#8CC8F5', className: 'bg-sky', textClass: 'text-midnight', role: 'Protected condition, information' },
  { name: 'Mint', hex: '#9DD9C0', className: 'bg-mint', textClass: 'text-midnight', role: 'Allowed, success, healthy' },
  { name: 'Dusty rose', hex: '#F1B5C1', className: 'bg-rose', textClass: 'text-midnight', role: 'Blocked, denied, errors' },
  { name: 'Soft peach', hex: '#F0CB91', className: 'bg-peach', textClass: 'text-midnight', role: 'Simulated data, caution' },
  { name: 'Cloud', hex: '#E8EAF2', className: 'bg-cloud', textClass: 'text-midnight', role: 'Text and headings' },
]

export const tintedSurfaces = [
  { tone: 'lavender' as const, title: 'Lavender surface', note: 'Featured content and the selected item.' },
  { tone: 'sky' as const, title: 'Sky surface', note: 'Information and the Protected condition.' },
  { tone: 'mint' as const, title: 'Mint surface', note: 'Allowed actions and successful results.' },
  { tone: 'rose' as const, title: 'Rose surface', note: 'Blocked actions and denied access.' },
  { tone: 'peach' as const, title: 'Peach surface', note: 'Simulated data and things to double-check.' },
]

export const typeSamples = [
  { className: 'text-display font-semibold', label: 'Display · 40', sample: 'Understand what your agent did' },
  { className: 'text-title font-semibold', label: 'Title · 28', sample: 'Every action, checked and explained' },
  { className: 'text-heading font-semibold', label: 'Heading · 20', sample: 'Proposed actions' },
  { className: 'text-base', label: 'Body · 16', sample: 'Plain-language explanations sit beside the technical detail.' },
  { className: 'text-sm text-fg-muted', label: 'Small · 14', sample: 'Supporting notes and captions use this size.' },
  { className: 'font-mono text-sm', label: 'Mono · 14', sample: 'resource_id: sample-ledger-001' },
]

export const sampleSteps = [
  { id: 'request', label: 'Request' },
  { id: 'actions', label: 'Proposed actions' },
  { id: 'run', label: 'Run' },
  { id: 'summary', label: 'Summary' },
]

export const sampleActions = [
  {
    title: 'Read a sample document',
    plain: 'The agent asks to open the sample note so it can summarise it.',
    technical: '{\n  "kind": "read",\n  "target": "sample-note-001",\n  "parameters": { "format": "text" }\n}',
  },
  {
    title: 'Write a short summary',
    plain: 'The agent asks to save a three-line summary back to the workspace.',
    technical: '{\n  "kind": "write",\n  "target": "sample-summary-001",\n  "parameters": { "lines": 3 }\n}',
  },
]

export const sampleTimeline = [
  { id: 't1', title: 'Request received', meta: '00:00', description: 'The task was handed to the agent.', tone: 'neutral' as const },
  { id: 't2', title: 'Agent proposed 2 actions', meta: '00:01', description: 'One read and one write.', tone: 'lavender' as const },
  { id: 't3', title: 'Actions checked', meta: '00:02', description: 'Each action was reviewed before it ran.', tone: 'sky' as const },
  { id: 't4', title: 'Summary saved', meta: '00:03', description: 'The task finished successfully.', tone: 'mint' as const },
]

export const sampleBefore = { title: 'Quarterly note', status: 'draft', lines: 12, reviewer: 'unassigned' }
export const sampleAfter = { title: 'Quarterly note', status: 'reviewed', lines: 12, reviewer: 'sample-user' }
