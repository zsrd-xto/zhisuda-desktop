# TODO.md — 职速达开发路线图

> **产品**：职速达（ai-job-delivery）— AI 驱动的桌面端求职辅助工具  
> **价值主张**：好工作，职速达——智能筛选岗位，确认即投，求职更高效。  
> **Agent 规范**：开发前必读 [`AGENTS.md`](./AGENTS.md)

---

## 关联文档

| 文档 | 路径 | 用途 |
|------|------|------|
| Agent 开发规范 | [`AGENTS.md`](./AGENTS.md) | 架构、编码、安全红线 |
| 产品需求 PRD v1.1 | [`prd.md`](./prd.md) | 功能边界与验收标准 |
| 技术方案 | [`tech-spec.md`](./tech-spec.md) | IPC、数据层、部署 |
| Boss Spike 报告 | [`spike-report.md`](./spike-report.md) | WebView 可行性结论 |
| 竞品分析 | [`competitor-analysis.md`](./competitor-analysis.md) | 差异化与风险 |
| UI 交互原型 | [`ai-job-delivery/index.html`](./ai-job-delivery/index.html) | 页面布局参考 |

---

## 技术栈

| 层级 | 选型 | 版本 | 说明 |
|------|------|------|------|
| 运行时 | Electron | 28+ | 桌面壳 + BrowserView |
| 语言 | TypeScript | 5.x | 全栈 TS |
| 构建 | electron-vite | 2.x | 主/渲染/preload 打包 |
| 前端框架 | React | 18 | 函数式组件 |
| 样式 | **Tailwind CSS** | 3.x | 唯一样式方案，不写业务 CSS |
| 状态管理 | Zustand | 4.x | 轻量全局状态 |
| 路由 | React Router | 6.x | 页面导航 |
| 数据库 | better-sqlite3 | 11.x | 主进程同步 SQLite |
| 打包分发 | electron-builder | 24.x | Win / macOS 安装包 |
| 自动更新 | electron-updater | 6.x | 对接 CDN `latest.yml` |
| 简历解析 | pdf-parse + mammoth | — | PDF / Word |
| 定时任务 | node-cron | — | v0.2 L2 投递 |
| AI 调用 | OpenAI SDK | 4.x | v0.2+，用户自带 Key |
| 密钥存储 | keytar | — | OS keychain 派生加密密钥 |
| 测试 | Vitest | — | 单元 + 集成测试 |

> **已废弃**：Ant Design（原 tech-spec 选型）。UI 以 Tailwind + 自建轻量组件为准，见 [`AGENTS.md`](./AGENTS.md)。

**明确不使用**：Puppeteer 控制 BrowserView（见 spike-report）。

---

## 目标目录结构

