import { LoaderCircle } from 'lucide-react'
import { StatePanel } from '@/components/ui'
import { NotConnectedError, RedTeamServiceError } from '@/services'

/** Loading state shared by the catalogue and the detail page. */
export function LibraryLoading({ title }: { title: string }) {
  return <StatePanel variant="loading" title={title} className="py-10" />
}

/** Distinguishes "backend not connected" from every other failure; never substitutes data. */
export function LibraryError({ error, subject, onRetry }: { error: Error; subject: string; onRetry?: () => void }) {
  if (error instanceof NotConnectedError) {
    return (
      <div data-catalogue-state="backend-unavailable">
        <StatePanel
          variant="error"
          title={`${subject} is unavailable: the backend is not connected`}
          description={`${error.message} Nothing is substituted: no demonstration data is shown while the backend source is selected.`}
          className="py-10"
        />
      </div>
    )
  }
  const issues = error instanceof RedTeamServiceError ? error.issues : []
  return (
    <div data-catalogue-state="error">
      <StatePanel
        variant="error"
        title={`${subject} couldn't be loaded`}
        description={
          <>
            {error.message}
            {issues.length > 0 && (
              <span className="mt-2 block text-left">
                {issues.map((i) => (
                  <span key={i} className="block font-mono text-xs">{i}</span>
                ))}
              </span>
            )}
          </>
        }
        action={
          onRetry && (
            <button type="button" onClick={onRetry} className="rt-chip">
              <LoaderCircle className="size-4" aria-hidden /> Try again
            </button>
          )
        }
        className="py-10"
      />
    </div>
  )
}
