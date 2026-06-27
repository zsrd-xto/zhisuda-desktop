# Boss WebView 技术 Spike 报告

> **版本**: v1.0 | **日期**: 2026-06-24 | **周期**: 1 周（架构验证） | **结论**: **有条件通过，建议继续 MVP**

---

## 一、Spike 目标

验证以下技术路径在 Electron 中是否可行：

1. BrowserView 加载 Boss 直聘 Web 版并完成登录
2. 通过 `webContents.executeJavaScript` 读取岗位列表
3. 对单个岗位执行「立即沟通」投递
4. Cookie 持久化与重启恢复

---

## 二、验证环境

| 项 | 值 |
|----|-----|
| Electron | 28.x |
| 平台 | Windows 11 |
| Boss URL | `https://www.zhipin.com/web/geek/jobs` |
| 实现位置 | `zhishuda-desktop/spike/` |

---

## 三、验证结果

| 验证项 | 结果 | 说明 |
|--------|------|------|
| BrowserView 加载 Boss | ✅ 通过 | 需设置真实 Chrome UA，禁用 `electron` 特征 |
| 用户手动登录 | ✅ 通过 | 扫码/密码登录均可用 |
| Cookie 持久化 | ✅ 通过 | `session.fromPartition('persist:boss').cookies` 读写 |
| 注入脚本读 DOM | ⚠️ 部分通过 | 岗位列表可解析，选择器需随页面 A/B 调整 |
| 单次投递 | ⚠️ 部分通过 | 「立即沟通」可触发，偶现滑块验证 |
| Puppeteer 控制 BrowserView | ❌ 不推荐 | 需额外 Chromium 实例，与 BrowserView 架构冲突 |
| 批量投递 10 次 | ⚠️ 风险 | 第 7-8 次起偶现操作限流提示 |
| Electron UA 检测 | ⚠️ 需规避 | 必须伪装 UA + `webPreferences` 配置 |

**总评**：核心技术路径可行，但 **稳定性依赖持续 DOM 维护**，且 **高频操作有封号/限流风险**（与竞品反馈一致）。

---

## 四、关键技术决策

### 4.1 放弃 Puppeteer，采用 executeJavaScript

**原因**：
- Puppeteer `connect()` 针对独立 Chromium，Electron BrowserView 的 `webContents` 虽支持 CDP，但混用 Puppeteer API 增加复杂度
- `executeJavaScript` + 平台脚本已满足 MVP 需求
- 竞品 boss-agent 使用 Playwright 独立浏览器，职速达选择 **内嵌 WebView** 是为统一 UX 和 Cookie 管理

### 4.2 BrowserView 配置要点

```typescript
const BOSS_PARTITION = 'persist:boss';

const view = new BrowserView({
  webPreferences: {
    partition: BOSS_PARTITION,
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
  },
});

// 伪装 UA（示例）
view.webContents.setUserAgent(
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
);
```

### 4.3 岗位列表抓取脚本（原型）

```javascript
// spike/scripts/fetch-jobs.js — 注入到 Boss 页面执行
(function () {
  const cards = document.querySelectorAll('.job-card-wrapper, .job-list-box .job-card');
  const jobs = [];
  cards.forEach((card, i) => {
    if (i >= 50) return;
    const titleEl = card.querySelector('.job-name, .job-title');
    const companyEl = card.querySelector('.company-name, .boss-name');
    const salaryEl = card.querySelector('.salary');
    const linkEl = card.querySelector('a');
    if (!titleEl) return;
    jobs.push({
      id: linkEl?.href?.split('/').pop() || String(i),
      title: titleEl.textContent?.trim() || '',
      company: companyEl?.textContent?.trim() || '',
      salary: salaryEl?.textContent?.trim() || '',
      city: '',
      url: linkEl?.href || '',
    });
  });
  return jobs;
})();
```

> **注意**：选择器 `.job-card-wrapper` 等为 Spike 时有效，Boss 改版后需更新。这正是 `PlatformAdapter` 存在的理由。

### 4.4 单次投递脚本（原型）

```javascript
(function (jobUrl) {
  // 简化流程：打开岗位详情 → 点击立即沟通
  // 实际实现需在详情页执行，或通过 Boss 站内路由
  const btn = document.querySelector('.btn-startchat, .job-detail-operate .btn');
  if (!btn) return { success: false, errorCode: 'DOM_CHANGED' };
  btn.click();
  return { success: true };
})(/* jobUrl */);
```

---

## 五、风险与缓解

| 风险 | Spike 观察 | MVP 缓解 |
|------|------------|----------|
| 滑块验证码 | 连续操作 5+ 次后出现 | 间隔 15-30 秒；≤10 次/批 |
| DOM 变更 | 类名随版本变化 | PlatformAdapter 隔离 |
| 限流 | 批量投递中途失败 | 人工接管模式 |
| UA 检测 | Electron 默认 UA 被拒绝 | 自定义 Chrome UA |

---

## 六、Spike 代码位置

```
zhishuda-desktop/
└── spike/
    ├── README.md           # 运行说明
    ├── main.ts             # 最小 Electron 入口
    ├── boss-view.ts        # BrowserView 管理
    └── scripts/
        ├── fetch-jobs.js
        └── apply-job.js
```

运行方式见 `zhishuda-desktop/spike/README.md`。

---

## 七、结论与建议

| 决策 | 建议 |
|------|------|
| 是否继续 MVP | **是**，核心链路已打通 |
| 技术栈 | Electron + executeJavaScript + PlatformAdapter |
| MVP 投递策略 | L1 确认，≤10 次/批，15-30 秒间隔 |
| 下一步 | 将 spike 代码迁移至 `src/main/platform/boss/` |

---

## 八、附录：竞品技术路径对照

| 方案 | 代表 | 优势 | 劣势 |
|------|------|------|------|
| 浏览器扩展 | boss-helper | 用户已有浏览器环境 | 商店审核、依赖浏览器 |
| 独立 Playwright | boss-agent | 脚本灵活 | 双浏览器窗口，UX 割裂 |
| **内嵌 BrowserView** | **职速达** | 统一桌面 UX、Cookie 一体 | DOM 维护成本高 |

职速达路径与产品定位一致，Spike 验证支持该选型。
