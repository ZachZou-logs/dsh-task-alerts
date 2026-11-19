# 任务提醒

[![CI](https://github.com/ZachZou-logs/dsh-task-alerts/actions/workflows/ci.yml/badge.svg)](https://github.com/ZachZou-logs/dsh-task-alerts/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.en.md) | 中文

在 DeepSeek Harness（DSH）中执行长任务时，你看不到它的执行状态：任务什么时候结束、是否停在提问或授权上等待处理，都要切回 DSH 窗口才知道。为了及时介入，通常只能反复切换窗口查看。dsh-task-alerts 针对这个问题构建，在任务执行完毕、或需要你介入时发送一条桌面通知，其余时间可以离开 DSH 页面，不必一直盯着。

已在 Windows 与 macOS 上验证通过，直接安装，开箱即用。

## 平台支持

| 平台 | 状态 |
| --- | --- |
| Windows | ✅ 已在 Windows 11 + DSH 桌面版实测通过 |
| macOS | ✅ 已在 DSH 桌面版实测通过 |

插件的全部逻辑只调用窗口自带的标准 Web API（`Notification`、`setTimeout`）：没有 `process.platform` 分支，没有 shell 调用，也没有原生二进制。DSH 桌面版在 Windows 和 macOS 上都是 Electron，同一份代码两边都跑得通。若存在 Linux 版，同为 Electron，理应也能用，但尚未实测——欢迎在 Issues 里反馈结果。

## 什么时候会通知

| 时机 | 通知标题 |
| --- | --- |
| 一轮任务正常结束 | 任务完成 |
| 停下来等你回答提问 | 等待你的回答 |
| 停下来等你批准工具调用 | 需要你的授权 |
| 停下来等你确认方案 | 等待方案确认 |

通知正文会带上会话标题，例如「重构登录模块 已完成这一轮」；取不到标题时显示会话 ID 的前 8 位。点击通知会把 DSH 窗口切到前台。同一时刻只保留最后一条通知，连续触发不会堆叠。

## 什么时候不通知

- **默认 8 秒内就跑完的回合**——问一句「这个函数干嘛的」不该弹通知。等待你操作的通知不受这个门槛限制，再短也会提醒。
- **本来就是正在操作的那一刻**——刚点完确认、刚回答完问题，不会补一条「等待你」。
- 同一次等待不会因为切换窗口而重复提醒。

## 配置

配置写在插件自带的 `cordis.patch.yml` 里，改完**卸载再重新安装插件**生效：

```yaml
- insert:
    - id: task-alerts
      name: 'dsh-task-alerts'
      config:
        minSeconds: 8         # 少于这么多秒的回合不提醒；0 = 每轮都提醒（0–3600）
        lingerSeconds: 20     # 通知横幅保留秒数（3–600）
        silentOnFinish: false # true = 只提醒「等待你操作」
```

## 安装

**本地目录**：DSH → 设置 → 插件 → 添加插件，选择本目录。

**从 GitHub**：

```sh
dsh plugin --profile <你的 profile> add https://github.com/ZachZou-logs/dsh-task-alerts
```

## 前提

操作系统的通知权限要放行。Windows 上如果开了「专注助手」、或系统设置里关了 DSH 的通知，横幅会被吞掉；macOS 上首次使用需在「系统设置 → 通知」里允许 DSH。

## 已知限制

- **DSH 窗口完全关闭时无法提醒**——通知由窗口进程发出，窗口关掉就没有发送方。窗口最小化或被挡住不受影响。
- 通知不区分「任务失败」和「任务完成」，两者都标为「任务完成」。
- 没有可视化设置表单，阈值只能改 `cordis.patch.yml`。

## 开发

```sh
# 语法检查
node --check index.js && node --check client.js
```

`index.js` 是 Host 半侧（解析配置 + 通过一个 Remote 端点发布解析后的设置）。`client.js` 是浏览器半侧（会话状态监听 + 桌面通知）。`client.js` 经 `window.__ModuleLoader__.load` 原样加载，因此必须保持 IIFE 风格的普通脚本，不能写成 ES module。

CI 跑在 `windows-latest` 与 `macos-latest` 上：manifest 校验、`node --check`、以及配置解析的冒烟测试。

## 许可证

[MIT](LICENSE)
