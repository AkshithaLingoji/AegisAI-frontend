import { useEffect, useRef, type ReactNode } from 'react'

/** Each step announces itself and takes focus, so keyboard and screen-reader users land at the start of the new step. */
export function StepHeading({ title, description }: { title: string; description?: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    ref.current?.focus({ preventScroll: false })
  }, [])
  return (
    <div className="space-y-2">
      <h2 ref={ref} tabIndex={-1} className="text-title font-semibold text-fg outline-none">
        {title}
      </h2>
      {description && <p className="max-w-3xl text-base leading-relaxed text-fg-muted">{description}</p>}
    </div>
  )
}
