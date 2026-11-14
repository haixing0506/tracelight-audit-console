<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Bell, CircleHelp, Menu, Search, Settings2 } from 'lucide-vue-next'
import { useAppState } from '../composables/useAppState'

defineEmits(['toggle-nav', 'open-command'])

const route = useRoute()
const { state, openAlerts } = useAppState()
const currentGroup = computed(() => route.meta.group || '工作台')
</script>

<template>
  <header class="topbar">
    <div class="topbar-leading">
      <button class="icon-button mobile-menu" aria-label="打开导航" @click="$emit('toggle-nav')">
        <Menu :size="20" />
      </button>
      <div class="breadcrumbs">
        <span>{{ currentGroup }}</span>
        <span class="breadcrumb-slash">/</span>
        <strong>{{ route.meta.title }}</strong>
      </div>
    </div>

    <div class="topbar-actions">
      <button class="command-trigger" type="button" @click="$emit('open-command')">
        <Search :size="16" />
        <span>搜索日志、告警或页面</span>
        <kbd>Ctrl K</kbd>
      </button>

      <div class="stream-indicator" :class="{ paused: !state.liveStream }">
        <span class="live-dot" />
        <span>{{ state.liveStream ? '实时采集中' : '实时流已暂停' }}</span>
      </div>

      <button class="icon-button topbar-icon" type="button" aria-label="帮助">
        <CircleHelp :size="18" />
      </button>
      <button class="icon-button topbar-icon" type="button" aria-label="设置">
        <Settings2 :size="18" />
      </button>
      <button class="icon-button topbar-icon notification-button" type="button" aria-label="通知">
        <Bell :size="18" />
        <span v-if="openAlerts.length" class="notification-dot">{{ openAlerts.length }}</span>
      </button>

      <button class="profile-button" type="button">
        <span class="profile-avatar">LC</span>
        <span class="profile-copy">
          <strong>林澈</strong>
          <small>安全审计员</small>
        </span>
        <span class="profile-caret">⌄</span>
      </button>
    </div>
  </header>
</template>
