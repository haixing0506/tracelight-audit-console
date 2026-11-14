<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Download,
  FileWarning,
  RefreshCw,
  ShieldCheck,
  TimerReset,
  Zap,
} from 'lucide-vue-next'
import ChartPanel from '../components/ChartPanel.vue'
import LogDetailDrawer from '../components/LogDetailDrawer.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { useAppState } from '../composables/useAppState'
import { riskDistribution, sourceHealth, throughputSeries } from '../data/mockData'
import { formatTime, resultMeta, severityMeta, timeAgo } from '../utils/format'
import { createLogger } from '../services/logger'

const router = useRouter()
const { state, openAlerts, healthySources, pushToast } = useAppState()
const logger = createLogger('dashboard')
const selectedLog = ref(null)
const detailOpen = ref(false)
const period = ref('24h')
const refreshing = ref(false)

const periodOptions = [
  { label: '24 小时', value: '24h' },
  { label: '7 天', value: '7d' },
  { label: '30 天', value: '30d' },
]

const metrics = [
  {
    label: '今日日志事件',
    value: '1.28',
    unit: 'M',
    trend: '12.4%',
    direction: 'up',
    hint: '较昨日同期',
    icon: Zap,
    tone: 'mint',
    spark: [22, 28, 25, 34, 31, 44, 40, 52, 47, 57, 61, 58],
  },
  {
    label: '高危安全事件',
    value: '286',
    unit: '',
    trend: '8.2%',
    direction: 'up',
    hint: '较昨日同期',
    icon: FileWarning,
    tone: 'orange',
    spark: [18, 24, 19, 31, 29, 34, 27, 41, 38, 33, 37, 42],
  },
  {
    label: '平均响应时间',
    value: '3m 42s',
    unit: '',
    trend: '18s',
    direction: 'down',
    hint: '较上周平均',
    icon: TimerReset,
    tone: 'blue',
    spark: [48, 42, 46, 38, 40, 34, 37, 31, 33, 29, 31, 27],
  },
  {
    label: '合规覆盖率',
    value: '98.6',
    unit: '%',
    trend: '1.3%',
    direction: 'up',
    hint: '较上个周期',
    icon: ShieldCheck,
    tone: 'violet',
    spark: [82, 84, 83, 87, 86, 89, 91, 90, 92, 94, 95, 97],
  },
]

function sparklinePath(values) {
  const width = 112
  const height = 34
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width
      const y = height - ((value - min) / range) * (height - 4) - 2
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

const activeSeries = computed(() => {
  if (period.value === '24h') {
    return { labels: throughputSeries.labels, events: throughputSeries.events, blocked: throughputSeries.blocked }
  }
  if (period.value === '7d') {
    return {
      labels: ['11-08', '11-09', '11-10', '11-11', '11-12', '11-13', '11-14'],
      events: [64, 72, 69, 81, 76, 88, 92],
      blocked: [4, 6, 5, 9, 8, 12, 14],
    }
  }
  return {
    labels: ['10-16', '10-20', '10-24', '10-28', '11-01', '11-05', '11-09', '11-14'],
    events: [58, 63, 67, 65, 74, 79, 84, 92],
    blocked: [3, 5, 4, 7, 6, 10, 9, 14],
  }
})

const trendOption = computed(() => ({
  animationDuration: 700,
  color: ['#247d6b', '#e58a4b'],
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#172622',
    borderWidth: 0,
    padding: [10, 12],
    textStyle: { color: '#f6f7f2', fontSize: 12 },
    axisPointer: { type: 'line', lineStyle: { color: '#cbd4cc', type: 'dashed' } },
  },
  legend: {
    right: 2,
    top: 0,
    itemWidth: 8,
    itemHeight: 8,
    icon: 'circle',
    textStyle: { color: '#657169', fontSize: 12 },
    data: ['采集事件', '风险拦截'],
  },
  grid: { left: 2, right: 8, top: 34, bottom: 4, containLabel: true },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: activeSeries.value.labels,
    axisLine: { lineStyle: { color: '#e4e8e2' } },
    axisTick: { show: false },
    axisLabel: { color: '#8a958d', fontSize: 11, margin: 12 },
  },
  yAxis: {
    type: 'value',
    splitNumber: 4,
    axisLabel: { color: '#8a958d', fontSize: 11, formatter: '{value}k' },
    splitLine: { lineStyle: { color: '#edf0eb', type: 'dashed' } },
  },
  series: [
    {
      name: '采集事件',
      type: 'line',
      smooth: 0.35,
      symbol: 'circle',
      showSymbol: false,
      lineStyle: { width: 2.2 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(36, 125, 107, 0.24)' },
            { offset: 1, color: 'rgba(36, 125, 107, 0.01)' },
          ],
        },
      },
      data: activeSeries.value.events,
    },
    {
      name: '风险拦截',
      type: 'line',
      smooth: 0.35,
      symbol: 'circle',
      showSymbol: false,
      lineStyle: { width: 1.8 },
      data: activeSeries.value.blocked,
    },
  ],
}))

