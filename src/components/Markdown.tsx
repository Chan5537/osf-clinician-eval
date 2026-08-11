import type { ReactNode } from 'react'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ImageLightbox } from '@/components/ImageLightbox'
import { cn } from '@/lib/utils'

interface Props {
  children: string
  className?: string
}

// A figure caption (the risk-bar / sleep-vitals explainer) is authored as an italic
// paragraph directly under its image. We detect it by its signature phrasing and render
// it as a visually distinct caption — smaller, bolded, muted, and set off from the body
// text with a top border — so a reader never confuses the "how to read the chart" note
// for clinical content (Chan 2026-08-11).
const CAPTION_SIGNATURES = ['You are here', 'relative to other sleep-study patients', 'severity band']
function flattenText(node: ReactNode): string {
  if (node == null || node === false) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(flattenText).join('')
  if (typeof node === 'object' && 'props' in node) return flattenText((node as { props: { children?: ReactNode } }).props.children)
  return ''
}
function isFigureCaption(node: ReactNode): boolean {
  const text = flattenText(node)
  return CAPTION_SIGNATURES.some((s) => text.includes(s))
}

// Allow inline base64 image data-URIs (the agent embeds the "You are here" risk
// figure as ![...](data:image/png;base64,...)). react-markdown v9+ sanitizes URLs
// with defaultUrlTransform, which strips data: URIs — so we pass image data-URIs
// through and defer to the default transform for everything else.
function urlTransform(url: string): string {
  if (url.startsWith('data:image/')) return url
  return defaultUrlTransform(url)
}

// The generated narratives put the risk-bar caption (an italic `*…red = higher.*` line)
// directly under the figure, but often with only a SINGLE newline before the body prose
// that follows — so CommonMark merges the caption and the first body sentence into one
// paragraph, and no styling can separate them. We normalize here at render time: force a
// blank line AFTER a caption line that ends with the caption's signature, so it becomes its
// own paragraph (which the `p` renderer below then styles as a caption). This fixes the
// currently-deployed data without a regeneration (Chan 2026-08-11).
function isolateCaptionParagraph(md: string): string {
  return md.replace(
    /^(.*(?:red = higher|no severity band)\.\*)[ \t]*\n(?!\n)/gim,
    '$1\n\n',
  )
}

// Renders response markdown with GFM support (bold, italic, lists, tables,
// footnote citations like [^1], and embedded risk-figure images). react-markdown
// builds a virtual DOM from the AST — no dangerouslySetInnerHTML, so XSS-safe.
export function Markdown({ children, className }: Props) {
  const normalized = isolateCaptionParagraph(children)
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none prose-headings:font-semibold',
        // Wrap long unbreakable tokens (e.g. reference URLs, the one-line metrics summary) so
        // content never overflows/clips its column. min-w-0 lets the flex column shrink; the
        // break-words rules break long links/paragraphs onto the next line.
        'min-w-0 break-words',
        '[&_a]:break-all [&_p]:break-words [&_li]:break-words',
        // Tame the GFM footnote markers and reference section under prose.
        'prose-sup:text-[0.65em] prose-sup:font-medium',
        '[&_.footnotes]:mt-6 [&_.footnotes]:border-t [&_.footnotes]:pt-3 [&_.footnotes]:text-xs [&_.footnotes]:text-muted-foreground',
        '[&_.footnotes_h2]:sr-only',
        // Sleep-vitals figure: full width, rounded, with a little breathing room.
        '[&_img]:my-3 [&_img]:w-full [&_img]:rounded-md [&_img]:border',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={urlTransform}
        components={{
          // Make the sleep-vitals figure click-to-expand (it's cramped in the narrow columns).
          img: ({ src, alt }) => (
            <ImageLightbox src={typeof src === 'string' ? src : undefined} alt={alt} />
          ),
          // Figure captions get a distinct, smaller, bolded, set-off treatment so they read
          // clearly as chart-reading notes rather than body content.
          p: ({ children, ...props }) =>
            isFigureCaption(children) ? (
              <p
                className="mt-1.5 mb-3 border-t border-border pt-1.5 text-[0.7rem] font-semibold leading-snug text-muted-foreground [&_em]:not-italic"
                {...props}
              >
                {children}
              </p>
            ) : (
              <p {...props}>{children}</p>
            ),
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  )
}
