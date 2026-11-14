<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  Activity,
  ArrowUpRight,
  Database,
  FileClock,
  LayoutDashboard,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-vue-next'

defineProps({
  open: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['close'])

const route = useRoute()

const navGroups = [
  {
    label: '工作台',
    items: [
      { label: '安全运营总览', path: '/', icon: LayoutDashboard },
      { label: '审计日志', path: '/logs', icon: ScrollText },
      { label: '风险告警', path: '/alerts', icon: ShieldAlert, badge: '6' },
    ],
  },
  {
    label: '管理',
    items: [
      { label: '数据源管理', path: '/sources', icon: Database },
      { label: '运行日志', path: '/operations', icon: FileClock },
    ],
  },
]

const activePath = computed(() => route.path)
</script>

<template>
  <aside class="sidebar" :class="{ 'is-open': open }">
    <div class="sidebar-brand">
      <div class="brand-mark" aria-hidden="true">
        <ShieldCheck :size="22" :stroke-width="2.2" />
      </div>
      <div class="brand-copy">
        <strong>Tracelight</strong>
        <span>SECURITY AUDIT</span>
      </div>
      <button class="icon-button sidebar-close" aria-label="关闭导航" @click="$emit('close')">
        <X :size="18" />
      </button>
    </div>

    <button class="workspace-switcher" type="button">
      <span class="workspace-avatar">N</span>
      <span>
        <small>当前工作空间</small>
        <strong>Nexa Cloud</strong>
      </span>
      <span class="workspace-caret">⌄</span>
    </button>

    <nav class="sidebar-nav" aria-label="主导航">
      <section v-for="group in navGroups" :key="group.label" class="nav-group">
        <p class="nav-label">{{ group.label }}</p>
        <RouterLink
          v-for="item in group.items"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: activePath === item.path }"
          @click="$emit('close')"
        >
          <component :is="item.icon" :size="18" :stroke-width="1.8" />
          <span>{{ item.label }}</span>
          <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
        </RouterLink>
      </section>
    </nav>

    <div class="sidebar-foot">
      <div class="retention-card">
        <div class="retention-heading">
          <span><Activity :size="15" /> 日志存储</span>
          <strong>68%</strong>
        </div>
        <div class="usage-track"><span style="width: 68%" /></div>
        <p>已使用 680 GB / 1 TB</p>
        <button type="button">管理存储 <ArrowUpRight :size="14" /></button>
      </div>
      <div class="sidebar-status">
        <span class="live-dot" />
        <span>全部服务运行正常</span>
        <span class="status-version">v1.0</span>
      </div>
    </div>
  </aside>
  <button
    v-if="open"
    class="sidebar-scrim"
    aria-label="关闭导航遮罩"
    @click="$emit('close')"
  />
</template>
