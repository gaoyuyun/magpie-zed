// A Gemini request goes to Zed in Google's own shape, except where Zed's
// cloud reads it more strictly than Google does.
import { expect, test } from "bun:test"
import { _internal } from "./index.mjs"

const { providerRequest } = _internal

test("a lowercase thinkingLevel goes to Zed in the enum's own spelling", () => {
  for (const [given, sent] of [["high", "HIGH"], ["medium", "MEDIUM"], ["low", "LOW"], ["minimal", "MINIMAL"], ["HIGH", "HIGH"]]) {
    const { req } = providerRequest(
      "gemini",
      { contents: [{ role: "user", parts: [{ text: "hi" }] }], generationConfig: { thinkingConfig: { includeThoughts: true, thinkingLevel: given } } },
      "gemini-4-argon",
    )
    expect(req.generationConfig.thinkingConfig).toEqual({ includeThoughts: true, thinkingLevel: sent })
    expect(req.model).toBe("models/gemini-4-argon")
  }
})

test("a request without a thinkingLevel is left as it came", () => {
  const body = { contents: [{ role: "user", parts: [{ text: "hi" }] }], generationConfig: { thinkingConfig: { thinkingBudget: 1024 } } }
  const { req } = providerRequest("gemini", structuredClone(body), "gemini-3.5-flash")
  expect(req.generationConfig).toEqual(body.generationConfig)
  const bare = providerRequest("gemini", { contents: [] }, "gemini-3.5-flash").req
  expect(bare.generationConfig).toBeUndefined()
})
