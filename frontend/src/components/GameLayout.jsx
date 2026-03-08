export default function GameLayout({ config, children }) {
  return (
    <div className="py-2">
      <h2 className="page-title mb-4" style={{ fontSize: '1.5rem' }}>
        <span className="me-2" aria-hidden="true">{config.icon}</span>
        {config.title}
      </h2>
      {children}
    </div>
  )
}
