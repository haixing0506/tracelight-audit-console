<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FilterX,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from 'lucide-vue-next'
import LogDetailDrawer from '../components/LogDetailDrawer.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { useAppState } from '../composables/useAppState'
import { createLogger } from '../services/logger'
import { formatDateTime, resultMeta, severityMeta } from '../utils/format'

const { state, pushToast } = useAppState()
const logger = createLogger('audit-console:logs')

const query = ref('')
const appliedQuery = ref('')
const level = ref('all')
const source = ref('all')
const result = ref('all')
const timeRange = ref('24h')
const sort = ref('newest')
const page = ref(1)
const pageSize = 9
const selectedIds = ref(new Set())
const selectedLog = ref(null)
const detailOpen = ref(false)
const searching = ref(false)

const levelFilters = [
  { label: '全部', value: 'all' },
  { label: '严重', value: 'critical' },
  { label: '高危', value: 'high' },
  { label: '中危', value: 'medium' },
  { label: '低危', value: 'low' },
  { label: '信息', value: 'info' },
]

const sourceOptions = computed(() => [...new Set(state.logs.map((item) => item.source))])

const filteredLogs = computed(() => {
  const keyword = appliedQuery.value.trim().toLowerCase()
  const rangeMs = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    all: Number.POSITIVE_INFINITY,
  }[timeRange.value]
  const cutoff = Date.now() - rangeMs

  return state.logs
    .filter((log) => {
      const matchesQuery =
        !keyword ||
        [log.id, log.action, log.eventName, log.actor.name, log.actor.email, log.ip, log.target, log.source]
          .join(' ')
          .toLowerCase()
          .includes(keyword)
      const matchesLevel = level.value === 'all' || log.level === level.value
      const matchesSource = source.value === 'all' || log.source === source.value
      const matchesResult = result.value === 'all' || log.result === result.value
      const matchesTime = new Date(log.occurredAt).getTime() >= cutoff
      return matchesQuery && matchesLevel && matchesSource && matchesResult && matchesTime
    })
    .sort((a, b) => {
      if (sort.value === 'risk') return b.riskScore - a.riskScore
      if (sort.value === 'oldest') return new Date(a.occurredAt) - new Date(b.occurredAt)
      return new Date(b.occurredAt) - new Date(a.occurredAt)
    })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredLogs.value.length / pageSize)))
const pagedLogs = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredLogs.value.slice(start, start + pageSize)
})
const pageNumbers = computed(() => {
  if (totalPages.value <= 5) return Array.from({ length: totalPages.value }, (_, index) => index + 1)
  const start = Math.max(1, Math.min(page.value - 2, totalPages.value - 4))
  return Array.from({ length: 5 }, (_, index) => start + index)
})
const severeCount = computed(
  () => filteredLogs.value.filter((log) => ['critical', 'high'].includes(log.level)).length,
)
const blockedCount = computed(
  () => filteredLogs.value.filter((log) => log.result === 'blocked').length,
)
const allPageSelected = computed(
  () => pagedLogs.value.length > 0 && pagedLogs.value.every((log) => selectedIds.value.has(log.id)),
)

function runSearch() {
  searching.value = true
  appliedQuery.value = query.value
  page.value = 1
  const started = performance.now()

  window.setTimeout(() => {
    searching.value = false
    logger.info('执行审计日志检索', {
      query: appliedQuery.value,
      level: level.value,
      source: source.value,
      result: result.value,
      timeRange: timeRange.value,
      hits: filteredLogs.value.length,
      durationMs: Math.round(performance.now() - started),
      operator: 'lin.che@tracelight.cn',
    })
  }, 220)
}

function resetFilters() {
  query.value = ''
  appliedQuery.value = ''
  level.value = 'all'
  source.value = 'all'
  result.value = 'all'
  timeRange.value = '24h'
  sort.value = 'newest'
  page.value = 1
  selectedIds.value = new Set()
  logger.info('重置日志检索条件')
}

function toggleSort(column) {
  if (column === 'risk') {
    sort.value = sort.value === 'risk' ? 'newest' : 'risk'
  } else {
    sort.value = sort.value === 'newest' ? 'oldest' : 'newest'
  }
}

function toggleRow(id) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

function togglePage() {
  const next = new Set(selectedIds.value)
  if (allPageSelected.value) {
    pagedLogs.value.forEach((log) => next.delete(log.id))
  } else {
    pagedLogs.value.forEach((log) => next.add(log.id))
  }
  selectedIds.value = next
}

