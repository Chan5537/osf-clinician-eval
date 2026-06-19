import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface Props {
  children: string
  className?: string
}

// Allow inline base64 image data-URIs (the agent embeds the "You are here" risk
// figure as ![...](data:image/png;base64,...)). react-markdown v9+ sanitizes URLs
// with defaultUrlTransform, which strips data: URIs — so we pass image data-URIs
// through and defer to the default transform for everything else.
function urlTransform(url: string): string {
  if (url.startsWith('data:image/')) return url
  return defaultUrlTransform(url)
}

// Renders response markdown with GFM support (bold, italic, lists, tables,
// footnote citations like [^1], and embedded risk-figure images). react-markdown
// builds a virtual DOM from the AST — no dangerouslySetInnerHTML, so XSS-safe.
export function Markdown({ children, className }: Props) {
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none prose-headings:font-semibold',
        // Tame the GFM footnote markers and reference section under prose.
        'prose-sup:text-[0.65em] prose-sup:font-medium',
        '[&_.footnotes]:mt-6 [&_.footnotes]:border-t [&_.footnotes]:pt-3 [&_.footnotes]:text-xs [&_.footnotes]:text-muted-foreground',
        '[&_.footnotes_h2]:sr-only',
        // Risk-figure image: full width, rounded, with a little breathing room.
        '[&_img]:my-3 [&_img]:w-full [&_img]:rounded-md [&_img]:border',
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={urlTransform}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
