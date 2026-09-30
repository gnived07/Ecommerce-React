export default function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="product-grid" aria-label="Loading products" aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>
          <div className="skeleton" style={{ aspectRatio: '3 / 4' }} />
          <div className="skeleton" style={{ width: '68%', height: 13, marginTop: 14 }} />
          <div className="skeleton" style={{ width: '42%', height: 10, marginTop: 8 }} />
        </div>
      ))}
    </div>
  )
}
