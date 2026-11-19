# Task alerts

[![CI](https://github.com/ZachZou-logs/dsh-task-alerts/actions/workflows/ci.yml/badge.svg)](https://github.com/ZachZou-logs/dsh-task-alerts/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

English | [中文](README.md)

When you run a long task in DeepSeek Harness (DSH), you cannot see its state: when it finishes, or whether it has stopped on a question or an approval, only becomes visible after switching back to the DSH window. Staying responsive therefore means checking that window over and over. dsh-task-alerts is built for this: it sends one desktop notification when the task finishes or needs you to step in, and the rest of the time you can leave the DSH page instead of watching it.

Verified on both Windows and macOS. Install it and it works out of the box.

## Platform support

| Platform | Status |
| --- | --- |
| Windows | ✅ Tested on Windows 11 + DSH desktop |
| macOS | ✅ Tested on DSH desktop |

Every part of the plugin uses only standard window APIs (`Notification`, `setTimeout`): no `process.platform` branches, no shell calls, no native binaries. The DSH desktop app is Electron on both Windows and macOS, so one code base runs on both. A Linux build, if one exists, would be Electron as well and should work, but nobody has confirmed it yet — feedback in the Issues is welcome.

## When it notifies

| Moment | Title |
| --- | --- |
| A turn finishes | Task finished |
| The agent asks you a question | Question for you |
| A tool call needs approval | Needs approval |
| A plan needs review | Needs plan review |

The body carries the session title, for example "Refactor the login module — finished this turn"; when no title is available it falls back to the first 8 characters of the session ID. Clicking the notification brings the DSH window forward. Only the latest notification is kept, so a burst replaces rather than stacks.

## When it stays silent

- **Turns that finish within 8 seconds by default** — asking "what does this function do" should not raise a toast. Notifications that wait for you are not subject to this threshold and appear however short the turn was.
- **The moment you are already acting** — finishing an approval or an answer does not spawn a follow-up toast.
- The same wait does not notify again when you switch windows.

## Configuration

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

## Install

**Local directory**: DSH → Settings → Plugins → Add plugin, and pick this directory.

**From GitHub**:

```sh
dsh plugin --profile <your profile> add https://github.com/ZachZou-logs/dsh-task-alerts
```

## Requirements

OS notification permission must be granted. On Windows, Focus Assist or a disabled DSH notification setting swallows the banner. On macOS, allow DSH under System Settings → Notifications the first time.

## Known limitations

- **No notification when the DSH window is fully closed** — the window process is the sender. Minimized or covered windows work fine.
- Failures and completions both read as "Task finished".
- No visual settings form; change thresholds in `cordis.patch.yml`.

## Development

```sh
# syntax check
node --check index.js && node --check client.js
```

`index.js` is the Host half (config resolution + a Remote endpoint publishing the resolved settings). `client.js` is the browser half (session-status watcher + desktop notification). `client.js` is loaded as-is through `window.__ModuleLoader__.load`, so it must stay a plain IIFE-style script rather than an ES module.

CI runs on `windows-latest` and `macos-latest`: manifest validation, `node --check`, and a config-resolution smoke test.

## License

[MIT](LICENSE)
