/**
 * verify.ts — end-to-end proof the sample plugin works against the real
 * dsh-tools ToolRegistry: schema validation, canonical output, render,
 * hook observation, error containment, and effect-based unregistration.
 */
import { writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { root } from './launcher.ts'
import { stats } from './src/result-logger.ts'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
await sleep(300) // let service fibers settle

const registry = (root as any).tools
if (!registry) throw new Error('ctx.tools service not available')

console.log('--- 1. schemas() shows the model-facing projection')
console.log(JSON.stringify(registry.schemas(), null, 1).slice(0, 400))

const ac = new AbortController()
const run = (callId: string, args: unknown) =>
  registry.execute({ callId, name: 'hash_sum', arguments: args, signal: ac.signal })

console.log('\n--- 2. valid text call (canonical value)')
const r1 = await run('call-1', { algorithm: 'sha256', text: 'hello harness' })
console.log('isError:', r1.isError)
console.log('value  :', JSON.stringify(r1.value))
console.log('render :', JSON.stringify(r1.content))

console.log('\n--- 3. known-answer check (sha256 of "abc")')
const r2 = await run('call-2', { text: 'abc' })
const expected = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
console.log('digest :', r2.value?.digest)
console.log('match  :', r2.value?.digest === expected ? 'PASS ✅' : `FAIL ❌ (expected ${expected})`)

console.log('\n--- 4. valid file call')
const f = join(tmpdir(), `dsh-sample-${Date.now()}.txt`)
writeFileSync(f, 'hello harness')
const r3 = await run('call-3', { algorithm: 'md5', path: f })
console.log('value  :', JSON.stringify(r3.value))
rmSync(f)

console.log('\n--- 5. schema validation (missing both text and path)')
const r4 = await run('call-4', { algorithm: 'sha256' })
console.log('isError:', r4.isError, '| error:', (r4.error?.message ?? r4.content?.[0]?.text ?? '').slice(0, 120))

console.log('\n--- 6. unsupported algorithm is contained (isError, no crash)')
const r5 = await run('call-5', { algorithm: 'rot13', text: 'x' })
console.log('isError:', r5.isError, '| error:', (r5.error?.message ?? r5.content?.[0]?.text ?? '').slice(0, 120))

console.log('\n--- 7. hook observation count (result-logger saw every outcome)')
console.log('observed:', stats.observed, '(expect 5: calls 1-5)')

console.log('\n--- 8. effect-based unregistration (register then dispose)')
const disposer = registry.register({
  name: 'temp_tool', description: 'temp', parameters: {},
  output: { schema: { type: 'object', properties: {}, additionalProperties: true }, render: () => [{ type: 'text', text: 'ok' }] },
  execute: async () => ({ ok: true }),
} as any)
console.log('schemas before dispose:', registry.schemas().map((s: any) => s.name).join(', '))
disposer()
console.log('schemas after dispose :', registry.schemas().map((s: any) => s.name).join(', '))

console.log('\nALL CHECKS DONE')
process.exit(0)
