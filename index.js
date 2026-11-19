/**
 * Task alerts — Host half.
 *
 * Resolves the row config and publishes it to the Client module through a small
 * Remote endpoint, so thresholds live in `cordis.patch.yml` instead of being
 * hard-coded in the browser bundle.
 *
 * This file deliberately imports nothing: a linked local bundle resolves its
 * dependencies from the DSH installation and the profile, not from its own
 * directory, so a bare import would fail to load.
 */

/** Schema namespace for this bundle. */
export const name = 'dsh-task-alerts'

/** Remote/service namespace the Client mounts to read the settings. */
const NAMESPACE = 'taskAlerts'

/** Defaults applied when the row supplies no config. */
export const DEFAULTS = Object.freeze({
  /** Runs shorter than this many seconds stay silent. */
  minSeconds: 8,
  /** How long a toast lingers before it is closed, in seconds. */
  lingerSeconds: 20,
  /** Mute the "task finished" toast and keep only the waiting ones. */
  silentOnFinish: false,
})

/**
 * Read one bounded number, falling back to the default when unusable.
 * @param value - raw configured value.
 * @param fallback - value used when the setting is unusable.
 * @param min - inclusive lower bound.
 * @param max - inclusive upper bound.
 * @returns the clamped number.
 */
function bounded(value, fallback, min, max) {
  const parsed = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  if (typeof parsed !== 'number' || !Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

/**
 * Normalize the row config into the exact shape the Client reads.
 * @param raw - the row's `config` value, possibly undefined.
 * @returns the resolved settings.
 */
export function resolveConfig(raw) {
  const source = raw !== null && typeof raw === 'object' ? raw : {}
  return {
    minSeconds: bounded(source.minSeconds, DEFAULTS.minSeconds, 0, 3600),
    lingerSeconds: bounded(source.lingerSeconds, DEFAULTS.lingerSeconds, 3, 600),
    silentOnFinish: source.silentOnFinish === true || source.silentOnFinish === 'true',
  }
}

const jsonResult = {
  mode: 'strict',
  typeSymbol: 'dsh-task-alerts#Settings',
  create: () => ({ parse: (value) => value }),
}

/** Remote descriptors the Client may mount. */
const DESCRIPTORS = Object.freeze([
  {
    id: `dsh-task-alerts/${NAMESPACE}/read`,
    service: NAMESPACE,
    namespace: NAMESPACE,
    method: 'read',
    invocation: { kind: 'direct' },
    result: jsonResult,
    parameters: [],
  },
])

/** The host-side service object the descriptor above calls into. */
class TaskAlertsSettings {
  /**
   * @param settings - already resolved settings.
   */
  constructor(settings) {
    this.settings = settings
  }

  /**
   * Answer the resolved settings.
   * @returns plain JSON settings.
   */
  read() {
    return this.settings
  }
}

/**
 * Mount the plugin and publish its settings endpoint.
 * @param ctx - Host plugin context.
 * @param config - row config supplied by the loader.
 */
export function apply(ctx, config) {
  const settings = resolveConfig(config)
  ctx.inject(['typert'], (ctx) => {
    ctx.provide(NAMESPACE, new TaskAlertsSettings(settings))
    ctx.typert.register({
      package: name,
      face: 'host',
      schemas: [],
      model: { services: [], events: [], objects: [] },
      invocations: DESCRIPTORS,
    })
  })
}