const riskTotal = computed(() => riskDistribution.reduce((sum, item) => sum + item.value, 0))

const riskOption = computed(() => ({
  animationDuration: 650,
  tooltip: {
    trigger: 'item',
    backgroundColor: '#172622',
    borderWidth: 0,
    textStyle: { color: '#fff', fontSize: 12 },
    formatter: '{b}: {c} 条 ({d}%)',
  },
  series: [
    {
      type: 'pie',
      radius: ['68%', '86%'],
      center: ['50%', '48%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderColor: '#ffffff',
        borderWidth: 4,
        borderRadius: 3,
      },
      label: { show: false },
      emphasis: { scaleSize: 4 },
      data: riskDistribution.map((item) => ({
        ...item,
        itemStyle: { color: item.color },
      })),
    },
  ],
}))

const recentLogs = computed(() => state.logs.slice(0, 6))
const activeAlerts = computed(() =>
  state.alerts.filter((alert) => alert.status !== 'resolved').slice(0, 4),
)

function inspect(log) {
  selectedLog.value = log
  detailOpen.value = true
  logger.info('打开日志详情', { logId: log.id, sourcePage: 'dashboard' })
}

function refreshDashboard() {
  refreshing.value = true
  logger.info('刷新安全运营总览')
  window.setTimeout(() => {
    refreshing.value = false
    pushToast('success', '数据已刷新', '安全运营指标与实时事件流已同步')
  }, 700)
}

function exportBrief() {
  logger.info('导出安全运营简报', { period: period.value })
  pushToast('success', '简报生成任务已创建', '安全运营简报将以 PDF 格式发送至你的邮箱')
}
</script>

