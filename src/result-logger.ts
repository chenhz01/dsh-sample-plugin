/**
 * dsh-sample-plugin: result-logger hook plugin
 *
 * Demonstrates the "everything is a plugin" hook surface: observing the
 * immutable final outcome on the documented `tools/result` extension point
 * (signature: (exec, result) => void), without touching dispatch.
 */
import type { Context } from '@deepseek-ai/cordis'

export const name = 'result-logger'

/** exported so the verification script can assert observation counts */
export const stats = { observed: 0 }

export function apply(ctx: Context) {
  const log = (msg: string) => (ctx.logger?.info ? ctx.logger.info(msg) : console.log('[result-logger]', msg))
  ctx.on('tools/result', (exec: any, result: any) => {
    stats.observed++
    log(`#${stats.observed} ${exec.name} (${exec.callId}) isError=${result.isError}`)
  })
  log('result-logger plugin: tools/result observer installed')
}
