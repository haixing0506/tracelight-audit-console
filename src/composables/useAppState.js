import { computed, reactive } from 'vue'
import { createLiveLog, mockAlerts, mockLogs, mockSources } from '../data/mockData'
import { createLogger } from '../services/logger'

const log = createLogger('audit-console:state')
let liveSequence = 0

const state = reactive({
  logs: [...mockLogs],
  alerts: [...mockAlerts],
  sources: mockSources.map((source) => ({ ...source })),
  toasts: [],
  liveStream: true,
})

function dismissToast(id) {
  const index = state.toasts.findIndex((toast) => toast.id === id)
  if (index >= 0) state.toasts.splice(index, 1)
}

function pushToast(type, title, message, duration = 4200) {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  state.toasts.push({ id, type, title, message })
  if (duration > 0) {
    window.setTimeout(() => dismissToast(id), duration)
  }
  return id
}

function addLiveLog() {
  if (!state.liveStream) return null
  const next = createLiveLog(liveSequence)
  liveSequence += 1
  state.logs.unshift(next)
  if (state.logs.length > 80) state.logs.pop()
  return next
}

function acknowledgeAlert(id) {
  const alert = state.alerts.find((item) => item.id === id)
  if (!alert) return
  alert.status = alert.status === 'open' ? 'investigating' : 'resolved'
  alert.assignee = alert.assignee === '未分配' ? '林澈' : alert.assignee
  log.warn('告警状态已更新', {
    alertId: alert.id,
    rule: alert.rule,
    status: alert.status,
    operator: 'lin.che@tracelight.cn',
  })
  pushToast('success', '告警状态已更新', `${alert.id} 已标记为“${alert.status === 'investigating' ? '调查中' : '已解决'}”`)
}

function testSourceConnection(id) {
  const source = state.sources.find((item) => item.id === id)
  if (!source) return
  source.status = 'checking'
  log.info('开始测试数据源连接', { sourceId: source.id, source: source.name })

  window.setTimeout(() => {
    source.status = 'healthy'
    source.latency = Math.max(21, Math.floor(Math.random() * 96))
    source.lastSync = new Date().toISOString()
    log.info('数据源连接测试通过', {
      sourceId: source.id,
      latencyMs: source.latency,
    })
    pushToast('success', '连接测试通过', `${source.name} 响应正常，延迟 ${source.latency} ms`)
  }, 900)
}

function registerSource(payload) {
  const source = {
    id: `src-${Date.now()}`,
    name: payload.name,
    type: payload.type,
    code: payload.code || payload.name.slice(0, 3).toUpperCase(),
    status: 'checking',
    events24h: 0,
    latency: 0,
    throughput: '0/s',
    lastSync: new Date().toISOString(),
    retention: payload.retention || '180 天',
    owner: payload.owner || '安全平台组',
  }

  state.sources.unshift(source)
  log.info('注册新的日志数据源', {
    sourceId: source.id,
    name: source.name,
    type: source.type,
    retention: source.retention,
  })
  pushToast('success', '数据源已创建', `${source.name} 正在执行首次连接校验`)

  window.setTimeout(() => {
    source.status = 'healthy'
    source.latency = 48
    source.lastSync = new Date().toISOString()
    log.info('新数据源首次校验通过', { sourceId: source.id })
  }, 1300)

  return source
}

export function useAppState() {
  return {
    state,
    openAlerts: computed(() => state.alerts.filter((alert) => alert.status !== 'resolved')),
    criticalAlerts: computed(() => state.alerts.filter((alert) => alert.severity === 'critical' && alert.status !== 'resolved')),
    healthySources: computed(() => state.sources.filter((source) => source.status === 'healthy').length),
    addLiveLog,
    acknowledgeAlert,
    registerSource,
    testSourceConnection,
    pushToast,
    dismissToast,
  }
}