```
zhisuda-desktop/
├── package.json
├── electron-builder.yml
├── electron.vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── tsconfig.node.json
├── vitest.config.ts
├── src/
│   ├── main/                         # Electron 主进程
│   │   ├── index.ts                  # 应用入口
│   │   ├── ipc/                      # IPC handlers（按模块拆分）
│   │   │   ├── user.ipc.ts
│   │   │   ├── resume.ipc.ts
│   │   │   ├── preferences.ipc.ts
│   │   │   ├── platform.ipc.ts
│   │   │   ├── delivery.ipc.ts
│   │   │   ├── messages.ipc.ts
│   │   │   └── updater.ipc.ts
│   │   ├── db/
│   │   │   ├── index.ts              # 连接与 migration 执行
│   │   │   └── migrations/           # 001_init.sql, ...
│   │   ├── services/
│   │   │   ├── user.service.ts
│   │   │   ├── resume.service.ts
│   │   │   ├── preferences.service.ts
│   │   │   ├── delivery.service.ts
│   │   │   ├── matching.service.ts   # 规则匹配算法
│   │   │   ├── messages.service.ts
│   │   │   └── updater.service.ts
│   │   └── platform/
│   │       ├── types.ts              # PlatformAdapter 接口
│   │       ├── adapter-manager.ts
│   │       └── boss/
│   │           ├── boss-adapter.ts
│   │           ├── boss-view.ts      # BrowserView 生命周期
│   │           └── scripts/          # 注入脚本（纯 JS IIFE）
│   │               ├── fetch-jobs.js
│   │               └── apply-job.js
│   ├── preload/
│   │   ├── index.ts                  # contextBridge → window.zhisuda
│   │   └── index.d.ts                # 渲染进程类型声明
│   └── renderer/                     # React 前端
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx
│       ├── styles/
│       │   └── index.css             # 仅 @tailwind 指令
│       ├── pages/
│       │   ├── Home.tsx              # 首次启动 / 欢迎
│       │   ├── Dashboard.tsx         # 数据看板
│       │   ├── Resume.tsx            # 简历管理
│       │   ├── Preferences.tsx       # 求职偏好
│       │   ├── Jobs.tsx              # 岗位列表 + WebView + L1 投递
│       │   ├── Messages.tsx          # HR 消息（MVP 只读）
│       │   └── Settings.tsx          # 设置 / 清除数据
│       ├── components/               # 可复用 UI 组件
│       ├── stores/                   # Zustand stores
│       ├── hooks/
│       └── lib/                      # 纯函数工具（无 Node 依赖）
├── resources/                        # 应用图标、模板
├── spike/                            # Spike 参考代码（逐步合并至 main）
└── docs/                             # 产品与技术文档
    ├── AGENTS.md
    ├── TODO.md
    ├── prd.md
    ├── tech-spec.md
    ├── spike-report.md
    └── competitor-analysis.md
```

官网独立仓库（规划）：`zhisuda-website/`（静态站 + 安装包 CDN）。

---

## 开发规范（快速检查表）

开发前确认 [`AGENTS.md`](./AGENTS.md)；提交前自检：

- [ ] 改动仅在 `zhisuda-desktop/` 目录内
- [ ] 已有用户批准的开发计划
- [ ] 组件与 IPC 返回值均有 TypeScript 类型
- [ ] 无业务 `.css` / `.scss` 文件（仅 Tailwind 入口）
- [ ] 渲染进程通过 `window.zhisuda.*` 调用 IPC
- [ ] Boss 脚本变更已跑人工回归清单
- [ ] 新增 IPC channel 已登记（tech-spec 或本文件）
- [ ] 遵守投递频率红线（≤10/批，15–30s 间隔）

---

## 分阶段开发计划

### Phase 0 — 工程脚手架（约 1 周）

**目标**：可运行的 Electron 空壳 + IPC 骨架 + 数据库 migration 框架。

- [x] `electron-vite` + React 18 + TypeScript 初始化
- [x] Tailwind CSS + PostCSS 配置
- [x] `main` / `preload` / `renderer` 三层骨架
- [x] 示例 IPC：`user:getProfile` 往返
- [x] SQLite 初始化 + `001_init.sql` migration 框架
- [x] ESLint + Prettier 配置
- [x] Vitest 基础配置 + 示例测试

**验收标准**：

- `npm run dev` 启动应用窗口
- `window.zhisuda.user.getProfile()` 返回本地用户（首次自动创建）
- `npm test` 通过

---

### Phase 1 — MVP v0.1（约 8–10 周）

**目标**：Boss 半自动投递闭环 + 简历/偏好 + 基础看板 + 可分发安装包。

#### Phase 1a — 基础数据（W1–2）

- [x] 本地账号：首次启动自动创建 `device_id` + UUID
- [x] 昵称设置与持久化（`user:updateNickname`）
- [x] 简历上传：PDF / Word 解析（pdf-parse + mammoth）
- [x] 简历结构化预览 + 在线表单编辑
- [x] 自动保存（30 秒或字段变更）
- [x] 「清除所有数据」功能

**验收**（摘自 PRD）：

```gherkin
Given 用户首次打开应用
When 应用完成初始化
Then 自动创建本地用户并进入主界面

Given 用户上传 PDF 简历
When 解析完成
Then 展示结构化预览（基本信息/工作经历/项目/教育等）
```

