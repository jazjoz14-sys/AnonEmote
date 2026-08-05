/**
 * Emotion check-in taxonomy.
 *
 * A two-step triage: a broad feeling first, then a nuanced word. The broad
 * feeling maps onto one of the six existing emotion planets, so by the end of
 * the check-in the system knows where the user belongs and the user has a
 * clearer name for what they are carrying.
 *
 * Naming a feeling precisely is itself regulating — the nuance step is here for
 * the user's benefit, not just for routing.
 */

export const FEELINGS = [
  {
    id: 'joy',              // → joy planet
    label: 'Light',
    sub: 'Something good happened',
    emoji: '✨',
    color: '#f59e0b',
    nuances: [
      { id: 'grateful',  label: 'Grateful',  prompt: 'What are you thankful for right now?' },
      { id: 'proud',     label: 'Proud',     prompt: 'What did you accomplish that deserves recognition?' },
      { id: 'hopeful',   label: 'Hopeful',   prompt: 'What are you looking forward to?' },
      { id: 'relieved',  label: 'Relieved',  prompt: 'What weight finally lifted off you?' },
      { id: 'loved',     label: 'Cared for', prompt: 'Who made you feel seen lately?' },
      { id: 'excited',   label: 'Excited',   prompt: "What's got your energy up?" },
    ],
  },
  {
    id: 'vent',             // → venting planet
    label: 'Heavy',
    sub: 'I need to let something out',
    emoji: '🌧️',
    color: '#3b82f6',
    nuances: [
      { id: 'frustrated', label: 'Frustrated', prompt: "What keeps getting in your way?" },
      { id: 'burntout',   label: 'Burnt out',  prompt: 'What has been draining you the longest?' },
      { id: 'angry',      label: 'Angry',      prompt: "What happened that wasn't fair?" },
      { id: 'unheard',    label: 'Unheard',    prompt: 'What do you wish someone understood?' },
      { id: 'pressured',  label: 'Pressured',  prompt: "Who or what is expecting too much of you?" },
      { id: 'tired',      label: 'Exhausted',  prompt: 'What would you set down if you could?' },
    ],
  },
  {
    id: 'advice',           // → seek advice planet
    label: 'Unsure',
    sub: 'I need perspective',
    emoji: '🌿',
    color: '#10b981',
    nuances: [
      { id: 'torn',       label: 'Torn',        prompt: 'What decision are you stuck between?' },
      { id: 'lost',       label: 'Lost',        prompt: "What are you trying to figure out?" },
      { id: 'doubting',   label: 'Second-guessing', prompt: 'What choice keeps replaying in your head?' },
      { id: 'stuck',      label: 'Stuck',       prompt: 'What have you already tried?' },
      { id: 'curious',    label: 'Curious',     prompt: 'What would you like other people to weigh in on?' },
      { id: 'conflicted', label: 'Conflicted',  prompt: "What are the two sides pulling at you?" },
    ],
  },
  {
    id: 'grief',            // → grief & loss planet
    label: 'Aching',
    sub: 'Something or someone is gone',
    emoji: '🌑',
    color: '#6366f1',
    nuances: [
      { id: 'grieving',     label: 'Grieving',     prompt: 'Who or what are you missing?' },
      { id: 'lonely',       label: 'Lonely',       prompt: 'When do you feel it most?' },
      { id: 'hurt',         label: 'Hurt',         prompt: 'What happened that still stings?' },
      { id: 'disappointed', label: 'Disappointed', prompt: 'What did you hope for that did not come?' },
      { id: 'empty',        label: 'Empty',        prompt: 'What used to matter that feels distant now?' },
      { id: 'regretful',    label: 'Regretful',    prompt: 'What would you do differently?' },
    ],
  },
  {
    id: 'anxiety',          // → anxiety planet
    label: 'Restless',
    sub: "I can't switch my mind off",
    emoji: '🌀',
    color: '#ec4899',
    nuances: [
      { id: 'worried',    label: 'Worried',     prompt: 'What are you afraid might happen?' },
      { id: 'overwhelmed',label: 'Overwhelmed', prompt: 'What is piling up on you?' },
      { id: 'scared',     label: 'Scared',      prompt: 'What feels out of your control?' },
      { id: 'insecure',   label: 'Insecure',    prompt: 'What are you comparing yourself against?' },
      { id: 'racing',     label: 'Racing',      prompt: 'What thought keeps circling back?' },
      { id: 'dreading',   label: 'Dreading',    prompt: 'What are you putting off facing?' },
    ],
  },
  {
    id: 'neutral',          // → reflections planet
    label: 'Quiet',
    sub: 'Just thinking out loud',
    emoji: '🪐',
    color: '#94a3b8',
    nuances: [
      { id: 'reflective', label: 'Reflective', prompt: 'What has been on your mind?' },
      { id: 'calm',       label: 'Calm',       prompt: 'What does today feel like?' },
      { id: 'numb',       label: 'Numb',       prompt: 'What would you say if you had the words?' },
      { id: 'nostalgic',  label: 'Nostalgic',  prompt: 'What are you remembering?' },
      { id: 'observing',  label: 'Observing',  prompt: 'What did you notice today?' },
      { id: 'unsure',     label: 'Not sure',   prompt: 'Start anywhere — it does not have to make sense.' },
    ],
  },
  {
    id: 'doodle',           // → doodle drift planet
    label: 'Creative',
    sub: 'I want to draw it instead',
    emoji: '🎨',
    color: '#fb923c',
    nuances: [
      { id: 'abstract',  label: 'Abstract',    prompt: 'Let your hand move without thinking.' },
      { id: 'scene',     label: 'A scene',     prompt: 'Draw the place in your mind.' },
      { id: 'emotion',   label: 'The feeling', prompt: 'What shape does it take?' },
      { id: 'character', label: 'A creature',  prompt: 'Give the feeling a body.' },
      { id: 'symbol',    label: 'A symbol',    prompt: 'What image keeps coming back?' },
      { id: 'free',      label: 'Freeform',    prompt: 'No rules — just draw.' },
    ],
  },
]

export const getFeelingById = (id) => FEELINGS.find((f) => f.id === id)

/** Look up the writing prompt for a feeling/nuance pair. */
export function getPrompt(feelingId, nuanceId) {
  const feeling = getFeelingById(feelingId)
  if (!feeling) return null
  return feeling.nuances.find((n) => n.id === nuanceId)?.prompt || null
}
