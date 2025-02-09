import { HTTPError, MaintenanceError } from './errors.js'

/**
 * @typedef {'rw' | 'r-' | '--'} Mode
 * @typedef {import('itty-router').RouteHandler} Handler
 */

/**
 * Read and write.
 */
export const READ_WRITE = 'rw'

/**
 * Read only mode.
 */
export const READ_ONLY = 'r-'

/**
 * No reading or writing.
 */
export const NO_READ_OR_WRITE = '--'

/** @type {readonly Mode[]} */
export const modes = Object.freeze([NO_READ_OR_WRITE, READ_ONLY, READ_WRITE])

/**
 * The default maintenance mode (normal operation).
 */
export const DEFAULT_MODE = READ_WRITE

/**
 * Middleware: Specify the mode (permissions) a request hander requires to operate e.g.
 * r- = only needs read permission so enabled in read-only AND read+write modes.
 * rw = needs to read and write so only enabled in read+write mode.
 *
 * @param {Handler} handler
 * @param {Mode} mode
 * @returns {Handler}
 */
export function withMode (handler, mode) {
  if (mode === NO_READ_OR_WRITE) {
    throw new Error('invalid mode')
  }

  /**
   * @param {Request} request
   * @param {import('./env').Env} env
   * @returns {Response}
   */
  return (request, env, ctx) => {
    const enabled = () => {
      const currentMode = env.MODE
      const currentModeBits = modeBits(currentMode)

      return modeBits(mode).every((bit, i) => {
        if (bit === '-') {
          return true
        }
        return currentModeBits[i] === bit
      })
    }

    // Enabled, just get the handler
    if (enabled()) {
      return handler(request, env, ctx)
    }

    return maintenanceHandler()
  }
}

/**
 * @param {any} m
 * @returns {string[]}
 */
function modeBits (m) {
  if (!modes.includes(m)) {
    throw new HTTPError(
      `invalid maintenance mode, wanted one of ${modes} but got "${m}"`,
      503
    )
  }
  return m.split('')
}

/**
 * @returns {never}
 */
function maintenanceHandler () {
  const url = 'https://status.web3.storage'
  throw new MaintenanceError(`API undergoing maintenance, check ${url} for more info`)
}
