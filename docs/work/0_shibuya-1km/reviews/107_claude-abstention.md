# Claude exact-source lane: abstention

2026-09-27. The current fleet runbook pins `claude-opus-5-5[1m]` with effort `max`. Claude CLI 2.1.281 met its minimum version. One owned, hidden CLI process received the exact reconstructed frozen tree, a read-only prompt, and only `Read,Glob,Grep` tools. Its result was exit 1 after approximately 8 seconds: `Failed to authenticate. API Error: 401` because the OAuth access token had expired. No authentication change, installation, retry or model substitution followed.

`claude.jsonl` contains no substantive review and reports `modelUsage: {}`. Therefore neither model identity nor grounded source review was established, and this is an abstention, never an approval. The available local login-status result from the earlier dependency audit was insufficient to establish live model access.

Evidence: `prompt-claude.md`, `run-claude.mjs`, `claude-process.json`, `claude-completion.json`, `claude.jsonl` and `claude-stderr.log`. `tree-before.json` and `tree-after.json` match across all 592 reconstructed files; `final-integrity.json` independently reconfirms them and all 14 frozen overlays. Owned PID 18700 exited and was absent at the final check. The bounded timeout did not fire. No browser, GPU process or server was launched by this lane.

The Codex CLI lane remains unavailable because its earlier sanitized status check reported not logged in. It was not retried. The separately authored Astra review is the independent source review actually performed.
