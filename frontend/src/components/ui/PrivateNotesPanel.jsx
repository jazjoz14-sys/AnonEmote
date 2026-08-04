import React, { useState } from 'react'
import useAppStore from '../../store/useAppStore'
import useDraggable from '../../hooks/useDraggable'

const PANEL_W = 320

/**
 * PrivateNotesPanel — writing the user chose to keep for themselves.
 *
 * These never reach the server. They live in sessionStorage, so they clear when
 * the tab closes, which matters because students often use shared campus
 * computers.
 */
export default function PrivateNotesPanel({ onClose }) {
  const { privateNotes, deletePrivateNote } = useAppStore()
  const { position, isDragging, dragProps, handleProps } = useDraggable({
    width: PANEL_W,
    height: 420,
    initial: { x: 24, y: Math.max(12, window.innerHeight / 2 - 210) },
  })

  return (
    <div
      {...dragProps}
      className="fixed z-40 glass-dark rounded-3xl p-5 flex flex-col gap-4"
      style={{
        ...dragProps.style,
        left: position.x,
        top: position.y,
        width: PANEL_W,
        maxHeight: '70vh',
        border: '1px solid rgba(167,139,250,0.28)',
        boxShadow: isDragging
          ? '0 30px 60px -12px rgba(0,0,0,0.9)'
          : '0 20px 40px -12px rgba(0,0,0,0.7)',
        cursor: isDragging ? 'grabbing' : 'default',
      }}
      role="dialog"
      aria-label="My private notes"
    >
      {/* Header / drag handle */}
      <div
        {...handleProps}
        className="flex items-start justify-between gap-2 -m-1 p-1 rounded-xl select-none
                   focus:outline-none focus:ring-1 focus:ring-violet-500/50"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-slate-600 text-base leading-none" aria-hidden="true">⠿</span>
          <span className="text-xl shrink-0">🔒</span>
          <div className="min-w-0">
            <h3 className="font-bold text-white text-sm">My notes</h3>
            <p className="text-xs text-slate-500">Only on this device</p>
          </div>
        </div>
        <button
          onClick={onClose}
          data-no-drag
          className="text-slate-500 hover:text-white transition-colors text-lg
                     leading-none shrink-0 px-1"
          aria-label="Close notes"
        >
          ✕
        </button>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        These were never sent to our servers. They clear when you close this tab.
      </p>

      <div
        className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1 min-h-0"
        style={{ touchAction: 'pan-y' }}
      >
        {privateNotes.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">
            Nothing saved yet.
          </p>
        ) : (
          privateNotes.map((n) => (
            <div
              key={n.id}
              className="glass rounded-xl px-3 py-2.5 text-sm text-slate-200
                         border-l-2 border-violet-500/50"
            >
              <p className="whitespace-pre-wrap break-words leading-relaxed">{n.text}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-600">
                  {new Date(n.savedAt).toLocaleTimeString([], {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
                <button
                  onClick={() => deletePrivateNote(n.id)}
                  data-no-drag
                  className="text-xs text-slate-600 hover:text-red-400 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
