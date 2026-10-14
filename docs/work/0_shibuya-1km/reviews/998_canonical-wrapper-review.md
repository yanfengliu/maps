# 998 — canonical wrapper ownership review

2026-10-14. Independent read-only review of the prepared canonical gate ownership wrapper. Product source review993 and native appearance acceptance remain separate.

**998 verdict: not ready for dispatch. Two material fixes are required in the canonical wrapper.**

- **GW-1 [P2] — inherited debug settings can force a headed browser.** [run-owned-visual.ps1:103](C:/Users/38909/Documents/github/maps/artifacts/commercial-corner-20261014/canonical-gate/run-owned-visual.ps1:103) checks two environment overrides but leaves Playwright debug settings inherited. Installed `playwright-core/lib/coreBundle.js:8152–8155` reads `PWDEBUG`, `npm_config_pwdebug` and `npm_package_config_pwdebug`; lines39887–39888 force `headless=false` in inspector mode, even when explicitly passed `true`. This can launch a visible browser outside the headless executable allowlist. Refuse or neutralize the effective debug setting before launch and record that admission.

- **GW-2 [P2] — final census excludes children created during cleanup.** [run-owned-visual.ps1:185](C:/Users/38909/Documents/github/maps/artifacts/commercial-corner-20261014/canonical-gate/run-owned-visual.ps1:185) requires an unclassified child’s creation time to precede `$closureStarted`. That timestamp is recorded at line154, before final admission and termination. A child created during that interval can remain visible in the final inventory yet escape survivor refusal and allow TEMP deletion at line199. Include such late children in unresolved final evidence and refuse completion/preserve TEMP. Historical parent edges must remain evidence only, never authority to kill.

Other reviewed boundaries are sound within their stated limits: exact `npm run visual` from PRIMARY; occupied4319 and existing output refusal; scoped outside-Git TEMP; retained handles with identity checks; unchanged executable classifier; and canonical-only certificate production. The1200-second checks are monotonic and CIM calls request5-second operation limits. This is not live deadline proof. Cleanup is also not a30-second total wall bound: final census and output waits have separate allowances after the shared cleanup timer.

All15 active pins and three basis pins matched before and after review. Exact targets:

- Preparation: `8df54d23f6189cb375ac970c2d2a1e2ddfb34940e86f23a4066b5d0eda6b045c`
- Canonical runner: `4cc820e4032e5fd16a9754e2ead8d646eaa8cc886e4a524c7d72569613b350fb`

The eight retained offline controls cover classification, parsing and output refusal. They do not establish live admission, termination, CIM deadlines, TEMP cleanup or unseen descendant absence.

The separate capture wrapper was checked narrowly against freeze `758cf67849996a84702ef056b52cae540d55885939e606262fedb6efc7bde829`. **GW-1 applies conditionally there too**, despite `capture.mjs:142` specifying `headless:true`. **GW-2’s precise timestamp-filter defect does not transfer:** that filter is absent from capture’s wrapper. Its existing outer receipt expressly covers recorded identities only. This cross-check is not a replacement for review997 or approval of the whole capture wrapper.

No files were changed and no launch, test or gate ran during the read-only review. **Review released; product/native acceptance remains outside this verdict.**

**Root disposition:** Root accepts GW-1 and GW-2 and the stated limit that30seconds is not the complete cleanup wall bound. Both implementation owners will preserve the exact old frozen targets before fixes. Root will request a focused source re-review against new pins after the repairs. Canonical-wrapper changes and capture-wrapper changes remain separate; neither is authorized to launch by this report. Root separately authorized saving this report after the read-only review.