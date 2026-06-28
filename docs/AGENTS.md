# AGENTS.md — 职速达开发规范

> 本文件指导 AI Agent 在 **职速达（ai-job-delivery）** 项目中的开发行为。  
> 产品：面向求职者的 AI 驱动桌面端求职辅助工具（独立 Electron 应用）。

---

## 会话启动清单

每次开始工作前，**按顺序阅读**（不要跳过）：

1. **本文件** — `docs/AGENTS.md`
2. **当前任务与进度** — `docs/TODO.md`
3. **产品需求** — `docs/prd.md`
4. **技术方案** — `docs/tech-spec.md`
5. **Boss WebView 约束** — `docs/spike-report.md`

需要了解竞品差异化或 UI 信息架构时，再读 `docs/competitor-analysis.md`、`docs/ai-job-delivery/index.html`。

---

## 工作边界

| 规则 | 说明 |
|------|------|
| **目录隔离** | 只允许在 `zhisuda-desktop/` 内创建、修改、删除文件；不扫描或改动仓库其他目录 |
| **先计划后开发** | 未经用户明确批准，不得编写业务代码；可先调研、写计划、更新 `docs/TODO.md` |
| **简洁优先** | 最小可行实现；禁止 speculative 抽象、过度设计 |
| **核心优先** | MVP 聚焦 Boss 直聘 + L1 半自动投递主链路 |
| **命名统一** | 目录名 `zhisuda-desktop`；对外产品名「职速达」；代码包名建议 `zhisuda` |


## 前端规范

### 组件与类型

- **仅使用函数式组件**，禁止 class 组件
- **所有组件必须有 TypeScript 类型**：`props`、事件回调、`children`、store 状态、IPC 返回值均需显式类型
- 样式只用 Tailwind CSS
- 不要使用 any 类型

## 测试规范

完成代码改动后，**必须**跑通单元测试；端到端测试按需执行。

| 命令 | 要求 | 说明 |
|------|------|------|
| `npm test` | **必须** | 单元测试（Vitest），覆盖主进程服务、解析器、DB migration 等 |
| `npm run test:e2e` | 可选 | Playwright + Electron E2E，验证 UI 与 IPC 完整链路（耗时较长，含构建） |

**执行顺序**：先 `npm test`，通过后再视情况执行 `npm run test:e2e`。

**注意**：
- `npm test` 前会自动执行 `pretest`（切换 Node 原生绑定）；若报 `NODE_MODULE_VERSION` 不匹配，先执行 `node scripts/ensure-node-native.mjs`
- `npm run test:e2e` 前会自动构建应用；跑 E2E 前需关闭正在运行的 Electron 实例
- 新增 IPC channel 或改动 Phase 验收相关功能时，建议补充/更新 `e2e/tests/` 对应用例

## git提交规范
-- 用户名：向涛
-- 邮箱：xt0913@yeah.net
- **提交规则：** 不得擅自执行 `git commit`。仅在用户明确发出提交指令（如"提交"、"commit"、"提交代码"）时才能提交。
- **Commit 语言：** commit message 必须使用中文编写。