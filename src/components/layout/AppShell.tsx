import { Outlet } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { Menu, X } from 'lucide-react'
import { LogoMark } from '@/components/brand/Logo'
import { SimulationBanner } from '@/components/evidence/SimulationBanner'
import { SourceBadge } from '@/components/evidence/SourceBadge'
import { Sidebar } from '@/components/layout/Sidebar'
import { useUiStore } from '@/state/uiStore'

export function AppShell() {
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen)
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen)

  return (
    <div className="min-h-screen lg:pl-80">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-lavender focus:px-4 focus:py-2 focus:text-midnight"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-80 border-r border-line bg-surface lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      <Dialog.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="drawer-overlay fixed inset-0 z-40 bg-midnight/70 lg:hidden" />
          <Dialog.Content
            aria-describedby={undefined}
            className="drawer-panel fixed inset-y-0 left-0 z-50 w-[85vw] max-w-80 border-r border-line bg-surface lg:hidden"
          >
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Dialog.Close
              aria-label="Close navigation"
              className="absolute right-3 top-4 flex size-11 items-center justify-center rounded-xl text-fg-muted hover:bg-raised hover:text-fg"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
            <Sidebar onNavigate={() => setMobileNavOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <header className="sticky top-0 z-20 border-b border-line bg-midnight/85 backdrop-blur-sm">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setMobileNavOpen(true)}
              className="flex size-11 items-center justify-center rounded-xl text-fg-muted hover:bg-raised hover:text-fg"
            >
              <Menu className="size-5" aria-hidden />
            </button>
            <LogoMark className="size-7" />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs font-medium uppercase tracking-wider text-fg-subtle sm:inline">
              Data source
            </span>
            <SourceBadge />
          </div>
        </div>
        <SimulationBanner />
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
        <Outlet />
      </main>
    </div>
  )
}
