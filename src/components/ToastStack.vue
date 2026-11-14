<script setup>
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-vue-next'
import { useAppState } from '../composables/useAppState'

defineProps({
  toasts: {
    type: Array,
    default: () => [],
  },
})

const { dismissToast } = useAppState()
const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-stack" aria-live="polite">
      <TransitionGroup name="toast">
        <div v-for="toast in toasts" :key="toast.id" class="toast" :class="`toast-${toast.type}`">
          <component :is="iconMap[toast.type] || Info" :size="19" />
          <div class="toast-copy">
            <strong>{{ toast.title }}</strong>
            <p>{{ toast.message }}</p>
          </div>
          <button class="toast-close" type="button" aria-label="关闭提示" @click="dismissToast(toast.id)">
            <X :size="16" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
