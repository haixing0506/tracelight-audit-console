const actors = [
  { name: '周屿', role: '平台管理员', email: 'zhou.yu@tracelight.cn' },
  { name: '林澈', role: '安全审计员', email: 'lin.che@tracelight.cn' },
  { name: '许言', role: '运维工程师', email: 'xu.yan@tracelight.cn' },
  { name: '沈鹿', role: '研发工程师', email: 'shen.lu@tracelight.cn' },
  { name: '宋禾', role: '数据管理员', email: 'song.he@tracelight.cn' },
  { name: '外部应用', role: 'Service Account', email: 'svc-billing@internal' },
]

const eventTemplates = [
  {
    level: 'critical',
    action: '管理员权限提升',
    eventName: 'iam.role.privilege_escalation',
    path: '/api/v1/roles/grant',
    method: 'PUT',
    target: 'user:ops-028',
    source: '身份中心 IAM',
    message: '检测到非工作时段向运维账号授予超级管理员角色',
    tags: ['权限变更', '管理员', '非工作时段'],
    riskScore: 94,
  },
  {
    level: 'high',
    action: '批量导出客户数据',
    eventName: 'crm.export.customer_data',
    path: '/api/v2/customers/export',
    method: 'POST',
    target: 'dataset:customer-profile',
    source: '客户数据平台',
    message: '单次导出记录数超过 10,000 条，触发数据外发保护策略',
    tags: ['数据外发', '批量操作'],
    riskScore: 86,
  },
  {
    level: 'high',
    action: '敏感配置被修改',
    eventName: 'config.secret.update',
    path: '/api/v1/config/secrets',
    method: 'PATCH',
    target: 'config:payment-gateway',
    source: '配置中心',
    message: '支付网关密钥配置发生变更，变更前后指纹不一致',
    tags: ['配置变更', '支付'],
    riskScore: 81,
  },
  {
    level: 'medium',
    action: '异地登录成功',
    eventName: 'auth.login.new_region',
    path: '/api/v1/sessions',
    method: 'POST',
    target: 'session:web-3721',
    source: '统一认证',
    message: '账号在新的地理位置完成登录，设备指纹已通过校验',
    tags: ['登录', '地理位置'],
    riskScore: 62,
  },
  {
    level: 'medium',
    action: '访问策略被更新',
    eventName: 'gateway.policy.update',
    path: '/api/v1/access-policies/p-204',
    method: 'PATCH',
    target: 'policy:p-204',
    source: 'API 网关',
    message: '研发环境访问策略由白名单模式切换为宽松模式',
    tags: ['访问控制', '策略'],
    riskScore: 58,
  },
  {
    level: 'low',
    action: '成员加入工作空间',
    eventName: 'workspace.member.invite',
    path: '/api/v1/workspaces/w-18/members',
    method: 'POST',
    target: 'workspace:w-18',
    source: '协作平台',
    message: '工作空间新增一名只读成员，权限范围符合组织策略',
    tags: ['成员管理'],
    riskScore: 24,
  },
  {
    level: 'info',
    action: '审批流程完成',
    eventName: 'workflow.approval.completed',
    path: '/api/v1/approvals/a-903',
    method: 'POST',
    target: 'approval:a-903',
    source: '流程引擎',
    message: '生产环境发布审批已通过，所有审批节点完成',
    tags: ['审批', '发布'],
    riskScore: 12,
  },
  {
    level: 'high',
    action: '失败登录次数超限',
    eventName: 'auth.login.bruteforce',
    path: '/api/v1/sessions',
    method: 'POST',
    target: 'account:fin-ops-07',
    source: '统一认证',
    message: '同一来源地址在 5 分钟内连续失败 18 次，账号已临时锁定',
    tags: ['暴力破解', '账号锁定'],
    riskScore: 88,
  },
]

const regions = [
  { city: '上海', code: 'CN-SH', ip: '10.24.18.7' },
  { city: '北京', code: 'CN-BJ', ip: '10.12.44.19' },
  { city: '深圳', code: 'CN-SZ', ip: '10.31.6.82' },
  { city: '杭州', code: 'CN-HZ', ip: '10.18.27.11' },
  { city: '新加坡', code: 'AP-SG', ip: '172.16.8.34' },
  { city: '法兰克福', code: 'EU-DE', ip: '192.168.42.6' },
]

