/**
 * Allowed reactions — emoji only, no free text.
 *
 * Deliberately empathy-oriented: there is no 👍 or ❤️ "like" equivalent, so
 * reacting expresses support rather than approval or endorsement. This keeps
 * the platform aligned with its goal of removing social performance pressure.
 *
 * Must stay in sync with the CHECK constraint on public.reactions.emoji
 * and ALLOWED_EMOJI in backend/src/routes/reactions.js
 */
export const REACTIONS = [
  { emoji: '🫂', label: 'Sending a hug' },
  { emoji: '💙', label: 'I care' },
  { emoji: '😢', label: 'I feel this too' },
  { emoji: '🌱', label: 'It gets better' },
  { emoji: '✨', label: 'Sending strength' },
]

export const ALLOWED_EMOJI = REACTIONS.map((r) => r.emoji)

/**
 * Report reasons — must match the CHECK constraint on public.reports.reason
 */
export const REPORT_REASONS = [
  { id: 'harassment', label: 'Harassment or bullying' },
  { id: 'hate_speech', label: 'Hate speech' },
  { id: 'self_harm', label: 'Concern for their safety' },
  { id: 'spam', label: 'Spam or off-topic' },
  { id: 'other', label: 'Something else' },
]
