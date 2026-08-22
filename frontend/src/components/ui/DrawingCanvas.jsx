import React, { useRef, useState, useCallback, useEffect } from 'react'

const COLORS = [
  '#1F2937', '#F87171', '#FB923C', '#FBBF24', '#A3E635',
  '#34D399', '#22D3EE', '#60A5FA', '#A78BFA', '#F472B6',
  '#000000', '#6B7280',
]

const BRUSH_SIZES = [2, 5, 10, 18]

/**
 * DrawingCanvas — a touch-friendly freeform drawing surface.
 *
 * Outputs a PNG data URL via onChange when the user finishes a stroke.
 * Designed for emotional expression, not precision — tools are minimal
 * (brush colour, size, eraser, clear) to keep the barrier to entry low.
 */
export default function DrawingCanvas({ width = 360, height = 360, onChange }) {
  const canvasRef = useRef(null)
  const isDrawing = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  const [color, setColor] = useState('#1F2937')
  const [brushSize, setBrushSize] = useState(5)
  const [erasing, setErasing] = useState(false)
  const [hasContent, setHasContent] = useState(false)

  // Setup canvas with white background to match the planet surface
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }, [width, height])

  const getPos = useCallback((e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if (e.touches && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }, [])

  const startDraw = useCallback((e) => {
    e.preventDefault()
    isDrawing.current = true
    lastPos.current = getPos(e)
  }, [getPos])

  const draw = useCallback((e) => {
    if (!isDrawing.current) return
    e.preventDefault()

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e)

    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = erasing ? '#ffffff' : color
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()

    lastPos.current = pos
    setHasContent(true)
  }, [color, brushSize, erasing, getPos])

  const endDraw = useCallback(() => {
    if (!isDrawing.current) return
    isDrawing.current = false

    // Emit the current canvas state
    if (onChange && canvasRef.current) {
      onChange(canvasRef.current.toDataURL('image/png'))
    }
  }, [onChange])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    setHasContent(false)
    if (onChange) onChange(null)
  }, [width, height, onChange])

  return (
    <div className="flex flex-col gap-2">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full rounded-xl border border-white/10 cursor-crosshair"
        style={{ aspectRatio: `${width}/${height}`, touchAction: 'none' }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
        onTouchCancel={endDraw}
      />

      {/* Tools */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Colours */}
        <div className="flex gap-1 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setErasing(false) }}
              className={`w-6 h-6 rounded-full transition-all
                ${color === c && !erasing ? 'ring-2 ring-white scale-110' : 'ring-1 ring-white/20'}`}
              style={{ backgroundColor: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>

        <div className="w-px h-5 bg-white/10" />

        {/* Brush sizes */}
        <div className="flex gap-1 items-center">
          {BRUSH_SIZES.map((s) => (
            <button
              key={s}
              onClick={() => { setBrushSize(s); setErasing(false) }}
              className={`rounded-full bg-white/80 transition-all
                ${brushSize === s && !erasing ? 'ring-2 ring-violet-400' : ''}`}
              style={{ width: Math.max(12, s + 6), height: Math.max(12, s + 6) }}
              aria-label={`Brush size ${s}`}
            />
          ))}
        </div>

        <div className="w-px h-5 bg-white/10" />

        {/* Eraser */}
        <button
          onClick={() => setErasing((v) => !v)}
          className={`px-2 py-1 rounded-lg text-xs transition-all
            ${erasing ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'}`}
          aria-label={erasing ? 'Eraser (active)' : 'Eraser'}
          aria-pressed={erasing}
        >
          🧹
        </button>

        {/* Clear */}
        <button
          onClick={clearCanvas}
          disabled={!hasContent}
          className="px-2 py-1 rounded-lg text-xs text-slate-400 hover:text-red-300
                     disabled:opacity-30 transition-all"
        >
          Clear
        </button>
      </div>
    </div>
  )
}
