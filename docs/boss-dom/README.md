# Boss DOM / API 采样文档

> 采样日期：2026-06-28  
> 环境：Chrome DevTools MCP + 公开逆向资料交叉验证

## 已确认接口

| 用途 | URL | 说明 |
|------|-----|------|
| 推荐职位列表 | `GET /wapi/zpgeek/pc/recommend/job/list.json` | 职位页默认加载，`page` + `pageSize` + `city` |
| 搜索职位列表 | `GET /wapi/zpgeek/search/joblist.json` | 关键词搜索场景 |
| 职位详情 | `GET /wapi/zpgeek/job/detail.json` | 参数 `securityId`（来自列表项） |

## 列表响应结构（摘要）

- 根：`{ code, message, zpData }`
- 列表：`zpData.jobList[]`
- 分页：`zpData.hasMore`
- 列表项关键字段：`encryptJobId`, `jobName`, `salaryDesc`, `cityName`, `brandName`, `securityId`, `welfareList`

## 详情响应结构（摘要）

- `zpData.jobInfo`：`jobName`, `salaryDesc`, `postDescription`, `showSkills`
- `zpData.brandComInfo`：`brandName`, `stageName`, `scaleName`, `industryName`, `introduce`

## 反爬与频率限制

Boss 对高频 API / 自动化行为敏感（code 36 等）。运行时策略见 `src/main/platform/boss/boss-config.ts` 中 `BOSS_RATE_LIMIT`：

- 列表分页间隔 3–5s（随机抖动）
- 详情请求间隔 4–8s，单次最多 10 条详情
- 两次完整抓取冷却 ≥ 2 分钟
- 应用内 `platform:debugSnapshot` 在 BrowserView 内 `fetch`（复用登录 Cookie），避免主进程直调
- **不使用 F12**：Boss 检测 DevTools 会跳转空白页；采样改用应用内「导出页面结构」按钮

## 应用内采样（方案 A）

1. `npm run dev` 启动应用，进入 **Boss 岗位**
2. 展开底部面板，在 Boss 页面登录并打开职位列表
3. 点击 **导出页面结构**（仅触发 1 次 DOM 探测 + 最多 3 次 API 请求）
4. 文件输出：`%APPDATA%\zhisuda-desktop\boss-dom-capture\snapshot-*.json`
5. 将 JSON 提供给开发侧，用于更新 `seed-profile-v1.json` 并 `import-profile`

导入：`node tools/boss-explorer/import-profile.mjs`
