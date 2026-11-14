import { onBeforeUnmount, onMounted } from 'vue'

export function useEscapeToClose(isOpen, close) {
  function handleKeydown(event) {
    if (event.key !== 'Escape' || !isOpen()) return
    event.preventDefault()
    close()
  }

  onMounted(() => window.addEventListener('keydown', handleKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
}