#### Phase 1b — 偏好与 Boss 登录（W3–4）

- [ ] 求职偏好 CRUD（城市/薪资/岗位/黑名单/关键词等）
- [ ] Boss BrowserView：登录页加载、UA 伪装、partition 持久化
- [ ] 登录状态检测（`platform:login`）
- [ ] 岗位列表抓取（`platform:fetchJobs`，上限 100）
- [ ] 从 spike 迁移 Boss 配置至 `main/platform/boss/`

**验收**：

- [ ] WebView 扫码/密码登录成功
- [ ] Cookie 重启后仍有效
- [ ] 手动触发抓取返回 ≥5 条岗位

#### Phase 1c — 核心投递（W5–6）

- [ ] 规则匹配算法（薪资 40% + 岗位名 25% + 公司 20% + 城市 10% + 关键词 5%）
- [ ] 岗位列表 UI：匹配度、勾选、黑名单、重点关注
- [ ] L1 批量投递（`delivery:applyBatch`，≤10/次，15–30s 间隔）
- [ ] 投递状态机：待投递 → 投递中 → 已投递 / 失败
- [ ] 人工接管模式（CAPTCHA / RATE_LIMIT / DOM_CHANGED）
- [ ] 投递记录持久化（`delivery:getRecords`）
- [ ] 基础数据看板：总投递、今日投递、简单趋势

**验收**：

```gherkin
Given 用户勾选 5 个岗位并点击批量投递
When 投递完成
Then 实时展示进度，记录写入 delivery_records
And 失败时提示人工接管
```

#### Phase 1d — 分发与更新（W7–8）

- [ ] `electron-builder` Win / macOS 打包配置
- [ ] `electron-updater` + `latest.yml` 对接 CDN
- [ ] 应用图标与安装包命名（`职速达-Setup-x.y.z.exe`）
- [ ] 官网 v1（可独立仓 `zhisuda-website/`）：Hero、下载区、功能亮点、FAQ、法律文档
- [ ] GitHub Actions release workflow（tag `v*` 触发）

**验收**：

- [ ] 本地 `npm run dist` 产出安装包
- [ ] 官网可下载安装包并校验 SHA256
- [ ] 旧版应用可检测并提示更新

#### Phase 1e — 稳定化（W9–10）

- [ ] HR 消息轮询 + 桌面通知（只读，不自动回复）
- [ ] 消息列表展示与未读标记
- [ ] 崩溃恢复：未完成任务状态恢复
- [ ] 操作日志（`operation_logs`）
- [ ] 用户协议 + 隐私政策（`docs/legal/`）
- [ ] Sentry 崩溃上报（opt-in，默认关闭）
- [ ] Boss 适配稳定性打磨 + 内测反馈修复

**MVP 功能范围确认**（PRD 7.1）：

| 模块 | 功能 | 状态 |
|------|------|------|
| 账号 | 本地账号（设备级） | Phase 1a |
| 简历 | 上传解析 + 在线编辑 | Phase 1a |
| 偏好 | 条件设置 + 黑名单 | Phase 1b |
| 投递 | Boss 登录 + 抓取 + 规则匹配 | Phase 1b–c |
| 投递 | L1 批量 + 人工接管 | Phase 1c |
| 看板 | 基础投递统计 | Phase 1c |
| HR | 新消息桌面提醒（只读） | Phase 1e |
| 分发 | 官网 + 安装包 + 自动更新 | Phase 1d |

**MVP 验证指标**（PRD 7.3）：

| 指标 | 目标 |
|------|------|
| 内测下载 | 100 人 |
| 周活投递 | 30 人 |
| 投递效率提升 | 3 倍+ |
| 7 日留存 | >40% |

---

### Phase 2 — v0.2（扩展与商业化）

**目标**：多平台、自动化增强、AI 能力、付费体系。

