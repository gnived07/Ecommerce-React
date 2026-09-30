import SiteHeader from './SiteHeader.jsx'
import SiteFooter from './SiteFooter.jsx'
import CartDrawer from './CartDrawer.jsx'
import AnimatedOutlet from './AnimatedOutlet.jsx'
import { MotionConfig } from 'framer-motion'

export default function SiteLayout() {
  return <MotionConfig reducedMotion="user"><SiteHeader /><main><AnimatedOutlet /></main><SiteFooter /><CartDrawer /></MotionConfig>
}
