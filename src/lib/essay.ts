// The essay "genre template": what sections exist and what each one needs.
// A lab report will be another template with the same shape.

export type Part = { id: string; label: string; question: string }

export type Question = {
  text: string
  placeholder: string
  prefill?: 'point' | 'notes' // start the box with the student's main point or research notes
}

// A paragraph is drafted from a few short answers. Gemma turns them into `sentences`
// sentences covering `parts`, using the thesis and main points the student already wrote.
export type Chunk = {
  id: string
  label: string
  button: string
  sentences: string
  parts: string[] // Part labels this chunk covers
  questions: Question[]
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
      label: 'Introduction',
      button: 'Write my intro',
      sentences: '2-3',
      parts: ['Hook', 'Background'],
      questions: [
        {
          text: 'What would grab a reader’s attention?',
          placeholder: 'e.g. Most kids at my school check their phone like 50 times a day',
        },
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
      label: 'Conclusion',
      button: 'Write my conclusion',
      sentences: '3-4',
      parts: ['Restate thesis', 'Sum up', 'So what?'],
      questions: [
        {
          text: 'Why should anyone care?',
          placeholder: 'e.g. Schools that ban phones could help kids get better grades',
        },
      ],
    },
  ],
}

const BODY_CHUNKS: Chunk[] = [
  {
    id: 'paragraph',
    label: 'Your paragraph',
    button: 'Write my paragraph',
    sentences: '4-5',
    parts: ['Topic sentence', 'Evidence', 'Explanation', 'Link back'],
    questions: [
      { text: 'What’s this paragraph about?', placeholder: 'Your main point', prefill: 'point' },
      {
        text: 'What’s your proof?',
        placeholder: 'e.g. My teacher said grades went up after the phone ban',
        prefill: 'notes',
      },
      { text: 'Why does that matter?', placeholder: 'e.g. Kids learn more when they’re not distracted' },
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
