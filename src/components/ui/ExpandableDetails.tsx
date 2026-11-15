import type { ReactNode } from 'react'
import * as Collapsible from '@radix-ui/react-collapsible'
import { ChevronDown } from 'lucide-react'

export interface ExpandableDetailsProps {
  summary?: string
  defaultOpen?: boolean
  children: ReactNode
}

/** Progressive disclosure for technical detail; plain-language content stays outside it. */
export function ExpandableDetails({
  summary = 'Technical details',
  defaultOpen = false,
  children,
}: ExpandableDetailsProps) {
  return (
    <Collapsible.Root defaultOpen={defaultOpen} className="rounded-2xl border border-line bg-raised/60">
      <Collapsible.Trigger className="group flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-5 text-sm font-medium text-fg-muted transition-colors hover:text-fg">
        {summary}
        <ChevronDown
          className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180"
          aria-hidden
        />
      </Collapsible.Trigger>
      <Collapsible.Content className="collapsible-content overflow-hidden">
        <div className="border-t border-line px-5 py-4 text-sm text-fg-muted">{children}</div>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}
