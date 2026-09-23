/**
 * dsh-sample-plugin: hash_sum tool plugin
 *
 * A first-party-style tool plugin for DeepSeek Harness, written against the
 * documented contract in docs/cookbook/adding-a-tool.md:
 *  - named-export `apply(ctx)` (Cordis function plugin)
 *  - `inject: ['tools']` service dependency
 *  - `defineTool` typed args, canonical JSON return, model-facing render
 *  - honors exec.signal for cancellation
 */
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'hash-sum'
export const inject = ['tools']

const ALGORITHMS = ['sha256', 'sha1', 'md5'] as const
type Algorithm = (typeof ALGORITHMS)[number]

const log = (ctx: Context, msg: string) => (ctx.logger?.info ? ctx.logger.info(msg) : console.log('[hash-sum]', msg))

export function apply(ctx: Context) {
  ctx.tools.register(defineTool({
    name: 'hash_sum',
    description: 'Compute a cryptographic hash (sha256/sha1/md5) of a UTF-8 text or a file.',
    parameters: {
      algorithm: { type: 'string', description: `Hash algorithm. One of: ${ALGORITHMS.join(', ')}` },
      text: { type: 'string', description: 'Text to hash (mutually exclusive with path)' },
      path: { type: 'string', description: 'Absolute file path to hash (mutually exclusive with text)' },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          algorithm: { type: 'string' },
          encoding: { type: 'string' },
          digest: { type: 'string' },
          input: { type: 'json' },
        },
        additionalProperties: true,
      },
      render: (_args, value: any) => [
        { type: 'text', text: `${value.algorithm} (${value.encoding}): ${value.digest}` },
      ],
    },
    async execute(args, exec) {
      // defineTool validates types; cross-field rules are hand-checked
      // per the documented execute() contract.
      const algorithm = (args.algorithm ?? 'sha256') as Algorithm
      if (!ALGORITHMS.includes(algorithm)) {
        throw new Error(`unsupported algorithm "${args.algorithm}"; use one of: ${ALGORITHMS.join(', ')}`)
      }
      if (!!args.text === !!args.path) {
        throw new Error('provide exactly one of "text" or "path"')
      }

      if (typeof args.text === 'string') {
        if (args.text.length === 0) throw new Error('"text" must be a non-empty string')
        const digest = createHash(algorithm).update(args.text, 'utf8').digest('hex')
        return { algorithm, encoding: 'hex', digest, input: { kind: 'text', bytes: Buffer.byteLength(args.text, 'utf8') } }
      }

      // file branch: honor exec.signal so cancellation kills in-flight I/O
      const buf = await readFile(args.path as string, { signal: exec.signal })
      const digest = createHash(algorithm).update(buf).digest('hex')
      return { algorithm, encoding: 'hex', digest, input: { kind: 'file', path: args.path, bytes: buf.byteLength } }
    },
  }))
  log(ctx, 'hash-sum plugin: hash_sum tool registered')
}
