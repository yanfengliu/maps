# Runtime complete-report representation v3 focused independent review

Verdict: ACCEPT for Root's separate standard 33-method unit run. This is static code and unit-packet acceptance only. No v3 test, candidate import, function, codec, query, phase or Unreal runtime ran in this review, and no runtime, semantic, physical or phase acceptance is granted.

Reviewed on 2026-10-16 by `/root/runtime_v3_review`, independently of implementation owner `/root/city_runtime`. The integration owner remains `/root`. The workspace base is `33d386299ff7bd02d91bca38f655f41597ddb756`; the review binds the ignored v3 packet rather than the worktree's unrelated changes. Candidate seal: 14,061 bytes, SHA-256 `1099a0fc8901086c9a7656953e28f227d900a53ad79d2fcab670c24b6b42d817`. Candidate handoff: 8,781 bytes, SHA-256 `35124cf646fb507b8b13de2c33c5674a979c47e49f151e7da946c2a73c1128f3`.

## Scope and evidence

The scope is the actual v2 failed forensic acquisition's path-stat/held-fstat metadata basis repair, its three added methods and retention of the previous 30 requirements. I read the full candidate storage source, both v2-to-v3 diffs, the real-read unit seams and new cases, the relevant original cases, README, handoff and repair response. I read Root's exact stat-basis policy, five-file diagnostic and failed-v2-unit observation. I did not reopen accepted unrelated codec, receipt or phase design.

Independent static checks verified all 43 sealed member pins and exact 44-file namespace including the seal, all 56 unit inputs, all 94 preservation records, the seven basis authorities, and all raw-byte forward and inverse deltas in the original, v1 and v2 delta records. Each input was checked for lexical reparse points, a regular bounded file and a full length/hash match. The review utility recorded 4,463 successful checks and 115 unique full-read pins in `verification.json`. Repeated path and byte-check groups are summarized there; substantive checks and exact pins are retained. The unchanged v2 storage and unit copies match the actual v2 packet, and all six other candidate modules remain byte-identical to v2.

## Comparison contract

`after/report_storage.py` is 17,544 bytes, SHA-256 `11bd746a16a554a84ba432ba6ace4ec8ab9101c7f350303714ce71c4fb2fb23e`. Only `file_state` and `failure_file_pin` change from v2, with one new helper `same_file_basis`. The other 15 existing definitions and every non-definition top-level AST node remain exact.

At lines 116-132, `file_state` requires a regular file, a positive actual integer inode, and native integer device, size, birthtime, mtime and raw ctime. Missing, null, boolean, float or string birthtime cannot fall back to ctime or a guessed value. Across path and held APIs, the comparison requires device, inode, regular kind, size, actual birthtime and mtime to agree. Raw ctime remains in each retained state instead of being demanded equal across APIs.

At lines 143-170, path-open equals path-before, and the complete path state including raw ctime must still equal path-after. The complete held-before state including its raw ctime must equal held-after. The common cross-API basis is checked at both boundaries. The fix therefore removes only the observed false cross-API ctime equality, while retaining change checks in each channel and the identity, growth, truncation, replacement and observed-overwrite refusals.

This matches Root policy `b951916e09a96deebbd28c6fae745ef6bdf52901fa13bb828db415e00ce3a728`. The probe `83c131458858dded2fb47e398d48923e942f5a7c4b556eebf56c6ad9601eb04c` contains exactly one 1,048,577-byte row whose raw ctime differs across APIs while common fields and both API channels remain stable. This is local observed evidence; no undocumented platform cause or general race-proof claim is inferred.

## Unit packet

The unit source is 48,236 bytes, SHA-256 `c94e4390818f22f39d3d06abcee8b22debd61fc7e3c35e55bcf3856b0862017e`. There are exactly 33 prepared test methods: all previous 30 names and three added cases. Twenty-eight old methods remain raw-byte exact. The existing stable-read method changes only its incorrect cross-API full-state equality into full within-channel equality and explicit common-field equality. The source-inverse method adds the v2-to-v3 delta family. Existing refusal regular expressions remain present, and no skip decorator is introduced.

The added probe regression reads the externally pinned observation, independently asserts its single ctime-only mismatch and stable channels, and injects those recorded native observations only at the production `stat_info` and `os.fstat` acquisition seams. It calls the exact v2 and v3 `failure_file_pin` implementations while reading a real owned 1,048,577-byte tempfile. The old arm must refuse at open with zero payload reads; the v3 arm must return the full independently calculated SHA and length with exactly initial extent plus one requested byte. The seam is a deterministic replay, not a newly observed live race or a replacement implementation of the acquisition function.

The other two methods require refusal for raw ctime changes at path-before, path-after and held-after, and for absent or coercive birthtime. Existing real growth, truncation, different-handle identity, final path replacement, observed overwrite, missing/present invalid success and beyond-extent cases remain. No test substitutes a raised cap or earlier generic refusal for the intended check.

## Findings and limits

No material finding in this focused delta. The initial forensic extent remains 0..1,048,577 bytes plus at most one lookahead; semantic files remain 1,048,576 bytes and both adopted logical roles remain 33,554,432 bytes. Source/phase clocks and guards are unchanged. Actual v2 RED evidence is retained; v3 PASS is not claimed.

Root may next execute the exact documented standard isolated unittest command under a separate lease, capture its actual full stdout/stderr and exit, recheck the input packet and tempfile/cache cleanup, and accept or reject the actual result. Fresh phase bindings, four genuine current prerequisite results and censuses, the original 76+18 population, wire/readback/deadline checks, ordinary/future POST and all Unreal/native acceptance remain outstanding. This review does not authorize transferring the earlier FIRST population or treating preparation as execution.

No candidate or production source was edited. Only this fresh ignored review directory was written. No selected/helper/browser/engine/server process or process census was launched; ordinary static utilities finished. No commit or integration was performed.
