// Shows how much of a Gemma draft came from the student's own answers.
// Runs in the browser: a word counts as "yours" if it's a meaningful word you used,
// or part of a two-word phrase you used.

const STOPWORDS = new Set(
  `a an the and or but so if of to in on at by for with from as is are was were be been being it its this that
  these those they them their there he she his her we our you your i me my not no do does did can could will
  would should may might also than then into about because which who what when where how more most very just`.split(/\s+/),
)

const normalize = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '').replace(/'s$/, '')

export type Token = { text: string; yours: boolean }

export function attribute(draft: string, sources: string[]): { tokens: Token[]; percent: number } {
  const sourceWords = sources.join(' ').split(/\s+/).map(normalize).filter(Boolean)
  const vocab = new Set(sourceWords)
  const bigrams = new Set(sourceWords.slice(1).map((w, i) => `${sourceWords[i]} ${w}`))

  const pieces = draft.split(/(\s+)/) // keep whitespace so the text renders unchanged
  const words = pieces.filter((p) => p.trim()).map(normalize)

  let content = 0
  let yoursContent = 0
  let wi = 0
  const tokens = pieces.map((text) => {
    if (!text.trim()) return { text, yours: false }
    const w = words[wi]
    const inPhrase =
      (wi > 0 && bigrams.has(`${words[wi - 1]} ${w}`)) || (wi < words.length - 1 && bigrams.has(`${w} ${words[wi + 1]}`))
    const isContent = w !== '' && !STOPWORDS.has(w)
    const yours = inPhrase || (isContent && vocab.has(w))
    if (isContent) {
      content++
      if (yours) yoursContent++
    }
    wi++
    return { text, yours }
  })

  return { tokens, percent: content ? Math.round((yoursContent / content) * 100) : 0 }
}
