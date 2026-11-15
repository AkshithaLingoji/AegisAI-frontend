/**
 * Semantic tones. Meaning is never carried by colour alone — components pair
 * tones with an icon or a text label.
 */
export type Tone = 'neutral' | 'lavender' | 'sky' | 'mint' | 'rose' | 'red' | 'peach'

export const toneText: Record<Tone, string> = {
  neutral: 'text-fg-muted',
  lavender: 'text-lavender',
  sky: 'text-sky',
  mint: 'text-mint',
  rose: 'text-rose',
  red: 'text-red-pale',
  peach: 'text-peach',
}

export const toneSoftBg: Record<Tone, string> = {
  neutral: 'bg-raised',
  lavender: 'bg-lavender/[0.16]',
  sky: 'bg-sky/[0.16]',
  mint: 'bg-mint/[0.16]',
  rose: 'bg-rose/[0.18]',
  red: 'bg-red/[0.16]',
  peach: 'bg-peach/[0.16]',
}

export const toneBorder: Record<Tone, string> = {
  neutral: 'border-line',
  lavender: 'border-lavender/30',
  sky: 'border-sky/30',
  mint: 'border-mint/30',
  rose: 'border-rose/30',
  red: 'border-red/55',
  peach: 'border-peach/30',
}

export const toneDot: Record<Tone, string> = {
  neutral: 'bg-fg-subtle',
  lavender: 'bg-lavender',
  sky: 'bg-sky',
  mint: 'bg-mint',
  rose: 'bg-rose',
  red: 'bg-red',
  peach: 'bg-peach',
}

/** Whole-surface tint for cards and panels: a visible pastel wash on Slate. */
export const toneTint: Record<Tone, string> = {
  neutral: 'border-line bg-surface',
  lavender: 'border-lavender/30 bg-lavender/[0.17]',
  sky: 'border-sky/30 bg-sky/[0.16]',
  mint: 'border-mint/30 bg-mint/[0.16]',
  rose: 'border-rose/45 tint-rose',
  red: 'border-red/55 tint-red',
  peach: 'border-peach/50 tint-peach',
}

/** Icon tile: pastel fill with the matching pastel glyph. */
export const toneTile: Record<Tone, string> = {
  neutral: 'bg-raised text-fg-muted',
  lavender: 'bg-lavender/[0.18] text-lavender',
  sky: 'bg-sky/[0.18] text-sky',
  mint: 'bg-mint/[0.18] text-mint',
  rose: 'bg-rose/[0.26] text-rose',
  red: 'bg-red/[0.26] text-red-pale',
  peach: 'bg-peach/[0.28] text-peach',
}

/** Thin accent bar used to mark a section with its pastel. */
export const toneBar: Record<Tone, string> = {
  neutral: 'bg-line-strong',
  lavender: 'bg-lavender',
  sky: 'bg-sky',
  mint: 'bg-mint',
  rose: 'bg-rose',
  red: 'bg-red',
  peach: 'bg-peach',
}
