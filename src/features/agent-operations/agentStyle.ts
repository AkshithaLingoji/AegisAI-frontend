import { Landmark, Stethoscope, type LucideIcon } from 'lucide-react'
import type { Agent } from '@/domain'
import type { Tone } from '@/components/ui'

export interface AgentStyle {
  tone: Tone
  Icon: LucideIcon
  /** Plain-language names for the two groups of resources. */
  permittedHeading: string
  restrictedHeading: string
  domainLabel: string
}

/** Each agent keeps its own pastel and icon wherever it appears; names and icons also tell them apart. */
export function agentStyle(agent: Agent): AgentStyle {
  if (agent.domain === 'health') {
    return {
      tone: 'lavender',
      Icon: Stethoscope,
      permittedHeading: 'Authorized records',
      restrictedHeading: 'Restricted records',
      domainLabel: 'Health',
    }
  }
  return {
    tone: 'sky',
    Icon: Landmark,
    permittedHeading: 'Resources the user may use',
    restrictedHeading: 'Restricted resources',
    domainLabel: String(agent.domain) === 'finance' ? 'Finance' : String(agent.domain),
  }
}

export const agentPath = (id: string) => `/agents/${encodeURIComponent(id)}`
