import { ArrowRight, Download } from 'lucide-react'
import { ConditionBadge, CONDITION_COPY, type Condition } from '@/components/evidence/ConditionBadge'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Badge,
  Button,
  Card,
  DiffView,
  ExpandableDetails,
  SideBySide,
  StatePanel,
  Timeline,
  toneDot,
  toneTile,
} from '@/components/ui'
import { Section } from '@/components/layout/Section'
import { ServiceLayerPanel } from './ServiceLayerPanel'
import { WorkspaceSample } from './WorkspaceSample'
import {
  brandPalette,
  sampleAfter,
  sampleBefore,
  sampleTimeline,
  tintedSurfaces,
  typeSamples,
} from './showcaseData'

const conditions: Condition[] = ['baseline', 'protected']

export function DesignSystemPage() {
  return (
    <div className="space-y-16">
      <Card tint="lavender" padding="lg" className="relative overflow-hidden sm:p-10">
        {/* Decorative pastel motif — purely visual. */}
        <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 hidden size-64 sm:block">
          <span className="absolute right-24 top-14 size-28 rounded-full bg-lavender/30" />
          <span className="absolute right-6 top-8 size-20 rounded-full bg-sky/30" />
          <span className="absolute right-12 top-32 size-24 rounded-full bg-mint/25" />
          <span className="absolute right-36 top-36 size-12 rounded-full bg-rose/35" />
          <span className="absolute right-2 top-28 size-10 rounded-full bg-peach/40" />
        </div>
        <PageHeader
          eyebrow="Phase 1 · Foundation"
          title="Design system"
          description="The building blocks every AegisAI screen is made from. Everything on this page is sample content for the component gallery — it is not AegisAI data."
        />
      </Card>

      <Section
        id="service-layer"
        tone="sky"
        title="Data & integration"
        description="The app is ready to connect to the AegisAI backend later without changing any screen."
      >
        <ServiceLayerPanel />
      </Section>

      <Section
        id="colour"
        title="Colour"
        tone="lavender"
        description="Eight colours, used with intent. Midnight is only the backdrop; most content sits on Slate, and pastel washes of the accents give each area its own character."
      >
        <ul aria-label="Brand palette" className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {brandPalette.map((c) => (
            <li key={c.name} className="overflow-hidden rounded-3xl border border-line-strong">
              <div className={`${c.className} ${c.textClass} flex h-24 items-end px-4 pb-3 font-mono text-xs font-medium`}>
                {c.hex}
              </div>
              <div className="space-y-0.5 bg-surface px-4 py-3">
                <p className="text-sm font-semibold text-fg">{c.name}</p>
                <p className="text-xs leading-snug text-fg-muted">{c.role}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="space-y-3">
          <h3 className="text-heading font-semibold text-fg">Tinted surfaces</h3>
          <p className="max-w-3xl text-sm leading-relaxed text-fg-muted">
            A soft wash of an accent over Slate gives a card its category at a glance, with no loud colour.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tintedSurfaces.map((t) => (
            <Card key={t.tone} tint={t.tone} className="space-y-3">
              <span className={`inline-flex size-10 items-center justify-center rounded-2xl ${toneTile[t.tone]}`} aria-hidden>
                <span className={`size-3 rounded-full ${toneDot[t.tone]}`} />
              </span>
              <p className="font-semibold text-fg">{t.title}</p>
              <p className="text-sm leading-relaxed text-fg-muted">{t.note}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="type"
        tone="peach" title="Typography" description="Inter for interface text; JetBrains Mono for identifiers, payloads and evidence.">
        <Card padding="lg" className="divide-y divide-line">
          {typeSamples.map((t) => (
            <div key={t.label} className="grid gap-1 py-5 first:pt-0 last:pb-0 sm:grid-cols-[10rem_1fr] sm:items-baseline sm:gap-6">
              <span className="text-xs font-medium uppercase tracking-wider text-fg-subtle">{t.label}</span>
              <span className={t.className}>{t.sample}</span>
            </div>
          ))}
        </Card>
      </Section>

      <Section id="actions"
        tone="lavender" title="Buttons & badges" description="One primary action per screen, always in the same place. Large touch targets.">
        <Card padding="lg" className="space-y-8">
          <div className="flex flex-wrap items-center gap-4">
            <Button size="lg" trailingIcon={<ArrowRight className="size-4" aria-hidden />}>Primary action</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button loading>Loading</Button>
            <Button variant="secondary" disabled leadingIcon={<Download className="size-4" aria-hidden />}>Disabled</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="neutral">Neutral</Badge>
            <Badge tone="lavender">Lavender</Badge>
            <Badge tone="sky">Sky</Badge>
            <Badge tone="mint">Mint</Badge>
            <Badge tone="rose">Rose</Badge>
            <Badge tone="peach">Amber</Badge>
          </div>
        </Card>
      </Section>

      <Section id="states"
        tone="mint" title="States" description="Loading, empty, success, denied and error all share one treatment so users always know what happened.">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <StatePanel variant="loading" title="Loading" description="Say what is happening, not just “Loading”." />
          <StatePanel variant="empty" title="Nothing here yet" description="Explain why, and what to do next." />
          <StatePanel variant="success" title="Success" description="The action completed as expected." />
          <StatePanel variant="denied" title="Denied" description="A protection stopped the action. This is an expected outcome, not a malfunction." />
          <StatePanel variant="error" title="Something went wrong" description="Say what failed and what can be done about it." />
        </div>
      </Section>

      <Section
        id="workspace"
        tone="lavender"
        title="Guided workspace"
        description="The pattern the four Red-Team demonstrations will use. Try it: it is fully interactive, and completed steps can be revisited."
      >
        <WorkspaceSample />
      </Section>

      <Section id="timeline"
        tone="sky" title="Execution timeline" description="Each event reads as a plain sentence first; technical detail stays one click away.">
        <Card padding="lg" className="space-y-6">
          <Timeline items={sampleTimeline} label="Sample execution timeline" />
          <ExpandableDetails>
            <p>Timeline items can link to the proposal, policy decision, gateway result or resource they refer to.</p>
          </ExpandableDetails>
        </Card>
      </Section>

      <Section id="diff"
        tone="peach" title="Before & after" description="Resource states are compared field by field. Changed fields are labelled in text as well as colour.">
        <DiffView title="Sample record" before={sampleBefore} after={sampleAfter} />
      </Section>

      <Section
        id="comparison"
        tone="sky"
        title="Baseline vs Protected"
        description="Both conditions always start from the same data and the same attack payload, and are shown side by side."
      >
        <SideBySide
          left={{
            label: CONDITION_COPY.baseline.name,
            tint: 'neutral',
            badge: <ConditionBadge condition="baseline" />,
            children: <p className="text-sm leading-relaxed text-fg-muted">{CONDITION_COPY.baseline.summary}</p>,
          }}
          right={{
            label: CONDITION_COPY.protected.name,
            tint: 'sky',
            badge: <ConditionBadge condition="protected" />,
            children: <p className="text-sm leading-relaxed text-fg-muted">{CONDITION_COPY.protected.summary}</p>,
          }}
        />
        <div className="flex flex-wrap items-center gap-3 text-sm text-fg-subtle">
          Identity badges:
          {conditions.map((c) => (
            <ConditionBadge key={c} condition={c} />
          ))}
          <span>Different icon, label and style — never colour alone.</span>
        </div>
      </Section>
    </div>
  )
}
