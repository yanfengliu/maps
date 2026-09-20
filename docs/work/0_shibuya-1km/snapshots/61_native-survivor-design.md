# Original-handle survivor observation

Owner: native_instrument_correction, assigned by root. Base: d7c8eea43c1cbfc6e85bcd01306fd43898be6b66. Preparation only: no native fixture execution before root and independent source review. The baseline is run 02 source b463a04aafc723f013dcc30641c5f6f173184d57992e47443b963115fa10a13a, including unchanged 500 ms / 5 ms accounting, 15-second normal and five-second crash waits, original handles, rescue and sentinel safeguards. All 28 baseline cases remain in their original runner and retain their own results. Six separately named observer cases form another denominator; their added transfer and sampling cannot be passed off as unchanged baseline observations.

## Ownership and publication

The runner already holds the original owner process handle returned by CreateProcessW. The stopped owner holds its originally returned fixture root handle. It publishes that scalar source-handle value into a shared mailbox before signaling its existing checkpoint, and does not close or reuse that handle while stopped there. The scalar alone is not identity: its validity depends on that original process handle and held source-handle lifetime. The runner pulls a duplicate using DuplicateHandle through the original owner process handle. The returned duplicate is immediately entered into its local ledger before another API call. No handle is created remotely in the runner and only later published; that push scheme would have an owner-death leak window.

For the post-assignment and leaked-job pairs the final observer is a SYNCHRONIZE-only duplicate of that root process. For the breakaway pair the root duplicate is a bridge with PROCESS_DUP_HANDLE | SYNCHRONIZE. The root fixture holds the originally returned child process handle, publishes its value, marks child creation complete, and waits on a separate shared atomic acknowledgement. This barrier does not read or signal the original auto-reset advance event. The owner can reach checkpoint 16 while the fixture holds the child handle. The runner pulls a SYNCHRONIZE-only duplicate of that actual child's handle through the bridge, enters it in the ledger, then publishes acknowledgement so the source fixture can close its original handle. The matched candidate creates the same ordinary descendant without breakaway; creation refusal is not a passing substitute.

```text
runner original owner process handle + separate outer rescue job
  -> owner-held original fixture root handle at checkpoint
     -> SYNCHRONIZE observer (post-assignment and leak pairs)
     -> PROCESS_DUP_HANDLE | SYNCHRONIZE bridge (breakaway pair)
        -> root-held original child handle at publication barrier
           -> SYNCHRONIZE observer; acknowledge only after ledger entry
```

The runner acquires no tested inner-job handle. The final process observer has no termination or query permission; it is a wait authority. The bridge has duplication/wait access only. No OpenProcess, PID lookup, PID stop, broker or fallback is introduced. DuplicateHandle requires PROCESS_DUP_HANDLE on the source process and creates another handle to the same object; WaitForSingleObject requires SYNCHRONIZE. Official contracts: https://learn.microsoft.com/en-us/windows/win32/api/handleapi/nf-handleapi-duplicatehandle and https://learn.microsoft.com/en-us/windows/win32/api/synchapi/nf-synchapi-waitforsingleobject.

## Acquisition and failure table

| Stage | Owner and held lifetime | Failure result and cleanup |
| --- | --- | --- |
| Root publication | Owner's Scope retains original process/thread handles at existing checkpoint 12, 14 or 16. Shared publication uses interlocked release/acquire. | Missing publication, premature owner exit or invalid duplication is unknown/failure. Runner still has original owner and outer job for joined rescue. |
| Root duplicate | Runner immediately ledgers returned process handle; no further API precedes ownership. | API failure is recorded with Win32 error; it never implies target death. A successful prior acquisition remains in finally cleanup. |
| Child publication | Breakaway/contained fixture holds original child process handle until a separate atomic acknowledgement. Owner waits its existing child-created predicate before checkpoint 16. | If transfer fails, acknowledgement is not required for rescue: the distinct outer job kills and joins the waiting fixture and child. No source-handle reuse is allowed while waiting. |
| Child duplicate | Runner pulls through its original-root bridge, ledgers the final SYNCHRONIZE handle, then acknowledges release. | No remote target allocation/publication gap. A failure keeps bridge ownership and goes to joined outer rescue. |
| Before owner death | Wait(observer, 0) must return WAIT_TIMEOUT, proving this created fixture is still unsignaled before the cut. | Already signaled or WAIT_FAILED is a failed observation, not a passing candidate. |
| After owner death | Original owner is signaled by the existing wait, accounting runs unchanged, then Wait(observer, 0) is recorded before rescue. | Candidate requires WAIT_OBJECT_0; negative requires WAIT_TIMEOUT. Every other result is unknown/failure. Raw accounting remains separate and cannot substitute. |
| Explicit/finally close | Final observer and bridge are closed before outer rescue; all close errors remain failed even if a later retry closes them. Destructor retries while retaining original handle authority. | No clean receipt before closure. Outer Scope still joins rescue if observation or closure throws. No PID operations. |

The separate child publication wait has no success timeout. It ends only on acknowledgement or process disposal by existing outer rescue. This is a held acquisition barrier, not a new passing time budget. The extra transfer duration, raw wait results and acknowledgement events are recorded. The observer retains process objects and can affect accounting or scheduling; its six results are explicitly separate from the unchanged 28-case baseline.

## Cases and verdict

The six cases are post-assignment negative/matched creation-assigned candidate at checkpoint 12, leaked-job negative/private-job candidate at checkpoint 14, and breakaway negative/ordinary-child candidate at checkpoint 16. Each requires a successful transfer, a live pre-cut target, owner signal, the expected post-cut wait result, explicit observer closure, unchanged outer rescue/sentinel/handle balance, and an actual created descendant where applicable. These six observations can validate their intended live/dead distinctions; they do not retroactively change the baseline's raw labels. The unchanged creation-window measurement remains unavailable. The combined run remains partial when the baseline is partial; no primitive or launcher certificate is emitted.

## Execution receipt

The future command will call the frozen executable directly from the tool shell and immediately propagate its LASTEXITCODE with exit, independently of any later JSON report. Its stdout records each group's return status; each group's events file retains its own FINAL. The tool's returned exit status is the independent OS command receipt. Any later authored report must preserve that raw tool result before formatting a reconstructed record. No receipt wrapper or native run is executed during preparation.