<template>
  <div class="page dashboard-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">SECURITY OPERATIONS</p>
        <h1>安全运营总览</h1>
        <p class="page-subtitle">2026 年 11 月 14 日，星期六 · 所有核心链路运行稳定</p>
      </div>
      <div class="page-actions">
        <button class="button secondary" type="button" @click="refreshDashboard">
          <RefreshCw :size="16" :class="{ spinning: refreshing }" />
          刷新数据
        </button>
        <button class="button primary" type="button" @click="exportBrief">
          <Download :size="16" />
          导出简报
        </button>
      </div>
    </header>

    <section class="signal-strip">
      <div class="signal-main">
        <span class="signal-icon"><Zap :size="17" /></span>
        <div>
          <strong>2,847 events/s</strong>
          <span>当前采集速率</span>
        </div>
      </div>
      <div class="signal-divider" />
      <div class="signal-stat"><span>数据源</span><strong>{{ healthySources }}/6 健康</strong></div>
      <div class="signal-stat"><span>待处理告警</span><strong>{{ openAlerts.length }} 条</strong></div>
      <div class="signal-stat"><span>最近同步</span><strong>8 秒前</strong></div>
      <div class="signal-live"><span class="live-dot" /> LIVE</div>
    </section>

    <section class="metric-grid">
      <article v-for="metric in metrics" :key="metric.label" class="metric-card" :class="`metric-${metric.tone}`">
        <div class="metric-top">
          <span class="metric-icon"><component :is="metric.icon" :size="19" /></span>
          <svg class="metric-spark" viewBox="0 0 112 34" preserveAspectRatio="none" aria-hidden="true">
            <path :d="sparklinePath(metric.spark)" fill="none" stroke="currentColor" stroke-width="1.8" />
          </svg>
        </div>
        <p>{{ metric.label }}</p>
        <div class="metric-value-row">
          <strong>{{ metric.value }}</strong>
          <span>{{ metric.unit }}</span>
        </div>
        <div class="metric-foot">
          <span class="trend" :class="metric.direction">
            <component :is="metric.direction === 'up' ? ArrowUpRight : ArrowDownRight" :size="14" />
            {{ metric.trend }}
          </span>
          <span>{{ metric.hint }}</span>
        </div>
      </article>
    </section>

    <section class="dashboard-charts">
      <article class="panel trend-panel">
        <header class="panel-header">
          <div>
            <h2>事件采集趋势</h2>
            <p>全平台审计事件与风险拦截量</p>
          </div>
          <div class="segmented-control" role="tablist" aria-label="趋势时间范围">
            <button
              v-for="option in periodOptions"
              :key="option.value"
              type="button"
              :class="{ active: period === option.value }"
              @click="period = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </header>
        <ChartPanel :option="trendOption" height="286px" />
      </article>

      <article class="panel risk-panel">
        <header class="panel-header">
          <div>
            <h2>风险等级分布</h2>
            <p>近 24 小时风险事件</p>
          </div>
          <button class="text-action" type="button" @click="router.push('/logs')">
            查看日志 <ArrowRight :size="14" />
          </button>
        </header>
        <div class="risk-chart-wrap">
          <ChartPanel :option="riskOption" height="172px" />
          <div class="risk-center">
            <strong>{{ riskTotal }}</strong>
            <span>风险事件</span>
          </div>
        </div>
        <div class="risk-legend">
          <div v-for="item in riskDistribution" :key="item.name">
            <span class="risk-dot" :style="{ background: item.color }" />
            <span>{{ item.name }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
        <div class="source-health">
          <div class="source-health-heading">
            <span>核心数据源可用性</span>
            <StatusBadge label="SLA 正常" tone="success" dot />
          </div>
          <div v-for="source in sourceHealth" :key="source.name" class="health-row">
            <span>{{ source.name }}</span>
            <div class="health-track"><span :style="{ width: `${source.value}%` }" /></div>
            <strong>{{ source.value }}%</strong>
          </div>
        </div>
      </article>
    </section>

    <section class="dashboard-lower">
      <article class="panel event-panel">
        <header class="panel-header">
          <div>
            <h2>实时审计事件</h2>
            <p>最新采集的高价值操作记录</p>
          </div>
          <button class="button ghost" type="button" @click="router.push('/logs')">
            查看全部 <ArrowRight :size="15" />
          </button>
        </header>
        <div class="table-wrap compact-table">
          <table>
            <thead>
              <tr>
                <th>时间</th>
                <th>事件</th>
                <th>操作人</th>
                <th>风险</th>
                <th>结果</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in recentLogs" :key="log.id" class="clickable-row" @click="inspect(log)">
                <td class="mono muted">{{ formatTime(log.occurredAt) }}</td>
                <td>
                  <div class="event-cell">
                    <strong>{{ log.action }}</strong>
                    <span>{{ log.source }}</span>
                  </div>
                </td>
                <td>
                  <div class="actor-cell">
                    <span class="mini-avatar">{{ log.actor.name.slice(0, 1) }}</span>
                    {{ log.actor.name }}
                  </div>
                </td>
                <td>
                  <StatusBadge
                    :label="severityMeta[log.level]?.label"
                    :tone="severityMeta[log.level]?.tone"
                  />
                </td>
                <td>
                  <StatusBadge
                    :label="resultMeta[log.result]?.label"
                    :tone="resultMeta[log.result]?.tone"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="panel alerts-panel">
        <header class="panel-header">
          <div>
            <h2>待处理告警</h2>
            <p>{{ openAlerts.length }} 条告警需要关注</p>
          </div>
          <button class="icon-button small" type="button" aria-label="查看全部告警" @click="router.push('/alerts')">
            <ArrowRight :size="16" />
          </button>
        </header>
        <div class="alert-mini-list">
          <button
            v-for="alert in activeAlerts"
            :key="alert.id"
            type="button"
            class="alert-mini-item"
            @click="router.push('/alerts')"
          >
            <span class="alert-severity-bar" :class="`bar-${alert.severity}`" />
            <span class="alert-mini-copy">
              <strong>{{ alert.title }}</strong>
              <small>{{ alert.rule }} · {{ timeAgo(alert.lastSeen) }}</small>
            </span>
            <StatusBadge
              :label="severityMeta[alert.severity]?.label"
              :tone="severityMeta[alert.severity]?.tone"
            />
          </button>
        </div>
        <div class="alert-ack-summary">
          <CheckCircle2 :size="16" />
          <span>今日已自动拦截 <strong>38</strong> 个高风险操作</span>
          <CalendarDays :size="15" class="summary-calendar" />
        </div>
      </article>
    </section>

    <LogDetailDrawer :open="detailOpen" :log="selectedLog" @close="detailOpen = false" />
  </div>
</template>
