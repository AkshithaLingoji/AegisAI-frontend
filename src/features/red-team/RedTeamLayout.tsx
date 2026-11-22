import { Link, Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'
import './redTeam.css'

const PAGES = [
  { to: '/red-team', label: 'Overview', active: (p: string) => p === '/red-team' },
  { to: '/red-team/scenarios', label: 'Scenario Catalogue', active: (p: string) => p.startsWith('/red-team/scenarios') },
  { to: '/red-team/configure', label: 'Configure Experiment', active: (p: string) => p === '/red-team/configure' || p === '/red-team/review' },
]

/** Wraps every Red-Team page in the page-scoped dark theme (see redTeam.css). Nothing else is themed. */
export function RedTeamLayout() {
  const { pathname } = useLocation()
  return (
    <div className="rt-lab space-y-8">
      <nav aria-label="Red-Team Lab pages" className="rt-subnav">
        <ul className="flex flex-wrap gap-2">
          {PAGES.map((p) => (
            <li key={p.to}>
              <Link to={p.to} aria-current={p.active(pathname) ? 'page' : undefined} className={cn('rt-subnav-link', p.active(pathname) && 'rt-subnav-link-active')}>
                {p.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  )
}
