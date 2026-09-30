import { AnimatePresence, motion } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'

export default function AnimatedOutlet() {
  const location = useLocation()
  return <AnimatePresence mode="wait" initial={false}><motion.div key={location.pathname} className="route-transition" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.24, ease: 'easeOut' }}><Outlet /></motion.div></AnimatePresence>
}
