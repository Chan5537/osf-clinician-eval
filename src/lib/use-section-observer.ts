import { useEffect, useState } from 'react'

// Which of the given section ids is currently on screen, and whether a specific one is visible.
//
// Both hooks use IntersectionObserver rather than scroll handlers: the browser does the hit-testing
// off the main thread, so there is no scroll-time layout thrash on a page that carries three 600px
// scroll areas and two full-page base64 figures.

/** Id of the section nearest the top of the viewport among those currently intersecting. */
export function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null)
  // ids is a module-level constant array in practice; join it so the effect is not re-run on
  // every render by a fresh array identity.
  const key = ids.join(',')

  useEffect(() => {
    const targets = key
      .split(',')
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el != null)
    if (targets.length === 0) return

    const visible = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id)
          else visible.delete(e.target.id)
        }
        // Preserve document order rather than callback order, so the rail highlights the topmost
        // visible block instead of whichever one last fired.
        const first = key.split(',').find((id) => visible.has(id))
        if (first) setActive(first)
      },
      // A band across the upper half of the viewport: a section counts as "current" once its top
      // reaches roughly the header, and stops counting once it has scrolled well past.
      { rootMargin: '-80px 0px -55% 0px', threshold: 0 },
    )
    targets.forEach((t) => observer.observe(t))
    return () => observer.disconnect()
  }, [key])

  return active
}

/** True while the given section has any part on screen. */
export function useSectionInView(id: string): boolean {
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = document.getElementById(id)
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [id])

  return inView
}
