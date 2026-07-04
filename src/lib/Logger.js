import { debug as tDebug, info as tInfo, warn as tWarn, error as tError } from '@tauri-apps/plugin-log'

const isDev = import.meta.env.DEV

/**
 * Format a log message with optional JSON-serialized arguments.
 * @param {string} msg - Base message string
 * @param {...*} args - Additional values to serialize as JSON
 * @returns {string} Formatted message
 */
function format(msg, ...args) {
  if (args.length === 0) return msg
  return msg + " " + args.map(a => JSON.stringify(a, null, 2)).join(" ")
}

/**
 * Logger proxy that routes to console in dev mode and Tauri log plugin in production.
 */
const Logger = {
  /** @param {string} msg @param {...*} args */
  debug: function (msg, ...args) {
    if (isDev) return console.debug(format(msg, ...args))
    tDebug(format(msg, ...args))
  },
  /** @param {string} msg @param {...*} args */
  info: function (msg, ...args) {
    if (isDev) return console.info(format(msg, ...args))
    tInfo(format(msg, ...args))
  },
  /** @param {string} msg @param {...*} args */
  warn: function (msg, ...args) {
    if (isDev) return console.warn(format(msg, ...args))
    tWarn(format(msg, ...args))
  },
  /** @param {string} msg @param {...*} args */
  error: function (msg, ...args) {
    if (isDev) return console.error(format(msg, ...args))
    tError(format(msg, ...args))
  },
}

export default Logger
