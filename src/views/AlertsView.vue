<script setup>
import { computed, reactive, ref } from 'vue'
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  TimerReset,
  UserCheck,
} from 'lucide-vue-next'
import AlertDetailDrawer from '../components/AlertDetailDrawer.vue'
import BaseModal from '../components/BaseModal.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { useAppState } from '../composables/useAppState'
import { createLogger } from '../services/logger'
import { severityMeta, statusMeta, timeAgo } from '../utils/format'

const { state, acknowledgeAlert, pushToast } = useAppState()
const logger = createLogger('audit-console:alerts')

const activeTab = ref('all')
const severity = ref('all')
const query = ref('')
const selectedId = ref(null)
const drawerOpen = ref(false)
const ruleModalOpen = ref(false)
const ruleForm = reactive({
  name: '',
  source: '身份中心 IAM',
  severity: 'high',
  expression: '',
  description: '',
})

const tabs = computed(() => [
  { label: '全部告警', value: 'all', count: state.alerts.length },
  { label: '待处理', value: 'open', count: state.alerts.filter((item) => item.status === 'open').length },
  { label: '调查中', value: 'investigating', count: state.alerts.filter((item) => item.status === 'investigating').length },
  { label: '已解决', value: 'resolved', count: state.alerts.filter((item) => item.status === 'resolved').length },
])

const filteredAlerts = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  return state.alerts.filter((alert) => {
    const matchesTab = activeTab.value === 'all' || alert.status === activeTab.value
    const matchesSeverity = severity.value === 'all' || alert.severity === severity.value
    const matchesQuery =
      !keyword || `${alert.id} ${alert.title} ${alert.source} ${alert.rule}`.toLowerCase().includes(keyword)
    return matchesTab && matchesSeverity && matchesQuery
  })
})

const selectedAlert = computed(() => state.alerts.find((alert) => alert.id === selectedId.value) || null)
const openCount = computed(() => state.alerts.filter((item) => item.status === 'open').length)
const investigatingCount = computed(
  () => state.alerts.filter((item) => item.status === 'investigating').length,
)
const resolvedCount = computed(
  () => state.alerts.filter((item) => item.status === 'resolved').length,
)

function openAlert(alert) {
  selectedId.value = alert.id
  drawerOpen.value = true
  logger.info('打开安全告警详情', {
    alertId: alert.id,
    severity: alert.severity,
    status: alert.status,
  })
}

function advanceAlert(id) {
  acknowledgeAlert(id)
}

function resolveAlert(id) {
  const alert = state.alerts.find((item) => item.id === id)
  if (!alert) return
  alert.status = 'resolved'
  logger.info('安全告警已解决', {
    alertId: alert.id,
    operator: 'lin.che@tracelight.cn',
    resolution: 'manual_review',
  })
  pushToast('success', '告警已解决', `${alert.id} 已完成审计复核并关闭`)
}

function submitRule() {
  if (!ruleForm.name.trim() || !ruleForm.expression.trim()) {
    pushToast('warning', '请补全规则信息', '规则名称与检测表达式为必填项')
    return
  }
  logger.info('创建检测规则', {
    ruleName: ruleForm.name,
    source: ruleForm.source,
    severity: ruleForm.severity,
    expression: ruleForm.expression,
  })
  pushToast('success', '检测规则已创建', `${ruleForm.name} 将在保存后 30 秒内生效`)
  ruleModalOpen.value = false
  Object.assign(ruleForm, {
    name: '',
    source: '身份中心 IAM',
    severity: 'high',
    expression: '',
    description: '',
  })
}

