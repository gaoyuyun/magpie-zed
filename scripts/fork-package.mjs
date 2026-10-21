// Gives package.json this fork's identity over whatever upstream's says,
// keeping upstream's version, main and the rest. It is run by hand once and
// by sync-upstream.yml whenever a rebase conflicts in package.json alone
// (upstream bumping its version beside the lines changed here), so the fork
// never needs a person for that.
//   node scripts/fork-package.mjs
import { readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

const file = join(resolve(import.meta.dirname, ".."), "package.json")
const pkg = JSON.parse(readFileSync(file, "utf8"))
pkg.name = "magpie-zed"
if (!pkg.description.includes("upstream's Zed plugin")) pkg.description += " — upstream's Zed plugin, with fixes that haven't landed there yet"
pkg.files = [...new Set([...(pkg.files ?? []), "NOTICE.md"])]
pkg.keywords = [...new Set([...(pkg.keywords ?? []), "magpie-plugin"])]
pkg.repository = { type: "git", url: "git+https://github.com/gaoyuyun/magpie-zed.git" }
pkg.magpie = { icon: "zed", ...pkg.magpie }
writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n")
