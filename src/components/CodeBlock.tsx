import { useCallback, useEffect, useRef, useState } from 'react'

interface CodeBlockProps {
  /** The text shown, verbatim — and what the Copy button puts on the clipboard. */
  code: string
  /** Read by assistive tech and shown as the block's small caption. */
  label: string
}

/**
 * A preformatted block with a Copy button. The button copies the text as
 * given, so a recipe pasted into a client config is the recipe on the page.
 */
export function CodeBlock({ code, label }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )

  const copy = useCallback(() => {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => setCopied(false))
  }, [code])

  return (
    <figure className="code-block">
      <figcaption className="code-block-head">
        <span className="hint">{label}</span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={copy}
          aria-label={`Copy ${label}`}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </figcaption>
      <pre>
        <code>{code}</code>
      </pre>
    </figure>
  )
}
