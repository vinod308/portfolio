import { Link } from 'react-router'
import './Button.css'

/**
 * `to` renders a router <Link>, `href` an <a>, otherwise a <button>.
 * variant: "primary" | "secondary" | "ghost"; size: "md" | "lg"
 * External http(s) links open in a new tab.
 */
export default function Button({
  to,
  href,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  children,
  type = 'button',
  ...rest
}) {
  const classes = `button button--${variant} button--${size} ${className}`.trim()
  const inner = (
    <>
      <span className="button__label">{children}</span>
      {icon && (
        <span className="button__icon" aria-hidden="true">
          {icon}
        </span>
      )}
    </>
  )

  if (to) {
    return (
      <Link className={classes} to={to} {...rest}>
        {inner}
      </Link>
    )
  }

  if (href) {
    const external = /^https?:\/\//.test(href)
    return (
      <a
        className={classes}
        href={href}
        {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
        {...rest}
      >
        {inner}
        {external && <span className="visually-hidden"> (opens in a new tab)</span>}
      </a>
    )
  }

  return (
    <button className={classes} type={type} {...rest}>
      {inner}
    </button>
  )
}

export const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

export const ExternalIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M5 11 11 5M6 5h5v5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)
