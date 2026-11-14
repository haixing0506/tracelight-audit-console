<script setup>
import { X } from 'lucide-vue-next'
import { useEscapeToClose } from '../composables/useEscapeToClose'

const props = defineProps({
  open: Boolean,
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  width: {
    type: String,
    default: '560px',
  },
})

const emit = defineEmits(['close'])

useEscapeToClose(() => props.open, () => emit('close'))
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-layer" @mousedown.self="emit('close')">
        <section class="modal-card" :style="{ maxWidth: width }" role="dialog" aria-modal="true">
          <header class="modal-header">
            <div>
              <h2>{{ title }}</h2>
              <p v-if="description">{{ description }}</p>
            </div>
            <button class="icon-button" type="button" aria-label="关闭弹窗" @click="emit('close')">
              <X :size="18" />
            </button>
          </header>
          <div class="modal-body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
