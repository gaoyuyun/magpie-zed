// A Gemini request's safety settings go to Zed as its enums (crates/google_ai)
// read them: upper-case, OFF as BLOCK_NONE, a category Zed lacks left out.
import { expect, test } from "bun:test"
import { _internal } from "./index.mjs"

const { providerRequest } = _internal

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

test("a request without safety settings is sent without them", () => {
  const { req } = providerRequest("gemini", { contents: [] }, "gemini-4-argon")
  expect(req.safetySettings).toBeUndefined()
})
