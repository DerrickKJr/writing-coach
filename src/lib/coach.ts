// Everything the coach can do. Each function is one Gemma call with a JSON schema,
// so the UI gets structured data (cards, checklists) instead of free text.

import { chatJSON, type ChatMessage } from './ollama'
import type { Chunk, Draft, SectionSpec } from './essay'
import { relevantExcerpts } from './sources'

// 'coach' never writes essay text. 'assemble' may write a sentence, but only out of the student's own words.
type Mode = 'coach' | 'assemble'

function systemPrompt(draft: Draft, mode: Mode, excerpts: string): string {
  return [
    `You are a friendly writing coach for a ${draft.grade.toLowerCase()} student working on a ${draft.essayType.toLowerCase()} essay.`,
    "Your job is to help the student write their OWN essay. Hard rules:",
    mode === 'coach'
      ? "- Never write sentences, paragraphs or a thesis the student could copy into their essay. Offer directions, questions and feedback instead."
      : "- You may only combine, reorder and tighten the student's OWN words. Never add ideas, reasons, facts or examples the student didn't give.",
    "- When you show an example, it must be about a completely different topic than the student's essay.",
    "- Never invent quotes, statistics, sources or citations. If you mention a fact, it is general knowledge the student must check.",
    `- Use simple, encouraging language a ${draft.grade.toLowerCase()} student understands. Be brief. Plain text only, no markdown.`,
    '',
    `The assignment: ${draft.assignment || '(not given)'}`,
    draft.thesis ? `The student's thesis: ${draft.thesis}` : '',
    excerpts
      ? `\nExcerpts from files the student uploaded. These are real sources: you may use facts from them as evidence and name the file they came from.\n${excerpts}`
      : '',
  ].join('\n')
}

function ask<T>(
  draft: Draft,
  request: string,
  schema: object,
  temperature?: number,
  mode: Mode = 'coach',
  useSources = true,
): Promise<T> {
  // Only the passages that match this request, so the prompt stays small for a local model.
  const query = `${draft.assignment} ${draft.thesis} ${request}`
  const excerpts = useSources ? relevantExcerpts(draft.sources, query) : ''
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt(draft, mode, excerpts) },
    { role: 'user', content: request },
  ]
  return chatJSON<T>(messages, schema, temperature)
}

const stringList = (min: number, max: number) => ({
  type: 'array',
  items: { type: 'string' },
  minItems: min,
  maxItems: max,
})

function avoid(seen: string[]): string {
  return seen.length ? `\nDo NOT repeat or closely resemble any of these, which the student already saw:\n- ${seen.join('\n- ')}` : ''
}

// --- Thesis -----------------------------------------------------------------

export type Angle = { title: string; question: string }

export async function suggestAngles(draft: Draft, seen: string[]): Promise<Angle[]> {
  const res = await ask<{ angles: Angle[] }>(
    draft,
    `The student doesn't know what position or angle to take. Suggest 3 different angles they could take.
Each angle has a short title (under 8 words, NOT a full thesis sentence) and one question that helps the student decide what they believe about it.${avoid(seen)}`,
    {
      type: 'object',
      properties: {
        angles: {
          type: 'array',
          minItems: 3,
          maxItems: 3,
          items: {
            type: 'object',
            properties: { title: { type: 'string' }, question: { type: 'string' } },
            required: ['title', 'question'],
          },
        },
      },
      required: ['angles'],
    },
    0.9,
  )
  return res.angles
}

export type ThesisCheck = { verdict: 'strong' | 'almost' | 'needs work'; strengths: string[]; questions: string[] }

