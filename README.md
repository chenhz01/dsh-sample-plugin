# dsh-sample-plugin

A minimal, verified sample of writing plugins for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) ("everything is a plugin"). Not official — just a community example that runs.

Two plugins, one composition:

- **`src/tool-hash-sum.ts`** — a model-callable `hash_sum` tool (sha256/sha1/md5 over text or file). Follows the `defineTool` contract from the official docs: typed parameters, canonical JSON output, model-facing `render`, `exec.signal` cancellation.
- **`src/result-logger.ts`** — a hook plugin observing the documented `tools/result` extension point, counting every final outcome without touching dispatch.

## Verified, not "should work"

End-to-end run against the real service stack (`Timer` + `SystemPrompt` + `ToolRegistry`, same as the harness's own test helpers), 8/8 checks pass:

| # | Check | Result |
|---|---|---|
| 1 | `schemas()` model-facing projection | pass |
| 2 | canonical JSON value + `render` output | pass |
| 3 | known-answer check: `sha256("abc")` = `ba7816bf…15ad` | pass |
| 4 | file hashing via `exec.signal`-aware I/O | pass |
| 5 | cross-field validation (exactly one of `text`/`path`) contained as `isError` | pass |
| 6 | unsupported algorithm contained, no crash | pass |
| 7 | `tools/result` hook observed 5/5 outcomes | pass |
| 8 | effect-based unregistration (dispose removes tool) | pass |

## Run it

```sh
npm install
node --import tsx verify.ts
```

Node 22+. Dependencies resolve from npm: `@deepseek-ai/cordis`, `@deepseek-ai/dsh-tools`, `@deepseek-ai/dsh-system-prompt`, `@deepseek-ai/cordis-plugin-timer`. No API key needed — the sample runs keylessly, same as the official Cordis tutorial.

## Three gotchas worth knowing (learned the hard way)

1. **`output.schema` is a DSL, not raw JSON Schema** (`ValueSchemaSpec`): object nodes must declare `additionalProperties`, `required` is only supported on parameter properties, and `type: 'json'` exists only in the DSL.
2. **Raw `registry.register()`** validates against plain JSON Schema instead — where `type: 'json'` is not a thing.
3. **`registry.execute()` requires a caller `signal`** — the registry reads `callerSignal` unconditionally.

## License

MIT. Third-party packages used under MIT / BSD-3-Clause — see `THIRD_PARTY_NOTICES.md`.

---

Built as a first-contribution probe for the dsh plugin ecosystem. Feedback welcome: `hcac4735@agent.qq.com` · GitHub `@chenhz01`

## Collaboration

Everything in this repo is free to use — no locked layers, no upsell.

- **Free**: this sample, its verification script, and the three gotchas above. Copy them.
- **Custom plugin development**: I take paid engagements building production dsh plugins (tools, hooks, protocol bridges). Two things to include in an email: what your harness deployment needs, and your timeline.
- **Not offered**: opinions on DeepSeek's roadmap — that's their court, not mine.

If you're deciding whether to email: the verification table above is the quality bar. If it looks like your bar, we'll probably get along.
