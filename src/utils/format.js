const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

export function formatDateTime(value) {
  if (!value) return '—'
  return dateTimeFormatter.format(new Date(value)).replaceAll('/', '-')
}

export function formatTime(value) {
  if (!value) return '—'
  return timeFormatter.format(new Date(value))
}

export function timeAgo(value) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 20) return '刚刚'
  if (seconds < 60) return `${seconds} 秒前`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`
  return `${Math.floor(seconds / 86400)} 天前`
}

export function formatCompact(value) {
  return new Intl.NumberFormat('zh-CN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export const severityMeta = {
  critical: { label: '严重', tone: 'critical' },
  high: { label: '高危', tone: 'high' },
  medium: { label: '中危', tone: 'medium' },
  low: { label: '低危', tone: 'low' },
  info: { label: '信息', tone: 'info' },
}

export const resultMeta = {
  success: { label: '成功', tone: 'success' },
  failed: { label: '失败', tone: 'critical' },
  blocked: { label: '已拦截', tone: 'high' },
}

export const statusMeta = {
  open: { label: '待处理', tone: 'critical' },
  investigating: { label: '调查中', tone: 'medium' },
  resolved: { label: '已解决', tone: 'success' },
}
