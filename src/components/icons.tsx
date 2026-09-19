/**
 * Small inline SVG icons — the project has no icon dependency, so these are
 * hand-inlined (Lucide-style paths). They draw with `currentColor`, so an icon
 * inherits its button's text color and hover state for free.
 */
interface IconProps {
  className?: string
}

const BASE = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

/** Robot / assistant — the "Ask" chat. */
export function BotIcon({ className }: IconProps) {
  return (
    <svg className={className} {...BASE}>
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  )
}

/** GitHub mark — footer repo link. Filled (not stroked), so it skips `BASE`. */
export function GitHubIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.575.106.785-.25.785-.556 0-.274-.01-1.002-.015-1.966-3.196.695-3.87-1.54-3.87-1.54-.523-1.33-1.277-1.684-1.277-1.684-1.044-.714.08-.699.08-.699 1.155.082 1.762 1.186 1.762 1.186 1.026 1.758 2.693 1.25 3.35.955.104-.743.402-1.25.73-1.538-2.552-.29-5.235-1.276-5.235-5.68 0-1.255.448-2.28 1.184-3.084-.119-.29-.513-1.459.112-3.043 0 0 .966-.309 3.165 1.178a11.03 11.03 0 0 1 2.88-.388c.977.004 1.962.132 2.881.388 2.198-1.487 3.163-1.178 3.163-1.178.626 1.584.232 2.753.114 3.043.737.804 1.183 1.829 1.183 3.084 0 4.415-2.687 5.386-5.246 5.671.413.355.78 1.057.78 2.131 0 1.54-.014 2.782-.014 3.16 0 .308.207.667.79.554A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5z" />
    </svg>
  )
}

/** Line chart — the equity-research link on a SEC report. */
export function ResearchIcon({ className }: IconProps) {
  return (
    <svg className={className} {...BASE}>
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  )
}

/** Sun — the theme toggle while dark (it switches to light). */
export function SunIcon({ className }: IconProps) {
  return (
    <svg className={className} {...BASE}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  )
}

/** Moon — the theme toggle while light (it switches to dark). */
export function MoonIcon({ className }: IconProps) {
  return (
    <svg className={className} {...BASE}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}

/** Gear / settings — the Keys drawer. */
export function GearIcon({ className }: IconProps) {
  return (
    <svg className={className} {...BASE}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
