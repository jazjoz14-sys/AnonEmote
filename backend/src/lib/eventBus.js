/**
 * In-process event bus for audit entry broadcasting.
 * Uses Node.js built-in EventEmitter to fan-out audit entries
 * to all registered listeners (SSE connections, etc.) without
 * requiring database polling.
 * @module eventBus
 */
import { EventEmitter } from 'events'

/** @type {EventEmitter} */
const bus = new EventEmitter()

// Prevent MaxListenersExceededWarning — up to 5 SSE clients + internal listeners
bus.setMaxListeners(10)

/**
 * Classify a log entry type into a severity level.
 * Types containing "error" or "failed" → 'error'
 * Types containing "warn" or "rate_limit" → 'warning'
 * Everything else → 'info'
 * @param {string} type - The audit entry type field
 * @returns {'error'|'warning'|'info'}
 */
export function classifySeverity(type) {
  const t = (type || '').toLowerCase()
  if (t.includes('error') || t.includes('failed')) return 'error'
  if (t.includes('warn') || t.includes('rate_limit')) return 'warning'
  return 'info'
}

/**
 * Emit an audit entry to all listeners. Enriches with severity field.
 * Fire-and-forget — slow listeners do not block the caller.
 * @param {object} entry - The audit log entry (must have a `type` field)
 */
export function emitAudit(entry) {
  const enriched = {
    ...entry,
    severity: classifySeverity(entry.type),
  }
  bus.emit('audit', enriched)
}

/**
 * Register a listener for audit events.
 * @param {(entry: object) => void} listener
 */
export function onAudit(listener) {
  bus.on('audit', listener)
}

/**
 * Remove a previously registered listener.
 * @param {(entry: object) => void} listener
 */
export function offAudit(listener) {
  bus.off('audit', listener)
}

export default bus
