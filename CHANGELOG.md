# Changelog

## 0.1.0

首个可用版本。

- 长任务结束后发送桌面通知（Windows / macOS）
- 等待操作时发送通知：提问、工具授权、方案确认
- 默认 8 秒以内的快速回合不打扰
- 支持通过 `cordis.patch.yml` 配置 `minSeconds`、`lingerSeconds`、`silentOnFinish`
- 点击通知聚焦 DSH 窗口