export function checkThesis(draft: Draft): Promise<ThesisCheck> {
  return ask<ThesisCheck>(
    draft,
    `Check the student's thesis: "${draft.thesis}".
A strong thesis is one sentence, takes a clear position someone could disagree with, is specific, and hints at the main points.
Give a verdict, up to 2 strengths, and up to 3 questions that push the student to improve it themselves. Do not rewrite it.`,
    {
      type: 'object',
      properties: {
        verdict: { type: 'string', enum: ['strong', 'almost', 'needs work'] },
        strengths: stringList(0, 2),
        questions: stringList(0, 3),
      },
      required: ['verdict', 'strengths', 'questions'],
    },
    0.3,
  )
}

export type ThesisAnswer = { question: string; answer: string }
export type CombinedThesis = { thesis: string; changes: string[] }

// Fold the student's answers to the check questions back into one thesis sentence.
export function combineThesis(draft: Draft, answers: ThesisAnswer[]): Promise<CombinedThesis> {
  const qa = answers
    .filter((a) => a.answer.trim())
    .map((a) => `Q: ${a.question}\nStudent's answer: ${a.answer}`)
    .join('\n\n')
  return ask<CombinedThesis>(
    draft,
    `The student's current thesis: "${draft.thesis}"
They answered questions about how to make it stronger:

${qa}

Combine their thesis and answers into ONE clear thesis sentence. Keep the student's own words and voice wherever you can.
Only use ideas that appear in their thesis or answers. Don't add anything new.
Also list up to 3 short notes on what you changed and which answer it came from.`,
    {
      type: 'object',
      properties: { thesis: { type: 'string' }, changes: stringList(1, 3) },
      required: ['thesis', 'changes'],
    },
    0.3,
    'assemble',
  )
}

// --- Main points ------------------------------------------------------------

export type PointIdea = { label: string; why: string }

export async function suggestPoints(draft: Draft, seen: string[]): Promise<PointIdea[]> {
  const res = await ask<{ points: PointIdea[] }>(
    draft,
    `Suggest 3 main points (one per body paragraph) that could support the thesis.
Each has a short label (under 10 words, a topic not a sentence) and one sentence on why it supports the thesis.${avoid(seen)}`,
    {
      type: 'object',
      properties: {
        points: {
          type: 'array',
          minItems: 3,
          maxItems: 3,
          items: {
            type: 'object',
            properties: { label: { type: 'string' }, why: { type: 'string' } },
            required: ['label', 'why'],
          },
        },
      },
      required: ['points'],
    },
    0.9,
  )
  return res.points
}

export type ResearchHelp = { background: string[]; searches: string[]; lookFor: string[] }

export function researchHelp(draft: Draft, point: string): Promise<ResearchHelp> {
  return ask<ResearchHelp>(
    draft,
    `The student doesn't know much about this point: "${point}".
Give: up to 4 short background facts from general knowledge (the student will verify them), 3 search queries they could type into a search engine or library catalog, and 3 kinds of evidence to look for (e.g. "a statistic about...").`,
    {
      type: 'object',
      properties: {
        background: stringList(1, 4),
        searches: stringList(3, 3),
        lookFor: stringList(3, 3),
      },
      required: ['background', 'searches', 'lookFor'],
    },
    0.4,
  )
}

// --- Paragraphs -------------------------------------------------------------

export type ChunkAnswer = { question: string; answer: string }
export type ChunkDraft = { needMore: boolean; followUp: string; text: string }

type ChunkRequest = {
  spec: SectionSpec
  chunk: Chunk
  answers: ChunkAnswer[]
  soFar: string // the paragraph written so far, for flow
  notes?: string // the student's research notes for this point
  previous?: string // last draft, when the student said "not quite"
  fix?: string // what the student said was off
  allowGaps?: boolean // student chose "write it anyway": mark missing evidence instead of asking
}

export const GAP_MARKER = '[add your evidence here]'

