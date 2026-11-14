# Tracelight 企业审计日志平台

一个面向安全运营场景的企业级审计日志与可观测性前端项目。项目覆盖日志检索、风险告警处置、数据源监控、运行日志观测和前端结构化日志治理，适合作为前端开发实习岗位的作品项目。

![Vue](https://img.shields.io/badge/Vue-3.5-42b883)
![Vite](https://img.shields.io/badge/Vite-6-646cff)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2023-f7df1e)
![ECharts](https://img.shields.io/badge/ECharts-5.6-d53f3f)

## 项目亮点

- 完整的安全运营工作台：总览、日志检索、告警处置、数据源管理、运行日志五个业务页面。
- 企业级前端日志内核：日志级别、命名空间、关联 ID、敏感字段递归脱敏、内存环形缓冲、`localStorage` 持久化、全局异常捕获和 NDJSON 导出。
- 真实可操作的业务闭环：日志筛选、排序、分页、批量选择、CSV 导出、告警状态流转、检测规则创建、数据源连接测试。
- 数据可视化：24 小时事件趋势、风险等级分布、采集容量趋势和 SLA 健康度，使用 ECharts 按需加载。
- 工程化基础：Vue Router 路由懒加载、Composition API、可复用组件、响应式布局、Vitest 单元测试和 IDEA 运行配置。

## 技术栈

| 方向 | 技术 |
| --- | --- |
| 核心框架 | Vue 3.5、Composition API、`<script setup>` |
| 开发语言 | JavaScript ES2023、HTML5、CSS3 |
| 路由 | Vue Router 4 |
| 图表 | ECharts 5，按需引入 Line、Pie 和基础组件 |
| 图标 | Lucide Vue |
| 构建工具 | Vite 6 |
| 测试 | Vitest |
| 开发工具 | IntelliJ IDEA |

## 在 IDEA 中运行

1. 使用 IntelliJ IDEA 打开项目根目录 `F:\项目文件\项目二`。
2. 确保 IDEA 已配置 Node.js 20 或更高版本。
3. 在终端执行 `npm install`，或等待 IDEA 自动识别 `package.json` 并安装依赖。
4. 在右上角运行配置中选择 `Dev Server`，或直接运行 `npm run dev`。
5. 浏览器打开 `http://localhost:5173`。

项目已提供 `.run/Dev Server.run.xml` 和 `.run/Build.run.xml`，IDEA 会自动识别这两个运行项。

## 常用命令

```bash
npm install
npm run dev
npm run build
npm test
```

## 页面功能

- **安全运营总览**：核心指标、事件采集趋势、风险分布、数据源 SLA、实时审计事件与待处理告警。
- **审计日志**：多条件组合检索、风险级别切换、时间范围筛选、字段排序、分页、批量选择、CSV 导出和结构化详情抽屉。
- **风险告警**：状态标签页、级别筛选、关键字搜索、告警详情、调查/解决状态流转、新建检测规则和报告导出。
- **数据源管理**：连接健康状态、吞吐与延迟指标、连接测试、添加数据源、采集流水线和容量趋势。
- **运行日志**：级别过滤、实时订阅、上下文检索、结构化 JSON 查看、NDJSON 导出和缓冲区清理。

## 日志设计

运行日志服务位于 `src/services/logger.js`，核心字段如下：

```json
{
  "id": "rt_8a27fe61d3a027d1",
  "timestamp": "2026-11-14T08:36:21.135Z",
  "level": "info",
  "namespace": "audit-console:logs",
  "message": "执行审计日志检索",
  "environment": "production",
  "service": "web-console",
  "schemaVersion": "1.0",
  "correlationId": "cor_4c8920f2d38b16a1",
  "context": {
    "query": "ops-028",
    "level": "high",
    "hits": 6,
    "durationMs": 42
  }
}
```

日志能力包含：

- 级别控制：`debug`、`info`、`warn`、`error`、`fatal`。
- 命名空间：按 `audit-console:logs`、`audit-console:alerts` 等业务域拆分。
- 关联追踪：自动生成 `correlationId`，便于串联一次操作链路。
- 敏感信息保护：对密码、Token、Authorization、Cookie、银行卡等字段递归脱敏。
- 异常捕获：监听 `window.error` 与 `unhandledrejection`，同时接入 Vue `errorHandler`。
- 缓冲与持久化：内存保留最新 240 条，本地持久化最近 120 条，避免无限增长。
- 标准导出：支持 NDJSON，方便后续接入 ELK、Loki 或 ClickHouse。

## 目录结构

```text
src/
├─ components/        # 应用外壳、图表、抽屉、弹窗、命令面板等复用组件
├─ composables/       # 跨页面响应式业务状态
├─ data/              # 可复现的模拟审计数据
├─ router/            # 路由配置与页面懒加载
├─ services/          # 企业级日志服务与单元测试
├─ styles/            # 全局设计令牌、组件样式和响应式规则
├─ utils/             # 日期、数字、状态格式化
└─ views/             # 五个业务页面
```

## 简历描述参考

**Tracelight 企业审计日志平台｜个人项目**

- 基于 Vue 3、Vue Router、JavaScript 和 ECharts 构建企业审计日志控制台，独立完成五个业务页面、公共组件与响应式布局。
- 设计前端结构化日志服务，实现日志分级、命名空间、链路 ID、递归脱敏、全局异常捕获、240 条环形缓冲与 NDJSON 导出。
- 实现日志多条件检索、排序分页、批量导出、告警状态流转和数据源连接测试等业务闭环，并通过 Vitest 覆盖日志脱敏与导出等核心逻辑。
- 使用 ECharts 按需加载和路由懒加载控制首屏资源体积，适配桌面、平板与移动端布局。

> 项目中的审计事件、告警、数据源和运营指标均为前端模拟数据，用于完整展示交互流程和工程能力。
