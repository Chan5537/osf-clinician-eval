import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface Props {
  src?: string
  alt?: string
  className?: string
}

// A clickable inline image that expands to a full-screen lightbox on click. Self-contained
// (no extra deps): renders a fixed overlay via a portal, closes on backdrop click or Escape.
// Used for the sleep-vitals figure, which is cramped in the narrow per-arm columns — clinicians
// can click to see it at full size.
export function ImageLightbox({ src, alt, className }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    // lock body scroll while the overlay is open
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  if (!src) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Expand figure: ${alt ?? 'figure'}`}
        className="group relative block w-full cursor-zoom-in border-0 bg-transparent p-0"
      >
        <img
          src={src}
          alt={alt ?? ''}
          className={cn('w-full rounded-md border transition group-hover:brightness-95', className)}
        />
        <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100">
          Click to expand
        </span>
      </button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={alt ?? 'Expanded figure'}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-8"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-black shadow hover:bg-white"
            >
              Close ✕
            </button>
            {/* stop propagation so clicking the image itself doesn't close */}
            <img
              src={src}
              alt={alt ?? ''}
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full cursor-zoom-out rounded-lg bg-white shadow-2xl"
            />
          </div>,
          document.body,
        )}
    </>
  )
}
