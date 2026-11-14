import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearLogs,
  createLogger,
  getLogs,
  hydrateLogs,
  setLogLevel,
  subscribeLogs,
  toNdjson,
} from './logger'

describe('enterprise logger', () => {
  const storage = new Map()
  const localStorageMock = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  }

  beforeEach(() => {
    storage.clear()
    vi.stubGlobal('localStorage', localStorageMock)
    clearLogs()
    setLogLevel('debug')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('emits a structured entry with required observability fields', () => {
    const log = createLogger('test:logs')
    const entry = log.info('日志检索完成', { hits: 12 })

    expect(entry).toMatchObject({
      level: 'info',
      namespace: 'test:logs',
      message: '日志检索完成',
      service: 'web-console',
      schemaVersion: '1.0',
    })
    expect(entry.id).toMatch(/^rt_/)
    expect(entry.correlationId).toMatch(/^cor_/)
    expect(entry.timestamp).toBeTruthy()
    expect(entry.context).toEqual({ hits: 12 })
  })

  it('recursively redacts sensitive context fields', () => {
    const log = createLogger('test:security')
    const entry = log.warn('认证信息已更新', {
      actor: {
        email: 'auditor@example.com',
        password: 'plain-text-secret',
        accessToken: 'token-value',
      },
      authorization: 'Bearer secret',
      request: {
        cardNumber: '6222-0000-0000-0000',
      },
    })

    expect(entry.context.actor.password).toBe('[REDACTED]')
    expect(entry.context.actor.accessToken).toBe('[REDACTED]')
    expect(entry.context.authorization).toBe('[REDACTED]')
    expect(entry.context.request.cardNumber).toBe('[REDACTED]')
    expect(entry.context.actor.email).toBe('auditor@example.com')
  })

  it('handles deeply nested and circular context without leaking secrets', () => {
    const log = createLogger('test:circular')
    const payload = {
      account: {
        profile: {
          accessToken: 'nested-secret',
        },
      },
    }
    payload.account.self = payload.account

    const entry = log.error('复杂上下文', payload)

    expect(entry.context.account.profile.accessToken).toBe('[REDACTED]')
    expect(entry.context.account.self).toBe('[CIRCULAR]')
  })

  it('notifies subscribers and keeps newest entries first', () => {
    const log = createLogger('test:stream')
    const received = []
    const unsubscribe = subscribeLogs((entry) => received.push(entry))

    log.info('first event')
    log.error('second event')
    unsubscribe()

    expect(received.map((entry) => entry.message)).toEqual(['first event', 'second event'])
    expect(getLogs().map((entry) => entry.message)).toEqual(['second event', 'first event'])
  })

  it('serializes the buffer as valid NDJSON', () => {
    const log = createLogger('test:export')
    log.info('export me', { source: 'dashboard' })
    log.warn('and me')

    const lines = toNdjson().split('\n')
    expect(lines).toHaveLength(2)
    expect(lines.map((line) => JSON.parse(line).message)).toEqual(['and me', 'export me'])
  })

  it('keeps only the newest 240 entries in the memory buffer', () => {
    const log = createLogger('test:buffer')

    for (let index = 0; index < 245; index += 1) {
      log.info(`event-${index}`)
    }

    const entries = getLogs()
    expect(entries).toHaveLength(240)
    expect(entries[0].message).toBe('event-244')
    expect(entries.at(-1).message).toBe('event-5')
  })

  it('filters entries below the configured minimum level', () => {
    const log = createLogger('test:levels')
    setLogLevel('warn')

    log.debug('ignored debug')
    log.info('ignored info')
    log.warn('kept warning')
    log.error('kept error')

    expect(getLogs().map((entry) => entry.message)).toEqual(['kept error', 'kept warning'])
  })

  it('restores persisted entries after a reload', () => {
    const persisted = [
      {
        id: 'rt_persisted',
        timestamp: '2026-11-14T08:00:00.000Z',
        level: 'info',
        namespace: 'test:persistence',
        message: 'persisted event',
        environment: 'test',
        service: 'web-console',
        schemaVersion: '1.0',
        correlationId: 'cor_persisted',
        context: { source: 'localStorage' },
      },
    ]
    localStorage.setItem('tracelight.runtime-logs.v1', JSON.stringify(persisted))

    expect(hydrateLogs()).toEqual(persisted)
    expect(getLogs()).toEqual(persisted)
  })
})
