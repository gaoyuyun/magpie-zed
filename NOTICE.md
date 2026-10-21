# NOTICE

This is a maintained fork of the Zed plugin of
[magpie-community/plugins](https://github.com/magpie-community/plugins)
(`packages/zed`, published there as `@magpie-community/opencode-zed-auth`),
which is MIT licensed; its notice is kept in [LICENSE](./LICENSE).

It carries, on top of upstream's code:

- **the dollar spend on the card**, read with an optional zed.dev web session
  (magpie-community/plugins#32, not merged upstream yet);
- **Gemini's thinking level upper-cased** before Zed's cloud, which refuses
  the lowercase spelling Google accepts (`unknown variant 'high', expected one
  of MINIMAL, LOW, MEDIUM, HIGH`), so Gemini with a reasoning effort works.

`upstream` is upstream's `packages/zed` as its own history; `main` is that
plus the patches above, rebased onto it every hour by
`.github/workflows/sync-upstream.yml` and pushed only when the tests pass.

The provider id is `zed`, the same as upstream's, so the two are mutually
exclusive: turn one off when the other is on. A sign-in made with either is
used by both.
