<script setup>
defineProps({
  label: {
    type: String,
    required: true,
  },
  tone: {
    type: String,
    default: 'neutral',
  },
  dot: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <span class="status-badge" :class="`tone-${tone}`">
    <span v-if="dot" class="badge-dot" />
    {{ label }}
  </span>
</template>
