/**
 * Mini launcher — mirrors the one-file launcher contract described in
 * docs/cordis-tutorial/index.md (vendor/cordis/bin.js). Service stack is
 * mounted exactly like the official test helper in
 * packages/extensions/cordis-host-runner/tests/helpers.ts:
 *   await ctx.plugin(Timer); await ctx.plugin(SystemPrompt); await ctx.plugin(ToolRegistry)
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import Timer from '@deepseek-ai/cordis-plugin-timer'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRegistry from '@deepseek-ai/dsh-tools'

const root = new Context()
await root.plugin(Timer)
await root.plugin(SystemPrompt)
await root.plugin(ToolRegistry)

// parse cordis.yml: a list of { name: <module specifier> } entries
const raw = readFileSync(new URL('./cordis.yml', import.meta.url), 'utf8')
const entries = [...raw.matchAll(/name:\s*'?([^'\n]+)'?/g)].map(m => m[1].trim())

for (const spec of entries) {
  const mod = await import(spec.startsWith('./') || spec.startsWith('../')
    ? pathToFileURL(fileURLToPath(new URL(spec, import.meta.url))).href
    : spec)
  await root.plugin(mod)
  console.log(`[loader] mounted ${mod.name ?? spec}`)
}

export { root }
