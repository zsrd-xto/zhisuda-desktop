# 职速达（zhisuda-desktop）

> 好工作，职速达——智能筛选岗位，确认即投，求职更高效。

面向求职者的 AI 驱动桌面端求职辅助工具（Electron 独立应用）。

---

## 环境要求

| 项目 | 要求 |
|------|------|
| Node.js | 20+ |
| 包管理器 | npm（推荐） |
| 操作系统 | Windows 11（主开发环境）/ macOS（打包验证） |
| Git | 已安装 |

Windows 下若 `postinstall` 原生模块编译失败，需安装 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)（勾选「使用 C++ 的桌面开发」）。无 VS 时项目会尝试下载 `better-sqlite3` 预编译包（当前固定 Electron 28.3.3）。

---

## 快速启动

```bash
# 1. 进入项目目录
cd zhisuda-desktop

# 2. 安装依赖（含 Electron 与原生模块）
npm install

# 3. 启动开发模式（热更新）
npm run dev
```

启动成功后应弹出 Electron 窗口，显示职速达欢迎页及自动创建的本地用户信息。

---

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发模式，自动执行 `predev` 切换 Electron 原生绑定 |
| `npm run build` | 生产构建（含 TypeScript 检查） |
| `npm start` | 预览生产构建结果 |
| `npm test` | 运行单元测试，自动执行 `pretest` 切换 Node 原生绑定 |
| `npm run test:e2e` | 构建后运行 Playwright + Electron E2E 测试 |
| `npm run test:e2e:ui` | 以 Playwright UI 模式调试 E2E |
| `npm run lint` | ESLint 检查 |
| `npm run format` | Prettier 格式化 `src/` |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run dist` | 构建并打包当前平台安装包 |
| `npm run dist:win` | 构建 Windows 安装包（`职速达-Setup-x.y.z.exe`） |
| `npm run dist:mac` | 构建 macOS 安装包（`.dmg`） |
| `npm run sync:release-info` | 从 `dist/` 生成官网 `releases.json`（含 SHA256） |
| `npm run build:win` | 同 `dist:win` |

---

## 首次启动验证

开发窗口打开后，可按以下步骤确认 Phase 0 脚手架正常：

1. **界面**：欢迎页展示用户 ID、设备 ID、昵称（未设置）、创建时间
2. **DevTools**：按 `F12` 打开控制台，执行：

   ```js
   await window.zhisuda.user.getProfile()
   ```

   应返回包含 `id`、`deviceId`、`nickname`、`createdAt` 的对象
3. **持久化**：关闭应用后再次 `npm run dev`，用户 ID 应保持不变
4. **测试**：`npm test` 应 3 项全部通过

---

## 原生模块（better-sqlite3）

`better-sqlite3` 是 C++ 原生模块，**Node.js（测试）与 Electron（开发）使用不同 ABI**，不能共用同一份 `.node` 文件。项目已通过脚本自动切换：

| 时机 | 脚本 | 作用 |
|------|------|------|
| `npm install` 后 | `postinstall` | 为 Electron 编译/下载原生绑定 |
| `npm run dev` 前 | `predev` | 确保 Electron 绑定可用 |
| `npm test` 前 | `pretest` | 确保 Node.js 绑定可用 |

### 常见问题

**`Could not locate the bindings file`**

```bash
# 开发前
node scripts/ensure-electron-native.mjs
npm run dev

# 测试前
node scripts/ensure-node-native.mjs
npm test
```

**`NODE_MODULE_VERSION` 不匹配**

说明当前 `.node` 文件与运行时不一致。先跑对应脚本再执行 `dev` 或 `test`，不要混用。

**`npm install` 时 `postinstall` 失败**

1. 安装 Visual Studio Build Tools 后重新 `npm install`
2. 或手动执行：`node scripts/ensure-electron-native.mjs`

---

## 打包与发布

```bash
# Windows 安装包
npm run dist:win

# 同步版本与 SHA256 到官网
npm run sync:release-info

# 构建官网（需先在 website/ 安装依赖）
cd website && npm install && npm run build
```

发布流程：推送 `v*` tag → GitHub Actions 构建 Win/Mac 安装包并创建 Release → 可选上传 CDN 更新 `latest.yml`。

自动更新：已安装客户端启动 5 秒后检查更新（`electron-updater`），设置页可手动检查、下载、跳过版本。

官网源码位于 [`website/`](website/)，部署静态产物至 Vercel 或 OSS。

---

## 项目结构（概要）

```
zhisuda-desktop/
├── src/
│   ├── main/           # Electron 主进程（IPC、DB、服务）
│   ├── preload/        # contextBridge → window.zhisuda
│   ├── renderer/       # React + Tailwind 前端
│   └── shared/         # 主/渲染进程共享类型
├── scripts/            # 原生模块安装脚本
├── docs/               # PRD、技术方案、原型等
├── docs/AGENTS.md           # AI Agent 开发规范
└── docs/TODO.md             # 分阶段路线图与进度
```

数据库文件位置：`{userData}/zhisuda.db`（Electron 用户数据目录）。

---

## 相关文档

| 文档 | 说明 |
|------|------|
| [AGENTS.md](./docs/AGENTS.md) | 开发规范与编码约束 |
| [TODO.md](./docs/TODO.md) | 分阶段路线图、IPC 登记表 |
| [docs/prd.md](./docs/prd.md) | 产品需求 |
| [docs/tech-spec.md](./docs/tech-spec.md) | 技术方案 |
| [docs/spike-report.md](./docs/spike-report.md) | Boss WebView 可行性 |

---

## 开发进度

- **Phase 0**（工程脚手架）：已完成
- **Phase 1c**（核心投递）：已完成
- **Phase 1d**（分发与更新）：已完成
- **当前焦点**：Phase 1e — 稳定化与内测打磨

详见 [TODO.md](./docs/TODO.md)。