- [ ] 手机号注册/登录 + 短信验证码
- [ ] 51job `PlatformAdapter` 实现
- [ ] L2 定时任务（node-cron）：抓取 → 匹配 → 投递
- [ ] 向量语义匹配（embedding API + 用户自带 Key）
- [ ] HR 消息分类 + 自动回复（打招呼/索要简历）
- [ ] AI 智能回复（复杂场景）+ 敏感问题策略
- [ ] 大模型管理：多提供商 API Key 配置与测试连接
- [ ] 回复模板 CRUD
- [ ] Freemium 订阅（免费版限额 + Pro 月卡/年卡）
- [ ] Cookie / API Key AES-256-GCM + keytar

**验收要点**：

- L2 定时任务可按配置自动执行
- 敏感问题（年龄/婚育）不自动回复，仅通知
- AI 请求直连用户配置的模型商，不经职速达服务器

---

### Phase 3 — v0.3（简历增强）

- [ ] AI 简历优化向导（6 步流程，PRD 3.6）
- [ ] 简历导出 PDF / Word 增强
- [ ] Pro 年卡权益：AI 简历优化

---

### Phase 4 — v0.4 / v1.0（全平台与规模化）

- [ ] 猎聘 / 拉勾 PlatformAdapter
- [ ] 简历模板市场
- [ ] 面试准备、薪资查询工具
- [ ] 社区功能 + 求职工具箱
- [ ] B 端团队版（猎头/HR 批量账号）

---

## 本地开发与启动

### 环境要求

- Node.js 20+
- npm 或 pnpm
- Windows 11（Boss 适配主测环境）/ macOS（打包验证）
- Git

### 命令（Phase 0 脚手架完成后可用）

```bash
cd zhisuda-desktop

# 安装依赖
npm install

# 开发模式（热更新）
npm run dev

# 生产构建
npm run build

# 打包安装包
npm run dist

# 运行测试
npm test

# 代码检查
npm run lint
```

> **原生模块说明**：`better-sqlite3` 需按运行时切换 ABI。`npm run dev` 前自动执行 `predev`（Electron 绑定）；`npm test` 前自动执行 `pretest`（Node 绑定）。全新安装后 `postinstall` 会尝试 `electron-builder install-app-deps`，失败时回退到预编译包。

### Spike 独立验证

Boss WebView 技术验证代码位于 `spike/`（待建，参考 `docs/spike-report.md`）。  
Phase 1b 时将 spike 中的 BrowserView 配置与脚本迁移至 `src/main/platform/boss/`。

---

## 架构、部署与分发

### 构建发布流程

```
本地开发 (npm run dev)
    ↓
生产构建 (npm run build)
    ↓
打包 (npm run dist) → .exe / .dmg
    ↓
上传 CDN (download.zhisuda.com/releases/)
    ↓
更新 latest.yml / latest-mac.yml
    ↓
已安装客户端 (electron-updater 检测更新)
```

### 发布产物

```
releases/
├── latest.yml              # Windows 更新清单
├── latest-mac.yml          # macOS 更新清单
├── 职速达-Setup-0.1.0.exe
├── 职速达-0.1.0-mac.dmg
└── SHA256SUMS.txt
```

### electron-updater 配置

```yaml
# electron-builder.yml
publish:
  provider: generic
  url: https://download.zhisuda.com/releases/
```

更新流程：

1. 启动 5 秒后静默检查 `latest.yml`
2. 有新版本 → 通知「发现新版本」
3. 用户确认 → 后台下载 → 提示重启安装
4. 支持「跳过此版本」

### CI（Phase 1d）

```yaml
# .github/workflows/release.yml
on:
  push:
    tags: ['v*']
jobs:
  build:
    strategy:
      matrix:
        os: [windows-latest, macos-latest]
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - run: npm run dist
      - uses: softprops/action-gh-release@v2
```

安装包同步上传 CDN 并更新 `latest.yml`。

### 成本预估（MVP）

| 项目 | 月成本 |
|------|--------|
| 服务器 / CDN | ¥200 |
| 代码签名（一次性） | OV 约 ¥2000–5000/年 |
| AI 调用 | ¥0（用户自带 Key） |

