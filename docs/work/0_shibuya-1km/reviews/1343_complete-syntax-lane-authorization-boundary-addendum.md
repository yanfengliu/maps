# 1343 — Authorization boundary

This addendum clarifies the frozen1343 preparation without changing its runner, checker, metadata or original report bytes. The runner pins the release path/byte count/SHA-256 supplied in argv and retains/finalizes those exact bytes. It does not decode release contents, test authorization fields, establish that a document grants permission or implement a release-content authorization predicate.

Root's separate inspection/admission of the exact runner, plan, input tuple, raw release descriptor, argv, cwd, environment and outputs supplies semantic authorization externally. A matching raw descriptor alone is not permission. Root accepts this private syntax-only responsibility separation; the lane remains unreleased and unexecuted. The FALSE input contract, frozen handoff and this addendum grant no runtime, control, constructor or profile permission.
