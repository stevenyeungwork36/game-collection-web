export default function DrawerToggle({
  onClick,
  ariaLabel = 'Open menu',
  stuckToDrawer = false,
  drawerWidth = 260,
  isOpen = false,
}) {
  return (
    <button
      type="button"
      className="drawer-toggle"
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        left: stuckToDrawer ? `${drawerWidth}px` : '1rem',
      }}
    >
      <span className="drawer-toggle-arrow" aria-hidden="true">
        {isOpen ? '←' : '→'}
      </span>
    </button>
  )
}
