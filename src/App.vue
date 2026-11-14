<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import AppSidebar from './components/AppSidebar.vue'
import CommandPalette from './components/CommandPalette.vue'
import ToastStack from './components/ToastStack.vue'
import { useAppState } from './composables/useAppState'

const navOpen = ref(false)
const commandOpen = ref(false)
const { state, addLiveLog } = useAppState()
let liveTimer

function handleGlobalKeydown(event) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    commandOpen.value = true
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
  liveTimer = window.setInterval(addLiveLog, 6800)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.clearInterval(liveTimer)
})
</script>

<template>
  <div class="app-shell">
    <AppSidebar :open="navOpen" @close="navOpen = false" />
    <div class="workspace">
      <AppHeader
        @toggle-nav="navOpen = !navOpen"
        @open-command="commandOpen = true"
      />
      <main class="page-content">
        <RouterView v-slot="{ Component, route }">
          <Transition name="page-fade" mode="out-in">
            <component :is="Component" :key="route.path" />
          </Transition>
        </RouterView>
      </main>
    </div>

    <CommandPalette v-model:open="commandOpen" />
    <ToastStack :toasts="state.toasts" />
  </div>
</template>
