<script setup>
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileSearch,
  Fingerprint,
  ShieldAlert,
  UserRound,
  X,
} from 'lucide-vue-next'
import StatusBadge from './StatusBadge.vue'
import { useEscapeToClose } from '../composables/useEscapeToClose'
import { formatDateTime, severityMeta, statusMeta, timeAgo } from '../utils/format'

const props = defineProps({
  open: Boolean,
  alert: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'advance', 'resolve'])

useEscapeToClose(() => props.open, () => emit('close'))
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open && alert" class="drawer-layer" @mousedown.self="emit('close')">
        <aside class="detail-drawer alert-drawer" role="dialog" aria-modal="true">
          <header class="drawer-header">
            <div>
              <span class="eyebrow">SECURITY INCIDENT</span>
              <div class="drawer-title-row">
                <h2>{{ alert.title }}</h2>
                <StatusBadge
                  :label="severityMeta[alert.severity]?.label"
                  :tone="severityMeta[alert.severity]?.tone"
                  dot
                />
              </div>
              <p>{{ alert.id }} · 触发规则 {{ alert.rule }}</p>
            </div>
            <button class="icon-button" type="button" aria-label="关闭详情" @click="emit('close')">
              <X :size="19" />
            </button>
          </header>

          <div class="drawer-body">
            <section class="detail-alert">
              <ShieldAlert :size="20" />
              <div>
                <strong>风险摘要</strong>
                <p>{{ alert.description }}</p>
              </div>
            </section>

            <section class="incident-status-strip">
              <div>
                <span>当前状态</span>
                <StatusBadge
                  :label="statusMeta[alert.status]?.label"
                  :tone="statusMeta[alert.status]?.tone"
                  dot
                />
              </div>
              <div><span>负责人</span><strong>{{ alert.assignee }}</strong></div>
              <div><span>关联事件</span><strong>{{ alert.eventCount }} 条</strong></div>
            </section>

            <section class="detail-block">
              <h3>检测信息</h3>
              <div class="detail-grid">
                <div>
                  <span><Activity :size="14" /> 数据源</span>
                  <strong>{{ alert.source }}</strong>
                </div>
                <div>
                  <span><Fingerprint :size="14" /> 规则编号</span>
                  <strong class="mono">{{ alert.rule }}</strong>
                </div>
                <div>
                  <span><Clock3 :size="14" /> 最近触发</span>
                  <strong>{{ formatDateTime(alert.lastSeen) }}</strong>
                  <small>{{ timeAgo(alert.lastSeen) }}</small>
                </div>
                <div>
                  <span><UserRound :size="14" /> 当前处理人</span>
                  <strong>{{ alert.assignee }}</strong>
                </div>
              </div>
            </section>

            <section class="detail-block">
              <h3>影响资产</h3>
              <div class="asset-list">
                <div>
                  <span class="asset-icon"><FileSearch :size="16" /></span>
                  <div><strong>production / payments</strong><small>生产环境 · 支付域</small></div>
                  <StatusBadge label="受影响" tone="high" />
                </div>
                <div>
                  <span class="asset-icon"><UserRound :size="16" /></span>
                  <div><strong>account / ops-028</strong><small>高权限运维账号</small></div>
                  <StatusBadge label="已隔离" tone="success" />
                </div>
              </div>
            </section>

            <section class="detail-block">
              <h3>处置时间线</h3>
              <div class="incident-timeline">
                <div class="timeline-entry complete">
                  <span />
                  <div><strong>风险规则命中</strong><p>规则引擎检测到异常操作并创建安全告警。</p><small>{{ formatDateTime(alert.lastSeen) }}</small></div>
                </div>
                <div class="timeline-entry complete">
                  <span />
                  <div><strong>自动响应策略执行</strong><p>已冻结关联会话，阻止后续高风险请求。</p><small>触发后 1.2 秒</small></div>
                </div>
                <div class="timeline-entry">
                  <span />
                  <div><strong>等待安全审计员确认</strong><p>建议核对变更工单与责任人，确认后关闭事件。</p><small>待处理</small></div>
                </div>
              </div>
            </section>

            <section class="recommendation-box">
              <CheckCircle2 :size="18" />
              <div>
                <strong>处置建议</strong>
                <p>核验账号近 24 小时操作记录，确认是否存在合法变更工单；如无授权，立即撤销新增角色并轮换关联凭据。</p>
              </div>
            </section>
          </div>

          <footer class="drawer-footer">
            <button class="button secondary" type="button" @click="emit('resolve', alert.id)">
              <CheckCircle2 :size="16" />
              标记已解决
            </button>
            <button
              class="button primary"
              type="button"
              :disabled="alert.status !== 'open'"
              @click="emit('advance', alert.id)"
            >
              {{ alert.status === 'open' ? '开始调查' : alert.status === 'investigating' ? '调查进行中' : '事件已解决' }}
              <ArrowRight :size="16" />
            </button>
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>
