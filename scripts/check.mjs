// Loads the plugin the way OpenCode (and magpie) do and checks the shape of
// what it returns: an auth hook with a provider, a loader and methods
// OpenCode knows, and a config hook that declares models. It signs in to
// nothing and sends no request. Upstream's scripts/check.mjs, for one package.
import { readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

const dir = resolve(import.meta.dir, "..")
const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"))
const problems = []
try {
  const mod = await import(pathToFileURL(join(dir, pkg.main ?? "index.mjs")).href)
  const fns = Object.values(mod).filter((v) => typeof v === "function")
  if (!fns.length) problems.push("exports no plugin function")
  const client = { app: { log: async () => {} }, auth: { set: async () => {} }, tui: { showToast: async () => {} }, config: { get: async () => ({ data: {} }) } }
  for (const fn of fns) {
    const hooks = await fn({ client, directory: process.cwd(), worktree: process.cwd(), $: undefined, project: {} })
    const auth = hooks?.auth
    if (!auth) { problems.push(`${fn.name}: no auth hook`); continue }
    if (typeof auth.provider !== "string" || !auth.provider) problems.push(`${fn.name}: auth.provider`)
    if (typeof auth.loader !== "function") problems.push(`${fn.name}: auth.loader`)
    if (!Array.isArray(auth.methods) || !auth.methods.length) problems.push(`${fn.name}: auth.methods`)
    for (const m of auth.methods ?? []) {
      if (!["oauth", "api"].includes(m.type)) problems.push(`${fn.name}: method type ${m.type}`)
      if (m.type === "oauth" && typeof m.authorize !== "function") problems.push(`${fn.name}: ${m.label} has no authorize`)
    }
    if (hooks.config) {
      const cfg = { provider: {} }
      await hooks.config(cfg)
      const p = cfg.provider[auth.provider]
      if (p && (!p.npm || !p.models || !Object.keys(p.models).length)) problems.push(`${fn.name}: config gives ${auth.provider} no npm or models`)
    }
  }
} catch (e) {
  problems.push(String(e?.stack ?? e))
}
console.log(problems.length ? `✗ ${pkg.name}\n  ${problems.join("\n  ")}` : `✓ ${pkg.name}`)
process.exit(problems.length ? 1 : 0)
