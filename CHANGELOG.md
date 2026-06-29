# Changelog

## [0.1.1] - 2026-06-29

### Fixed

- 安装包文件名改为英文（`Zhisuda-Setup-x.y.z.exe`），修复 GitHub Releases 中文文件名截断导致下载 404
- Vercel 官网构建：独立 tsconfig、法律文档路径修复

## [0.1.0] - 2026-06-29

### Added

- Boss 直聘 L1 半自动投递：批量投递、人工接管、投递记录与数据看板
- 求职偏好 CRUD、岗位抓取与智能筛选
- 简历上传解析与在线编辑
- Windows / macOS 安装包分发与 electron-updater 自动更新
- 产品官网 v1（下载、FAQ、用户协议与隐私政策）

### Notes

- MVP 内测版本，仅支持 Boss 直聘平台
- 自动更新对接 GitHub Releases / CDN `latest.yml`
