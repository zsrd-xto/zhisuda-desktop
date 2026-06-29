# 职速达官网规划

> **版本**: v1.0 | **日期**: 2026-06-24 | **作者**: 运营部 Agent | **代码库**: [zhishuda-website](../../../zhishuda-website/)

---

## 一、定位

职速达官网是独立 C 端产品的 **唯一官方下载入口**，信息架构对标 [OpenClaw 桌面版官网](https://openclawcn.net/)，内容聚焦求职场景。

| 维度 | OpenClaw | 职速达 |
|------|----------|--------|
| 产品 | 全能 AI 助理 | Boss 求职辅助 |
| 下载 | Win / Mac | Win / Mac |
| 卖点 | 多模型、IM 集成 | 智能筛选、确认即投、本地数据 |
| 安全叙事 | 命令授权、目录隔离 | 本地存储、不上传 Boss 密码 |

---

## 二、页面结构

```
/                    # 首页（Hero + 功能 + 安全 + FAQ + 下载）
/privacy             # 隐私政策
/terms               # 用户协议
/changelog           # 更新日志
/download            # 下载页（可选，首页已含下载区）
```

---

## 三、区块规格

### Hero
- 标题：好工作，职速达
- 副标题：智能筛选岗位，确认即投，求职更高效
- CTA：免费下载（锚点至下载区）

### 下载区
- Windows 安装包（显示版本号 v0.1.0）
- macOS 安装包（Apple Silicon / Intel 可合并或分栏）
- SHA256 校验码
- 系统要求：Win 10+ / macOS 12+

### 功能亮点（3-4 卡）
1. 智能筛选 — 按城市/薪资/关键词匹配岗位
2. 确认即投 — L1 模式，你说了算
3. 数据看板 — 投递进度一目了然
4. 本地安全 — 简历与 Cookie 仅存本机

### 安全说明
- 不收集 Boss 账号密码
- 招聘平台 Cookie 本地加密
- 可随时清除全部本地数据

### FAQ（至少 5 条）
1. 职速达和 Boss 直聘什么关系？
2. 会不会被封号？
3. 数据存在哪里？
4. 免费版和付费版区别？（内测全免费）
5. 支持哪些平台？（MVP 仅 Boss）

### 页脚
- 用户协议 | 隐私政策 | 更新日志
- © 2026 职速达
- 与 OpenClaw 无隶属关系说明（独立产品）

---

## 四、技术方案

| 项 | 选型 |
|----|------|
| 框架 | Astro 4（静态站，零 JS 默认） |
| 样式 | Tailwind CSS |
| 部署 | Vercel / 阿里云 OSS + CDN |
| 域名 | zhishuda.com（待注册） |
| 安装包 | GitHub Releases 或 OSS `download.zhishuda.com` |

---

## 五、发布流程

1. `zhishuda-desktop` CI 打 tag → 构建安装包
2. 上传至 CDN `releases/`
3. 更新 `latest.yml` 与官网版本号
4. 更新 `/changelog` 页面

---

## 六、SEO

- Title: 职速达 — Boss直聘求职助手，智能筛选确认即投
- Keywords: Boss直聘, 求职助手, 简历投递, 找工作
- 结构化数据: SoftwareApplication

---

## 七、相关文档

- [PRD 官网章节](docs/prd.md#46-官网产品分发入口)
- [用户协议](docs/user-agreement.md)
- [隐私政策](docs/privacy-policy.md)
