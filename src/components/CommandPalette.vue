<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight,
  Database,
  FileClock,
  LayoutDashboard,
  Search,
  ShieldAlert,
  ScrollText,
} from 'lucide-vue-next'

const props = defineProps({
  open: Boolean,
})

const emit = defineEmits(['update:open'])
const router = useRouter()
const query = ref('')
const activeIndex = ref(0)
const inputRef = ref(null)

const commands = [
  { label: '安全运营总览', caption: '查看实时风险与采集态势', path: '/', icon: LayoutDashboard },
  { label: '检索审计日志', caption: '按事件、操作人或来源检索', path: '/logs', icon: ScrollText },
  { label: '处理风险告警', caption: '查看当前待处理安全事件', path: '/alerts', icon: ShieldAlert },
  { label: '数据源管理', caption: '检查采集链路和连接状态', path: '/sources', icon: Database },
  { label: '运行日志', caption: '查看结构化前端运行日志', path: '/operations', icon: FileClock },
]

const filtered = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  if (!keyword) return commands
  return commands.filter((command) =>
    `${command.label} ${command.caption}`.toLowerCase().includes(keyword),
  )
})

function close() {
  emit('update:open', false)
}

function go(path) {
  router.push(path)
  close()
}

function handleKeydown(event) {
  if (event.key === 'Escape') return close()
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, filtered.value.length - 1)
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
  }
  if (event.key === 'Enter' && filtered.value[activeIndex.value]) {
    go(filtered.value[activeIndex.value].path)
  }
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      query.value = ''
      activeIndex.value = 0
      await nextTick()
      inputRef.value?.focus()
    }
  },
)

watch(query, () => {
  activeIndex.value = 0
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="command-layer" @mousedown.self="close">
        <section class="command-dialog" @keydown="handleKeydown">
          <div class="command-input-row">
            <Search :size="19" />
            <input
              ref="inputRef"
              v-model="query"
              placeholder="搜索页面、日志或操作…"
              aria-label="全局搜索"
            />
            <kbd>ESC</kbd>
          </div>
          <div class="command-results">
            <p class="command-label">快速跳转</p>
            <button
              v-for="(command, index) in filtered"
              :key="command.path"
              class="command-item"
              :class="{ active: index === activeIndex }"
              type="button"
              @mouseenter="activeIndex = index"
              @click="go(command.path)"
            >
              <span class="command-icon"><component :is="command.icon" :size="18" /></span>
              <span class="command-copy">
                <strong>{{ command.label }}</strong>
                <small>{{ command.caption }}</small>
              </span>
              <ArrowRight :size="16" class="command-arrow" />
            </button>
            <div v-if="!filtered.length" class="command-empty">
              没有匹配的页面或操作
            </div>
          </div>
          <footer class="command-footer">
            <span><kbd>↑</kbd><kbd>↓</kbd> 导航</span>
            <span><kbd>↵</kbd> 打开</span>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