function createSeed(seed) {
  let value = seed
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296
    return value / 4294967296
  }
}

function traceId(random) {
  return Array.from({ length: 4 }, () => Math.floor(random() * 65535).toString(16).padStart(4, '0')).join('')
}

function buildLog(template, index, random, minutesAgo) {
  const actor = actors[Math.floor(random() * actors.length)]
  const region = regions[Math.floor(random() * regions.length)]
  const occurredAt = new Date(Date.now() - minutesAgo * 60 * 1000 - Math.floor(random() * 40) * 1000)
  const resultRoll = random()
  const result = resultRoll > 0.91 ? 'failed' : resultRoll > 0.83 ? 'blocked' : 'success'
  const trace = traceId(random)

  return {
    id: `AUD-${occurredAt.getFullYear()}${String(occurredAt.getMonth() + 1).padStart(2, '0')}-${String(48210 + index).padStart(5, '0')}`,
    occurredAt: occurredAt.toISOString(),
    level: template.level,
    action: template.action,
    eventName: template.eventName,
    actor,
    target: template.target,
    source: template.source,
    region: `${region.city} · ${region.code}`,
    ip: region.ip,
    result,
    method: template.method,
    path: template.path,
    riskScore: Math.max(8, template.riskScore + Math.floor(random() * 9) - 4),
    tags: template.tags,
    traceId: trace,
    requestId: `req_${trace.slice(0, 12)}`,
    duration: Math.floor(20 + random() * 640),
    message: template.message,
    payload: {
      actorId: `usr_${String(1024 + Math.floor(random() * 800))}`,
      target: template.target,
      result,
      sourceIp: region.ip,
      userAgent: random() > 0.5 ? 'Mozilla/5.0 Chrome/138.0' : 'Tracelight-SDK/2.4.1',
      policy: template.tags[0],
      riskSignals: template.tags.slice(1),
    },
  }
}

const seededRandom = createSeed(20261114)

export const mockLogs = Array.from({ length: 46 }, (_, index) => {
  const template = eventTemplates[index % eventTemplates.length]
  return buildLog(template, index, seededRandom, index * 13 + Math.floor(seededRandom() * 9))
}).sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))

export function createLiveLog(sequence = 0) {
  const random = Math.random
  const template = eventTemplates[sequence % eventTemplates.length]
  return buildLog(template, 900 + sequence, random, 0)
}

