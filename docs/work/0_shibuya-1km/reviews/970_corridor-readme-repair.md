# 970 — fixture README LF repair

Resolved P3 from review 968 by restoring `test/fixtures/README.md` to LF. The original 91-line main content remains a byte-exact prefix, and all six added provenance lines remain unchanged. The current README is 11,019 bytes, SHA-256 `2471c136130f1987b14fa020b0af65ea0b627dabfd231ef972c97ad98a37ff22`; the previous CRLF version was 11,116 bytes, SHA-256 `d8560bc625644ffc7e59fb84806a848ca3f28e5f3e6378016e38821efefa4723`.

Against main `ac2ddc42292e3b34516b2fc56f515a892ad20df1`, Git reports `i/lf w/lf attr/-text`, six added lines and zero removed lines. `git diff --check` exits 0. The three runtime files, corridor test and JSON fixture retain their exact live and frozen length/SHA-256 pins. Historical 965 freeze and its README copy remain unchanged; this repair's receipt binds the corrected current README separately.

Evidence: `artifacts/corridor970-readme-repair/receipt.json` (5,722 bytes, SHA-256 `1a6f4d628b2d1f084d269e347957da95bccca532fe044131cbfb069aa7190abc`) and `git-diff.patch` (2,309 bytes, SHA-256 `2435fe08ad75ea6fa8dd4d0e308bb37879538b73dd9962d51a409931f901d155`). Read-only Git checks used optional locks disabled. No gate, build, runtime or Git mutation ran. No task-owned process or temporary resource remains; compact evidence is retained for root acceptance.
