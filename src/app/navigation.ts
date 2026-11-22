import type { Tone } from '@/components/ui/tones'
import {
  Bot,
  FlaskConical,
  Gauge,
  Route,
  LayoutDashboard,
  Palette,
  ScrollText,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  id: string
  label: string
  icon: LucideIcon
  /** The module's pastel, reused for its icon tile and (later) its page accents. */
  tone: Tone
  /** Route. Only modules that actually exist have one. */
  to?: string
  /** Planned modules are listed (greyed, not linked) so the product map is visible. */
  plannedPhase?: number
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'command-center', label: 'Command Center', icon: LayoutDashboard, tone: 'lavender', to: '/' },
  { id: 'guided-tasks', label: 'Guided Tasks', icon: Route, tone: 'mint', to: '/tasks' },
  { id: 'agent-operations', label: 'Agent Operations', icon: Bot, tone: 'sky', to: '/agents' },
  { id: 'assurance-policy', label: 'Assurance & Policy', icon: ShieldCheck, tone: 'mint', plannedPhase: 4 },
  { id: 'red-team-lab', label: 'Red-Team Lab', icon: FlaskConical, tone: 'rose', to: '/red-team' },
  { id: 'audit-incident', label: 'Audit & Incidents', icon: ScrollText, tone: 'peach', plannedPhase: 6 },
  { id: 'research-benchmark', label: 'Research & Benchmarks', icon: Gauge, tone: 'sky', plannedPhase: 7 },
  { id: 'configuration', label: 'Configuration', icon: Settings, tone: 'neutral', plannedPhase: 8 },
  { id: 'design-system', label: 'Design system', icon: Palette, tone: 'lavender', to: '/design-system' },
]
