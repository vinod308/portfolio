import './SectionHeading.css'

/**
 * Eyebrow + heading + optional description.
 * `as` sets the heading level (default h2); align: "start" | "center"
 */
export default function SectionHeading({
  eyebrow,
  title,
  description,
  as: Heading = 'h2',
  align = 'start',
  id,
  className = '',
}) {
  return (
    <header className={`section-heading section-heading--${align} ${className}`.trim()}>
      {eyebrow && <p className="mono-label section-heading__eyebrow">{eyebrow}</p>}
      <Heading id={id} className={`section-heading__title section-heading__title--${Heading}`}>
        {title}
      </Heading>
      {description && <p className="section-heading__description">{description}</p>}
    </header>
  )
}
