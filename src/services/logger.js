const LEVEL_WEIGHT = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
}

const SENSITIVE_KEY = /pass(word)?|token|secret|authorization|cookie|session|card|cvv|credential/i
const STORAGE_KEY = 'tracelight.runtime-logs.v1'
const MAX_BUFFER_SIZE = 240

const state = {
  entries: [],
  subscribers: new Set(),
  minLevel: 'debug',
}

function createId(prefix = 'log') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`
  }
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

function redact(value, depth = 0, seen = new WeakSet()) {
  if (value === null || value === undefined) return value
  if (depth > 5) return '[MAX_DEPTH]'
  if (value instanceof Date) return value.toISOString()
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    }
  }
  if (typeof value !== 'object') return value
  if (seen.has(value)) return '[CIRCULAR]'

  seen.add(value)
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => redact(item, depth + 1, seen))
  }

  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 60)
      .map(([key, item]) => [key, SENSITIVE_KEY.test(key) ? '[REDACTED]' : redact(item, depth + 1, seen)]),
  )
}

function volatileStorageGet() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function volatileStorageSet(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 120)))
  } catch {
    // Storage can be unavailable in privacy mode; the in-memory buffer remains authoritative.
  }
}

function shouldEmit(level) {
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[state.minLevel]
}

function emit(entry) {
  if (!shouldEmit(entry.level)) return

  state.entries.unshift(entry)
  state.entries = state.entries.slice(0, MAX_BUFFER_SIZE)
  volatileStorageSet(state.entries)
  state.subscribers.forEach((subscriber) => subscriber(entry))
}

function write(level, namespace, message, context = {}) {
  const entry = {
    id: createId('rt'),
    timestamp: new Date().toISOString(),
    level,
    namespace,
    message,
    environment: import.meta.env?.MODE || 'development',
    service: 'web-console',
    schemaVersion: '1.0',
    correlationId: context.correlationId || createId('cor'),
    context: redact(context),
  }

  emit(entry)
  return entry
}

export function createLogger(namespace = 'app') {
  return {
    debug: (message, context) => write('debug', namespace, message, context),
    info: (message, context) => write('info', namespace, message, context),
    warn: (message, context) => write('warn', namespace, message, context),
    error: (message, context) => write('error', namespace, message, context),
    fatal: (message, context) => write('fatal', namespace, message, context),
    child: (childNamespace) => createLogger(`${namespace}:${childNamespace}`),
  }
}

export const logger = createLogger('console')

export function getLogs() {
  return [...state.entries]
}

export function subscribeLogs(callback) {
  state.subscribers.add(callback)
  return () => state.subscribers.delete(callback)
}

export function setLogLevel(level) {
  if (level in LEVEL_WEIGHT) state.minLevel = level
}

export function hydrateLogs() {
  if (state.entries.length) return state.entries
  state.entries = volatileStorageGet()
  return [...state.entries]
}

export function clearLogs() {
  const cleared = state.entries.length
  state.entries = []
  volatileStorageSet([])
  return cleared
}

export function toNdjson(entries = state.entries) {
  return entries.map((entry) => JSON.stringify(entry)).join('\n')
}

export function installGlobalErrorCapture() {
  if (typeof window === 'undefined') return

  window.addEventListener('error', (event) => {
    logger.error('未捕获的运行时异常', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('未处理的 Promise 拒绝', {
      reason: event.reason,
    })
  })
}