function exportReport() {
  const header = ['告警ID', '标题', '级别', '状态', '规则', '数据源', '负责人', '关联事件']
  const rows = filteredAlerts.value.map((alert) => [
    alert.id,
    alert.title,
    severityMeta[alert.severity]?.label,
    statusMeta[alert.status]?.label,
    alert.rule,
    alert.source,
    alert.assignee,
    alert.eventCount,
  ])
  const content = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([`\ufeff${content}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `tracelight-alerts-${Date.now()}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
  logger.info('导出安全告警报告', { rows: rows.length })
  pushToast('success', '报告已导出', `共导出 ${rows.length} 条安全告警`)
}
</script>

<template>
  <div class="page alerts-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">THREAT RESPONSE</p>
        <h1>风险告警</h1>
        <p class="page-subtitle">集中研判异常行为，跟踪响应进度并闭环处置安全事件</p>
      </div>
      <div class="page-actions">
        <button class="button secondary" type="button" @click="exportReport">
          <Download :size="16" /> 导出报告
        </button>
        <button class="button primary" type="button" @click="ruleModalOpen = true">
          <Plus :size="16" /> 新建规则
        </button>
      </div>
    </header>

    <section class="alert-stat-grid">
      <article>
        <span class="alert-stat-icon critical"><ShieldAlert :size="19" /></span>
        <div><span>待处理</span><strong>{{ openCount }}</strong><small>其中 1 条严重</small></div>
      </article>
      <article>
        <span class="alert-stat-icon medium"><UserCheck :size="19" /></span>
        <div><span>调查中</span><strong>{{ investigatingCount }}</strong><small>已分配负责人</small></div>
      </article>
      <article>
        <span class="alert-stat-icon success"><ShieldCheck :size="19" /></span>
        <div><span>今日已解决</span><strong>{{ resolvedCount }}</strong><small>闭环率 64%</small></div>
      </article>
      <article>
        <span class="alert-stat-icon blue"><TimerReset :size="19" /></span>
        <div><span>平均响应时间</span><strong>3m 42s</strong><small>较上周快 18 秒</small></div>
      </article>
    </section>

    <section class="panel alerts-list-panel">
      <header class="alerts-toolbar">
        <div class="tab-bar" role="tablist">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            :class="{ active: activeTab === tab.value }"
            @click="activeTab = tab.value"
          >
            {{ tab.label }}
            <span>{{ tab.count }}</span>
          </button>
        </div>
        <div class="alerts-filters">
          <label class="inline-search">
            <Search :size="16" />
            <input v-model="query" placeholder="搜索告警或规则" aria-label="搜索告警" />
          </label>
          <select v-model="severity" class="compact-select" aria-label="按风险级别筛选">
            <option value="all">全部级别</option>
            <option value="critical">严重</option>
            <option value="high">高危</option>
            <option value="medium">中危</option>
            <option value="low">低危</option>
          </select>
        </div>
      </header>

      <div class="alert-list">
        <article
          v-for="alert in filteredAlerts"
          :key="alert.id"
          class="alert-list-item"
          :class="`severity-${alert.severity}`"
          @click="openAlert(alert)"
        >
          <div class="alert-risk-block">
            <StatusBadge
              :label="severityMeta[alert.severity]?.label"
              :tone="severityMeta[alert.severity]?.tone"
              dot
            />
            <span class="alert-rule mono">{{ alert.rule }}</span>
          </div>
          <div class="alert-main-copy">
            <div class="alert-title-line">
              <h3>{{ alert.title }}</h3>
              <StatusBadge :label="statusMeta[alert.status]?.label" :tone="statusMeta[alert.status]?.tone" />
            </div>
            <p>{{ alert.description }}</p>
            <div class="alert-meta">
              <span>{{ alert.id }}</span>
              <span>{{ alert.source }}</span>
              <span>{{ alert.eventCount }} 条关联事件</span>
              <span>{{ timeAgo(alert.lastSeen) }}触发</span>
            </div>
          </div>
          <div class="alert-owner">
            <span>负责人</span>
            <div><span class="mini-avatar">{{ alert.assignee === '未分配' ? '?' : alert.assignee.slice(0, 1) }}</span>{{ alert.assignee }}</div>
          </div>
          <button type="button" class="icon-button alert-row-action" aria-label="查看告警详情">
            <ArrowRight :size="17" />
          </button>
        </article>
        <div v-if="!filteredAlerts.length" class="empty-state">
          <CheckCircle2 :size="26" />
          <strong>当前条件下没有告警</strong>
          <p>可以切换状态或清除搜索条件后查看。</p>
        </div>
      </div>
    </section>

    <AlertDetailDrawer
      :open="drawerOpen"
      :alert="selectedAlert"
      @close="drawerOpen = false"
      @advance="advanceAlert"
      @resolve="resolveAlert"
    />

    <BaseModal
      :open="ruleModalOpen"
      title="新建检测规则"
      description="定义触发条件与响应级别，规则将在保存后自动下发到检测引擎。"
      width="620px"
      @close="ruleModalOpen = false"
    >
      <form id="rule-form" class="form-grid" @submit.prevent="submitRule">
        <label class="form-field full">
          <span>规则名称 <em>*</em></span>
          <input v-model="ruleForm.name" placeholder="例如：非工作时段管理员权限变更" />
        </label>
        <label class="form-field">
          <span>数据源</span>
          <select v-model="ruleForm.source">
            <option>身份中心 IAM</option>
            <option>客户数据平台</option>
            <option>API 网关</option>
            <option>配置中心</option>
            <option>统一认证</option>
          </select>
        </label>
        <label class="form-field">
          <span>风险级别</span>
          <select v-model="ruleForm.severity">
            <option value="critical">严重</option>
            <option value="high">高危</option>
            <option value="medium">中危</option>
            <option value="low">低危</option>
          </select>
        </label>
        <label class="form-field full">
          <span>检测表达式 <em>*</em></span>
          <textarea
            v-model="ruleForm.expression"
            rows="4"
            placeholder="event.action == 'role.grant' and hour(timestamp) not in [8..19]"
          />
          <small>支持事件字段、布尔条件以及时间窗口聚合表达式。</small>
        </label>
        <label class="form-field full">
          <span>规则说明</span>
          <textarea v-model="ruleForm.description" rows="3" placeholder="补充触发背景与建议处置方式" />
        </label>
      </form>
      <template #footer>
        <button class="button secondary" type="button" @click="ruleModalOpen = false">取消</button>
        <button class="button primary" type="submit" form="rule-form">创建并启用</button>
      </template>
    </BaseModal>
  </div>
</template>
