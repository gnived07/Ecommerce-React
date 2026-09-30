import { motion, useReducedMotion } from 'framer-motion'
import ProductCard from './ProductCard.jsx'

export default function AnimatedProductGrid({ products }) {
  const reduceMotion = useReducedMotion()
  return <motion.div className="product-grid" initial="hidden" animate="visible" variants={{
    hidden: {},
    visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.045 } },
  }}>
    {products.map((product) => <motion.div key={product.id} variants={{ hidden: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 10 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: reduceMotion ? 0 : 0.35, ease: 'easeOut' }}><ProductCard product={product} /></motion.div>)}
  </motion.div>
}