// Turn the student's answers into a short paragraph. If the answers are too thin to write
// it without inventing anything, ask one follow-up question instead (unless allowGaps).
export function draftChunk(draft: Draft, req: ChunkRequest): Promise<ChunkDraft> {
  const qa = req.answers.map((a) => `Q: ${a.question}\nStudent: ${a.answer}`).join('\n\n')
  const points = draft.points.filter(Boolean)
  const redo = req.previous
    ? `\nYour last draft was:\n"${req.previous}"\nThe student said it's not quite right: "${req.fix}". Redraft it to say what they mean.`
    : ''
  const gaps = req.allowGaps
    ? `Never ask a follow-up. If evidence is missing or vague, write the sentence around it and put ${GAP_MARKER} where the evidence should go. Set needMore to false.`
    : `If an answer is too vague or missing to write this without making things up, set needMore to true, leave text empty,
and put ONE short, friendly question in followUp asking for exactly what's missing. Otherwise set needMore to false and followUp to "".`
  return ask<ChunkDraft>(
    draft,
    `Write the student's ${req.spec.title.toLowerCase()}. Its goal: ${req.spec.goal}
${points.length ? `The student's three main points: ${points.join('; ')}\n` : ''}${req.soFar.trim() ? `What they've written so far:\n"${req.soFar.trim()}"\n` : ''}${req.notes?.trim() ? `Student's research notes:\n"${req.notes.trim()}"\n` : ''}
Their answers:
${qa}
${redo}
Write ${req.chunk.sentences} sentences that cover: ${req.chunk.parts.join(', ')}.
${req.chunk.appendThesis ? "Don't write or repeat the thesis or its reasons. It gets added right after your sentences, so give background that leads into it.\n" : ''}Use ONLY ideas, facts and examples from the student's thesis, main points, answers, notes and uploaded files, and keep their wording wherever you can.
Write simply, the way a ${draft.grade.toLowerCase()} student would, and make it read smoothly without repeating phrases. Evidence must come from what they gave you. Never invent statistics, quotes, studies or sources.
${gaps}`,
    {
      type: 'object',
      properties: { needMore: { type: 'boolean' }, followUp: { type: 'string' }, text: { type: 'string' } },
      required: ['needMore', 'followUp', 'text'],
    },
    0.4,
    'assemble',
  )
}

export type PartStatus = { part: string; status: 'done' | 'weak' | 'missing'; note: string }
export type ParagraphFeedback = { parts: PartStatus[]; strengths: string[]; nextSteps: string[] }
export type Revision = { text: string; changes: string[] }

// Revise a paragraph using the feedback it got and the student's reply to that feedback.
export function reviseParagraph(
  draft: Draft,
  spec: SectionSpec,
  text: string,
  feedback: ParagraphFeedback,
  reply: string,
  notes?: string,
): Promise<Revision> {
  const fb = [
    ...feedback.parts.filter((p) => p.status !== 'done').map((p) => `${p.part} (${p.status}): ${p.note}`),
    ...feedback.nextSteps.map((s) => `Next step: ${s}`),
  ].join('\n')
  return ask<Revision>(
    draft,
    `The student's ${spec.title.toLowerCase()}:
"""
${text}
"""
Feedback they got:
${fb}
${notes?.trim() ? `\nTheir research notes:\n"${notes.trim()}"\n` : ''}
The student's reply to the feedback, in their own words:
"${reply}"

Revise the paragraph to address the feedback using the student's reply. Keep every sentence that was fine as it is.
Use ONLY ideas from their paragraph, reply, notes and uploaded files, and keep their wording wherever you can. Make it read smoothly.
Never invent statistics, quotes or sources. If evidence is still missing, put ${GAP_MARKER} where it should go.
Also list up to 3 short notes on what you changed.`,
    {
      type: 'object',
      properties: { text: { type: 'string' }, changes: stringList(1, 3) },
      required: ['text', 'changes'],
    },
    0.3,
    'assemble',
  )
}

export function paragraphFeedback(draft: Draft, spec: SectionSpec, text: string): Promise<ParagraphFeedback> {
  return ask<ParagraphFeedback>(
    draft,
    `Give feedback on the student's ${spec.title.toLowerCase()}. Its goal: ${spec.goal}
It should contain these parts: ${spec.parts.map((p) => p.label).join(', ')}.

Student's paragraph:
"""
${text}
"""

For every part, say if it's done, weak or missing, with a short note. Then up to 2 strengths and up to 3 next steps.
Next steps are questions or instructions for the student. Never write replacement sentences for them.`,
    {
      type: 'object',
      properties: {
        parts: {
          type: 'array',
          minItems: spec.parts.length,
          maxItems: spec.parts.length,
          items: {
            type: 'object',
            properties: {
              part: { type: 'string', enum: spec.parts.map((p) => p.label) },
              status: { type: 'string', enum: ['done', 'weak', 'missing'] },
              note: { type: 'string' },
            },
            required: ['part', 'status', 'note'],
          },
        },
        strengths: stringList(0, 2),
        nextSteps: stringList(1, 3),
      },
      required: ['parts', 'strengths', 'nextSteps'],
    },
    0.3,
  )
}

const EXAMPLE_TOPICS = [
  'why cities should plant more trees',
  'whether school should start later in the morning',
  'why learning to cook is an important life skill',
  'how video games can teach problem solving',
  'why public libraries still matter',
  'whether pets make people healthier',
]

export type ExampleParagraph = { topic: string; sentences: { part: string; text: string }[] }

export function exampleParagraph(draft: Draft, spec: SectionSpec): Promise<ExampleParagraph> {
  const haystack = `${draft.assignment} ${draft.thesis}`.toLowerCase()
  const choices = EXAMPLE_TOPICS.filter((t) => !t.split(' ').some((w) => w.length > 5 && haystack.includes(w)))
  const topic = choices[Math.floor(Math.random() * choices.length)] ?? EXAMPLE_TOPICS[0]
  return ask<ExampleParagraph>(
    draft,
    `Write a short model ${spec.title.toLowerCase()} about "${topic}" (NOT about the student's topic) to show the structure.
Label each sentence with the part it plays: ${spec.parts.map((p) => p.label).join(', ')}. Return the topic you used.`,
    {
      type: 'object',
      properties: {
        topic: { type: 'string' },
        sentences: {
          type: 'array',
          items: {
            type: 'object',
            properties: { part: { type: 'string', enum: spec.parts.map((p) => p.label) }, text: { type: 'string' } },
            required: ['part', 'text'],
          },
        },
      },
      required: ['topic', 'sentences'],
    },
    0.7,
    'coach',
    false,
  )
}

// --- Whole essay ------------------------------------------------------------

export type Review = {
  overall: string
  strengths: string[]
  priorities: string[]
  rubric: { criterion: string; score: number; note: string }[]
}

export function reviewEssay(draft: Draft, essay: string): Promise<Review> {
  return ask<Review>(
    draft,
    `Review the student's full essay below.
"""
${essay}
"""
Give a 1-2 sentence overall impression, up to 3 strengths, the top 3 things to fix first (as instructions or questions, never rewritten text),
and score it 1-4 on: Thesis, Organization, Evidence, Explanation, Clarity & grammar.`,
    {
      type: 'object',
      properties: {
        overall: { type: 'string' },
        strengths: stringList(1, 3),
        priorities: stringList(1, 3),
        rubric: {
          type: 'array',
          minItems: 5,
          maxItems: 5,
          items: {
            type: 'object',
            properties: {
              criterion: { type: 'string', enum: ['Thesis', 'Organization', 'Evidence', 'Explanation', 'Clarity & grammar'] },
              score: { type: 'integer', minimum: 1, maximum: 4 },
              note: { type: 'string' },
            },
            required: ['criterion', 'score', 'note'],
          },
        },
      },
      required: ['overall', 'strengths', 'priorities', 'rubric'],
    },
    0.3,
  )
}
