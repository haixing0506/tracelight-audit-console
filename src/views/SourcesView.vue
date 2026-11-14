<script setup>
import { computed, reactive, ref } from 'vue'
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CloudDownload,
  Database,
  Gauge,
  Network,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  TimerReset,
} from 'lucide-vue-next'
import BaseModal from '../components/BaseModal.vue'
import ChartPanel from '../components/ChartPanel.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { useAppState } from '../composables/useAppState'
import { throughputSeries } from '../data/mockData'
import { createLogger } from '../services/logger'
import { formatCompact, timeAgo } from '../utils/format'

const { state, healthySources, registerSource, testSourceConnection, pushToast } = useAppState()
const logger = createLogger('audit-console:sources')
const modalOpen = ref(false)
const form = reactive({
  name: '',
  type: 'Audit API',
  code: '',
  owner: '安全平台组',
  retention: '180 天',
})

const sourceStatus = {
  healthy: { label: '采集中', tone: 'success' },
  degraded: { label: '有延迟', tone: 'medium' },
  checking: { label: '校验中', tone: 'info' },
}

const totalEvents = computed(() => state.sources.reduce((sum, source) => sum + source.events24h, 0))
const averageLatency = computed(() => {
  const active = state.sources.filter((source) => source.latency)
  if (!active.length) return 0
  return Math.round(active.reduce((sum, source) => sum + source.latency, 0) / active.length)
})

const ingestionOption = computed(() => ({
  animationDuration: 600,
  color: ['#247d6b', '#b4c7b9'],
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#172622',
    borderWidth: 0,
    textStyle: { color: '#fff', fontSize: 12 },
  },
  legend: {
    right: 0,
    top: 0,
    itemWidth: 8,
    itemHeight: 8,
    icon: 'circle',
    textStyle: { color: '#657169', fontSize: 12 },
  },
  grid: { left: 0, right: 4, top: 32, bottom: 0, containLabel: true },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: throughputSeries.labels.filter((_, index) => index % 3 === 0),
    axisLine: { lineStyle: { color: '#e5e9e3' } },
    axisTick: { show: false },
    axisLabel: { color: '#8a958d', fontSize: 11 },
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: '#8a958d', fontSize: 11, formatter: '{value}k' },
    splitLine: { lineStyle: { color: '#edf0eb', type: 'dashed' } },
  },
  series: [
    {
      name: '事件采集',
      type: 'line',
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 2.2 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(36,125,107,.2)' },
            { offset: 1, color: 'rgba(36,125,107,.01)' },
          ],
        },
      },
      data: throughputSeries.events.filter((_, index) => index % 3 === 0),
    },
    {
      name: '管道容量',
      type: 'line',
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 1.5, type: 'dashed' },
      data: [92, 92, 92, 92, 92, 92, 92, 92],
    },
  ],
}))

function syncConfig() {
  logger.info('同步全部数据源配置', {
    sourceCount: state.sources.length,
    operator: 'lin.che@tracelight.cn',
  })
  pushToast('success', '配置同步完成', `${state.sources.length} 个数据源配置已下发`)
}

function openSettings(source) {
  logger.info('打开数据源配置', { sourceId: source.id, source: source.name })
  pushToast('info', '配置面板已准备', `${source.name} 的采集参数可在管理后台继续编辑`)
}

function submitSource() {
  if (!form.name.trim()) {
    pushToast('warning', '请输入数据源名称', '名称用于在日志检索和告警规则中识别数据来源')
    return
  }
  registerSource({ ...form })
  modalOpen.value = false
  Object.assign(form, {
    name: '',
    type: 'Audit API',
    code: '',
    owner: '安全平台组',
    retention: '180 天',
  })
}
</script>

