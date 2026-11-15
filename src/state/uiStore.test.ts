import { describe, expect, it } from 'vitest'
import { useUiStore } from './uiStore'

describe('uiStore', () => {
  it('toggles the mobile navigation', () => {
    expect(useUiStore.getState().mobileNavOpen).toBe(false)
    useUiStore.getState().setMobileNavOpen(true)
    expect(useUiStore.getState().mobileNavOpen).toBe(true)
    useUiStore.getState().setMobileNavOpen(false)
    expect(useUiStore.getState().mobileNavOpen).toBe(false)
  })
})
