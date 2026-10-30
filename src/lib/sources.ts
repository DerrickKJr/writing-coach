// Files the student uploads for context (class readings, notes, articles).
// Text is pulled out in the browser; nothing leaves the machine.

export type Source = { name: string; text: string }

const MAX_STORED_CHARS = 20000 // per file, keeps localStorage small
const PASSAGE_CHARS = 500

export async function readSource(file: File): Promise<Source> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  const raw = isPdf ? await readPdf(file) : await file.text()
  const text = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_STORED_CHARS)
  if (!text) throw new Error(`Couldn't find any text in ${file.name}. Scanned PDFs aren't supported yet.`)
  return { name: file.name, text }
}

async function readPdf(file: File): Promise<string> {
  // Loaded on demand so the PDF library only downloads when someone uploads a PDF.
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent()
    pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '))
  }
  return pages.join('\n')
}

const words = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9]{4,}/g) ?? [])

// Pick the passages that share the most words with `query`, up to `budget` characters,
// so a small local model gets the relevant parts instead of whole files.
export function relevantExcerpts(sources: Source[], query: string, budget = 2000): string {
  const q = words(query)
  const passages = sources.flatMap((s) => {
    const out: { name: string; text: string; score: number }[] = []
    for (let i = 0; i < s.text.length; i += PASSAGE_CHARS) {
      const text = s.text.slice(i, i + PASSAGE_CHARS)
      let score = 0
      for (const w of words(text)) if (q.has(w)) score++
      out.push({ name: s.name, text, score })
    }
    return out
  })
  passages.sort((a, b) => b.score - a.score)

  const picked: string[] = []
  let used = 0
  for (const p of passages) {
    if (p.score === 0 || used + p.text.length > budget) break
    picked.push(`- From the file "${p.name}": "…${p.text}…"`)
    used += p.text.length
  }
  return picked.join('\n')
}
