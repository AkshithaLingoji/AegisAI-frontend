import { describe, expect, it } from 'vitest'
import { DECISION_COPY } from '@/features/assurance/decisions'
import { toneBar, toneBorder, toneDot, toneSoftBg, toneText, toneTile, toneTint } from './tones'

describe('semantic status red', () => {
  it('DENY is red; ALLOW, REQUIRE_APPROVAL and DEFER are not', () => {
    expect(DECISION_COPY.DENY.tone).toBe('red')
    expect(DECISION_COPY.ALLOW.tone).toBe('mint')
    expect(DECISION_COPY.REQUIRE_APPROVAL.tone).not.toBe('red')
    expect(DECISION_COPY.DEFER.tone).not.toBe('red')
  })

  it('has a complete red tone that uses the red tokens, not dusty rose', () => {
    for (const map of [toneText, toneSoftBg, toneBorder, toneDot, toneTint, toneTile, toneBar]) {
      expect(map.red).toMatch(/red/)
      expect(map.red).not.toMatch(/rose/)
    }
  })

  it('keeps dusty rose as its own tone', () => {
    expect(toneDot.rose).toBe('bg-rose')
  })
})
