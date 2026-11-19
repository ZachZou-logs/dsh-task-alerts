/**
 * Task alerts — Client half.
 *
 * Watches the Harness session status source and raises a desktop notification
 * when a long turn finishes, fails, or stops to ask the user something.
 *
 * Thresholds come from the plugin row config (see index.js), read once through
 * the `taskAlerts` Remote endpoint. The notification itself uses the standard
 * Notification API of the DSH window, which works on Windows and macOS without
 * any native helper, shell command, or binary.
 */
window.__ModuleLoader__.load({
  id: 'dsh-task-alerts',
  factory(require) {
    /** Fallbacks used until (or when) the configured values cannot be read. */
    const FALLBACK = Object.freeze({ minSeconds: 8, lingerSeconds: 20, silentOnFinish: false })

    const messages = {
      zh: {
        done: '任务完成',
        question: '等待你的回答',
        approval: '需要你的授权',
        plan: '等待方案确认',
        other: '需要你处理',
        bodyDone: (s) => `${s} 已完成这一轮`,
        bodyWaiting: (s) => `${s} 正在等你确认`,
      },
      en: {
        done: 'Task finished',
        question: 'Question for you',
        approval: 'Needs approval',
        plan: 'Needs plan review',
        other: 'Needs your input',
        bodyDone: (s) => `${s} finished`,
        bodyWaiting: (s) => `${s} is waiting for you`,
      },
    }

    /** Pick the message table once per load; DSH reloads on a locale change. */
    function resolveMessages() {
      try {
        const lang = document.documentElement.lang || navigator.language || ''
        return /^zh/i.test(lang) ? messages.zh : messages.en
      } catch {
        return messages.en
      }
    }

    /** Pending-interaction kinds that map to a distinct heading. */
    const PENDING_KIND = {
      question: 'question',
      approval: 'approval',
      plan: 'plan',
      'plan-review': 'plan',
    }

    /**
     * Grade one status transition into an alert, or return `undefined` to stay silent.
     * @param previous - status before the change, absent for the first observation.
     * @param next - status after the change.
     * @param runningSince - when the session last started running, in epoch ms.
     * @param settings - resolved settings for this plugin instance.
     * @returns the alert to raise, if any.
     */
    function grade(previous, next, runningSince, settings) {
      if (next === undefined) return undefined
      const pendingKind = next.pendingInteraction === undefined ? undefined : String(next.pendingInteraction.kind)
      const previousKind = previous === undefined || previous.pendingInteraction === undefined
        ? undefined
        : String(previous.pendingInteraction.kind)
      if (pendingKind !== undefined) {
        // Only a newly raised interaction deserves an alert.
        if (pendingKind === previousKind) return undefined
        return { waiting: true, kind: PENDING_KIND[pendingKind] ?? 'other' }
      }
      if (previousKind !== undefined) return undefined
      if (previous === undefined || previous.running !== true || next.running !== false) return undefined
      if (settings.silentOnFinish) return undefined
      const thresholdMs = settings.minSeconds * 1000
      if (runningSince !== undefined && Date.now() - runningSince < thresholdMs) return undefined
      return { waiting: false, kind: 'done' }
    }

    /** Ask the window for notification permission once, ignoring repeated prompts. */
    function ensurePermission() {
      try {
        if (typeof Notification === 'undefined') return
        if (Notification.permission === 'default') void Notification.requestPermission()
      } catch {
        /* notifications are optional */
      }
    }

    /**
     * Raise one desktop notification. Clicking it focuses the DSH window.
     * @param heading - short title line.
     * @param body - one-line detail.
     * @param lingerMs - how long to keep the toast before closing it.
     * @returns the live notification, or undefined when unavailable.
     */
    function notify(heading, body, lingerMs) {
      try {
        if (typeof Notification === 'undefined') return undefined
        if (Notification.permission !== 'granted') return undefined
        const note = new Notification(heading, {
          body,
          silent: false,
          // One tag keeps a burst of alerts replacing the previous toast.
          tag: 'task-alerts',
        })
        note.onclick = () => {
          try {
            window.focus()
            note.close()
          } catch {
            /* the window may already be gone */
          }
        }
        setTimeout(() => {
          try { note.close() } catch { /* already closed */ }
        }, lingerMs)
        return note
      } catch {
        return undefined
      }
    }

    /**
     * Read the resolved settings from the Host endpoint.
     * @param ctx - Client plugin context.
     * @returns the settings, or the fallbacks when the endpoint is unavailable.
     */
    async function readSettings(ctx) {
      try {
        const remote = ctx.get('remote')
        if (remote === undefined || typeof remote.$mount !== 'function') return FALLBACK
        await remote.$mount({
          package: 'dsh-task-alerts',
          descriptors: [{
            id: 'dsh-task-alerts/taskAlerts/read',
            namespace: 'taskAlerts',
            method: 'read',
            invocation: { kind: 'direct' },
            parameters: [],
          }],
        })
        const service = ctx.get('remote.taskAlerts') ?? ctx.get('remote.dsh-task-alerts')
        const value = await service.read()
        if (value === null || typeof value !== 'object') return FALLBACK
        return {
          minSeconds: typeof value.minSeconds === 'number' ? value.minSeconds : FALLBACK.minSeconds,
          lingerSeconds: typeof value.lingerSeconds === 'number' ? value.lingerSeconds : FALLBACK.lingerSeconds,
          silentOnFinish: value.silentOnFinish === true,
        }
      } catch {
        // A missing or unreachable endpoint must not disable the plugin.
        return FALLBACK
      }
    }

    /**
     * Install the status watcher on a Client context.
     * @param ctx - Client plugin context.
     */
    async function install(ctx) {
      const text = resolveMessages()
      const settings = await readSettings(ctx)
      const lingerMs = settings.lingerSeconds * 1000
      const runningSince = new Map()
      const previous = new Map()
      ensurePermission()

      const readTitle = (sessionId) => {
        try {
          const row = ctx.sessions.list.getSnapshot().byId[sessionId]
          if (row !== undefined) {
            const title = row.title || row.displayTitle
            if (typeof title === 'string' && title.trim() !== '') return title.trim()
          }
        } catch {
          /* fall through to the short id */
        }
        return sessionId.slice(0, 8)
      }

      ctx.effect(() => ctx.uiSession.sessionStatus.subscribe(() => {
        let statuses
        try {
          statuses = ctx.uiSession.sessionStatus.getSnapshot()
        } catch {
          return
        }
        for (const [sessionId, status] of statuses) {
          const before = previous.get(sessionId)
          const alert = grade(before, status, runningSince.get(sessionId), settings)
          if (status.running === true && (before === undefined || before.running !== true)) {
            runningSince.set(sessionId, Date.now())
          } else if (status.running === false && before !== undefined && before.running === true) {
            runningSince.delete(sessionId)
          }
          if (alert === undefined) continue
          const title = readTitle(sessionId)
          notify(
            alert.waiting ? text[alert.kind] ?? text.other : text.done,
            alert.waiting ? text.bodyWaiting(title) : text.bodyDone(title),
            lingerMs,
          )
        }
        previous.clear()
        for (const [sessionId, status] of statuses) previous.set(sessionId, status)
      }))
    }

    return {
      inject: ['uiSession', 'sessions'],
      apply(ctx) {
        void install(ctx)
      },
    }
  },
})