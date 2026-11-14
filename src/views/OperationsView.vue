<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  Check,
  Clipboard,
  Copy,
  Database,
  Download,
  Pause,
  Play,
  Search,
  ShieldCheck,
  Trash2,
  Workflow,
  XCircle,
} from 'lucide-vue-next'
import BaseModal from '../components/BaseModal.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { createLogger, clearLogs, getLogs, subscribeLogs, toNdjson } from '../services/logger'
import { formatDateTime } from '../utils/format'
import { useAppState } from '../composables/useAppState'

const logger = createLogger('audit-console:operations')
const { pushToast } = useAppState()
const runtimeLogs = ref(getLogs())
const level = ref('all')
const query = ref('')
const selectedId = ref(runtimeLogs.value[0]?.id || null)
const streaming = ref(true)
const clearModalOpen = ref(false)
const copied = ref(false)
let unsubscribe

const levels = [
  { label: '全部', value: 'all' },
  { label: 'DEBUG', value: 'debug' },
  { label: 'INFO', value: 'info' },
  { label: 'WARN', value: 'warn' },
  { label: 'ERROR', value: 'error' },
]

const levelTone = {
  debug: 'neutral',
  info: 'info',
  warn: 'medium',
  error: 'critical',
  fatal: 'critical',
}

const filteredLogs = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  return runtimeLogs.value.filter((entry) => {
    const matchesLevel = level.value === 'all' || entry.level === level.value
    const matchesQuery =
      !keyword ||
      `${entry.message} ${entry.namespace} ${entry.correlationId}`.toLowerCase().includes(keyword)
    return matchesLevel && matchesQuery
  })
})

const selectedLog = computed(
  () => runtimeLogs.value.find((entry) => entry.id === selectedId.value) || filteredLogs.value[0] || null,
)

const errorCount = computed(
  () => runtimeLogs.value.filter((entry) => ['error', 'fatal'].includes(entry.level)).length,
)
const warningCount = computed(
  () => runtimeLogs.value.filter((entry) => entry.level === 'warn').length,
)
const prettyContext = computed(() =>
  selectedLog.value ? JSON.stringify(selectedLog.value.context, null, 2) : '{}',
)
const prettyEntry = computed(() =>
  selectedLog.value ? JSON.stringify(selectedLog.value, null, 2) : '{}',
)

function levelCount(value) {
  if (value === 'all') return runtimeLogs.value.length
  return runtimeLogs.value.filter((entry) => entry.level === value).length
}

function selectLog(entry) {
  selectedId.value = entry.id
}

