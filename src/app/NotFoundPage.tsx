import { Link } from 'react-router-dom'
import { buttonClasses, StatePanel } from '@/components/ui'

export function NotFoundPage() {
  return (
    <StatePanel
      variant="empty"
      title="This page doesn't exist"
      description="The address may be wrong, or the module hasn't been built yet."
      action={
        <Link to="/" className={buttonClasses('secondary')}>
          Back to start
        </Link>
      }
    />
  )
}
