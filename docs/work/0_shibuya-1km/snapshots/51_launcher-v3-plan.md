# F28 launcher v3 repair contract — proposal only

The v2 launcher and all 27 files in repair freeze `51b30d2c0fd81215eb3f7750d66fa3c33d35d331237a333bea83f753ceba7061` stay immutable. This proposal is separate from the frozen F27 controller. No new capture, launcher implementation or GPU work is authorized by this document.

Review 50's unchanged-ESM controls prove the v2 failure: the outer deadline race returns through finally and writes its manifest while `run()` is still awaiting a build or browser launch. That old continuation then acquires resources nobody closes. The repair must establish one owned async scope, not add another timeout around the same orphanable promise.

## Proposed mechanism

One absolute 120-second work deadline owns a cancellation flag and failure reason. A `checkpoint()` checks both that flag and the monotonic deadline before starting every async phase or resource acquisition, immediately after every awaited phase, and before recording a frame. The timer requests cancellation rather than detaching the work. Main awaits the single `run()` promise to settle; finally never begins its final inventory/manifest while that continuation can still acquire a resource.

Every acquisition follows `checkpoint -> start -> await -> retain handle -> checkpoint`. Retaining happens before the post-await checkpoint, so a late browser/context/page result belongs to cleanup even when cancellation occurred while it was pending. No subsequent acquisition begins after cancellation. The HTTP server handle is retained before calling `listen`. Browser launch receives an explicit timeout no larger than the remaining work budget. Navigation, readiness and screenshot operations also receive the remaining budget where their APIs support a timeout. A deadline during synchronous observation is caught by the absolute-time checkpoint after that observation returns; the existing 10-second subprocess limit remains.

On cancellation, available retained browser/server handles may begin idempotent closure to interrupt pending browser operations. Each close task is itself retained and joined; no dropped cleanup `Promise.race` may announce closure. The final cleanup owner still closes a handle delivered after cancellation and performs the existing strict creation-identity/process/profile checks. The existing seven-second close budget becomes an escalation point to the exact retained child/identity fallback, not permission to forget the pending close or write a final manifest. No broad process name kill is introduced.

Only after work has settled and every acquired resource has a settled close or verified disposal does final inventory run and the final manifest write. The manifest records deadline time, pending phase, cancellation, acquisition/closure order and drain duration; a timeout always stays a failed attempt even if drainage succeeds. Any pending diagnostic receipt must be visibly non-final and cannot claim complete cleanup. Neither a timer nor successful cleanup can turn an incomplete capture into success.

## Deadline tradeoff requiring root disposition

This proposal retains the 120-second work deadline and prevents later work/acquisition, but it cannot honestly promise process return at exactly 120 seconds while also joining arbitrary in-process promises. In particular, the current Vite `build()` API has no cancellation handle in this harness. If it never settles, this conservative owner remains in a named pending-build drain state, writes no final manifest, and launches no server/browser. Existing browser APIs receive explicit remaining-budget timeouts; cleanup can also extend elapsed time. A non-final pending receipt can expose this state without claiming resource release.

The smallest repair therefore treats 120 seconds as the work/capture deadline and reports settlement time separately. If root requires a hard bound on build drainage too, the next scope must move Vite into a separately owned, cancellable helper process and review its exact descendant cleanup. That is a distinct lifecycle increment; it should not be hidden in this small repair or claimed from an uninterruptible promise. Root should choose this boundary before implementation.

## Browser-free controls before any capture

Execute the exact copied v3 ESM body with the same synthetic imports as Review 50. Preserve v2's actual red results. At the real deadline callback, leave build unresolved: there must be no final manifest/return and no server/browser. Resolve it later: run must stop at the checkpoint, acquire nothing further, drain, then write a failed final manifest. In the delayed-launch arm, an HTTP server already exists: deadline must not finalize; when launch resolves its handle must be retained and closed, with no connect/context/page acquisition; final manifest follows disposal.

Also delay context/page acquisition, reject an acquisition, and resolve/reject a close after its escalation timer. Assert exact event ordering, complete case denominators, absence of acquisitions after cancellation, and no final manifest before the final required closure. Include a still-pending-build snapshot to prove that timeout is not silently reported as settled. No real browser, server, GPU or stop action is needed for these controls. Reuse the reviewed ISO, finite-date and exact creation-identity controls without changing their thresholds or classifier scope.

The handoff will contain old red/new green, exact code and input hashes, which phase bounds are API guarantees versus observed fixtures, any still-pending state, and cleanup evidence. Native capture stays blocked until the separate v3 target receives independent acceptance.
