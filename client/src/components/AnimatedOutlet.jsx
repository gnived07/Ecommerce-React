import { AnimatePresence, motion } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'
import { Suspense } from 'react'

export default function AnimatedOutlet() {
  const location = useLocation()
  return <AnimatePresence mode="wait" initial={false}><motion.div key={location.pathname} className="route-transition" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.24, ease: 'easeOut' }}><Suspense fallback={<div className="route-loading page-width" role="status">Opening the collection…</div>}><Outlet /></Suspense></motion.div></AnimatePresence>
}
