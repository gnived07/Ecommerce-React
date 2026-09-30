import Button from './Button.jsx'
import { Link } from 'react-router-dom'

export default function EmptyState({ eyebrow = 'Nothing here yet', title, message, actionLabel, actionHref }) {
  return (
    <section className="empty-state">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="section-title">{title}</h2>
      <p className="body-copy">{message}</p>
      {actionLabel && actionHref && <Button as={Link} to={actionHref}>{actionLabel}</Button>}
    </section>
  )
}
