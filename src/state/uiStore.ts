import { create } from 'zustand'

interface UiState {
  mobileNavOpen: boolean
  setMobileNavOpen: (open: boolean) => void
}

/** UI-only state. Server/domain data lives behind services + TanStack Query, never here. */
export const useUiStore = create<UiState>((set) => ({
  mobileNavOpen: false,
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
}))