<template>
  <div class="page sources-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">DATA CONNECTORS</p>
        <h1>数据源管理</h1>
        <p class="page-subtitle">统一管理日志采集链路、数据保留策略与连接健康状态</p>
      </div>
      <div class="page-actions">
        <button class="button secondary" type="button" @click="syncConfig">
          <RefreshCw :size="16" /> 同步配置
        </button>
        <button class="button primary" type="button" @click="modalOpen = true">
          <Plus :size="16" /> 添加数据源
        </button>
      </div>
    </header>

    <section class="source-stat-grid">
      <article class="panel">
        <span class="source-stat-icon mint"><Database :size="20" /></span>
        <div><span>已接入数据源</span><strong>{{ state.sources.length }}</strong><small>{{ healthySources }} 个运行正常</small></div>
      </article>
      <article class="panel">
        <span class="source-stat-icon blue"><CloudDownload :size="20" /></span>
        <div><span>24h 采集事件</span><strong>{{ formatCompact(totalEvents) }}</strong><small>覆盖 12 个业务域</small></div>
      </article>
      <article class="panel">
        <span class="source-stat-icon orange"><TimerReset :size="20" /></span>
        <div><span>平均采集延迟</span><strong>{{ averageLatency }} ms</strong><small>P95 低于 240 ms</small></div>
      </article>
      <article class="panel">
        <span class="source-stat-icon violet"><ShieldCheck :size="20" /></span>
        <div><span>传输加密</span><strong>100%</strong><small>TLS 1.3</small></div>
      </article>
    </section>

    <section class="source-grid">
      <article v-for="source in state.sources" :key="source.id" class="source-card">
        <header class="source-card-header">
          <span class="source-code">{{ source.code }}</span>
          <div class="source-title">
            <h2>{{ source.name }}</h2>
            <p>{{ source.type }}</p>
          </div>
          <StatusBadge
            :label="sourceStatus[source.status]?.label || source.status"
            :tone="sourceStatus[source.status]?.tone || 'neutral'"
            dot
          />
        </header>

        <div class="source-metrics">
          <div>
            <span>24h 事件</span>
            <strong>{{ source.events24h ? formatCompact(source.events24h) : '—' }}</strong>
          </div>
          <div>
            <span>采集延迟</span>
            <strong>{{ source.latency ? `${source.latency} ms` : '—' }}</strong>
          </div>
          <div>
            <span>吞吐速率</span>
            <strong>{{ source.throughput }}</strong>
          </div>
        </div>

        <div class="source-meta-row">
          <span><Activity :size="13" /> {{ timeAgo(source.lastSync) }}同步</span>
          <span><TimerReset :size="13" /> 保留 {{ source.retention }}</span>
          <span>{{ source.owner }}</span>
        </div>

        <footer class="source-card-footer">
          <button class="button secondary small-button" type="button" @click="testSourceConnection(source.id)">
            <RefreshCw :size="14" :class="{ spinning: source.status === 'checking' }" />
            {{ source.status === 'checking' ? '校验中' : '测试连接' }}
          </button>
          <button class="text-action" type="button" @click="openSettings(source)">
            配置 <ArrowRight :size="14" />
          </button>
        </footer>
      </article>
    </section>

    <section class="source-bottom-grid">
      <article class="panel pipeline-panel">
        <header class="panel-header">
          <div>
            <h2>采集流水线</h2>
            <p>事件从接入到可检索的完整处理链路</p>
          </div>
          <StatusBadge label="运行正常" tone="success" dot />
        </header>
        <div class="pipeline-steps">
          <div class="pipeline-step">
            <span><Network :size="18" /></span>
            <div><strong>接入层</strong><small>6 个连接器</small></div>
            <em>99.98%</em>
          </div>
          <ArrowRight :size="18" class="pipeline-arrow" />
          <div class="pipeline-step">
            <span><ShieldCheck :size="18" /></span>
            <div><strong>脱敏与校验</strong><small>Schema v1.0</small></div>
            <em>0 异常</em>
          </div>
          <ArrowRight :size="18" class="pipeline-arrow" />
          <div class="pipeline-step">
            <span><Database :size="18" /></span>
            <div><strong>缓冲队列</strong><small>2.4 GB / 10 GB</small></div>
            <em>24%</em>
          </div>
          <ArrowRight :size="18" class="pipeline-arrow" />
          <div class="pipeline-step">
            <span><Gauge :size="18" /></span>
            <div><strong>检索索引</strong><small>Refresh 8s</small></div>
            <em>可用</em>
          </div>
        </div>
        <div class="pipeline-note">
          <CheckCircle2 :size="15" />
          所有事件均携带 schemaVersion、traceId 与采集时间戳，支持端到端追溯。
        </div>
      </article>

      <article class="panel ingestion-panel">
        <header class="panel-header">
          <div>
            <h2>采集容量趋势</h2>
            <p>最近 24 小时管道负载</p>
          </div>
          <button class="icon-button small" type="button" aria-label="数据源设置" @click="openSettings(state.sources[0])">
            <Settings2 :size="16" />
          </button>
        </header>
        <ChartPanel :option="ingestionOption" height="184px" />
      </article>
    </section>

    <BaseModal
      :open="modalOpen"
      title="添加数据源"
      description="接入一个新的审计事件来源，创建后将立即执行连接校验。"
      width="600px"
      @close="modalOpen = false"
    >
      <form id="source-form" class="form-grid" @submit.prevent="submitSource">
        <label class="form-field full">
          <span>数据源名称 <em>*</em></span>
          <input v-model="form.name" placeholder="例如：财务业务系统" />
        </label>
        <label class="form-field">
          <span>接入类型</span>
          <select v-model="form.type">
            <option>Audit API</option>
            <option>Kafka Topic</option>
            <option>Webhook</option>
            <option>Access Log</option>
            <option>Event Stream</option>
          </select>
        </label>
        <label class="form-field">
          <span>数据源标识</span>
          <input v-model="form.code" maxlength="6" placeholder="FIN" />
        </label>
        <label class="form-field">
          <span>归属团队</span>
          <select v-model="form.owner">
            <option>安全平台组</option>
            <option>数据治理组</option>
            <option>云原生平台组</option>
            <option>基础架构组</option>
            <option>研发效能组</option>
          </select>
        </label>
        <label class="form-field">
          <span>数据保留</span>
          <select v-model="form.retention">
            <option>90 天</option>
            <option>180 天</option>
            <option>365 天</option>
          </select>
        </label>
        <div class="form-note full">
          <ShieldCheck :size="17" />
          <span>连接凭据将通过密钥管理服务加密保存，不会出现在浏览器日志中。</span>
        </div>
      </form>
      <template #footer>
        <button class="button secondary" type="button" @click="modalOpen = false">取消</button>
        <button class="button primary" type="submit" form="source-form">创建数据源</button>
      </template>
    </BaseModal>
  </div>
</template>
