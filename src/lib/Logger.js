import { debug, info, warn, error } from '@tauri-apps/plugin-log'

const Logger = {
  debug: async (msg, ...args) => await debug(format(msg, ...args)),
  info:  async (msg, ...args) => await info(format(msg, ...args)),
  warn:  async (msg, ...args) => await warn(format(msg, ...args)),
  error: async (msg, ...args) => await error(format(msg, ...args)),
}

function format(msg, ...args) {
  if (args.length === 0) return msg
  return msg + " " + args.map(a => JSON.stringify(a, null, 2)).join(" ")
}

export default Logger