export const mockAlerts = [
  {
    id: 'ALT-2068',
    title: '非工作时段管理员权限提升',
    description: '运维账号 ops-028 在 02:14 被授予超级管理员角色，操作来源为非受信网络。',
    severity: 'critical',
    status: 'open',
    rule: 'IAM-004',
    source: '身份中心 IAM',
    eventCount: 6,
    assignee: '未分配',
    lastSeen: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
  {
    id: 'ALT-2067',
    title: '短时间内大批量导出客户数据',
    description: '客户数据平台检测到 12,842 条记录被导出，超出账号历史 30 日均值的 9.6 倍。',
    severity: 'high',
    status: 'open',
    rule: 'DLP-012',
    source: '客户数据平台',
    eventCount: 3,
    assignee: '林澈',
    lastSeen: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
  },
  {
    id: 'ALT-2066',
    title: '支付网关密钥配置发生变更',
    description: '支付网关 secret 指纹在 10 分钟内连续变更两次，尚未匹配发布单。',
    severity: 'high',
    status: 'investigating',
    rule: 'CFG-008',
    source: '配置中心',
    eventCount: 4,
    assignee: '许言',
    lastSeen: new Date(Date.now() - 54 * 60 * 1000).toISOString(),
  },
  {
    id: 'ALT-2065',
    title: '异常来源登录失败次数超限',
    description: '同一来源地址在 5 分钟内连续验证失败 18 次，目标账号已临时锁定。',
    severity: 'high',
    status: 'investigating',
    rule: 'AUTH-021',
    source: '统一认证',
    eventCount: 18,
    assignee: '林澈',
    lastSeen: new Date(Date.now() - 81 * 60 * 1000).toISOString(),
  },
  {
    id: 'ALT-2064',
    title: '研发环境访问策略被放宽',
    description: '访问策略由 IP 白名单切换为宽松模式，变更人属于研发效能组。',
    severity: 'medium',
    status: 'open',
    rule: 'ACL-003',
    source: 'API 网关',
    eventCount: 2,
    assignee: '未分配',
    lastSeen: new Date(Date.now() - 2.4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ALT-2063',
    title: '第三方应用权限范围扩大',
    description: 'OAuth 应用 billing-sync 新增了读取组织成员信息的权限。',
    severity: 'medium',
    status: 'resolved',
    rule: 'OAUTH-006',
    source: '身份中心 IAM',
    eventCount: 1,
    assignee: '周屿',
    lastSeen: new Date(Date.now() - 4.8 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ALT-2062',
    title: '日志采集延迟超过阈值',
    description: 'CRM 审计数据源 P95 延迟达到 8.4 秒，超过 5 秒告警阈值。',
    severity: 'low',
    status: 'resolved',
    rule: 'OBS-015',
    source: '数据管道',
    eventCount: 3,
    assignee: '许言',
    lastSeen: new Date(Date.now() - 7.1 * 60 * 60 * 1000).toISOString(),
  },
]

export const mockSources = [
  {
    id: 'src-iam',
    name: '身份中心 IAM',
    type: 'Audit API',
    code: 'IAM',
    status: 'healthy',
    events24h: 312640,
    latency: 42,
    throughput: '8.2k/s',
    lastSync: new Date(Date.now() - 14 * 1000).toISOString(),
    retention: '180 天',
    owner: '安全平台组',
  },
  {
    id: 'src-crm',
    name: '客户数据平台',
    type: 'Kafka Topic',
    code: 'CRM',
    status: 'healthy',
    events24h: 284310,
    latency: 68,
    throughput: '6.7k/s',
    lastSync: new Date(Date.now() - 22 * 1000).toISOString(),
    retention: '365 天',
    owner: '数据治理组',
  },
  {
    id: 'src-gateway',
    name: 'API 网关',
    type: 'Access Log',
    code: 'GW',
    status: 'healthy',
    events24h: 426980,
    latency: 31,
    throughput: '12.4k/s',
    lastSync: new Date(Date.now() - 8 * 1000).toISOString(),
    retention: '90 天',
    owner: '云原生平台组',
  },
  {
    id: 'src-config',
    name: '配置中心',
    type: 'Webhook',
    code: 'CFG',
    status: 'degraded',
    events24h: 48120,
    latency: 218,
    throughput: '1.4k/s',
    lastSync: new Date(Date.now() - 52 * 1000).toISOString(),
    retention: '180 天',
    owner: '基础架构组',
  },
  {
    id: 'src-auth',
    name: '统一认证',
    type: 'Audit API',
    code: 'SSO',
    status: 'healthy',
    events24h: 156720,
    latency: 55,
    throughput: '4.1k/s',
    lastSync: new Date(Date.now() - 17 * 1000).toISOString(),
    retention: '180 天',
    owner: '安全平台组',
  },
  {
    id: 'src-workflow',
    name: '流程引擎',
    type: 'Event Stream',
    code: 'WF',
    status: 'healthy',
    events24h: 52340,
    latency: 46,
    throughput: '1.8k/s',
    lastSync: new Date(Date.now() - 11 * 1000).toISOString(),
    retention: '90 天',
    owner: '研发效能组',
  },
]

export const throughputSeries = {
  labels: Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, '0')}:00`),
  events: [31, 26, 22, 19, 18, 24, 38, 55, 68, 74, 81, 78, 86, 92, 88, 84, 79, 73, 66, 61, 57, 52, 46, 39],
  blocked: [2, 1, 1, 2, 1, 3, 4, 7, 6, 8, 11, 9, 10, 14, 12, 9, 8, 7, 6, 5, 4, 3, 3, 2],
}

export const riskDistribution = [
  { name: '严重', value: 14, color: '#d2483f' },
  { name: '高危', value: 48, color: '#e8873a' },
  { name: '中危', value: 96, color: '#d9b13d' },
  { name: '低危', value: 172, color: '#2f8f7b' },
]

export const sourceHealth = [
  { name: '身份中心 IAM', value: 99.99 },
  { name: 'API 网关', value: 99.97 },
  { name: '客户数据平台', value: 99.92 },
]
