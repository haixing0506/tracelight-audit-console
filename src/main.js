import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createLogger, hydrateLogs, installGlobalErrorCapture } from './services/logger'
import './styles/main.css'

const log = createLogger('bootstrap')

hydrateLogs()
installGlobalErrorCapture()

const app = createApp(App)

app.config.errorHandler = (error, instance, info) => {
  log.error('Vue 组件运行异常', {
    error,
    component: instance?.$options?.name || 'anonymous',
    info,
  })
}

app.use(router)

router.afterEach((to, from) => {
  log.debug('路由切换完成', {
    from: from.fullPath,
    to: to.fullPath,
    title: to.meta.title,
  })
})

log.info('Tracelight 控制台启动', {
  version: '1.0.0',
  viewport: `${window.innerWidth}x${window.innerHeight}`,
  locale: navigator.language,
})

app.mount('#app')
