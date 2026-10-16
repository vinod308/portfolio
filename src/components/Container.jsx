import './Container.css'

/** Centred, gutter-padded content column. size: "default" | "narrow" | "wide" */
export default function Container({ as: Tag = 'div', size = 'default', className = '', children, ...rest }) {
  return (
    <Tag className={`container container--${size} ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  )
}
