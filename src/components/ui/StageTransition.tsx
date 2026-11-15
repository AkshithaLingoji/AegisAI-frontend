import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'

/**
 * Fades/slides between stages. Motion is used only to signal that the stage
 * changed; `MotionConfig reducedMotion="user"` (see providers) honours the OS setting.
 */
export function StageTransition({ stageKey, children }: { stageKey: string; children: ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={stageKey}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
