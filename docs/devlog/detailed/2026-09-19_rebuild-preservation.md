# Devlog — 2026-09-19

## Cleanup erased the evidence that regeneration was incomplete

**Timestamp:** 2026-09-19 18:02–18:25 America/Los_Angeles, isolated implementation; no commit.

**Action:** The scene builder now enters through a read-only markings preflight before the existing cleanup and writer body. It recognizes only an absent pair or structurally consistent output from the existing published-only producer. Authored, unknown, incomplete and malformed pairs get a named refusal while all scene bytes remain in place. The producer note, function list and provenance shape are read as the current format, without changing their source policy.

**Result:** There are three admitted fixtures and 23 refusal fixtures. With either no preflight or a preflight after cleanup, all 23 refusal cases resolve instead of rejecting. Restoring the correct order passes all 26 preservation cases and the existing cleanup case. Every refused fixture compares all file bytes, including independent companion output, and verifies the writer was not called.

**Reasoning:** Calling the authored writer automatically would immediately encounter the unresolved source-vintage boundary. The preservation increment instead prevents a published-only rebuild from deleting evidence it cannot reproduce. Neither file being present is only a bootstrap condition; it cannot establish whether somebody already removed historical paint. Unknown markers remain a refusal, requiring an explicit future preservation decision.

**Validation:** The tests exercise the real shared orchestration boundary, mesh decoder and cleanup against temporary roots. They substitute a counted fixture writer for the expensive city generation body. Both mutation runs restore exact helper bytes in finally. Typechecking passes. No actual `data:scene`, source fetch, data writer, browser, GPU or full gate ran. This does not make a later admitted build failure transactional or prevent concurrent external file replacement.

**Code reviewer comments:** Independent review is pending. The parent accepted the preservation-only design before implementation. The author tightened the function-list consistency check while reading the existing producer, then repeated both red controls and the restored green suite.

