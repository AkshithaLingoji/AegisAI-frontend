import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { useUiStore } from '@/state/uiStore'

afterEach(() => {
  cleanup()
  // Module-level stores outlive a single render. Reset them so an open drawer in
  // one test cannot hide (aria-hidden) the page in the next.
  useUiStore.setState({ mobileNavOpen: false })
})