function downloadRuntimeLogs() {
  const content = toNdjson(filteredLogs.value)
  const blob = new Blob([content], { type: 'application/x-ndjson;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `tracelight-runtime-${Date.now()}.ndjson`
  anchor.click()
  URL.revokeObjectURL(url)
  logger.info('导出前端运行日志', {
    format: 'ndjson',
    rowCount: filteredLogs.value.length,
  })
  pushToast('success', '运行日志已导出', `已生成 ${filteredLogs.value.length} 条 NDJSON 记录`)
}

function requestClear() {
  clearModalOpen.value = true
}

function confirmClear() {
  const count = clearLogs()
  runtimeLogs.value = []
  selectedId.value = null
  clearModalOpen.value = false
  logger.warn('运行日志缓冲区已清空', { clearedEntries: count, operator: 'lin.che@tracelight.cn' })
  pushToast('success', '缓冲区已清空', `已移除 ${count} 条本地运行日志`)
}

async function copySelected() {
  if (!selectedLog.value) return
  try {
    await navigator.clipboard.writeText(prettyEntry.value)
    copied.value = true
    logger.debug('复制结构化运行日志', { entryId: selectedLog.value.id })
    window.setTimeout(() => (copied.value = false), 1600)
  } catch {
    logger.warn('剪贴板写入失败', { entryId: selectedLog.value.id })
    pushToast('warning', '无法写入剪贴板', '请检查浏览器剪贴板权限')
  }
}

onMounted(() => {
  logger.info('运行日志观测面板已连接', {
    bufferSize: runtimeLogs.value.length,
    schemaVersion: '1.0',
  })
  logger.debug('日志消费者订阅已建立', {
    sink: 'memory-buffer',
    persistence: 'localStorage',
  })
  runtimeLogs.value = getLogs()
  selectedId.value = selectedId.value || runtimeLogs.value[0]?.id || null

  unsubscribe = subscribeLogs((entry) => {
    if (!streaming.value) return
    runtimeLogs.value = [entry, ...runtimeLogs.value].slice(0, 240)
    if (!selectedId.value) selectedId.value = entry.id
  })
})

onBeforeUnmount(() => {
  unsubscribe?.()
})
</script>

<template>
  <div class="page operations-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">OBSERVABILITY</p>
        <h1>运行日志</h1>
        <p class="page-subtitle">查看前端应用的结构化运行日志、异常与链路标识</p>
      </div>
      <div class="page-actions">
        <button class="button secondary" type="button" @click="requestClear">
          <Trash2 :size="16" /> 清空缓冲区
        </button>
        <button class="button primary" type="button" @click="downloadRuntimeLogs">
          <Download :size="16" /> 导出 NDJSON
        </button>
      </div>
    </header>

    <section class="runtime-stat-grid">
      <article class="panel">
        <span class="runtime-icon info"><Workflow :size="19" /></span>
        <div><span>缓冲区日志</span><strong>{{ runtimeLogs.length }}</strong><small>上限 240 条</small></div>
      </article>
      <article class="panel">
        <span class="runtime-icon medium"><Pause :size="19" /></span>
        <div><span>WARN 事件</span><strong>{{ warningCount }}</strong><small>需关注</small></div>
      </article>
      <article class="panel">
        <span class="runtime-icon critical"><XCircle :size="19" /></span>
        <div><span>ERROR 事件</span><strong>{{ errorCount }}</strong><small>窗口内异常</small></div>
      </article>
      <article class="panel">
        <span class="runtime-icon success"><ShieldCheck :size="19" /></span>
        <div><span>敏感字段脱敏</span><strong>已启用</strong><small>模式匹配 8 类</small></div>
      </article>
    </section>

    <section class="operations-grid">
      <article class="panel runtime-log-panel">
        <header class="runtime-toolbar">
          <div class="level-tabs compact-tabs">
            <button
              v-for="item in levels"
              :key="item.value"
              type="button"
              :class="{ active: level === item.value }"
              @click="level = item.value"
            >
              {{ item.label }}
              <span>{{ levelCount(item.value) }}</span>
            </button>
          </div>
          <div class="runtime-toolbar-actions">
            <label class="inline-search runtime-search">
              <Search :size="15" />
              <input v-model="query" placeholder="搜索消息或链路 ID" aria-label="搜索运行日志" />
            </label>
            <button
              class="icon-button small"
              type="button"
              :aria-label="streaming ? '暂停自动刷新' : '恢复自动刷新'"
              @click="streaming = !streaming"
            >
              <Pause v-if="streaming" :size="15" />
              <Play v-else :size="15" />
            </button>
          </div>
        </header>

        <div class="runtime-stream-status">
          <span class="live-dot" :class="{ idle: !streaming }" />
          {{ streaming ? '实时订阅中' : '自动刷新已暂停' }}
          <span>· sink: memory / localStorage</span>
        </div>

        <div class="runtime-log-list">
          <button
            v-for="entry in filteredLogs"
            :key="entry.id"
            type="button"
            class="runtime-row"
            :class="{ selected: entry.id === selectedLog?.id }"
            @click="selectLog(entry)"
          >
            <span class="runtime-time mono">{{ formatDateTime(entry.timestamp).slice(6) }}</span>
            <StatusBadge :label="entry.level.toUpperCase()" :tone="levelTone[entry.level]" />
            <span class="runtime-message">
              <strong>{{ entry.message }}</strong>
              <small>{{ entry.namespace }} · {{ entry.correlationId.slice(0, 18) }}</small>
            </span>
            <span class="runtime-chevron">›</span>
          </button>
          <div v-if="!filteredLogs.length" class="empty-state compact-empty">
            <Search :size="23" />
            <strong>当前筛选下没有运行日志</strong>
            <p>调整级别或清空搜索关键词后再试。</p>
          </div>
        </div>
      </article>

      <aside class="panel runtime-detail-panel">
        <header class="panel-header">
          <div>
            <h2>日志详情</h2>
            <p>结构化日志 Schema v1.0</p>
          </div>
          <button class="icon-button small" type="button" aria-label="复制完整日志" @click="copySelected">
            <Check v-if="copied" :size="15" />
            <Copy v-else :size="15" />
          </button>
        </header>

        <template v-if="selectedLog">
          <div class="runtime-detail-heading">
            <StatusBadge :label="selectedLog.level.toUpperCase()" :tone="levelTone[selectedLog.level]" />
            <strong>{{ selectedLog.message }}</strong>
            <span>{{ formatDateTime(selectedLog.timestamp) }}</span>
          </div>
          <dl class="runtime-meta">
            <div><dt>命名空间</dt><dd class="mono">{{ selectedLog.namespace }}</dd></div>
            <div><dt>日志 ID</dt><dd class="mono">{{ selectedLog.id }}</dd></div>
            <div><dt>链路 ID</dt><dd class="mono">{{ selectedLog.correlationId }}</dd></div>
            <div><dt>服务</dt><dd>{{ selectedLog.service }}</dd></div>
            <div><dt>环境</dt><dd>{{ selectedLog.environment }}</dd></div>
            <div><dt>Schema</dt><dd class="mono">{{ selectedLog.schemaVersion }}</dd></div>
          </dl>
          <div class="runtime-json-heading">
            <span>Context</span>
            <button type="button" class="text-action" @click="copySelected">
              <Clipboard :size="13" /> 复制 JSON
            </button>
          </div>
          <pre class="json-view runtime-json">{{ prettyContext }}</pre>
        </template>
        <div v-else class="empty-state compact-empty">
          <Database :size="23" />
          <strong>选择一条运行日志</strong>
          <p>在左侧列表中选择日志以查看完整字段。</p>
        </div>
      </aside>
    </section>

    <section class="panel log-governance-panel">
      <header class="panel-header">
        <div>
          <h2>日志治理流水线</h2>
          <p>从浏览器事件到可导出链路的标准化处理过程</p>
        </div>
        <StatusBadge label="Schema 校验通过" tone="success" dot />
      </header>
      <div class="governance-flow">
        <div><span>01</span><strong>事件采集</strong><small>操作 / 路由 / 异常</small></div>
        <i />
        <div><span>02</span><strong>结构化</strong><small>级别 + 上下文</small></div>
        <i />
        <div><span>03</span><strong>敏感脱敏</strong><small>递归字段过滤</small></div>
        <i />
        <div><span>04</span><strong>缓冲持久化</strong><small>240 条环形缓冲</small></div>
        <i />
        <div><span>05</span><strong>导出与观测</strong><small>NDJSON 标准格式</small></div>
      </div>
    </section>

    <BaseModal
      :open="clearModalOpen"
      title="清空日志缓冲区"
      description="该操作只会移除浏览器本地保存的运行日志，不会影响审计事件数据。"
      width="480px"
      @close="clearModalOpen = false"
    >
      <div class="confirm-message">
        <Trash2 :size="22" />
        <div>
          <strong>确认清空 {{ runtimeLogs.length }} 条日志？</strong>
          <p>清除后将保留本次操作本身的 WARN 记录，便于追溯。</p>
        </div>
      </div>
      <template #footer>
        <button class="button secondary" type="button" @click="clearModalOpen = false">取消</button>
        <button class="button danger" type="button" @click="confirmClear">确认清空</button>
      </template>
    </BaseModal>
  </div>
</template>
