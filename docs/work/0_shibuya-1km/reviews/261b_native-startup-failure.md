# Attempt1 startup failure — independent bounded diagnosis

Verdict: the admitted attempt did not reach browser/native rendering. Freeze 36d6979d39e3c9ebf5071cc65cdec07362d7f15623026243fd608a374e04d9d6 requires a narrowly reviewed preview-hook and child-exit successor before any further hardware attempt. The prior final-binding approval did not exercise actual preview initialization. This reviewer missed the hook return contract and the host-specific child exit-code behavior. Native pixels, motion and shader linkage remain not run. Date: 2026-09-28. Reviewer: native_source259.

Observed immutable run: C:/Users/38909/Documents/github/maps/artifacts/native-capture261-20260928/runs/native261-entry262-20260928-1/. capture.json SHA 341de57e67c8c2383e6db658027368b65619b0ef55353aca3176c1026cd4d486 records passed=false and TypeError reading undefined.url, no served responses, stills or controls, and no browser identity. complete.json SHA 522fc83b1fe9fea184e48a68c72b8a4945aa7fac8fea835757dee63029f0286b records nodeExitCode=null, passed=false, no remaining owned processes, zero listeners and tempRemains=false. Its cleanup is not rendering evidence. The inner no-op close callbacks being marked closed do not mean those resources were acquired.

## P2 — private hook returns a request handler as a setup callback

Exact cause is C:/Users/38909/Documents/github/maps/artifacts/pedestrian-native253-20260928/private-config.mjs:13. The expression-bodied serve function returns server.middlewares.use(...). Connect's use returns its application for chaining. Both configureServer and configurePreviewServer are assigned that serve function at line14. Vite treats a returned function as a post-configuration callback and invokes it without request/response arguments. That callback is actually the Connect request dispatcher, so it reads undefined.url.

The installed Vite7.3.6 implementation confirms the chain: node_modules/vite/dist/node/chunks/config.js:35203 collects configurePreviewServer return values;35223 calls fn();10483 enters app.handle;10538 reads req.url. The private config SHA is adba0393262221145764f1e35e3da800a06244fb84e88b587acd63f0e19fcd30. Vite chunk SHA is c2fcfa51206dc1f8d22120ef4a82af8b9acdc02f4476520b6a0897d12a724ba3. The actual capture fails at its awaited preview initialization on capture.mjs:54, before assignment to its server variable. This is not a binding-schema dereference failure.

Independently reproduced with the unchanged frozen private config and actual Vite.preview. The bounded read-only Node invocation replaced net.Server.prototype.listen with a throwing guard, tracked HTTP servers constructed by http.createServer, and closed each in finally. It observed zero listen attempts, exactly one unlistened HTTP server, and all servers not listening after cleanup. It exited0 after asserting this exact failure. No browser, GPU, HTTP listener, dependency change or file edit was used. Actual stack:

    TypeError: Cannot read properties of undefined (reading 'url')
        at app.handle (.../node_modules/vite/dist/node/chunks/config.js:10538:38)
        at app (.../node_modules/vite/dist/node/chunks/config.js:10483:8)
        at .../node_modules/vite/dist/node/chunks/config.js:35223:34
        at Array.forEach (<anonymous>)
        at preview (.../node_modules/vite/dist/node/chunks/config.js:35223:12)

The stack resolved through the primary node_modules shared by the worktree, matching the hashed installed Vite bytes. The run's string-only error omitted its stack, but the same exact frozen config and installed preview path reproduce its failure before any listen. The old build and import-only preflight could not catch this because neither invoked configurePreviewServer. My prior review read and bound those receipts but did not test the hook lifecycle.

Minimal repair proposal: preserve original253 configuration and packet/build evidence, and in the successor private preview configuration wrap only the named private-native253-packet plugin's configureServer/configurePreviewServer registration so the wrapper returns undefined after calling the original hook. Alternatively a successor copy can add an explicit block body with no return. The chosen delta must not modify product source, packet, build pixels, unrelated plugins or URL behavior. Its cheap regression must execute the actual returned-hook initialization semantics, show the old failure and repaired progress without a request, and verify exact registration remains. Config import alone is insufficient. Root owns repair authorization.

## P2 — launcher loses the child exit code

owned-launch.ps1:30 starts the hidden child with Start-Process -PassThru. The code polls/waits and calls Refresh before reading ExitCode at40 without retaining its process handle immediately. On this host the recorded result is null, so even a successful native capture could not satisfy the outer passed predicate. The existing predicate fails closed; this did not turn failed media into success.

Worker261 independently owns the host reproduction. I read its actual diagnosis-attempt1/exit-code.ps1 SHA d0d688795bc831e08745e02397c9151f349de682eba64ea0ce51a95e88745af4 and exit-code.json SHA e6cbe21c1690116411dbbbc87d4e0e2b0eb70beba979af54edc79858f501671c. The six finite hidden Node children all exited. The existing sequence reports null for requested exit0,1,7. Reading and retaining child.Handle immediately after launch makes the same wait/Refresh sequence return exact0,1,7. This is actual host-process evidence, not a mocked Process object. I did not duplicate those children.

Minimal repair proposal: retain the process handle immediately after Start-Process and explicitly refuse a null/unavailable exit code before recording completion. Keep the exact-identity ownership, full census and finally cleanup paths. The focused check should bind the actual changed launcher statements and preserve both failure and success receipts. No browser or GPU is needed to validate this correction.

No product or frozen-run files were edited by this diagnosis. Only this assigned report was written. The earlier freeze and authored approvals remain unchanged as historical evidence, with their missed initialization bound corrected here. Root must authorize the exact repair, obtain focused rereview and a new sealed executor, then separately consider another finite hardware admission with a fresh census. No automatic native retry is approved here.