---

## 平台维护 SOP

Boss 页面 DOM 变更时的响应流程（目标：**48 小时内**发 patch）：

1. **监控**：`DOM_CHANGED` 错误码激增 / 用户反馈
2. **定位**：对比 Boss 页面 DOM 与 `boss/scripts/` 选择器
3. **修复**：仅更新 `boss/scripts/`，发 hotfix patch 版本
4. **验证**：Boss 人工回归清单全部通过
5. **发布**：更新 CHANGELOG，同步 CDN

### Boss 人工回归清单

- [ ] WebView 加载登录页
- [ ] 扫码/密码登录成功
- [ ] Cookie 持久化，重启后仍登录
- [ ] 抓取岗位列表 ≥5 条
- [ ] 单次投递成功
- [ ] 连续 3 次失败触发人工接管提示

---

## IPC Channel 登记表

| Channel | 方向 | 阶段 | 用途 |
|---------|------|------|------|
| `user:getProfile` | R→M | 0 | 获取本地用户信息 |
| `user:updateNickname` | R→M | 1a | 更新昵称 |
| `user:clearAllData` | R→M | 1a | 清除所有本地数据 |
| `resume:upload` | R→M | 1a | 上传并解析简历 |
| `resume:get` | R→M | 1a | 获取当前简历 |
| `resume:update` | R→M | 1a | 更新简历字段 |
| `preferences:get` | R→M | 1b | 获取求职偏好 |
| `preferences:save` | R→M | 1b | 保存求职偏好 |
| `platform:login` | R→M | 1b | 打开 Boss WebView 登录 |
| `platform:checkLogin` | R→M | 1b | 检测登录状态 |
| `platform:fetchJobs` | R→M | 1b | 触发岗位抓取 |
| `delivery:applyBatch` | R→M | 1c | L1 批量投递 |
| `delivery:getRecords` | R→M | 1c | 投递记录查询 |
| `delivery:resumeQueue` | R→M | 1c | 人工接管后继续 |
| `messages:checkUnread` | R→M | 1e | HR 消息轮询 |
| `messages:list` | R→M | 1e | 消息列表 |
| `updater:check` | R→M | 1d | 检查更新 |

> v0.2 新增 channel（规划）：`auth:*`、`ai:*`、`scheduler:*`、`platform:51job:*`

---

## 进度追踪

| 阶段 | 状态 | 说明 |
|------|------|------|
| Phase 0 工程脚手架 | ✅ 已完成 | electron-vite + IPC + SQLite |
| Phase 1a 基础数据 | ✅ 已完成 | 本地账号 + 简历上传解析编辑 |
| Phase 1b 偏好与登录 | ⬜ 未开始 | 偏好 + Boss WebView |
| Phase 1c 核心投递 | ⬜ 未开始 | 匹配 + L1 投递 + 看板 |
| Phase 1d 分发与更新 | ⬜ 未开始 | 打包 + 官网 + updater |
| Phase 1e 稳定化 | ⬜ 未开始 | HR 提醒 + 协议 + 打磨 |
| Phase 2 v0.2 | ⬜ 未开始 | 多平台 + AI + 付费 |
| Phase 3 v0.3 | ⬜ 未开始 | AI 简历优化 |
| Phase 4 v0.4+ | ⬜ 未开始 | 全平台 + 商业化 |

**当前焦点**：Phase 1b — 求职偏好 + Boss WebView 登录。

**最近更新**：2026-06-27 — Phase 1a 完成（昵称、简历上传解析、在线编辑、自动保存、清除数据）。

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-06-27 | Phase 1a 完成：昵称、简历 IPC、PDF/Word 解析、编辑预览、自动保存、清除数据 |
| 2026-06-24 | Phase 0 完成：脚手架、IPC、SQLite migration、Vitest、Tailwind |
| 2026-06-24 | 初版：技术栈（Tailwind）、目录结构、Phase 0–4 路线图、IPC 登记表 |
