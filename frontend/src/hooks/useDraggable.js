import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * useDraggable — makes a floating panel movable.
 *
 * Move/up listeners are attached to `window` while dragging rather than relying
 * on pointer capture, so the drag keeps tracking even if the cursor leaves the
 * panel or passes over the WebGL canvas.
 *
 * @param {{ width?: number, height?: number, initial?: {x:number,y:number} }} opts
 */
export default function useDraggable({ width = 480, height = 440, initial } = {}) {
  const [position, setPosition] = useState(() => {
    if (initial) return initial
    return {
      x: Math.max(12, (window.innerWidth - width) / 2),
      y: Math.max(12, (window.innerHeight - height) / 2),
    }
  })

  const [isDragging, setIsDragging] = useState(false)

  // Offset between the pointer and the panel's top-left at drag start
  const grabOffset = useRef({ x: 0, y: 0 })
  // Live position ref so listeners never read stale state
  const posRef = useRef(position)
  useEffect(() => { posRef.current = position }, [position])

  /** Keep at least part of the panel reachable on screen. */
  const clamp = useCallback((x, y) => {
    const visible = 120 // px of panel that must stay on screen
    return {
      x: Math.min(Math.max(-(width - visible), x), window.innerWidth - visible),
      y: Math.min(Math.max(0, y), window.innerHeight - 48),
    }
  }, [width])

  const startDrag = useCallback((clientX, clientY) => {
    grabOffset.current = {
      x: clientX - posRef.current.x,
      y: clientY - posRef.current.y,
    }
    setIsDragging(true)
  }, [])

  const onPointerDown = useCallback((e) => {
    // Don't start a drag from interactive controls
    if (e.target.closest('button, input, textarea, select, a, [data-no-drag]')) return
    if (e.button !== undefined && e.button !== 0) return // left button only
    e.preventDefault()
    startDrag(e.clientX, e.clientY)
  }, [startDrag])

  // Attach window listeners only while dragging
  useEffect(() => {
    if (!isDragging) return

    const onMove = (e) => {
      const cx = e.touches ? e.touches[0].clientX : e.clientX
      const cy = e.touches ? e.touches[0].clientY : e.clientY
      setPosition(clamp(cx - grabOffset.current.x, cy - grabOffset.current.y))
    }
    const onUp = () => setIsDragging(false)

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    // Prevent text selection artifacts during the drag
    const prevUserSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      document.body.style.userSelect = prevUserSelect
    }
  }, [isDragging, clamp])

  // Re-clamp on window resize
  useEffect(() => {
    const onResize = () => setPosition((p) => clamp(p.x, p.y))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [clamp])

  /** Arrow-key nudging for keyboard accessibility. */
  const onKeyDown = useCallback((e) => {
    const step = e.shiftKey ? 60 : 20
    const moves = {
      ArrowLeft: [-step, 0], ArrowRight: [step, 0],
      ArrowUp: [0, -step], ArrowDown: [0, step],
    }
    const move = moves[e.key]
    if (!move) return
    e.preventDefault()
    setPosition((p) => clamp(p.x + move[0], p.y + move[1]))
  }, [clamp])

  return {
    position,
    isDragging,
    setPosition,

    /** Spread on any region that should initiate a drag. */
    dragProps: {
      onPointerDown,
      style: { touchAction: 'none' },
    },

    /** Spread on the visible handle for cursor + a11y affordances. */
    handleProps: {
      onPointerDown,
      onKeyDown,
      tabIndex: 0,
      'aria-label': 'Drag to move this panel, or use arrow keys',
      style: {
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
      },
    },
  }
}
