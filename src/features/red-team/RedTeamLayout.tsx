import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/cn'
import './redTeam.css'

const PAGES = [
  { to: '/red-team', label: 'Overview', end: true },
  { to: '/red-team/scenarios', label: 'Scenario Catalogue', end: false },
]

/** Wraps every Red-Team page in the page-scoped dark theme (see redTeam.css). Nothing else is themed. */
export function RedTeamLayout() {
  return (
    <div className="rt-lab space-y-8">
      <nav aria-label="Red-Team Lab pages" className="rt-subnav">
        <ul className="flex flex-wrap gap-2">
          {PAGES.map((p) => (
            <li key={p.to}>
              <NavLink to={p.to} end={p.end} className={({ isActive }) => cn('rt-subnav-link', isActive && 'rt-subnav-link-active')}>
                {p.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  )
}
