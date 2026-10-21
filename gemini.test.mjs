// A Gemini request goes to Zed in Google's own shape, except where Zed's
// cloud reads it more strictly than Google does (crates/google_ai's enums).
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

const tools = [{ functionDeclarations: [{ name: "read", description: "read a file", parameters: { type: "object", properties: {} } }] }]

test("a function calling mode goes to Zed lower-cased, as its enum reads it", () => {
  for (const [given, sent] of [["AUTO", "auto"], ["ANY", "any"], ["NONE", "none"], ["auto", "auto"], ["VALIDATED", "auto"]]) {
    const { req } = providerRequest(
      "gemini",
      { contents: [], tools, toolConfig: { functionCallingConfig: { mode: given, allowedFunctionNames: ["read"] } } },
      "gemini-4-argon",
    )
    expect(req.toolConfig).toEqual({ functionCallingConfig: { mode: sent, allowedFunctionNames: ["read"] } })
    expect(req.tools).toEqual(tools)
  }
})

test("a mode Zed has no name for is left to its default", () => {
  const { req } = providerRequest("gemini", { contents: [], tools, toolConfig: { functionCallingConfig: { mode: "MODE_UNSPECIFIED" } } }, "gemini-4-argon")
  expect(req.toolConfig).toBeUndefined()
  expect(req.tools).toEqual(tools)
})

test("safety settings keep only what Zed's enums know, OFF read as BLOCK_NONE", () => {
  const { req } = providerRequest(
    "gemini",
    {
      contents: [],
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" },
      ],
    },
    "gemini-4-argon",
  )
  expect(req.safetySettings).toEqual([
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
  ])
  const none = providerRequest("gemini", { contents: [], safetySettings: [{ category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "OFF" }] }, "gemini-4-argon").req
  expect(none.safetySettings).toBeUndefined()
})
