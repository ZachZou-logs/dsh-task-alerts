# 任务提醒 / Task alerts

[![CI](https://github.com/ZachZou-logs/dsh-task-alerts/actions/workflows/ci.yml/badge.svg)](https://github.com/ZachZou-logs/dsh-task-alerts/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Long tasks run in the background. This DeepSeek Harness plugin tells you when one finishes, or when the Harness stops to wait for you — so you can walk away and still come back at the right moment.

长任务在后台跑。这个插件在任务结束、或 DSH 停下来等你操作时发一条桌面通知，让你可以放心离开。

## 平台支持 / Platform support

| 平台 | 状态 |
| --- | --- |
| Windows | ✅ 已在 Windows 11 + DSH 桌面版实测通过 |
| macOS | ⚪ 按代码判断应当可用，**尚未实测** |
| Linux | ⚪ 未验证 |

**为什么 macOS 理论上可用**：插件的全部逻辑只调用浏览器/Electron 标准 API（`Notification`、`setTimeout`），没有调用任何 Windows 专属功能，没有 `process.platform` 分支，没有 shell 调用，也没有原生二进制。DSH 桌面版在 Windows 和 macOS 上都是 Electron，两者都提供这套 API。

如果你在 macOS 上试用，欢迎在 Issues 里反馈结果。

---

## 中文

### 什么时候会通知

| 时机 | 通知标题 |
| --- | --- |
| 一轮任务正常结束 | 任务完成 |
| 停下来等你回答提问 | 等待你的回答 |
| 停下来等你批准工具调用 | 需要你的授权 |
| 停下来等你确认方案 | 等待方案确认 |

通知正文会带上会话标题，例如「重构登录模块 已完成这一轮」。点击通知会把 DSH 窗口切到前台。同一时刻只保留最后一条通知，连续触发不会堆叠。

### 什么时候不通知

- **默认 8 秒以内的快速回复**——问一句「这个函数干嘛的」不该弹通知。
- **本来就是你在操作的那一刻**——你刚点完确认、刚回答完问题，不会补一条「等待你」。
- 同一次等待不会因为你切换窗口而重复提醒。

### 配置

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

### 安装

**本地目录**：DSH → 设置 → 插件 → 添加插件，选择本目录。

**从 GitHub**：

```sh
dsh plugin --profile <你的 profile> add https://github.com/ZachZou-logs/dsh-task-alerts
```

### 前提

操作系统的通知权限要放行。Windows 上如果开了「专注助手」、或系统设置里关了 DSH 的通知，横幅会被吞掉；macOS 上首次使用需在「系统设置 → 通知」里允许 DSH。

### 已知限制

- **DSH 窗口完全关闭时无法提醒**——通知由窗口进程发出，窗口关掉就没有发送方。窗口最小化或被挡住不受影响。
- 通知不区分「任务失败」和「任务完成」，两者都标为「任务完成」。
- 没有可视化设置表单，阈值只能改 `cordis.patch.yml`。

---

## English

### When it notifies

| Moment | Title |
| --- | --- |
| A turn finishes | Task finished |
| The agent asks you a question | Question for you |
| A tool call needs approval | Needs approval |
| A plan needs review | Needs plan review |

The body carries the session title. Clicking the notification brings the DSH window forward. Only the latest notification is kept, so a burst replaces rather than stacks.

### When it stays silent

- **Runs under 8 seconds by default** — quick replies should not interrupt you.
- **The moment you are already acting** — finishing an approval or an answer does not spawn a follow-up toast.
- The same wait does not notify again when you switch windows.

### Configuration

Settings live in the bundled `cordis.patch.yml`; reinstall the plugin after editing:

```yaml
- insert:
    - id: task-alerts
      name: 'dsh-task-alerts'
      config:
        minSeconds: 8         # stay silent below this many seconds; 0 = always (0–3600)
        lingerSeconds: 20     # seconds before the toast closes (3–600)
        silentOnFinish: false # true = only notify for waits that need you
```

### Install

**Local directory**: DSH → Settings → Plugins → Add plugin, and pick this directory.

**From GitHub**:

```sh
dsh plugin --profile <your profile> add https://github.com/ZachZou-logs/dsh-task-alerts
```

### Requirements

OS notification permission must be granted. On Windows, Focus Assist or a disabled DSH notification setting swallows the banner. On macOS, allow DSH under System Settings → Notifications the first time.

### Known limitations

- **No notification when the DSH window is fully closed** — the window process is the sender. Minimized or covered windows work fine.
- Failures and completions both read as "Task finished".
- No visual settings form; change thresholds in `cordis.patch.yml`.

---

## Development

```sh
# syntax check
node --check index.js && node --check client.js
```

`index.js` is the Host half (config resolution + a Remote endpoint publishing the resolved settings). `client.js` is the browser half (session-status watcher + desktop notification). `client.js` is loaded as-is through `window.__ModuleLoader__.load`, so it must stay a plain IIFE-style script rather than an ES module.

CI runs on `windows-latest` and `macos-latest`: manifest validation, `node --check`, and a config-resolution smoke test.

## License

[MIT](LICENSE)