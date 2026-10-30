// The essay "genre template": what sections exist and what each one needs.
// A lab report will be another template with the same shape.

export type Part = { id: string; label: string; question: string }

// A paragraph is built a few sentences at a time. Each chunk asks the student a couple of
// questions, then Gemma turns their answers into 2-3 sentences covering `parts`.
export type Chunk = {
  id: string
  label: string
  parts: string[] // Part labels this chunk covers
  questions: string[]
  appendThesis?: boolean // drop the student's thesis in after this chunk (intro)
}

export type SectionSpec = {
  id: string
  title: string
  goal: string
  parts: Part[]
  chunks: Chunk[]
}

export const ESSAY_TYPES = ['Argumentative', 'Expository', 'Compare & contrast', 'Cause & effect'] as const
export const GRADE_LEVELS = ['Middle school', 'High school', 'College'] as const

export const BODY_PARTS: Part[] = [
  { id: 'topic', label: 'Topic sentence', question: "What's this paragraph's one main idea, and how does it support your thesis?" },
  { id: 'evidence', label: 'Evidence', question: 'What fact, example, quote or data backs it up? Where did you find it?' },
  { id: 'explain', label: 'Explanation', question: 'Why does that evidence prove your point? Say it in your own words.' },
  { id: 'link', label: 'Link back', question: 'How does this tie back to your thesis or lead into the next paragraph?' },
]

export const INTRO: SectionSpec = {
  id: 'intro',
  title: 'Introduction',
  goal: 'Pull the reader in, give them the background they need, and end with your thesis.',
  parts: [
    { id: 'hook', label: 'Hook', question: 'What surprising fact, question or short story would make someone want to keep reading?' },
    { id: 'context', label: 'Background', question: 'What does the reader need to know before your argument makes sense?' },
    { id: 'thesis', label: 'Thesis', question: 'Your thesis goes here, usually as the last sentence.' },
  ],
  chunks: [
    {
      id: 'opening',
      label: 'Hook + background',
      parts: ['Hook', 'Background'],
      questions: [
        'What surprising fact, question or moment could grab a reader?',
        'What does the reader need to know about this topic before your argument makes sense?',
      ],
      appendThesis: true,
    },
  ],
}

export const CONCLUSION: SectionSpec = {
  id: 'conclusion',
  title: 'Conclusion',
  goal: 'Remind the reader what you proved and why it matters, without just repeating yourself.',
  parts: [
    { id: 'restate', label: 'Restate thesis', question: 'How can you say your thesis again using different words?' },
    { id: 'summary', label: 'Sum up', question: 'What did each of your three points show?' },
    { id: 'sowhat', label: 'So what?', question: 'Why should the reader care? What should they think or do now?' },
  ],
  chunks: [
    {
      id: 'wrap',
      label: 'Restate + sum up',
      parts: ['Restate thesis', 'Sum up'],
      questions: [
        'In different words than before, what did your essay prove?',
        'In a few words each, what did your three points show?',
      ],
    },
    {
      id: 'sowhat',
      label: 'So what?',
      parts: ['So what?'],
      questions: ['Why should the reader care? What should they think or do now?'],
    },
  ],
}

const BODY_CHUNKS: Chunk[] = [
  {
    id: 'proof',
    label: 'Point + proof',
    parts: ['Topic sentence', 'Evidence'],
    questions: [
      "In your own words, what's this paragraph's main idea?",
      "What's your evidence? A fact, example or quote, and where it's from (check your research notes).",
    ],
  },
  {
    id: 'why',
    label: 'Why it matters',
    parts: ['Explanation', 'Link back'],
    questions: [
      'Why does that evidence prove your point?',
      'How does this connect back to your thesis?',
    ],
  },
]

export function bodySpec(index: number, point: string): SectionSpec {
  return {
    id: `body-${index}`,
    title: `Body paragraph ${index + 1}`,
    goal: `Prove this point: “${point || 'your point'}”`,
    parts: BODY_PARTS,
    chunks: BODY_CHUNKS,
  }
}

export type Draft = {
  assignment: string
  essayType: string
  grade: string
  thesis: string
  points: string[]
  notes: string[]
  sections: Record<string, string>
  chunkProgress: Record<string, number> // section id -> how many chunks are done
}

export const EMPTY_DRAFT: Draft = {
  assignment: '',
  essayType: ESSAY_TYPES[0],
  grade: GRADE_LEVELS[1],
  thesis: '',
  points: ['', '', ''],
  notes: ['', '', ''],
  sections: {},
  chunkProgress: {},
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

export function assemble(draft: Draft): string {
  const order = ['intro', 'body-0', 'body-1', 'body-2', 'conclusion']
  return order
    .map((id) => draft.sections[id]?.trim())
    .filter(Boolean)
    .join('\n\n')
}
