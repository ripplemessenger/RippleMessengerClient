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
  /**
   * Log a debug-level message. Routes to console.debug in dev, Tauri plugin-log in production.
   * @param {string} msg - Log message
   * @param {...*} args - Additional values serialized as JSON
   */
  debug: function (msg, ...args) {
    if (isDev) return console.debug(format(msg, ...args))
    tDebug(format(msg, ...args))
  },
  /**
   * Log an info-level message. Routes to console.info in dev, Tauri plugin-log in production.
   * @param {string} msg - Log message
   * @param {...*} args - Additional values serialized as JSON
   */
  info: function (msg, ...args) {
    if (isDev) return console.info(format(msg, ...args))
    tInfo(format(msg, ...args))
  },
  /**
   * Log a warning-level message. Routes to console.warn in dev, Tauri plugin-log in production.
   * @param {string} msg - Log message
   * @param {...*} args - Additional values serialized as JSON
   */
  warn: function (msg, ...args) {
    if (isDev) return console.warn(format(msg, ...args))
    tWarn(format(msg, ...args))
  },
  /**
   * Log an error-level message. Routes to console.error in dev, Tauri plugin-log in production.
   * @param {string} msg - Log message
   * @param {...*} args - Additional values serialized as JSON
   */
  error: function (msg, ...args) {
    if (isDev) return console.error(format(msg, ...args))
    tError(format(msg, ...args))
  },
}

export default Logger
