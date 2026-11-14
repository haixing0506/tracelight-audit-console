<script setup>
import { computed, ref } from 'vue'
import {
  Check,
  Clipboard,
  Clock3,
  Copy,
  ExternalLink,
  Fingerprint,
  Globe2,
  ShieldAlert,
  UserRound,
  X,
} from 'lucide-vue-next'
import StatusBadge from './StatusBadge.vue'
import { useEscapeToClose } from '../composables/useEscapeToClose'
import { formatDateTime, resultMeta, severityMeta } from '../utils/format'
import { createLogger } from '../services/logger'

const props = defineProps({
  open: Boolean,
  log: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close'])

useEscapeToClose(() => props.open, () => emit('close'))

const copied = ref(false)
const logger = createLogger('audit-console:log-detail')

const prettyPayload = computed(() => (props.log ? JSON.stringify(props.log.payload, null, 2) : ''))

async function copyTrace() {
  if (!props.log) return
  try {
    await navigator.clipboard.writeText(props.log.traceId)
    copied.value = true
    logger.info('复制日志链路 ID', { logId: props.log.id, traceId: props.log.traceId })
    window.setTimeout(() => (copied.value = false), 1600)
  } catch {
    logger.warn('剪贴板写入失败', { logId: props.log.id })
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open && log" class="drawer-layer" @mousedown.self="emit('close')">
        <aside class="detail-drawer" role="dialog" aria-modal="true">
          <header class="drawer-header">
            <div>
              <span class="eyebrow">AUDIT EVENT</span>
              <div class="drawer-title-row">
                <h2>{{ log.action }}</h2>
                <StatusBadge
                  :label="severityMeta[log.level]?.label || log.level"
                  :tone="severityMeta[log.level]?.tone"
                  dot
                />
              </div>
              <p>{{ log.eventName }}</p>
            </div>
            <button class="icon-button" type="button" aria-label="关闭详情" @click="emit('close')">
              <X :size="19" />
            </button>
          </header>

          <div class="drawer-body">
            <section class="detail-alert">
              <ShieldAlert :size="20" />
              <div>
                <strong>风险评分 {{ log.riskScore }}</strong>
                <p>{{ log.message }}</p>
              </div>
            </section>

            <section class="detail-block">
              <h3>事件信息</h3>
              <div class="detail-grid">
                <div>
                  <span><Clock3 :size="14" /> 发生时间</span>
                  <strong>{{ formatDateTime(log.occurredAt) }}</strong>
                </div>
                <div>
                  <span><Fingerprint :size="14" /> 事件 ID</span>
                  <strong class="mono">{{ log.id }}</strong>
                </div>
                <div>
                  <span><UserRound :size="14" /> 操作人</span>
                  <strong>{{ log.actor.name }}</strong>
                  <small>{{ log.actor.email }}</small>
                </div>
                <div>
                  <span><Globe2 :size="14" /> 来源位置</span>
                  <strong>{{ log.region }}</strong>
                  <small>{{ log.ip }}</small>
                </div>
              </div>
            </section>

            <section class="detail-block">
              <h3>请求上下文</h3>
              <div class="request-line">
                <span class="method-chip">{{ log.method }}</span>
                <code>{{ log.path }}</code>
              </div>
              <dl class="kv-list">
                <div><dt>数据源</dt><dd>{{ log.source }}</dd></div>
                <div><dt>结果</dt><dd><StatusBadge :label="resultMeta[log.result]?.label" :tone="resultMeta[log.result]?.tone" /></dd></div>
                <div><dt>响应耗时</dt><dd>{{ log.duration }} ms</dd></div>
                <div><dt>请求 ID</dt><dd class="mono">{{ log.requestId }}</dd></div>
              </dl>
            </section>

            <section class="detail-block">
              <div class="block-heading">
                <h3>结构化载荷</h3>
                <button type="button" class="text-action">
                  <ExternalLink :size="14" /> 查看原始日志
                </button>
              </div>
              <pre class="json-view">{{ prettyPayload }}</pre>
            </section>

            <section class="detail-block">
              <h3>链路追踪</h3>
              <div class="trace-row">
                <code>{{ log.traceId }}</code>
                <button type="button" class="icon-button small" aria-label="复制链路 ID" @click="copyTrace">
                  <Check v-if="copied" :size="15" />
                  <Copy v-else :size="15" />
                </button>
              </div>
              <div class="trace-timeline">
                <div class="trace-step complete"><span /><div><strong>身份网关</strong><small>鉴权通过 · 24ms</small></div></div>
                <div class="trace-step complete"><span /><div><strong>策略引擎</strong><small>规则命中 · 62ms</small></div></div>
                <div class="trace-step"><span /><div><strong>审计管道</strong><small>事件已归档 · 11ms</small></div></div>
              </div>
            </section>
          </div>

          <footer class="drawer-footer">
            <button class="button secondary" type="button">
              <Clipboard :size="16" /> 标记已复核
            </button>
            <button class="button primary" type="button" @click="emit('close')">
              完成
            </button>
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>