function inspect(log) {
  selectedLog.value = log
  detailOpen.value = true
  logger.info('查看审计事件详情', {
    logId: log.id,
    traceId: log.traceId,
    riskScore: log.riskScore,
  })
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function exportLogs() {
  const rows = selectedIds.value.size
    ? filteredLogs.value.filter((log) => selectedIds.value.has(log.id))
    : filteredLogs.value
  const header = ['事件ID', '时间', '级别', '操作', '操作人', '数据源', '来源IP', '风险分', '结果']
  const content = [
    header.map(csvCell).join(','),
    ...rows.map((log) =>
      [
        log.id,
        log.occurredAt,
        severityMeta[log.level]?.label,
        log.action,
        log.actor.name,
        log.source,
        log.ip,
        log.riskScore,
        resultMeta[log.result]?.label,
      ]
        .map(csvCell)
        .join(','),
    ),
  ].join('\n')

  downloadFile(`\ufeff${content}`, `tracelight-audit-${Date.now()}.csv`, 'text/csv;charset=utf-8')
  logger.info('导出审计日志', {
    format: 'csv',
    rowCount: rows.length,
    scope: selectedIds.value.size ? 'selected' : 'filtered',
  })
  pushToast('success', '导出完成', `已导出 ${rows.length} 条审计日志`)
}

function refreshLogs() {
  logger.info('手动刷新日志数据', { currentPage: page.value })
  pushToast('success', '日志数据已刷新', `当前检索命中 ${filteredLogs.value.length} 条事件`)
}

function saveView() {
  logger.info('保存日志检索视图', {
    level: level.value,
    source: source.value,
    result: result.value,
    timeRange: timeRange.value,
  })
  pushToast('success', '检索视图已保存', '可在“已保存视图”中快速恢复当前筛选条件')
}

watch([level, source, result, timeRange, sort], () => {
  page.value = 1
})

onMounted(() => {
  logger.debug('审计日志页加载完成', {
    rows: state.logs.length,
    defaultRange: timeRange.value,
  })
})
</script>

<template>
  <div class="page logs-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">AUDIT EXPLORER</p>
        <h1>审计日志</h1>
        <p class="page-subtitle">检索 12 个业务系统产生的结构化操作记录与安全事件</p>
      </div>
      <div class="page-actions">
        <button class="button secondary" type="button" @click="saveView">
          <SlidersHorizontal :size="16" />
          保存视图
        </button>
        <button class="button primary" type="button" @click="exportLogs">
          <Download :size="16" />
          导出 {{ selectedIds.size ? `(${selectedIds.size})` : '结果' }}
        </button>
      </div>
    </header>

    <section class="search-summary">
      <div>
        <span>24 小时事件总量</span>
        <strong>1,284,932</strong>
        <small>+12.4%</small>
      </div>
      <div>
        <span>当前检索命中</span>
        <strong>{{ filteredLogs.length }}</strong>
        <small>条事件</small>
      </div>
      <div>
        <span>高危 / 严重</span>
        <strong>{{ severeCount }}</strong>
        <small>需关注</small>
      </div>
      <div>
        <span>策略拦截</span>
        <strong>{{ blockedCount }}</strong>
        <small>自动处置</small>
      </div>
    </section>

    <section class="panel filter-panel">
      <form class="search-form" @submit.prevent="runSearch">
        <div class="search-input-wrap">
          <Search :size="18" />
          <input
            v-model="query"
            type="search"
            placeholder="搜索事件 ID、操作人、IP、目标资源或事件名称"
            aria-label="搜索审计日志"
          />
          <kbd>↵</kbd>
        </div>
        <button class="button primary" type="submit" :disabled="searching">
          <RefreshCw v-if="searching" :size="16" class="spinning" />
          <Search v-else :size="16" />
          {{ searching ? '检索中' : '检索' }}
        </button>
      </form>

      <div class="filter-row">
        <div class="level-tabs" role="tablist" aria-label="风险级别">
          <button
            v-for="item in levelFilters"
            :key="item.value"
            type="button"
            :class="{ active: level === item.value }"
            @click="level = item.value"
          >
            {{ item.label }}
          </button>
        </div>
        <div class="filter-selects">
          <label class="select-field">
            <span>时间范围</span>
            <select v-model="timeRange">
              <option value="1h">最近 1 小时</option>
              <option value="24h">最近 24 小时</option>
              <option value="7d">最近 7 天</option>
              <option value="all">全部时间</option>
            </select>
          </label>
          <label class="select-field">
            <span>数据源</span>
            <select v-model="source">
              <option value="all">全部来源</option>
              <option v-for="item in sourceOptions" :key="item" :value="item">{{ item }}</option>
            </select>
          </label>
          <label class="select-field">
            <span>处理结果</span>
            <select v-model="result">
              <option value="all">全部结果</option>
              <option value="success">成功</option>
              <option value="failed">失败</option>
              <option value="blocked">已拦截</option>
            </select>
          </label>
          <button class="button ghost reset-button" type="button" @click="resetFilters">
            <FilterX :size="15" /> 清除
          </button>
        </div>
      </div>
    </section>

    <section class="panel log-table-panel">
      <header class="table-toolbar">
        <div>
          <h2>事件列表</h2>
          <span>共 {{ filteredLogs.length }} 条 · 查询耗时 42 ms</span>
        </div>
        <div class="toolbar-actions">
          <span v-if="selectedIds.size" class="selected-count">
            <Check :size="14" /> 已选择 {{ selectedIds.size }} 项
          </span>
          <button class="icon-button small" type="button" aria-label="刷新日志" @click="refreshLogs">
            <RefreshCw :size="16" />
          </button>
        </div>
      </header>

      <div class="table-wrap log-table-wrap">
        <table class="log-table">
          <thead>
            <tr>
              <th class="checkbox-cell">
                <input
                  type="checkbox"
                  :checked="allPageSelected"
                  aria-label="选择当前页全部事件"
                  @change="togglePage"
                />
              </th>
              <th>
                <button type="button" class="table-sort" @click="toggleSort('time')">
                  时间
                  <ArrowUp v-if="sort === 'newest'" :size="13" />
                  <ArrowDown v-else :size="13" />
                </button>
              </th>
              <th>事件</th>
              <th>操作人</th>
              <th>数据源</th>
              <th>
                <button type="button" class="table-sort" @click="toggleSort('risk')">
                  风险 <ArrowDown v-if="sort === 'risk'" :size="13" />
                </button>
              </th>
              <th>结果</th>
              <th>来源 IP</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="log in pagedLogs"
              :key="log.id"
              class="clickable-row"
              :class="{ selected: selectedIds.has(log.id) }"
              @click="inspect(log)"
            >
              <td class="checkbox-cell" @click.stop>
                <input
                  type="checkbox"
                  :checked="selectedIds.has(log.id)"
                  :aria-label="`选择事件 ${log.id}`"
                  @change="toggleRow(log.id)"
                />
              </td>
              <td>
                <span class="time-primary">{{ formatDateTime(log.occurredAt).slice(6) }}</span>
                <span class="id-secondary mono">{{ log.id }}</span>
              </td>
              <td>
                <div class="event-cell">
                  <strong>{{ log.action }}</strong>
                  <span class="mono">{{ log.eventName }}</span>
                </div>
              </td>
              <td>
                <div class="actor-cell">
                  <span class="mini-avatar">{{ log.actor.name.slice(0, 1) }}</span>
                  <span>
                    <strong>{{ log.actor.name }}</strong>
                    <small>{{ log.actor.role }}</small>
                  </span>
                </div>
              </td>
              <td><span class="source-chip">{{ log.source }}</span></td>
              <td>
                <div class="risk-cell">
                  <StatusBadge
                    :label="severityMeta[log.level]?.label"
                    :tone="severityMeta[log.level]?.tone"
                  />
                  <span class="risk-score">{{ log.riskScore }}</span>
                </div>
              </td>
              <td>
                <StatusBadge
                  :label="resultMeta[log.result]?.label"
                  :tone="resultMeta[log.result]?.tone"
                />
              </td>
              <td><span class="mono muted">{{ log.ip }}</span></td>
              <td class="row-action">
                <button type="button" class="text-action" @click.stop="inspect(log)">
                  详情 <ChevronRight :size="14" />
                </button>
              </td>
            </tr>
            <tr v-if="!pagedLogs.length">
              <td colspan="9">
                <div class="empty-state">
                  <Search :size="24" />
                  <strong>没有匹配的审计事件</strong>
                  <p>尝试调整关键词、时间范围或风险级别。</p>
                  <button class="button secondary" type="button" @click="resetFilters">重置筛选</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="table-pagination">
        <span>第 {{ page }} / {{ totalPages }} 页，共 {{ filteredLogs.length }} 条</span>
        <div class="pagination-buttons">
          <button class="icon-button small" type="button" :disabled="page === 1" aria-label="上一页" @click="page--">
            <ChevronLeft :size="16" />
          </button>
          <button
            v-for="number in pageNumbers"
            :key="number"
            type="button"
            class="page-number"
            :class="{ active: page === number }"
            @click="page = number"
          >
            {{ number }}
          </button>
          <button
            class="icon-button small"
            type="button"
            :disabled="page === totalPages"
            aria-label="下一页"
            @click="page++"
          >
            <ChevronRight :size="16" />
          </button>
        </div>
      </footer>
    </section>

    <LogDetailDrawer :open="detailOpen" :log="selectedLog" @close="detailOpen = false" />
  </div>
</template>
