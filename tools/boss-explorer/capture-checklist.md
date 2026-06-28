# Boss 页面探索 — MCP / 应用内采样清单

> Boss 禁用 F12 DevTools，请使用 **应用内「导出页面结构」**（`platform:debugSnapshot`）。

## 交互式采样步骤

1. 启动 `npm run dev`，进入 **Boss 岗位**
2. 展开底部面板，登录 Boss，停留在职位列表页
3. 点击 **导出页面结构**（单次操作，低频 API）
4. 检查 `%APPDATA%\zhisuda-desktop\boss-dom-capture\snapshot-*.json`
5. 根据 JSON 更新 `docs/boss-dom/seed-profile-v1.json`
6. 运行 `node tools/boss-explorer/import-profile.mjs`

## 采样 JSON 字段说明

| 字段 | 用途 |
|------|------|
| `domProbe` | 各选择器匹配数量，用于 DOM 通道 |
| `vueProbe` | Vue jobList 是否存在（参考 boss-helper） |
| `apiProbes` | 列表 API 路径、code、字段 keys |
| `detailProbe` | 详情 API 结构 |

## 竞品参考

- boss-helper：Content Script + Vue jobList
- boss-agent：Playwright 页面内 `fetch`
- 职速达：Electron BrowserView `executeJavaScript` + 页面内 `fetch`
