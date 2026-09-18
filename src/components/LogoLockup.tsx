// Co-branded logo row (UCLA + HAIL), centered. Used at the top of the landing
// and completion cards. Asset URLs are base-aware (import.meta.env.BASE_URL) so
// they resolve under the GitHub Pages base path.

const base = import.meta.env.BASE_URL

/**
 * `onClick` turns the lockup into a home button. Used on the completion screen, which is
 * otherwise a dead end: a rater who finishes has no way back to the overview, and the
 * only other exit (Start over) is correctly hidden from them.
 */
export function LogoLockup({ onClick }: { onClick?: () => void } = {}) {
  const inner = (
    <div className="flex items-center justify-center gap-4">
      <img
        src={`${base}ucla_logo.jpg`}
        alt="UCLA"
        className="h-11 w-auto rounded-sm object-contain"
      />
      <span className="h-9 w-px bg-border" aria-hidden="true" />
      <img
        src={`${base}hail-gradient-blue-cropped.png`}
        alt="Health Intelligence Lab"
        className="h-11 w-auto object-contain"
      />
    </div>
  )
  if (!onClick) return inner
  return (
    <button
      type="button"
      onClick={onClick}
      title="Back to the study overview — your answers are saved"
      className="w-full cursor-pointer rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {inner}
    </button>
  )
}
