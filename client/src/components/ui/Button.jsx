export default function Button({ as: Component = 'button', variant = 'solid', className = '', ...props }) {
  return <Component className={`button ${variant === 'solid' ? '' : `button--${variant}`} ${className}`.trim()} {...props} />
}
