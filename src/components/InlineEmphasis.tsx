import { Fragment } from 'react'

// Renders `**bolded**` spans inside a short plain-text string as real <strong> elements.
//
// WHY NOT `Markdown`/ReactMarkdown (Chan, 2026-08-25): the rubric's scoring guides and worked
// examples quote real letters, so they carry the same `**Condition Name**` markers the letters
// use. Left unrendered those show as literal asterisks, which is what the rater currently sees.
// The existing <Markdown> component would fix that but is built for whole letters — it wraps
// output in block <p>/<ul> elements, pulls in remark-gfm, runs figure-caption detection and an
// image lightbox, and would re-flow a tooltip line into a paragraph. This does the one thing
// needed, inline, with no dependencies.
//
// DELIBERATELY NOT A MARKDOWN PARSER. Only `**bold**` is honoured. Underscores, backticks,
// links and lists are passed through as written, because the strings this renders are quotes
// FROM clinical letters: an underscore or a bracket inside a condition name must survive
// verbatim, and silently reinterpreting one as formatting would misquote the letter the rater
// is being asked to score.
//
// Unmatched `**` is left as literal text rather than swallowed, so a typo in the rubric config
// is visible instead of silently eating the rest of the sentence.
export function InlineEmphasis({ text }: { text: string }) {
  // Split on paired ** … ** ; capture group => the emphasised run. `[\s\S]` so a quote that
  // wraps across a line in the source still matches. Non-greedy, so adjacent bold runs in one
  // sentence stay separate rather than merging into one span.
  const parts = text.split(/\*\*([\s\S]+?)\*\*/g)
  return (
    <>
      {parts.map((part, i) =>
        // Odd indices are the capture groups, i.e. the text that was wrapped in ** **.
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-foreground">
            {part}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  )
}
