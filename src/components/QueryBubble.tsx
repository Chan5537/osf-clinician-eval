interface Props {
  queryText: string
}

// The query, rendered as a chat message from the person asking — NOT as a form field and NOT as a
// markdown blockquote.
//
// Three things carry "this is the patient speaking, verbatim":
//   1. a purple "Patient Query" pill instead of a single-letter avatar — the speaker is named, not
//      abbreviated, so nothing has to be decoded;
//   2. a real speech-bubble tail pointing back at that pill (a rotated square borrowing the
//      bubble's own border + fill, so it stays correct in either theme);
//   3. curly quotes + italic, which mark the text as quoted speech rather than UI copy.
//
// `items-stretch` on the row makes the pill exactly as tall as the bubble, so the two read as one
// paired unit rather than a small tag floating beside a big box. The bubble sets the height; the
// pill follows it, including when a long query wraps.
// The object of the ask gets weight (owner 2026-08-29): raters skimmed the query and answered a
// different question ("what is wrong with this patient now"). The phrase is emphasized at render
// time so the data stays the verbatim query; a batch whose query drops the phrase renders plain.
function emphasizeAsk(text: string) {
  const phrase = 'new health conditions'
  const i = text.indexOf(phrase)
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <strong className="font-semibold not-italic">{phrase}</strong>
      {text.slice(i + phrase.length)}
    </>
  )
}

export function QueryBubble({ queryText }: Props) {
  return (
    <div className="flex items-stretch gap-3">
      <span className="flex shrink-0 items-center justify-center rounded-full border border-purple-300 bg-purple-100 px-5 text-base font-semibold text-purple-800">
        Patient Query
      </span>
      <div className="relative min-w-0 rounded-lg border border-purple-200 bg-purple-50 px-4 py-3">
        {/* Speech tail: a square rotated 45°, showing only its bottom+left edges so the corner
            reads as a point aimed at the pill. Half of it hangs outside the bubble. */}
        <span
          aria-hidden="true"
          className="absolute -left-1.5 top-4 size-3 rotate-45 border-b border-l border-purple-200 bg-purple-50"
        />
        <p className="text-[15px] italic leading-relaxed text-purple-950">
          &ldquo;{emphasizeAsk(queryText)}&rdquo;
        </p>
      </div>
    </div>
  )
}
