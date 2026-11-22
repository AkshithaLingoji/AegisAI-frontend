import { PageHeader } from '@/components/layout/PageHeader'
import { CategoryList } from './components/CategoryList'
import { ConnectionPanel } from './components/ConnectionPanel'
import { LabSections } from './components/LabSections'
import { LAB_SECTIONS } from './data/labSections'
import { PLANNED_CATEGORIES } from './data/plannedCategories'
import './redTeam.css'

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-4">
      <h2 id={id} className="flex items-center gap-3 text-title font-semibold text-fg">
        <span className="rt-heading-mark" aria-hidden />
        {title}
      </h2>
      {children}
    </section>
  )
}

/** Overview only: no scenarios are run here, and no statistic is shown that was not reported by a source. */
export function RedTeamOverviewPage() {
  return (
    <div className="rt-lab space-y-12">
      <PageHeader
        eyebrow="Red-Team Lab"
        title="Red-Team Lab"
        description="A workbench for testing how AI agents hold up against deliberate attacks, using reproducible scenarios and recorded evidence."
      />

      <Section id="rt-status" title="Connection and data">
        <ConnectionPanel />
      </Section>

      <Section id="rt-purpose" title="What it is for">
        <div className="max-w-3xl space-y-4 text-base leading-relaxed text-fg-muted">
          <p>
            The Red-Team Lab will run a library of adversarial scenarios against test agents and tools, evaluate what each attack achieved, and keep the evidence so an
            outcome can be inspected and reproduced.
          </p>
          <p>
            Adversarial testing is needed because an agent that behaves well in ordinary use can still be steered by hostile content or requests. Protections are only
            trustworthy once they have been tried against the things that attack them, and the results written down.
          </p>
          <p data-separate-subsystem className="rt-note">
            The lab is backed by a <strong className="font-semibold text-fg">separate experimental testing subsystem</strong>. This interface only presents what that
            subsystem reports; it does not run attacks or judge outcomes itself.
          </p>
        </div>
      </Section>

      <Section id="rt-categories" title="Categories it is designed to examine">
        <CategoryList categories={PLANNED_CATEGORIES} />
        <p className="text-sm text-fg-subtle">These describe intent. The set is open and will follow whatever the scenario library defines.</p>
      </Section>

      <Section id="rt-sections" title="What is coming">
        <LabSections sections={LAB_SECTIONS} />
      </Section>
    </div>
  )
}
