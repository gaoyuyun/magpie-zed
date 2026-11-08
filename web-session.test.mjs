// "Add a web session to a signed-in Zed account": an account signed in
// already gets a web session, or a new one, without signing in again. The
// account's own sign-in, as magpie last handed it to a hook, goes back with
// only the session replaced, so magpie keeps it as the same account.
import { afterEach, expect, test } from "bun:test"
import { ZedAuthPlugin, _internal } from "./index.mjs"

const real = globalThis.fetch
afterEach(() => {
  globalThis.fetch = real
  _internal.seen.clear()
})

const me = JSON.stringify({
  user: { legacy_user_id: 4242, github_login: "octo", name: "Octo Cat" },
  organizations: [{ id: "org-me", name: "Me", is_personal: true }],
  default_organization_id: "org-me",
  plans_by_organization: { "org-me": "zed_pro" },
  plan: { plan_v3: "zed_pro", subscription_period: { started_at: "2026-09-01T00:00:00Z", ended_at: "2026-10-01T00:00:00Z" } },
})
const billing = JSON.stringify({ current_usage: { token_spend: { spend_in_cents: 25, limit_in_cents: 1000 } } })

const account = (who, extra = {}) => ({
  type: "oauth",
  access: `access-${who}`,
  refresh: JSON.stringify({ userId: who === "octo" ? "4242" : "77", systemId: "sys", org: "org-me", plan: "zed_pro", planName: "Pro" }),
  expires: 0,
  accountId: who,
  ...extra,
})

// the plugin as magpie runs it: zed.dev answers the billing page by the
// session it is asked with; everything else is the account's own read
async function plugin({ session = "zed.session=good", status } = {}) {
  const seen = []
  globalThis.fetch = async (url, init) => {
    seen.push({ url: String(url), cookie: init.headers.Cookie })
    if (!String(url).includes("/frontend/billing/usage")) return new Response(me)
    if (status) return new Response("", { status })
    return init.headers.Cookie === session ? new Response(billing) : new Response("", { status: 401 })
  }
  const hooks = await ZedAuthPlugin({ client: { auth: { set: async () => {} } } })
  const method = hooks.auth.methods.find((m) => m.label === "Add a web session to a signed-in Zed account")
  return { hooks, method, seen }
}

test("it is a method of its own beside the browser sign-in, asking the session and the account", async () => {
  const { hooks, method } = await plugin()
  expect(hooks.auth.methods.map((m) => m.label)).toEqual(["Sign in with Zed (browser)", "Add a web session to a signed-in Zed account"])
  expect(method.type).toBe("oauth")
  expect(method.prompts.map((p) => p.key)).toEqual(["webCookie", "account"])
})

test("the one account read since start gets the session: its sign-in back as it was, only the session new", async () => {
  const { hooks, method, seen } = await plugin()
  const was = account("octo", { webCookie: "zed.session=old" })
  await hooks.auth.usage(async () => was)
  seen.length = 0
  const a = await method.authorize({ webCookie: "  zed.session=good; __cf_bm=x " })
  // nothing to open: done as soon as it's asked
  expect(a.url).toBe("")
  expect(a.method).toBe("auto")
  // the session was tried against zed.dev before anything is saved
  expect(seen).toEqual([{ url: "https://cloud.zed.dev/frontend/billing/usage", cookie: "zed.session=good" }])
  expect(await a.callback()).toEqual({ type: "success", access: was.access, refresh: was.refresh, expires: 0, accountId: "octo", webCookie: "zed.session=good" })
})

test("an account read only for its models or a request is remembered too", async () => {
  const { hooks, method } = await plugin()
  await hooks.provider.models({ models: {} }, { auth: account("octo") }).catch(() => {})
  expect((await (await method.authorize({ webCookie: "good" })).callback()).accountId).toBe("octo")
  _internal.seen.clear()
  await hooks.auth.loader(async () => account("octo"))
  expect((await (await method.authorize({ webCookie: "good" })).callback()).accountId).toBe("octo")
})

test("with several accounts the one named gets it, and none is guessed", async () => {
  const { hooks, method } = await plugin()
  await hooks.auth.usage(async () => account("octo"))
  await hooks.auth.usage(async () => account("cat"))
  await expect(method.authorize({ webCookie: "good" })).rejects.toThrow("name the account to add it to (octo, cat)")
  await expect(method.authorize({ webCookie: "good", account: "dog" })).rejects.toThrow("no signed-in Zed account named dog (octo, cat)")
  const back = await (await method.authorize({ webCookie: "good", account: " cat " })).callback()
  expect(back).toMatchObject({ accountId: "cat", access: "access-cat", webCookie: "zed.session=good" })
})

test("before any account was read it says to refresh the usage, and saves nothing", async () => {
  const { method, seen } = await plugin()
  await expect(method.authorize({ webCookie: "good" })).rejects.toThrow("refresh its usage first")
  expect(seen).toEqual([])
})

test("a session zed.dev refuses, can't be read with, or that names nothing is refused before anything is saved", async () => {
  const { hooks, method } = await plugin()
  await hooks.auth.usage(async () => account("octo"))
  await expect(method.authorize({ webCookie: "zed.session=stale" })).rejects.toThrow("zed.dev refused that web session")
  await expect(method.authorize({ webCookie: "  " })).rejects.toThrow("paste the zed.session cookie")
  await expect(method.authorize({ webCookie: "other=1; third=2" })).rejects.toThrow("paste the zed.session cookie")
  const down = await plugin({ status: 500 })
  await down.hooks.auth.usage(async () => account("octo"))
  await expect(down.method.authorize({ webCookie: "good" })).rejects.toThrow("couldn't be read with that web session")
})

test("the account given back reads the dollar spend with its new session", async () => {
  const { hooks, method } = await plugin()
  await hooks.auth.usage(async () => account("octo", { webCookie: "zed.session=old" }))
  const back = await (await method.authorize({ webCookie: "good" })).callback()
  const { type, ...saved } = back
  const u = await hooks.auth.usage(async () => ({ type: "oauth", ...saved }))
  expect(u.windows).toEqual([{ name: "Token spend", used: 2.5, amount: 0.25, limit: 10, unit: "usd", display: "$0.25 / $10.00", resetsAt: "2026-10-01T00:00:00Z" }])
})
