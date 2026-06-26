export function ValorantMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M2 12v44c0 1.5.6 3 1.6 4.2L41 100h31c1.7 0 2.6-2 1.5-3.3L5.5 11.2C4.6 10 2 10.6 2 12z" />
      <path d="M98 12v34c0 1.5-.6 3-1.6 4.2L62 92c-1 1.2-3 .5-3-1.1V70.5c0-1.5.6-3 1.6-4.2l34-42.6c.8-1 2.4-1.7 3.4-1.7z" opacity="0.7" />
    </svg>
  )
}
