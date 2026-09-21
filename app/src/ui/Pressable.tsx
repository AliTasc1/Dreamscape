import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'

interface Props {
  children: ReactNode
  onClick: () => void
  className?: string
  style?: CSSProperties
  label?: string
  pressed?: boolean
}

/**
 * A card-sized tap target. It is a div rather than a button because these
 * cards hold headings and stacked text, which a <button> may not contain —
 * so the button behaviour is added back by hand.
 */
export function Pressable({ children, onClick, className, style, label, pressed }: Props) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={pressed}
      className={className}
      style={style}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  )
}
