# Review 1433a: EOF-format disposition

Read-only follow-up to 1433. No source change or gate ran. Actual PRIMARY `src/scene/upper-windows.ts` and `test/upper-windows.test.ts` still match the revision2 frozen hashes `14d5bc7bf0583aec9c05459d0353c65f1033ba6fe563391a632a54d1629b7c72` and `a5204f58781fa0c0871cb372b1e89fe7de97c1b62fce965603b6ea5ca554f123`.

With `core.whitespace=cr-at-eol`, actual staged whitespace checking reports only `upper-windows.ts:124` and `upper-windows.test.ts:109`, each a new blank line at EOF. Both end in LF followed by CRLF. This is a harmless format warning, not a material implementation defect. AGENTS.md requires the five code gates; I found no additional requirement that `git diff --check` pass. Keeping these exact reviewed bytes preserves 1433's PASS without evidence transfer.

If root elects to normalize, remove exactly the final two CRLF bytes and preserve the preceding LF. Compare the remaining complete byte prefix, preserve old freeze/evidence, and record new raw hashes. Broad `trimEnd` equality alone could hide a larger whitespace edit.

The existing transfer rule is explicit: `docs/policies/local-rules.md:85` requires “identical built bundle bytes, unchanged data/scene/** and changed paths outside the bundle graph.” `upper-windows.ts` is in that graph: `src/scene/facade-textures.ts:70` and `src/render/post.ts:70` import it. Thus even a byte-identical rebuilt runtime does not satisfy every stated transfer condition after normalization. The certificate's four-file runtime bound remains a valid technical fact about the old run; it does not override the source-path condition.

Disposition: retain the frozen bytes and existing PASS, or normalize and refresh final gates plus required native evidence on the new revision. I do not approve a format-only exception to the current rule, relabel old raw source hashes as current, or infer new visual acceptance from runtime equivalence alone. No new proof machinery is needed. All 14 final criteria remain open.
