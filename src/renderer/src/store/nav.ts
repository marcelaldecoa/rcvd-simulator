/**
 * Cross-lab navigation.
 *
 * The dashboard's whole point is that a measurement is only useful once you
 * know which piece of theory it belongs to, so every widget carries a link to
 * the chapter that explains it. That link has to reach the shell, which owns
 * which chapter is open.
 *
 * A one-shot request rather than a piece of shared state: the shell consumes it
 * and clears it. Storing "the current lab" here instead would give two owners
 * for the same fact -- this store and the shell's own selection -- and they
 * would drift the first time a user clicked the sidebar.
 */

import { create } from 'zustand'
import type { LabId } from '../data/chapters'

interface NavState {
  /** A lab the user asked to jump to. Null when there is nothing pending. */
  request: LabId | null
  goToLab: (id: LabId) => void
  consume: () => void
}

export const useNav = create<NavState>((set) => ({
  request: null,
  goToLab: (id) => set({ request: id }),
  consume: () => set({ request: null })
}))
